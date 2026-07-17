import "server-only";

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
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import type { DialogueSummaryExam } from "@/types/dialogue-summary";
import type { FitbMissingWord } from "@/types/fitb";
import type { WritingTopic } from "@/types/writing";

/**
 * Shared grading engine for the fixed 20-step mock.
 *
 * Objective tasks score locally and synchronously. AI-graded tasks (photo
 * write/speak, read&write, read-then-speak, conversation summary, interactive
 * speaking) are scored by an LLM — those now run in the BACKGROUND after
 * submit-step commits the answer, so the learner advances instantly. The final
 * results row (and therefore the report) is only ever created once every step
 * holds a real score — `finalizeMockFixedResultIfReady` refuses to finalize
 * while any entry is still `ai_pending`, and `gradePendingStepsAndFinalize` is
 * the safety net that re-grades stragglers inline.
 */

const MOCK_GRADING_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-4o-mini",
  "claude-haiku-4-5",
] as const;

/** Tasks scored locally/rule-based — synchronous and instant. Everything else
 *  goes through the LLM grader and is eligible for background grading. */
const OBJECTIVE_TASK_TYPES = new Set([
  "fill_in_blanks",
  "dictation",
  "vocabulary_reading",
  "real_english_word",
  "interactive_conversation_mcq",
]);

export function isAiGradedTask(taskType: string): boolean {
  return !OBJECTIVE_TASK_TYPES.has(taskType);
}

export type MockFixedResponseEntry = {
  step_index: number;
  task_type: string;
  answer: unknown;
  score: number | null;
  /** True while the LLM grade for this step hasn't landed yet. */
  ai_pending?: boolean;
};

export type MockFixedStepItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: unknown;
};

export function isAdminSkippedAnswer(answer: unknown): boolean {
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
    if (!Number.isFinite(score)) {
      // Should be unreachable now that QuestionRouter always forces aggregate
      // mode for the fixed mock — log loudly instead of silently scoring 0,
      // since this is 55% of the Reading skill bucket.
      console.error(
        "[mock-fixed-submit-step] vocabulary_reading answer missing averageScore0To100 (non-aggregate/malformed payload) — scoring 0",
        JSON.stringify(answer),
      );
      return 0;
    }
    return normalize160((score / 100) * 160);
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

export async function scoreAnswerWithNormalCriteria({
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
      // The AI follow-up questions are generated at runtime, so the actual
      // question text arrives in the answer payload (turns[].questionEn), not in
      // the static set content. Prefer those so grading sees the real Q&A pairs.
      const answerTurns = Array.isArray((answer as { turns?: unknown[] })?.turns)
        ? ((answer as { turns?: unknown[] }).turns as Record<string, unknown>[])
        : [];
      const transcripts = extractInteractiveSpeakingTranscripts(answer);
      if (transcripts.length >= INTERACTIVE_SPEAKING_TURN_COUNT) {
        const turns = transcripts
          .slice(0, INTERACTIVE_SPEAKING_TURN_COUNT)
          .map((a, idx) => {
            const t = (contentTurns[idx] ?? {}) as Record<string, unknown>;
            const at = (answerTurns[idx] ?? {}) as Record<string, unknown>;
            return {
              turnIndex: idx + 1,
              questionEn: String(at.questionEn ?? at.question_en ?? t.question_en ?? `Turn ${idx + 1}`),
              questionTh: String(at.questionTh ?? at.question_th ?? t.question_th ?? ""),
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

// ---------------------------------------------------------------------------
// Background grading + finalization
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Grading key headers must be captured BEFORE the response is sent (a request's
 * headers aren't reliably readable inside `after()`), so we snapshot the three
 * optional override headers into a synthetic Request the grading engine can use.
 * Env keys take precedence inside resolveGradingKeysFromRequest anyway.
 */
export function captureGradingRequest(req: Request): Request {
  const headers = new Headers();
  for (const name of ["x-gemini-api-key", "x-anthropic-api-key", "x-openai-api-key"]) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  return new Request("https://grading.internal.local", { headers });
}

export function allStepsScored(responses: MockFixedResponseEntry[]): boolean {
  return responses.every((r) => typeof r.score === "number" && r.ai_pending !== true);
}

/**
 * Write a background-graded score into the session's `responses` entry.
 *
 * `responses` is a JSON array shared with submit-step's append, so a blind
 * read-modify-write could clobber a concurrent submit (losing an answer — far
 * worse than losing a score). The update is therefore guarded on the
 * (current_step, status) pair as read: any interleaved submit changes one of
 * them and voids the write. Two background graders can still race each other
 * (neither moves the step pointer), so after every write we re-read and verify
 * our own score survived, retrying with jitter until it does. Anything that
 * still slips through stays `ai_pending` and is re-graded by the finalizer.
 */
export async function writeStepScoreWithRetry(
  sessionId: string,
  stepIndex: number,
  score: number,
): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data: row, error } = await supabase
      .from("mock_fixed_sessions")
      .select("responses,current_step,status")
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !row) return false;
    const responses = (Array.isArray(row.responses) ? row.responses : []) as MockFixedResponseEntry[];
    const entry = responses.find((r) => r.step_index === stepIndex);
    if (!entry) return false;
    if (typeof entry.score === "number" && entry.ai_pending !== true) return true;

    const next = responses.map((r) =>
      r.step_index === stepIndex ? { ...r, score, ai_pending: false } : r,
    );
    await supabase
      .from("mock_fixed_sessions")
      .update({ responses: next })
      .eq("id", sessionId)
      .eq("current_step", row.current_step)
      .eq("status", row.status);

    const { data: check } = await supabase
      .from("mock_fixed_sessions")
      .select("responses")
      .eq("id", sessionId)
      .maybeSingle();
    const checked = ((Array.isArray(check?.responses) ? check?.responses : []) as MockFixedResponseEntry[]).find(
      (r) => r.step_index === stepIndex,
    );
    if (checked && typeof checked.score === "number" && checked.ai_pending !== true) return true;
    await sleep(200 + attempt * 200 + Math.random() * 300);
  }
  console.error("[mock-fixed-grading] score write did not stick", sessionId, stepIndex);
  return false;
}

/**
 * Grade one step in the background (called via `after()` from submit-step),
 * then attempt finalization in case this was the last outstanding grade.
 * Never throws — scoreAnswerWithNormalCriteria already falls back to a
 * heuristic score internally, and any storage failure is left for the
 * finalizer safety net.
 */
export async function gradeStepInBackground(params: {
  gradingReq: Request;
  sessionId: string;
  step: MockFixedStepItem;
  answer: unknown;
}): Promise<void> {
  try {
    const score = await scoreAnswerWithNormalCriteria({
      req: params.gradingReq,
      taskType: params.step.task_type,
      answer: params.answer,
      correct: params.step.correct_answer,
      step: params.step,
    });
    await writeStepScoreWithRetry(params.sessionId, params.step.step_index, score);
    await finalizeMockFixedResultIfReady(params.sessionId);
  } catch (e) {
    console.error("[mock-fixed-grading] background grade failed", params.sessionId, params.step.step_index, e);
  }
}

/**
 * Create the mock_fixed_results row for a COMPLETED session — but only when
 * every response holds a real score. This is the single gate that guarantees
 * the report is always computed from fully-graded answers. Idempotent and
 * race-safe: session_id is unique, so concurrent callers collapse to one row.
 */
export async function finalizeMockFixedResultIfReady(sessionId: string): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  const { data: session, error } = await supabase
    .from("mock_fixed_sessions")
    .select("id,user_id,set_id,status,responses,targets")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !session) return false;
  if (session.status !== "completed") return false;

  const responses = (Array.isArray(session.responses) ? session.responses : []) as MockFixedResponseEntry[];
  if (responses.length < 20 || !allStepsScored(responses)) return false;

  const scores = scoreBuckets(responses as Parameters<typeof scoreBuckets>[0]);
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
  const { error: resultErr } = await supabase.from("mock_fixed_results").upsert(
    {
      session_id: session.id,
      user_id: session.user_id,
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
      report_payload: { responses },
    },
    { onConflict: "session_id" },
  );
  if (resultErr) {
    console.error("[mock-fixed-grading] finalize upsert failed", sessionId, resultErr.message);
    return false;
  }
  return true;
}

/**
 * Safety net for the results-loading poller: if a completed session still has
 * pending AI grades (a background task died, a write never stuck), grade them
 * inline right here and finalize. Bounded by the caller (only invoked when the
 * session has been completed for a while), so learners never wait forever.
 */
export async function gradePendingStepsAndFinalize(
  sessionId: string,
  gradingReq: Request,
): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  const { data: session } = await supabase
    .from("mock_fixed_sessions")
    .select("id,set_id,status,responses")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.status !== "completed") return false;

  const responses = (Array.isArray(session.responses) ? session.responses : []) as MockFixedResponseEntry[];
  const pending = responses.filter((r) => typeof r.score !== "number" || r.ai_pending === true);
  if (pending.length > 0) {
    const { data: setItems } = await supabase
      .from("mock_fixed_set_items")
      .select("step_index,task_type,content,correct_answer")
      .eq("set_id", session.set_id);
    const itemByStep = new Map(
      ((setItems ?? []) as MockFixedStepItem[]).map((it) => [it.step_index, it]),
    );
    for (const entry of pending) {
      const step = itemByStep.get(entry.step_index);
      if (!step) continue;
      const score = await scoreAnswerWithNormalCriteria({
        req: gradingReq,
        taskType: step.task_type,
        answer: entry.answer,
        correct: step.correct_answer,
        step,
      });
      await writeStepScoreWithRetry(sessionId, entry.step_index, score);
    }
  }
  return finalizeMockFixedResultIfReady(sessionId);
}
