import { NextResponse } from "next/server";

import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { generateSpeakingReportWithGemini } from "@/lib/gemini-speaking";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { gradeFitbBlank, normalizeFitbCompare } from "@/lib/fitb-scoring";
import { getAdminAccess } from "@/lib/admin-auth";
import { miniDiagnosisLevelLabel, scoreMiniDiagnosisBuckets } from "@/lib/mini-diagnosis/score-buckets";
import { MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import type { FitbMissingWord } from "@/types/fitb";

const GRADING_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-4o-mini",
  "claude-haiku-4-5",
] as const;

type SubmitBody = { stepIndex?: number; answer?: unknown };

function normalize160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, Math.round(v)));
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function tokenizeDictation(v: unknown): string[] {
  const s = String(v ?? "").toLowerCase().replace(/[.]/g, " ");
  return s.match(/[a-z0-9]+(?:'[a-z0-9]+)*|[,!?;:()"[\]{}\-]/g) ?? [];
}

function fitbScore(answer: unknown, correct: unknown, content?: Record<string, unknown> | null): number {
  const answerObj = (answer && typeof answer === "object" ? answer : null) as
    | { answer?: unknown; answers?: unknown[] }
    | null;
  const nested = (answerObj?.answer && typeof answerObj.answer === "object"
    ? (answerObj.answer as { answers?: unknown[] })
    : null);
  const typedList = (
    Array.isArray(answerObj?.answers)
      ? answerObj?.answers
      : Array.isArray(nested?.answers)
        ? nested?.answers
        : []
  ).map((x) => String(x ?? "").trim());

  const missingWords = Array.isArray(content?.missingWords)
    ? (content?.missingWords.filter(
        (m): m is FitbMissingWord =>
          !!m &&
          typeof m === "object" &&
          typeof (m as { correctWord?: unknown }).correctWord === "string",
      ) as FitbMissingWord[])
    : [];

  if (missingWords.length > 0 && typedList.length > 0) {
    const scores = missingWords.map((mw, idx): number => {
      const typed = typedList[idx] ?? "";
      const g = gradeFitbBlank(mw, typed);
      return g === "exact" ? 1 : g === "close" ? 0.5 : 0;
    });
    const ratio = scores.reduce<number>((sum, item) => sum + item, 0) / missingWords.length;
    return normalize160(ratio * 160);
  }

  const actual = normalizeText((answer as { answer?: unknown })?.answer ?? answer);
  const expected = normalizeText((correct as { answer?: unknown })?.answer ?? correct);
  if (actual && expected && actual === expected) return 160;

  if (typedList.length > 0 && Array.isArray((correct as { answers?: unknown[] })?.answers)) {
    const expectedList = ((correct as { answers?: unknown[] }).answers ?? []).map((x) =>
      normalizeFitbCompare(String(x ?? "")),
    );
    const matched = typedList.reduce((acc, typed, idx) => {
      return acc + (normalizeFitbCompare(typed) === (expectedList[idx] ?? "") ? 1 : 0);
    }, 0);
    return expectedList.length > 0 ? normalize160((matched / expectedList.length) * 160) : 0;
  }
  return 0;
}

function heuristicScore(taskType: string, answer: unknown, correct: unknown, content?: Record<string, unknown> | null): number {
  if (taskType === "dictation") {
    const actualTokens = tokenizeDictation((answer as { answer?: unknown })?.answer ?? answer);
    const expectedRaw =
      (correct as { answer?: unknown })?.answer ??
      (content as { reference_sentence?: unknown } | null)?.reference_sentence ??
      correct;
    const expectedTokens = tokenizeDictation(expectedRaw);
    if (expectedTokens.length === 0) return 0;
    const matched = expectedTokens.reduce((acc, token, idx) => acc + (actualTokens[idx] === token ? 1 : 0), 0);
    return normalize160((matched / expectedTokens.length) * 160);
  }
  if (taskType === "fill_in_blanks") {
    return fitbScore(answer, correct, content);
  }
  if (taskType === "vocabulary_reading" || taskType === "interactive_listening") {
    const score = Number((answer as { averageScore0To100?: unknown })?.averageScore0To100);
    return Number.isFinite(score) ? normalize160((score / 100) * 160) : 0;
  }
  if (taskType === "real_english_word") {
    const score160 = Number((answer as { score160?: unknown })?.score160);
    return Number.isFinite(score160) ? normalize160(score160) : 0;
  }
  const text = String((answer as { text?: unknown })?.text ?? answer ?? "").trim();
  return text.length >= 20 ? 120 : text.length >= 5 ? 80 : 0;
}

async function runWithFallback<T>(req: Request, runner: (model: string, keys: ReturnType<typeof resolveGradingKeysFromRequest>) => Promise<T>) {
  const preferred = await resolveGeminiTextModel();
  const modelChain = [preferred, ...GRADING_MODEL_FALLBACKS].filter((m, i, arr) => m && arr.indexOf(m) === i);
  const keys = resolveGradingKeysFromRequest(req, preferred);
  let lastError: unknown = null;
  for (const model of modelChain) {
    try {
      return await runner(model, keys);
    } catch (error) {
      lastError = error;
      console.warn("[mini-diagnosis-submit-step] fallback model failed", model, error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All grading fallback models failed.");
}

async function scoreMiniDiagnosisAnswer({
  req,
  taskType,
  answer,
  correct,
  step,
}: {
  req: Request;
  taskType: string;
  answer: unknown;
  correct: unknown;
  step: { step_index: number; content?: Record<string, unknown> | null };
}): Promise<{ score: number; review?: Record<string, unknown> | null }> {
  const content = (step.content ?? {}) as Record<string, unknown>;

  if (
    taskType === "dictation" ||
    taskType === "fill_in_blanks" ||
    taskType === "vocabulary_reading" ||
    taskType === "interactive_listening" ||
    taskType === "real_english_word"
  ) {
    return { score: heuristicScore(taskType, answer, correct, content), review: null };
  }

  const attemptId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `mini-diagnosis-${Date.now()}-${step.step_index}`;

  try {
    if (taskType === "write_about_photo") {
      const transcript = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const imageUrl = String(content.image_url ?? "");
      const result = await runWithFallback(req, (model, keys) =>
        generatePhotoSpeakReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          itemId: `mini-diagnosis-step-${step.step_index}`,
          titleEn: String(content.title_en ?? content.titleEn ?? "Mini diagnosis write about photo"),
          titleTh: String(content.title_th ?? content.titleTh ?? "มินิไดแอกโนซิสเขียนจากภาพ"),
          promptEn: String(content.instruction ?? content.prompt_en ?? "Describe the image."),
          promptTh: String(content.instruction_th ?? content.prompt_th ?? "อธิบายภาพ"),
          imageUrl: imageUrl || "https://example.com/mini-diagnosis-photo.jpg",
          taskKeywords: [],
          prepMinutes: 0,
          transcript,
          originHub: "write-about-photo",
        }),
      );
      return {
        score: normalize160(result.report.score160),
        review: {
          score160: result.report.score160,
          improvementPoints: (result.report.improvementPoints ?? []).slice(0, 5),
          summaryTh: result.report.taskRelevancy?.summary?.th ?? "",
          summaryEn: result.report.taskRelevancy?.summary?.en ?? "",
        },
      };
    }

    if (taskType === "read_then_speak") {
      const transcript = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const result = await runWithFallback(req, (model, keys) =>
        generateSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          topicId: `mini-diagnosis-step-${step.step_index}`,
          topicTitleEn: String(content.title_en ?? content.titleEn ?? "Mini diagnosis read then speak"),
          topicTitleTh: String(content.title_th ?? content.titleTh ?? "มินิไดแอกโนซิสอ่านแล้วพูด"),
          questionId: `mini-diagnosis-step-${step.step_index}-q`,
          questionPromptEn: String(content.prompt_en ?? content.instruction ?? "Respond naturally."),
          questionPromptTh: String(content.prompt_th ?? content.instruction_th ?? "ตอบอย่างเป็นธรรมชาติ"),
          prepMinutes: 0,
          transcript,
          punctuateBeforeScoring: true,
          spokenFillerLenient: true,
        }),
      );
      return {
        score: normalize160(result.report.score160),
        review: {
          score160: result.report.score160,
          punctuatedTranscript: result.report.punctuatedTranscript ?? transcript,
          improvementPoints: (result.report.improvementPoints ?? []).slice(0, 5),
          summaryTh: result.report.taskRelevancy?.summary?.th ?? "",
          summaryEn: result.report.taskRelevancy?.summary?.en ?? "",
        },
      };
    }
  } catch (error) {
    console.error("[mini-diagnosis-submit-step] AI grading fallback to heuristic", error);
  }

  return { score: heuristicScore(taskType, answer, correct, content), review: null };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as SubmitBody;
  if (!body.stepIndex || body.stepIndex < 1 || body.stepIndex > MINI_DIAGNOSIS_STEP_COUNT) {
    return NextResponse.json({ error: "Invalid stepIndex" }, { status: 400 });
  }

  const access = await getAdminAccess();
  const isSimpleAdmin = access.ok && access.simple === true;

  const supabase = isSimpleAdmin ? createServiceRoleSupabase() : await createRouteHandlerSupabase();
  let userId: string | null = null;
  if (!isSimpleAdmin) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;
  }

  const sessionQuery = supabase
    .from("mini_diagnosis_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets")
    .eq("id", id);
  const { data: session, error: sessionError } = isSimpleAdmin
    ? await sessionQuery.single()
    : await sessionQuery.eq("user_id", userId!).single();
  if (sessionError || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const prev = Array.isArray(session.responses) ? session.responses : [];
  const alreadySubmitted = prev.find((row: any) => row.step_index === body.stepIndex);
  const alreadyComplete = session.status === "completed" || prev.length >= MINI_DIAGNOSIS_STEP_COUNT;

  if (alreadySubmitted && body.stepIndex < session.current_step) {
    return NextResponse.json({
      ok: true,
      complete: alreadyComplete,
      stepScore: Number(alreadySubmitted.score ?? 0),
      stepIndex: body.stepIndex,
      taskType: String(alreadySubmitted.task_type ?? ""),
      alreadyProcessed: true,
    });
  }

  if (session.status !== "in_progress") {
    if (alreadySubmitted) {
      return NextResponse.json({
        ok: true,
        complete: true,
        stepScore: Number(alreadySubmitted.score ?? 0),
        stepIndex: body.stepIndex,
        taskType: String(alreadySubmitted.task_type ?? ""),
        alreadyProcessed: true,
      });
    }
    return NextResponse.json({ error: "Session already closed" }, { status: 400 });
  }
  if (session.current_step !== body.stepIndex) {
    return NextResponse.json({ error: `Invalid step order. Expected step ${session.current_step}` }, { status: 409 });
  }

  const { data: setItems, error: setItemsError } = await supabase
    .from("mini_diagnosis_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", session.set_id)
    .order("step_index", { ascending: true });
  if (setItemsError || !setItems) {
    return NextResponse.json({ error: "Set items not found" }, { status: 404 });
  }

  const step = setItems.find((item: any) => item.step_index === body.stepIndex);
  if (!step) return NextResponse.json({ error: "Step not found in set" }, { status: 400 });

  if (prev.some((row: any) => row.step_index === body.stepIndex)) {
    const submittedRow = prev.find((row: any) => row.step_index === body.stepIndex);
    return NextResponse.json({
      ok: true,
      complete: alreadyComplete,
      stepScore: Number(submittedRow?.score ?? 0),
      stepIndex: body.stepIndex,
      taskType: String(submittedRow?.task_type ?? step.task_type),
      alreadyProcessed: true,
    });
  }

  const scored = await scoreMiniDiagnosisAnswer({
    req,
    taskType: step.task_type,
    answer: body.answer,
    correct: step.correct_answer,
    step,
  });
  const next = [
    ...prev,
    {
      step_index: body.stepIndex,
      task_type: step.task_type,
      answer: body.answer,
      score: scored.score,
      review: scored.review ?? null,
    },
  ];
  const isComplete = next.length >= MINI_DIAGNOSIS_STEP_COUNT;
  const patch: Record<string, unknown> = {
    responses: next,
    current_step: Math.min(MINI_DIAGNOSIS_STEP_COUNT, body.stepIndex + 1),
  };
  if (isComplete) {
    patch.status = "completed";
    patch.completed_at = new Date().toISOString();
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("mini_diagnosis_sessions")
    .update(patch)
    .eq("id", id)
    .eq("status", "in_progress")
    .eq("current_step", body.stepIndex)
    .select("id")
    .maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!updatedSession) {
    return NextResponse.json({ error: "Session changed during submit. Please reload." }, { status: 409 });
  }

  if (isComplete) {
    const scores = scoreMiniDiagnosisBuckets(next);
    const skillEntries = [
      { key: "reading", score: scores.reading },
      { key: "listening", score: scores.listening },
      { key: "speaking", score: scores.speaking },
      { key: "writing", score: scores.writing },
    ].sort((a, b) => b.score - a.score);
    const strengths = skillEntries.slice(0, 2);
    const weaknesses = skillEntries.slice(-2).reverse();
    const levelLabel = miniDiagnosisLevelLabel(scores.total);

    const { error: resultErr } = await supabase.from("mini_diagnosis_results").upsert({
      session_id: session.id,
      user_id: isSimpleAdmin ? String(session.user_id) : String(userId),
      set_id: session.set_id,
      actual_total: scores.total,
      actual_listening: scores.listening,
      actual_speaking: scores.speaking,
      actual_reading: scores.reading,
      actual_writing: scores.writing,
      level_label: levelLabel,
      strengths,
      weaknesses,
      report_payload: {
        responses: next,
        scoreBreakdown: scores.breakdown,
      },
    });
    if (resultErr) {
      return NextResponse.json({ error: `Result creation failed: ${resultErr.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    complete: isComplete,
    stepScore: scored.score,
    stepIndex: body.stepIndex,
    taskType: step.task_type,
  });
}
