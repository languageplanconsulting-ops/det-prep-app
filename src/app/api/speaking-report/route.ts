import { NextResponse } from "next/server";
import {
  chargeAiCreditForUser,
  getAiCreditStateForUser,
  maybeGrantRedeemImprovementReward,
} from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateSpeakingReportWithGemini } from "@/lib/gemini-speaking";
import {
  AllGradingAttemptsFailedError,
  buildModelLadder,
  gradeWithEscalation,
  gradingDeadlineFrom,
} from "@/lib/grading-escalation";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { recordDataCollectionSubmission } from "@/lib/data-collection";
import { getAdminAccess } from "@/lib/admin-auth";
import { isSpeakingRound } from "@/lib/speaking-constants";

// Room for the whole escalation ladder (retries, then other models) instead of
// being killed mid-attempt and throwing the learner's work away.
export const maxDuration = 300;

export async function POST(req: Request) {
  const startedAt = Date.now();
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
  const transcript = o.transcript;
  const prepMinutes = o.prepMinutes;
  const topicId = o.topicId;
  const questionId = o.questionId;
  const topicTitleEn = o.topicTitleEn;
  const topicTitleTh = o.topicTitleTh;
  const questionPromptEn = o.questionPromptEn;
  const questionPromptTh = o.questionPromptTh;
  const redeemed = o.redeemed;
  const previousScore160 = o.previousScore160;
  // The one-time skill-placement probe shouldn't cost the learner's monthly AI-feedback quota.
  const isPlacement = o.source === "placement";
  const speakingRoundRaw = o.speakingRound;
  const speakingRound =
    typeof speakingRoundRaw === "number" && isSpeakingRound(speakingRoundRaw) ? speakingRoundRaw : 1;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript must be a string" }, { status: 400 });
  }
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) {
    return NextResponse.json(
      { error: "Transcript too short — speak at least ~15 words (check the mic and language)." },
      { status: 400 },
    );
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (typeof topicId !== "string" || typeof questionId !== "string") {
    return NextResponse.json({ error: "topicId and questionId required" }, { status: 400 });
  }
  if (
    typeof topicTitleEn !== "string" ||
    typeof questionPromptEn !== "string"
  ) {
    return NextResponse.json(
      { error: "topicTitleEn and questionPromptEn required" },
      { status: 400 },
    );
  }

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const userId = await getOptionalAuthUserId(req);
    // Admins / preview-eligible accounts don't consume real feedback credits.
    const adminBypass = (await getAdminAccess(req)).ok;
    if (userId && !adminBypass && !isPlacement) {
      const credit = await getAiCreditStateForUser(userId, "read_then_speak");
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "Feedback quota reached" }, { status: 402 });
      }
    }
    const graded = await gradeWithEscalation({
      operation: "speaking_report",
      models: buildModelLadder(model, keys),
      deadlineAt: gradingDeadlineFrom(startedAt, maxDuration),
      runAi: (m, deadlineAt) =>
        generateSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          model: m,
          attemptId,
          topicId,
          topicTitleEn,
          topicTitleTh: typeof topicTitleTh === "string" ? topicTitleTh : "",
          questionId,
          questionPromptEn,
          questionPromptTh: typeof questionPromptTh === "string" ? questionPromptTh : "",
          prepMinutes,
          transcript,
          speakingRound,
          deadlineAt,
        }),
    });
    const { report, usage } = graded;
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speaking_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: {
          attemptId,
          topicId,
          questionId,
          gradeSource: graded.source,
          ...(graded.failures.length ? { recoveredFrom: graded.failures } : {}),
        },
      });
    }
    if (userId && !adminBypass && !isPlacement) {
      const charged = await chargeAiCreditForUser(userId, "read_then_speak");
      if (!charged.ok) {
        return NextResponse.json({ error: "Could not apply feedback credit after grading" }, { status: 500 });
      }
      const rewardBonus = await maybeGrantRedeemImprovementReward({
        userId,
        attemptId,
        surface: "read_then_speak",
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
    await recordDataCollectionSubmission({
      userId,
      examType: "read_then_speak",
      attemptId: typeof attemptId === "string" ? attemptId : null,
      promptTitle: typeof topicTitleEn === "string" ? topicTitleEn : null,
      promptText: typeof questionPromptEn === "string" ? questionPromptEn : null,
      submittedText: transcript,
      wordCount,
      score160: report.score160,
      report,
    });
    return NextResponse.json(report);
  } catch (e) {
    // Every model failed. Never a fabricated score — tell the client this is
    // temporary so it can re-ask while the learner's work is still on screen.
    if (e instanceof AllGradingAttemptsFailedError) {
      console.error("[speaking-report] all models failed:", e.failures.join(" | "));
      return NextResponse.json(
        {
          error:
            "ระบบตรวจกำลังไม่ว่างชั่วคราว งานของคุณยังอยู่ครบ — กดส่งอีกครั้งได้เลย (Grading is briefly busy. Your work is safe — please submit again.)",
          retryable: true,
        },
        { status: 503 },
      );
    }
    const message = normalizeGradingErrorMessage(e);
    console.error("[speaking-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
