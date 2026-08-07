import { NextResponse } from "next/server";
import {
  chargeAiCreditForUser,
  getAiCreditStateForUser,
  maybeGrantRedeemImprovementReward,
} from "@/lib/addon-credits";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
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
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type PhotoSpeakProgressRow = {
  latest_score160: number;
  best_score160: number;
  attempt_count: number;
};

async function getPhotoSpeakProgress(
  userId: string,
  itemId: string,
  taskType: "write_about_photo" | "speak_about_photo",
): Promise<PhotoSpeakProgressRow | null> {
  const svc = createServiceRoleSupabase();
  const { data } = await svc
    .from("photo_speak_progress")
    .select("latest_score160, best_score160, attempt_count")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .eq("task_type", taskType)
    .maybeSingle();
  return data ?? null;
}

async function upsertPhotoSpeakProgress(args: {
  userId: string;
  itemId: string;
  taskType: "write_about_photo" | "speak_about_photo";
  attemptId: string;
  score160: number;
  existing: PhotoSpeakProgressRow | null;
}): Promise<void> {
  try {
    const svc = createServiceRoleSupabase();
    const bestScore160 = Math.max(args.existing?.best_score160 ?? 0, args.score160);
    await svc.from("photo_speak_progress").upsert(
      {
        user_id: args.userId,
        item_id: args.itemId,
        task_type: args.taskType,
        latest_score160: args.score160,
        best_score160: bestScore160,
        latest_attempt_id: args.attemptId,
        attempt_count: (args.existing?.attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,item_id,task_type" },
    );
  } catch (err) {
    // Never let a progress-tracking failure break the grading response the user is waiting on.
    console.error("[photo-speak-report] progress upsert skipped:", err);
  }
}

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
  const itemId = o.itemId;
  const titleEn = o.titleEn;
  const titleTh = o.titleTh;
  const promptEn = o.promptEn;
  const promptTh = o.promptTh;
  const imageUrl = o.imageUrl;
  const keywords = o.keywords;
  const targetVocabulary = o.targetVocabulary;
  // The one-time skill-placement probe shouldn't cost the learner's monthly AI-feedback quota.
  const isPlacement = o.source === "placement";
  const redeemed = o.redeemed;
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
  const targetVocabList = Array.isArray(targetVocabulary)
    ? targetVocabulary.map((k) => String(k).trim()).filter(Boolean)
    : [];

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const userId = await getOptionalAuthUserId(req);
    const taskType: "write_about_photo" | "speak_about_photo" =
      originHub === "speak-about-photo" ? "speak_about_photo" : "write_about_photo";
    // Admins / preview-eligible accounts don't consume real feedback credits.
    const adminBypass = (await getAdminAccess(req)).ok;
    if (userId && !adminBypass && !isPlacement) {
      const credit = await getAiCreditStateForUser(userId, taskType);
      if (!credit.allowed) {
        return NextResponse.json({ error: credit.reason ?? "Feedback quota reached" }, { status: 402 });
      }
    }
    const serverProgress = userId ? await getPhotoSpeakProgress(userId, itemId, taskType) : null;
    const graded = await gradeWithEscalation({
      operation: "photo_speak_report",
      models: buildModelLadder(model, keys),
      deadlineAt: gradingDeadlineFrom(startedAt, maxDuration),
      runAi: (m, deadlineAt) =>
        generatePhotoSpeakReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          model: m,
          attemptId,
          itemId,
          titleEn,
          titleTh: typeof titleTh === "string" ? titleTh : "",
          promptEn,
          promptTh: typeof promptTh === "string" ? promptTh : "",
          imageUrl: imageUrl.trim(),
          taskKeywords,
          targetVocabulary: targetVocabList,
          prepMinutes,
          transcript,
          originHub,
          deadlineAt,
        }),
    });
    const { report, usage } = graded;
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "photo_speak_report",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: {
          attemptId,
          itemId,
          gradeSource: graded.source,
          ...(graded.failures.length ? { recoveredFrom: graded.failures } : {}),
        },
      });
    }
    if (userId && !adminBypass && !isPlacement) {
      const charged = await chargeAiCreditForUser(userId, taskType);
      if (!charged.ok) {
        return NextResponse.json({ error: "Could not apply feedback credit after grading" }, { status: 500 });
      }
      // previousScore160 comes from our own server-tracked progress, not the client body —
      // a client-supplied value here would let a user spoof their "previous" score to farm
      // improvement-reward credits.
      const rewardBonus = await maybeGrantRedeemImprovementReward({
        userId,
        attemptId,
        surface: taskType,
        redeemed: redeemed === true,
        previousScore160: serverProgress?.best_score160 ?? null,
        currentScore160: report.score160,
      });
      if (rewardBonus) {
        report.rewardBonus = rewardBonus;
      }
    }
    await recordDataCollectionSubmission({
      userId,
      examType: taskType,
      attemptId: typeof attemptId === "string" ? attemptId : null,
      promptTitle: typeof titleEn === "string" ? titleEn : null,
      promptText: typeof promptEn === "string" ? promptEn : null,
      submittedText: transcript,
      wordCount,
      score160: report.score160,
      report,
    });
    if (userId) {
      await upsertPhotoSpeakProgress({
        userId,
        itemId,
        taskType,
        attemptId,
        score160: report.score160,
        existing: serverProgress,
      });
    }
    return NextResponse.json(report);
  } catch (e) {
    // Every model failed. Never a fabricated score — tell the client this is
    // temporary so it can re-ask while the learner's work is still on screen.
    if (e instanceof AllGradingAttemptsFailedError) {
      console.error("[photo-speak-report] all models failed:", e.failures.join(" | "));
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
    console.error("[photo-speak-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
