import { apiFetch, authHeaders, finishStudySession, postPracticeAttempt, startStudySession } from "./api";
import { API_BASE_URL } from "./config";
import type { useI18n } from "./i18n";
import { PRODUCTION_MAX_SCORE, productionContentKey } from "./production-constants";
import type {
  PhotoAttemptReport,
  PhotoItem,
  PhotoTaskType,
  WritingAttemptReport,
  WritingTopic,
} from "./production-types";

type Translate = ReturnType<typeof useI18n>["t"];

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

// The list screen and the exam screen ask for the same task's items back to back.
const photoItemsCache = new Map<PhotoTaskType, PhotoItem[]>();

/** Active photo items (shared by both photo tasks) with this learner's server-side progress. */
export async function fetchPhotoItems(
  taskType: PhotoTaskType,
  opts?: { fresh?: boolean },
): Promise<PhotoItem[]> {
  const cached = photoItemsCache.get(taskType);
  if (cached && !opts?.fresh) return cached;
  const res = await apiFetch(
    `${API_BASE_URL}/api/photo-speak/items?taskType=${encodeURIComponent(taskType)}`,
    { headers: await authHeaders() },
  );
  const data = (await res.json().catch(() => ({}))) as { items?: PhotoItem[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not load photos (${res.status})`);
  const items = data.items ?? [];
  photoItemsCache.set(taskType, items);
  return items;
}

export async function fetchPhotoItem(taskType: PhotoTaskType, itemId: string): Promise<PhotoItem> {
  const fromCache = photoItemsCache.get(taskType)?.find((it) => it.id === itemId);
  if (fromCache) return fromCache;
  const item = (await fetchPhotoItems(taskType, { fresh: true })).find((it) => it.id === itemId);
  if (!item) throw new Error("Photo task not found");
  return item;
}

/** After a graded attempt the server's progress row changed — refetch next time. */
export function invalidatePhotoItems(taskType: PhotoTaskType): void {
  photoItemsCache.delete(taskType);
}

export async function fetchWritingTopics(round: number): Promise<WritingTopic[]> {
  const res = await apiFetch(
    `${API_BASE_URL}/api/practice/content/writing-topics?round=${round}`,
    { headers: await authHeaders() },
  );
  const data = (await res.json().catch(() => ({}))) as { topics?: WritingTopic[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not load topics (${res.status})`);
  return data.topics ?? [];
}

export async function fetchWritingTopic(id: string): Promise<WritingTopic> {
  const res = await apiFetch(
    `${API_BASE_URL}/api/practice/content/writing-topics?id=${encodeURIComponent(id)}`,
    { headers: await authHeaders() },
  );
  const data = (await res.json().catch(() => ({}))) as { topic?: WritingTopic; error?: string };
  if (!res.ok || !data.topic) throw new Error(data.error ?? `Topic not found (${res.status})`);
  return data.topic;
}

// ---------------------------------------------------------------------------
// Grading — same contract as the website's src/lib/grading-wait.ts:
//   200 + report  → graded
//   202 + pending → answer is SAVED server-side; poll /api/grading-job/:id
//   4xx/5xx       → real problem
// ---------------------------------------------------------------------------

export class GradingError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type GradingOutcome<T> =
  | { kind: "report"; report: T }
  /** Saved and still grading in the background — the learner can come back later. */
  | { kind: "still-working" };

const POLL_DELAYS_MS = [3000, 4000, 5000, 6000, 8000, 10000];
const MAX_POLLS = 30;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForGradingJob<T>(attemptId: string): Promise<GradingOutcome<T>> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_DELAYS_MS[Math.min(i, POLL_DELAYS_MS.length - 1)]!);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/grading-job/${encodeURIComponent(attemptId)}`,
        { headers: await authHeaders() },
      );
      if (!res.ok) continue; // transient — keep waiting
      const data = (await res.json()) as { status?: string; report?: T; error?: string };
      if (data.status === "done" && data.report) return { kind: "report", report: data.report };
      if (data.status === "abandoned") {
        throw new GradingError(
          500,
          data.error ?? "ตรวจไม่สำเร็จ ทีมงานได้รับแจ้งแล้ว งานของคุณถูกเก็บไว้ครบ",
        );
      }
    } catch (e) {
      if (e instanceof GradingError) throw e;
      // network blip — the job is safe on the server, keep polling
    }
  }
  return { kind: "still-working" };
}

async function submitForGrading<T>(
  path: string,
  body: Record<string, unknown>,
  onPending?: () => void,
): Promise<GradingOutcome<T>> {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    status?: string;
    attemptId?: string;
  };
  if (res.status === 202 && data.status === "pending" && data.attemptId) {
    onPending?.();
    return waitForGradingJob<T>(data.attemptId);
  }
  if (!res.ok) throw new GradingError(res.status, data.error ?? `Grading failed (${res.status})`);
  return { kind: "report", report: data as T };
}

export function submitPhotoReport(
  args: {
    mode: "write" | "speak";
    attemptId: string;
    item: PhotoItem;
    transcript: string;
  },
  onPending?: () => void,
): Promise<GradingOutcome<PhotoAttemptReport>> {
  const { item } = args;
  return submitForGrading<PhotoAttemptReport>(
    "/api/photo-speak-report",
    {
      attemptId: args.attemptId,
      itemId: item.id,
      titleEn: item.title_en,
      titleTh: item.title_th,
      promptEn: item.prompt_en,
      promptTh: item.prompt_th,
      imageUrl: item.image_url,
      keywords: item.keywords,
      // Same values the website sends.
      prepMinutes: args.mode === "speak" ? 1 : 0,
      transcript: args.transcript,
      originHub: args.mode === "speak" ? "speak-about-photo" : "write-about-photo",
      redeemed: false,
    },
    onPending,
  );
}

export function submitWritingReport(
  args: {
    attemptId: string;
    topic: WritingTopic;
    essay: string;
    followUpAnswers: string[];
  },
  onPending?: () => void,
): Promise<GradingOutcome<WritingAttemptReport>> {
  return submitForGrading<WritingAttemptReport>(
    "/api/writing-report",
    {
      attemptId: args.attemptId,
      topic: args.topic,
      essay: args.essay,
      followUpAnswers: args.followUpAnswers,
      prepMinutes: 0,
      redeemed: false,
      previousScore160: null,
    },
    onPending,
  );
}

/** Learner-facing text for a failed submit. Server wording can be technical, so map the common cases. */
export function gradingErrorText(t: Translate, e: unknown): string {
  if (e instanceof GradingError) {
    if (e.status === 402) {
      return t(
        "เครดิตการตรวจของคุณหมดแล้ว — คำตอบยังอยู่ ลองใหม่เมื่อได้เครดิตเพิ่ม",
        "You're out of feedback credits. Your answer is still here — try again when you have more.",
      );
    }
    if (e.status === 503 || e.status === 429) {
      return t(
        "ระบบตรวจไม่ว่างชั่วคราว คำตอบของคุณยังอยู่ ลองกดส่งอีกครั้งในอีกสักครู่",
        "Grading is busy right now. Your answer is still here — try sending again shortly.",
      );
    }
  }
  const message = e instanceof Error ? e.message : "";
  if (!message || /\bAI\b|gemini|anthropic|model/i.test(message)) {
    return t("ส่งตรวจไม่สำเร็จ ลองอีกครั้ง — คำตอบของคุณยังอยู่", "Could not grade this. Try again — your answer is still here.");
  }
  return message;
}

// ---------------------------------------------------------------------------
// Saving a finished attempt
// ---------------------------------------------------------------------------

/** Best-effort study-session start (same exercise types as the website). Never throws. */
export async function startProductionSession(exerciseType: string, setId: string): Promise<string | null> {
  try {
    return await startStudySession({ exerciseType, skill: "production", setId });
  } catch {
    return null;
  }
}

/**
 * After a graded attempt: close the study session with the full report (the
 * website's report pages read study_sessions.report_payload) and log the score
 * in practice_attempts so it syncs to the web study plan. Best-effort.
 */
export async function recordProductionResult(args: {
  sessionId: string | null;
  /** study_sessions.exercise_type — website names: write_about_photo, speak_about_photo, read_then_write. */
  exerciseType: string;
  /** practice_attempts.task_type — see PRODUCTION_TASK_TYPE. */
  taskType: string;
  setId: string;
  attemptId: string;
  score160: number;
  startedAt: number;
  submissionPayload: Record<string, unknown>;
  reportPayload: unknown;
  idField: "itemId" | "topicId";
}): Promise<void> {
  const duration = Math.max(1, Math.floor((Date.now() - args.startedAt) / 1000));
  await Promise.all([
    finishStudySession({
      sessionId: args.sessionId ?? undefined,
      exerciseType: args.exerciseType,
      setId: args.setId,
      score: args.score160,
      completed: true,
      duration_seconds: duration,
      submission_payload: args.submissionPayload,
      report_payload: args.reportPayload,
    }).catch(() => undefined),
    postPracticeAttempt({
      taskType: args.taskType,
      scorePct: (args.score160 / PRODUCTION_MAX_SCORE) * 100,
      detail: {
        via: args.taskType,
        attemptId: args.attemptId,
        [args.idField]: args.setId,
        score160: args.score160,
        contentKey: productionContentKey(args.taskType, args.setId),
      },
    }),
  ]);
}
