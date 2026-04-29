import { NextResponse } from "next/server";
import {
  chargeAiCreditForUser,
  getAiCreditStateForUser,
  maybeGrantRedeemImprovementReward,
} from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
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
  const transcript = o.transcript;
  const prepMinutes = o.prepMinutes;
  const itemId = o.itemId;
  const titleEn = o.titleEn;
  const titleTh = o.titleTh;
  const promptEn = o.promptEn;
  const promptTh = o.promptTh;
  const imageUrl = o.imageUrl;
  const keywords = o.keywords;
  const redeemed = o.redeemed;
  const previousScore160 = o.previousScore160;
  const originHubRaw = o.originHub;
  const originHub =
    originHubRaw === "write-about-photo"
      ? ("write-about-photo" as const)
      : originHubRaw === "speak-about-photo"
        ? ("speak-about-photo" as const)
        : undefined;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript must be a string" }, { status: 400 });
  }
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) {
    return NextResponse.json(
      { error: "Transcript too short — speak at least ~15 words." },
      { status: 400 },
    );
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (typeof itemId !== "string" || typeof titleEn !== "string" || typeof promptEn !== "string") {
    return NextResponse.json(
      { error: "itemId, titleEn, and promptEn required" },
      { status: 400 },
    );
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  const taskKeywords = Array.isArray(keywords)
    ? keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const userId = await getOptionalAuthUserId();
    if (userId) {
      const feedbackSurface =
        originHub === "speak-about-photo" ? "speak_about_photo" : "write_about_photo";
      const credit = await getAiCreditStateForUser(userId, feedbackSurface);
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "AI feedback quota reached" }, { status: 402 });
      }
    }
    const { report, usage } = await generatePhotoSpeakReportWithGemini({
      apiKey: keys.geminiApiKey,
      anthropicApiKey: keys.anthropicApiKey,
      model,
      attemptId,
      itemId,
      titleEn,
      titleTh: typeof titleTh === "string" ? titleTh : "",
      promptEn,
      promptTh: typeof promptTh === "string" ? promptTh : "",
      imageUrl: imageUrl.trim(),
      taskKeywords,
      prepMinutes,
      transcript,
      originHub,
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "photo_speak_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { attemptId, itemId },
      });
    }
    if (userId) {
      const feedbackSurface =
        originHub === "speak-about-photo" ? "speak_about_photo" : "write_about_photo";
      const charged = await chargeAiCreditForUser(userId, feedbackSurface);
      if (!charged.ok) {
        return NextResponse.json({ error: "Could not apply AI credit after grading" }, { status: 500 });
      }
      const rewardBonus = await maybeGrantRedeemImprovementReward({
        userId,
        attemptId,
        surface: feedbackSurface,
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
    const message = normalizeGradingErrorMessage(e);
    console.error("[photo-speak-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
