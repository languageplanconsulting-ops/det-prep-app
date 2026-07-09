import { NextResponse } from "next/server";
import {
  chargeAiCreditForUser,
  getAiCreditStateForUser,
  getSpeakingPartnerCreditLockForAttempt,
} from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateSpeakingPartnerReportWithGemini } from "@/lib/gemini-speaking-partner-report";
import { SPEAKING_PARTNER_TURN_COUNT } from "@/lib/speaking-partner-constants";
import { computeSessionTopics, upsertWeaknessHistory } from "@/lib/speaking-partner-weakness";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getRequestAuthUser } from "@/lib/supabase-request-client";
import { getAdminAccess } from "@/lib/admin-auth";
import { recordDataCollectionSubmission } from "@/lib/data-collection";

export const maxDuration = 120;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const attemptId = o.attemptId;
  const prepMinutesRaw = o.prepMinutes;
  const turnsRaw = o.turns;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  const prepMinutes = typeof prepMinutesRaw === "number" ? prepMinutesRaw : 0;
  if (!Array.isArray(turnsRaw) || turnsRaw.length !== SPEAKING_PARTNER_TURN_COUNT) {
    return NextResponse.json(
      { error: `turns must be an array of length ${SPEAKING_PARTNER_TURN_COUNT}` },
      { status: 400 },
    );
  }

  const turns = turnsRaw.map((t, i) => {
    const x = t as Record<string, unknown>;
    return {
      turnIndex: typeof x.turnIndex === "number" ? x.turnIndex : i + 1,
      questionEn: String(x.questionEn ?? ""),
      questionTh: String(x.questionTh ?? ""),
      transcript: String(x.transcript ?? ""),
    };
  });

  const topicSeedEn = turns[0]?.transcript?.trim() ?? "";
  if (!topicSeedEn) {
    return NextResponse.json({ error: "turn 1 transcript (topic) required" }, { status: 400 });
  }

  const wordCount = turns
    .map((t) => t.transcript.trim())
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount < 20) {
    return NextResponse.json(
      {
        error: `Combined answers too short — speak a bit more across all ${SPEAKING_PARTNER_TURN_COUNT} turns.`,
      },
      { status: 400 },
    );
  }

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const { user } = await getRequestAuthUser(req);
    const userId = user?.id ?? null;
    // Admins / preview-eligible accounts don't consume real feedback credits.
    const adminBypass = (await getAdminAccess()).ok;
    // Honor an existing reservation: if the learner already reserved a credit
    // for THIS attempt at /start, they're entitled to grade it — never block
    // them now even if their balance changed mid-conversation.
    const existingLock =
      userId && !adminBypass ? await getSpeakingPartnerCreditLockForAttempt(userId, attemptId) : null;
    if (userId && !adminBypass && !existingLock) {
      const credit = await getAiCreditStateForUser(userId, "interactive_speaking");
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "Feedback quota reached" }, { status: 402 });
      }
    }

    const { report, usage } = await generateSpeakingPartnerReportWithGemini({
      apiKey: keys.geminiApiKey,
      anthropicApiKey: keys.anthropicApiKey,
      model,
      attemptId,
      topicSeedEn,
      prepMinutes,
      turns,
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speaking_partner_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId },
      });
    }

    if (userId && !adminBypass) {
      const lock = existingLock;
      if (!lock || lock.status !== "charged") {
        const charged = await chargeAiCreditForUser(userId, "interactive_speaking");
        if (!charged.ok) {
          return NextResponse.json({ error: "Could not apply feedback credit after grading" }, { status: 500 });
        }
        const { createServiceRoleSupabase } = await import("@/lib/supabase-admin");
        const supabase = createServiceRoleSupabase();
        if (lock) {
          await supabase
            .from("speaking_partner_credit_locks")
            .update({
              status: "charged",
              charge_source: charged.source,
              updated_at: new Date().toISOString(),
            })
            .eq("attempt_id", attemptId)
            .eq("user_id", userId);
        } else {
          await supabase.from("speaking_partner_credit_locks").upsert({
            attempt_id: attemptId,
            user_id: userId,
            status: "charged",
            charge_source: charged.source,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    if (userId) {
      try {
        const sessionTopics = computeSessionTopics({
          grammarFindings: report.grammarFindings,
          transitionFindings: report.transitionFindings,
        });
        report.weaknessDelta = await upsertWeaknessHistory({ userId, attemptId, sessionTopics });
      } catch (weaknessErr) {
        console.error("[speaking-partner-report] weakness history update failed:", weaknessErr);
      }
    }

    await recordDataCollectionSubmission({
      userId,
      examType: "speaking_partner",
      attemptId,
      promptTitle: topicSeedEn,
      promptText: report.questionPromptEn ?? null,
      submittedText: turns.map((t) => t.transcript.trim()).filter(Boolean).join("\n\n"),
      wordCount,
      score160: report.score160,
      report,
    });

    return NextResponse.json(report);
  } catch (e) {
    const message = normalizeGradingErrorMessage(e);
    console.error("[speaking-partner-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
