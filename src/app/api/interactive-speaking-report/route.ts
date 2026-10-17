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
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import {
  AllGradingAttemptsFailedError,
  buildModelLadder,
  gradeWithEscalation,
  gradingDeadlineFrom,
} from "@/lib/grading-escalation";
import {
  gradingFailureResponseBody,
  logGradingFailure,
} from "@/lib/grading-failure-log";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { recordAttemptWeakness } from "@/lib/production-weakness";
import { getAdminAccess } from "@/lib/admin-auth";
import { recordDataCollectionSubmission } from "@/lib/data-collection";

// Room for the whole escalation ladder (retries, then other models) instead of
// being killed mid-attempt and throwing the learner's recording away.
export const maxDuration = 300;

export async function POST(req: Request) {
  const startedAt = Date.now();
  // Hoisted so a total grading failure can be attributed to the learner who hit it.
  let userId: string | null = null;
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
  // The one-time skill-placement probe shouldn't cost the learner's monthly AI-feedback quota.
  const isPlacement = o.source === "placement";

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
    userId = await getOptionalAuthUserId(req);
    // Admins / preview-eligible accounts don't consume real feedback credits.
    const adminBypass = (await getAdminAccess(req)).ok;
    // Honor an existing reservation: if the learner already reserved a credit
    // for THIS attempt at /start, they're entitled to grade it — never block
    // them now even if their balance changed mid-exam. Only re-check the
    // balance when there is no reservation (defensive).
    const existingLock =
      userId && !adminBypass && !isPlacement
        ? await getInteractiveSpeakingCreditLockForAttempt(userId, attemptId)
        : null;
    if (userId && !adminBypass && !isPlacement && !existingLock) {
      const credit = await getAiCreditStateForUser(userId, "interactive_speaking");
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "Feedback quota reached" }, { status: 402 });
      }
    }
    // Was a single un-laddered call: when the Gemini key was denied in August
    // 2026 every other exercise recovered on Claude and this one alone stayed
    // broken, because it had no second rung to fall to.
    const graded = await gradeWithEscalation({
      operation: "interactive_speaking_report",
      models: buildModelLadder(model, keys),
      deadlineAt: gradingDeadlineFrom(startedAt, maxDuration),
      runAi: (m, deadlineAt) =>
        generateInteractiveSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          model: m,
          attemptId,
          scenarioId,
          scenarioTitleEn: scenarioTitleEn.trim(),
          scenarioTitleTh: typeof scenarioTitleTh === "string" ? scenarioTitleTh.trim() : "",
          prepMinutes,
          turns,
          deadlineAt,
        }),
    });
    const { report, usage } = graded;
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "interactive_speaking_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: {
          attemptId,
          scenarioId,
          gradeSource: graded.source,
          ...(graded.failures.length ? { recoveredFrom: graded.failures } : {}),
        },
      });
    }
    if (userId && !adminBypass && !isPlacement) {
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
    // Interactive speaking is the one production exercise that doesn't go
    // through grading_jobs, so it records its own grammar topics here.
    await recordAttemptWeakness({
      userId,
      surface: "interactive_speaking",
      attemptId: typeof attemptId === "string" ? attemptId : "",
      grammarBreakdown: report.grammar?.breakdown ?? [],
    });
    await recordDataCollectionSubmission({
      userId,
      examType: "interactive_speaking",
      attemptId: typeof attemptId === "string" ? attemptId : null,
      promptTitle: scenarioTitleEn.trim(),
      promptText: turns.map((t) => t.questionEn).filter(Boolean).join(" | "),
      submittedText: turns.map((t) => `Q${t.turnIndex}: ${t.transcript}`).join("\n\n"),
      wordCount,
      score160: report.score160,
      report,
    });
    return NextResponse.json(report);
  } catch (e) {
    if (e instanceof AllGradingAttemptsFailedError) {
      console.error("[interactive-speaking-report] all models failed:", e.failures.join(" | "));
      logGradingFailure({
        operation: "interactive_speaking_report",
        userId,
        attemptId: typeof attemptId === "string" ? attemptId : null,
        error: e,
      });
      return NextResponse.json(gradingFailureResponseBody(e), { status: 503 });
    }
    const message = normalizeGradingErrorMessage(e);
    console.error("[interactive-speaking-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
