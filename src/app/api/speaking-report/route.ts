import { NextResponse } from "next/server";
import { chargeAiCreditForUser, getAiCreditStateForUser } from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateSpeakingReportWithGemini } from "@/lib/gemini-speaking";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { isSpeakingRound } from "@/lib/speaking-constants";

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
  const transcript = o.transcript;
  const prepMinutes = o.prepMinutes;
  const topicId = o.topicId;
  const questionId = o.questionId;
  const topicTitleEn = o.topicTitleEn;
  const topicTitleTh = o.topicTitleTh;
  const questionPromptEn = o.questionPromptEn;
  const questionPromptTh = o.questionPromptTh;
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
    const userId = await getOptionalAuthUserId();
    if (userId) {
      const credit = await getAiCreditStateForUser(userId);
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "AI feedback quota reached" }, { status: 402 });
      }
    }
    const { report, usage } = await generateSpeakingReportWithGemini({
      apiKey: keys.geminiApiKey,
      anthropicApiKey: keys.anthropicApiKey,
      model,
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
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speaking_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId, topicId, questionId },
      });
    }
    if (userId) {
      const charged = await chargeAiCreditForUser(userId);
      if (!charged.ok) {
        return NextResponse.json({ error: "Could not apply AI credit after grading" }, { status: 500 });
      }
    }
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[speaking-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
