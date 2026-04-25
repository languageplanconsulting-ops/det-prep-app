import { NextResponse } from "next/server";

import { generateDialogueSummaryReportWithGemini } from "@/lib/gemini-dialogue-summary";
import { generateInteractiveSpeakingReportWithGemini } from "@/lib/gemini-interactive-speaking-report";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
import { generateSpeakingReportWithGemini } from "@/lib/gemini-speaking";
import { generateWritingReportWithGemini } from "@/lib/gemini-writing";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { INTERACTIVE_SPEAKING_TURN_COUNT } from "@/lib/interactive-speaking-constants";
import { scoreBuckets } from "@/lib/mock-test/fixed-mock-score-buckets";
import { gradeFitbBlank, normalizeFitbCompare } from "@/lib/fitb-scoring";
import { getAdminAccess } from "@/lib/admin-auth";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import type { DialogueSummaryExam } from "@/types/dialogue-summary";
import type { FitbMissingWord } from "@/types/fitb";
import type { WritingTopic } from "@/types/writing";

const MOCK_GRADING_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-4o-mini",
  "claude-haiku-4-5",
] as const;

type SubmitBody = { stepIndex?: number; answer?: unknown };

function isAdminSkippedAnswer(answer: unknown): boolean {
  return (
    !!answer &&
    typeof answer === "object" &&
    (answer as { skippedByAdmin?: unknown }).skippedByAdmin === true
  );
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeDictationText(v: unknown): string {
  return String(v ?? "")
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9,\s]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, v));
}

function tokenizeDictationForScoring(v: unknown): string[] {
  const s = normalizeDictationText(v);
  const tokens = s.match(/[a-z0-9]+|,/g);
  return tokens ?? [];
}

function fitbHeuristicScore160(answer: unknown, correct: unknown, content?: Record<string, unknown> | null): number {
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
  )
    .map((x) => String(x ?? "").trim());

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
    const ratio = scores.reduce<number>((a, b) => a + b, 0) / missingWords.length;
    return normalize160(ratio * 160);
  }

  const actual = normalizeText((answer as { answer?: unknown })?.answer ?? answer);
  const expected = normalizeText((correct as { answer?: unknown })?.answer ?? correct);
  if (actual && expected && actual === expected) return 160;

  if (typedList.length > 0 && Array.isArray((correct as { answers?: unknown[] })?.answers)) {
    const expectedList = ((correct as { answers?: unknown[] }).answers ?? []).map((x) =>
      normalizeFitbCompare(String(x ?? "")),
    );
    const matched = typedList.reduce((acc, t, i) => {
      return acc + (normalizeFitbCompare(t) === (expectedList[i] ?? "") ? 1 : 0);
    }, 0);
    return expectedList.length > 0 ? normalize160((matched / expectedList.length) * 160) : 0;
  }
  return 0;
}

function fallbackHeuristicScore160(taskType: string, answer: unknown, correct: unknown, content?: Record<string, unknown> | null): number {
  if (isAdminSkippedAnswer(answer)) return 0;

  if (taskType === "fill_in_blanks" || taskType === "dictation") {
    if (taskType === "fill_in_blanks") {
      return fitbHeuristicScore160(answer, correct, content);
    }
    const actualRaw = (answer as { answer?: unknown })?.answer ?? answer;
    const expectedRaw =
      (correct as { answer?: unknown })?.answer ??
      (content as { reference_sentence?: unknown } | null)?.reference_sentence ??
      correct;
    const normalizedActual = normalizeDictationText(actualRaw);
    const normalizedExpected = normalizeDictationText(expectedRaw);
    if (normalizedActual && normalizedExpected && normalizedActual === normalizedExpected) {
      return 160;
    }
    const actualTokens = tokenizeDictationForScoring(actualRaw);
    const expectedTokens = tokenizeDictationForScoring(expectedRaw);
    if (expectedTokens.length === 0) return 0;
    const matched = expectedTokens.reduce((acc, token, idx) => {
      return acc + (actualTokens[idx] === token ? 1 : 0);
    }, 0);
    return normalize160((matched / expectedTokens.length) * 160);
  }
  if (taskType === "vocabulary_reading") {
    const score = Number((answer as { averageScore0To100?: unknown })?.averageScore0To100);
    return Number.isFinite(score) ? normalize160((score / 100) * 160) : 0;
  }
  if (taskType === "real_english_word") {
    const correctRealWords = Number(
      (answer as { correctCount?: unknown; correctRealWords?: unknown; correct_real_words?: unknown })?.correctCount ??
      (answer as { correctRealWords?: unknown })?.correctRealWords ??
      (answer as { correct_real_words?: unknown })?.correct_real_words,
    );
    if (Number.isFinite(correctRealWords)) {
      return normalize160(correctRealWords * 5);
    }
    const score160 = Number((answer as { score160?: unknown })?.score160);
    if (Number.isFinite(score160)) {
      return normalize160(score160);
    }
  }
  if (taskType === "interactive_conversation_mcq") {
    const score = Number((answer as { averageScore0To100?: unknown })?.averageScore0To100);
    return Number.isFinite(score) ? normalize160((score / 100) * 160) : 0;
  }
  if (taskType === "interactive_speaking") {
    const turns = extractInteractiveSpeakingTranscripts(answer);
    if (turns.length > 0) {
      const chars = turns.join(" ").trim().length;
      return chars >= 180 ? 136 : chars >= 80 ? 112 : chars >= 20 ? 88 : 56;
    }
  }
  const text = normalizeText((answer as { text?: unknown })?.text ?? answer);
  return text.length >= 20 ? 128 : text.length >= 5 ? 96 : 0;
}

async function scoreAnswerWithNormalCriteria({
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
}): Promise<number> {
  if (isAdminSkippedAnswer(answer)) {
    // Preview skips should behave like a learner leaving the task blank.
    return 0;
  }

  const content = (step.content ?? {}) as Record<string, unknown>;

  // Objective tasks are intentionally local/rule-based.
  if (
    taskType === "fill_in_blanks" ||
    taskType === "dictation" ||
    taskType === "vocabulary_reading" ||
    taskType === "real_english_word" ||
    taskType === "interactive_conversation_mcq"
  ) {
    return fallbackHeuristicScore160(taskType, answer, correct, content);
  }

  try {
    const preferred = await resolveGeminiTextModel();
    const modelChain = [preferred, ...MOCK_GRADING_MODEL_FALLBACKS].filter(
      (m, i, arr) => m && arr.indexOf(m) === i,
    );
    const keys = resolveGradingKeysFromRequest(req, preferred);
    const attemptId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `mock-${Date.now()}-${step.step_index}`;

    const runWithFallback = async <T>(runner: (model: string) => Promise<T>): Promise<T> => {
      let lastError: unknown = null;
      for (const model of modelChain) {
        try {
          return await runner(model);
        } catch (err) {
          lastError = err;
          console.warn("[mock-fixed-submit-step] grading fallback model failed", model, err);
        }
      }
      throw lastError instanceof Error ? lastError : new Error("All grading fallback models failed.");
    };

    if (taskType === "read_and_write") {
      const topic: WritingTopic = {
        id: `mock-fixed-step-${step.step_index}`,
        titleEn: String(content.title_en ?? content.titleEn ?? "Mock read and write"),
        titleTh: String(content.title_th ?? content.titleTh ?? "ม็อกอ่านแล้วเขียน"),
        promptEn: String(content.prompt ?? content.instruction ?? "Read then write based on the task."),
        promptTh: String(content.prompt_th ?? content.instruction_th ?? "อ่านแล้วเขียนตามโจทย์"),
      };
      const essay = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const { report } = await runWithFallback((model) =>
        generateWritingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          topic,
          essay,
          prepMinutes: 0,
        }),
      );
      return normalize160(report.score160);
    }

    if (taskType === "write_about_photo" || taskType === "speak_about_photo") {
      const transcript = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const imageUrl = String(content.image_url ?? "");
      const allPhotoCategories = ["people", "place", "landscape", "animal", "nature"];
      const keywordSet = new Set<string>(
        Array.isArray(content.keywords)
          ? content.keywords.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
          : [],
      );
      for (const c of allPhotoCategories) keywordSet.add(c);
      const { report } = await runWithFallback((model) =>
        generatePhotoSpeakReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          itemId: `mock-fixed-step-${step.step_index}`,
          titleEn: String(content.title_en ?? content.titleEn ?? `${taskType} mock item`),
          titleTh: String(content.title_th ?? content.titleTh ?? "ข้อสอบม็อก"),
          promptEn: String(content.prompt_en ?? content.instruction ?? "Respond based on the photo."),
          promptTh: String(content.prompt_th ?? content.instruction_th ?? "ตอบจากภาพ"),
          imageUrl: imageUrl || "https://example.com/mock-photo.jpg",
          taskKeywords: [...keywordSet],
          prepMinutes: 0,
          transcript,
          originHub: taskType === "write_about_photo" ? "write-about-photo" : "speak-about-photo",
        }),
      );
      return normalize160(report.score160);
    }

    if (taskType === "read_then_speak") {
      const transcript = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const { report } = await runWithFallback((model) =>
        generateSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          topicId: `mock-fixed-step-${step.step_index}`,
          topicTitleEn: String(content.title_en ?? content.titleEn ?? "Mock read then speak"),
          topicTitleTh: String(content.title_th ?? content.titleTh ?? "ม็อกอ่านแล้วพูด"),
          questionId: `mock-fixed-step-${step.step_index}-q`,
          questionPromptEn: String(content.prompt_en ?? content.instruction ?? "Respond to the prompt."),
          questionPromptTh: String(content.prompt_th ?? content.instruction_th ?? "ตอบตามโจทย์"),
          prepMinutes: 0,
          transcript,
          punctuateBeforeScoring: true,
          spokenFillerLenient: true,
        }),
      );
      return normalize160(report.score160);
    }

    if (taskType === "conversation_summary") {
      const summary = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const turns = Array.isArray(content.turns) ? content.turns : [];
      const exam: DialogueSummaryExam = {
        id: `mock-fixed-step-${step.step_index}`,
        round: 1,
        difficulty: "medium",
        setNumber: 1,
        titleEn: String(content.title_en ?? content.titleEn ?? "Mock conversation summary"),
        titleTh: String(content.title_th ?? content.titleTh ?? "ม็อกสรุปบทสนทนา"),
        scenarioSentences: [
          "You listened to a short conversation and need to summarize it clearly.",
          "Focus on the key idea, important detail, and final recommendation.",
          "Keep the summary concise and relevant.",
          "Use clear sentence structure and transitions.",
          "Avoid adding details not mentioned in the conversation.",
        ],
        dialogue: turns.slice(0, 12).flatMap((row) => {
          const o = row as Record<string, unknown>;
          return [
            { speaker: "Examiner", text: String(o.question_en ?? "") },
            { speaker: "Candidate", text: String(o.reference_answer_en ?? "") },
          ];
        }),
      };
      const { report } = await runWithFallback((model) =>
        generateDialogueSummaryReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          exam,
          summary,
          submittedAt: new Date().toISOString(),
          wordCount: summary.trim().split(/\s+/).filter(Boolean).length,
        }),
      );
      return normalize160(report.score160);
    }

    if (taskType === "interactive_speaking") {
      const userTurnsRaw = (answer as { user_turn_answers?: unknown[] })?.user_turn_answers;
      const contentTurns = Array.isArray(content.turns) ? content.turns : [];
      const transcripts = extractInteractiveSpeakingTranscripts(answer);
      if (transcripts.length >= INTERACTIVE_SPEAKING_TURN_COUNT) {
        const turns = transcripts
          .slice(0, INTERACTIVE_SPEAKING_TURN_COUNT)
          .map((a, idx) => {
            const t = (contentTurns[idx] ?? {}) as Record<string, unknown>;
            return {
              turnIndex: idx + 1,
              questionEn: String(t.question_en ?? `Turn ${idx + 1}`),
              questionTh: String(t.question_th ?? ""),
              transcript: String(a ?? ""),
            };
          });
        const { report } = await runWithFallback((model) =>
          generateInteractiveSpeakingReportWithGemini({
            apiKey: keys.geminiApiKey,
            anthropicApiKey: keys.anthropicApiKey,
            openAiApiKey: keys.openAiApiKey,
            model,
            attemptId,
            scenarioId: `mock-fixed-step-${step.step_index}`,
            scenarioTitleEn: String(content.scenario_title_en ?? "Mock interactive speaking"),
            scenarioTitleTh: String(content.scenario_title_th ?? "ม็อกอินเทอร์แอคทีฟสปีคกิ้ง"),
            prepMinutes: 0,
            turns,
          }),
        );
        const score160 = normalize160(report.score160);
        if (score160 <= 0) {
          // Guardrail: if model returns an unusable 0 despite non-empty turns,
          // fall back to deterministic heuristic from transcript length.
          return fallbackHeuristicScore160(taskType, answer, correct, content);
        }
        return score160;
      }

      const transcript = String((answer as { text?: unknown })?.text ?? answer ?? "");
      const { report } = await runWithFallback((model) =>
        generateSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          openAiApiKey: keys.openAiApiKey,
          model,
          attemptId,
          topicId: `mock-fixed-step-${step.step_index}`,
          topicTitleEn: String(content.scenario_title_en ?? "Mock interactive speaking"),
          topicTitleTh: String(content.scenario_title_th ?? "ม็อกอินเทอร์แอคทีฟสปีคกิ้ง"),
          questionId: `mock-fixed-step-${step.step_index}-q`,
          questionPromptEn: String(content.prompt_en ?? content.instruction ?? "Respond to the prompt."),
          questionPromptTh: String(content.prompt_th ?? content.instruction_th ?? "ตอบตามโจทย์"),
          prepMinutes: 0,
          transcript,
        }),
      );
      const score160 = normalize160(report.score160);
      if (score160 <= 0 && (transcripts.length > 0 || transcript.trim().length > 0)) {
        return fallbackHeuristicScore160(taskType, answer, correct, content);
      }
      return score160;
    }
  } catch (error) {
    console.error("[mock-fixed-submit-step] AI grading failed; fallback heuristic", error);
  }

  return fallbackHeuristicScore160(taskType, answer, correct, content);
}

function extractInteractiveSpeakingTranscripts(answer: unknown): string[] {
  const fromUserTurns = Array.isArray((answer as { user_turn_answers?: unknown[] })?.user_turn_answers)
    ? ((answer as { user_turn_answers?: unknown[] }).user_turn_answers ?? [])
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    : [];
  if (fromUserTurns.length > 0) return fromUserTurns;

  const fromTurns = Array.isArray((answer as { turns?: unknown[] })?.turns)
    ? ((answer as { turns?: unknown[] }).turns ?? [])
        .map((row) => {
          const o = row as Record<string, unknown>;
          return String(o.transcript ?? o.answerTranscript ?? "").trim();
        })
        .filter(Boolean)
    : [];
  return fromTurns;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as SubmitBody;
  if (!body.stepIndex || body.stepIndex < 1 || body.stepIndex > 20) {
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
    .from("mock_fixed_sessions")
    .select("id,user_id,set_id,status,current_step,responses,targets")
    .eq("id", id);

  const { data: session, error: sessionError } = isSimpleAdmin
    ? await sessionQuery.single()
    : await sessionQuery.eq("user_id", userId!).single();
  if (sessionError || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "in_progress") return NextResponse.json({ error: "Session already closed" }, { status: 400 });
  if (session.current_step !== body.stepIndex) {
    return NextResponse.json(
      { error: `Invalid step order. Expected step ${session.current_step}` },
      { status: 409 },
    );
  }
  const userIdForResults = isSimpleAdmin ? String((session as { user_id: string }).user_id) : String(userId);

  const { data: setItems, error: setItemsError } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,time_limit_sec,rest_after_step_sec,content,correct_answer,is_ai_graded")
    .eq("set_id", (session as { set_id: string }).set_id)
    .order("step_index", { ascending: true });
  if (setItemsError || !setItems) {
    return NextResponse.json({ error: "Set items not found" }, { status: 404 });
  }

  const step = setItems.find((x: any) => x.step_index === body.stepIndex);
  if (!step) return NextResponse.json({ error: "Step not found in set" }, { status: 400 });

  const prev = Array.isArray(session.responses) ? session.responses : [];
  if (prev.some((r: any) => r.step_index === body.stepIndex)) {
    return NextResponse.json({ error: "Step already submitted" }, { status: 400 });
  }
  const sessionTargets = (session.targets ?? {}) as Record<string, unknown>;
  const singleStepPreview = sessionTargets.singleStepPreview === true;
  const singleStepIndex = Number(sessionTargets.singleStepIndex ?? 0);
  const score = await scoreAnswerWithNormalCriteria({
    req,
    taskType: step.task_type,
    answer: body.answer,
    correct: step.correct_answer,
    step,
  });
  const next = [...prev, { step_index: body.stepIndex, task_type: step.task_type, answer: body.answer, score }];
  const isComplete = singleStepPreview
    ? body.stepIndex === singleStepIndex && next.length >= 1
    : next.length >= 20;
  const patch: Record<string, unknown> = {
    responses: next,
    current_step: singleStepPreview
      ? body.stepIndex
      : Math.min(20, body.stepIndex + 1),
  };
  if (isComplete && !singleStepPreview) {
    patch.status = "completed";
    patch.completed_at = new Date().toISOString();
  }
  const { data: updatedSession, error: updateError } = await supabase
    .from("mock_fixed_sessions")
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
    const scores = scoreBuckets(next);
    const targets = (session.targets ?? {}) as Record<string, number>;
    const targetRounded = {
      total: Math.round(Number(targets.total ?? 0)),
      listening: Math.round(Number(targets.listening ?? 0)),
      speaking: Math.round(Number(targets.speaking ?? 0)),
      reading: Math.round(Number(targets.reading ?? 0)),
      writing: Math.round(Number(targets.writing ?? 0)),
    };
    const deltas = {
      total: scores.total - targetRounded.total,
      listening: scores.listening - targetRounded.listening,
      speaking: scores.speaking - targetRounded.speaking,
      reading: scores.reading - targetRounded.reading,
      writing: scores.writing - targetRounded.writing,
    };
    const { error: resultErr } = await supabase.from("mock_fixed_results").upsert({
      session_id: session.id,
      user_id: userIdForResults,
      set_id: session.set_id,
      target_total: targetRounded.total,
      target_listening: targetRounded.listening,
      target_speaking: targetRounded.speaking,
      target_reading: targetRounded.reading,
      target_writing: targetRounded.writing,
      actual_total: scores.total,
      actual_listening: scores.listening,
      actual_speaking: scores.speaking,
      actual_reading: scores.reading,
      actual_writing: scores.writing,
      deltas,
      report_payload: { responses: next },
    });
    if (resultErr) {
      return NextResponse.json({ error: `Result creation failed: ${resultErr.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    complete: isComplete,
    singleStepPreview,
    stepScore: score,
    stepIndex: body.stepIndex,
    taskType: step.task_type,
  });
}
