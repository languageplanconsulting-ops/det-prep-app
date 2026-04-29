import { NextResponse } from "next/server";
import {
  chargeAiCreditForUser,
  getAiCreditStateForUser,
  getInteractiveSpeakingCreditLockForAttempt,
  maybeGrantRedeemImprovementReward,
} from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateInteractiveSpeakingReportWithGemini } from "@/lib/gemini-interactive-speaking-report";
import { INTERACTIVE_SPEAKING_TURN_COUNT } from "@/lib/interactive-speaking-constants";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";

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
  const scenarioId = o.scenarioId;
  const scenarioTitleEn = o.scenarioTitleEn;
  const scenarioTitleTh = o.scenarioTitleTh;
  const prepMinutes = o.prepMinutes;
  const turnsRaw = o.turns;
  const redeemed = o.redeemed;
  const previousScore160 = o.previousScore160;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof scenarioId !== "string" || !scenarioId) {
    return NextResponse.json({ error: "scenarioId required" }, { status: 400 });
  }
  if (typeof scenarioTitleEn !== "string" || !scenarioTitleEn.trim()) {
    return NextResponse.json({ error: "scenarioTitleEn required" }, { status: 400 });
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (!Array.isArray(turnsRaw) || turnsRaw.length !== INTERACTIVE_SPEAKING_TURN_COUNT) {
    return NextResponse.json(
      { error: `turns must be an array of length ${INTERACTIVE_SPEAKING_TURN_COUNT}` },
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

  const wordCount = turns
    .map((t) => t.transcript.trim())
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount < 20) {
    return NextResponse.json(
      {
        error: `Combined answers too short — speak a bit more across all ${INTERACTIVE_SPEAKING_TURN_COUNT} turns.`,
      },
      { status: 400 },
    );
  }

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const userId = await getOptionalAuthUserId();
    if (userId) {
      const credit = await getAiCreditStateForUser(userId, "interactive_speaking");
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "AI feedback quota reached" }, { status: 402 });
      }
    }
    const { report, usage } = await generateInteractiveSpeakingReportWithGemini({
      apiKey: keys.geminiApiKey,
      anthropicApiKey: keys.anthropicApiKey,
      model,
      attemptId,
      scenarioId,
      scenarioTitleEn: scenarioTitleEn.trim(),
      scenarioTitleTh: typeof scenarioTitleTh === "string" ? scenarioTitleTh.trim() : "",
      prepMinutes,
      turns,
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "interactive_speaking_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId, scenarioId },
      });
    }
    if (userId) {
      const lock = await getInteractiveSpeakingCreditLockForAttempt(userId, attemptId);
      if (!lock || lock.status !== "charged") {
        const charged = await chargeAiCreditForUser(userId, "interactive_speaking");
        if (!charged.ok) {
          return NextResponse.json({ error: "Could not apply AI credit after grading" }, { status: 500 });
        }
        const { createServiceRoleSupabase } = await import("@/lib/supabase-admin");
        const supabase = createServiceRoleSupabase();
        if (lock) {
          await supabase
            .from("interactive_speaking_credit_locks")
            .update({
              status: "charged",
              charge_source: charged.source,
              updated_at: new Date().toISOString(),
            })
            .eq("attempt_id", attemptId)
            .eq("user_id", userId);
        } else {
          await supabase
            .from("interactive_speaking_credit_locks")
            .upsert({
              attempt_id: attemptId,
              user_id: userId,
              scenario_id: scenarioId,
              status: "charged",
              charge_source: charged.source,
              updated_at: new Date().toISOString(),
            });
        }
      }
      const rewardBonus = await maybeGrantRedeemImprovementReward({
        userId,
        attemptId,
        surface: "interactive_speaking",
        redeemed: redeemed === true,
        previousScore160:
          typeof previousScore160 === "number" && Number.isFinite(previousScore160)
            ? previousScore160
            : null,
        currentScore160: report.score160,
      });
      if (rewardBonus) {
        report.rewardBonus = rewardBonus;
      }
    }
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[interactive-speaking-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
