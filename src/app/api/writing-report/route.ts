import { NextResponse } from "next/server";
import { chargeAiCreditForUser, getAiCreditStateForUser } from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateWritingReportWithGemini } from "@/lib/gemini-writing";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import type { WritingTopic } from "@/types/writing";

export const maxDuration = 120;

function isTopic(v: unknown): v is WritingTopic {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.titleEn === "string" &&
    typeof o.titleTh === "string" &&
    typeof o.promptEn === "string" &&
    typeof o.promptTh === "string"
  );
}

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
  const essay = o.essay;
  const followUpAnswers = o.followUpAnswers;
  const prepMinutes = o.prepMinutes;
  const topic = o.topic;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof essay !== "string") {
    return NextResponse.json({ error: "essay must be a string" }, { status: 400 });
  }
  if (followUpAnswers !== undefined && !Array.isArray(followUpAnswers)) {
    return NextResponse.json({ error: "followUpAnswers must be an array of strings" }, { status: 400 });
  }
  const followUpAnswerStrings = Array.isArray(followUpAnswers)
    ? followUpAnswers.map((x) => String(x ?? ""))
    : undefined;
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return NextResponse.json(
      { error: "essay must contain at least 50 words" },
      { status: 400 },
    );
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (!isTopic(topic)) {
    return NextResponse.json({ error: "topic object invalid" }, { status: 400 });
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
    const { report, usage } = await generateWritingReportWithGemini({
      apiKey: keys.geminiApiKey,
      anthropicApiKey: keys.anthropicApiKey,
      model,
      attemptId,
      topic,
      essay,
      followUpAnswers: followUpAnswerStrings,
      prepMinutes,
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "writing_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId },
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
    console.error("[writing-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
