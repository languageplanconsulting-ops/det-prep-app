import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Task-level weakness vector — the personalization signal for the study calendar.
 *
 * Merges, newest-assessment-first:
 *   1. the latest fixed mock (`mock_fixed_results.report_payload.responses`,
 *      20 graded steps, 0–160 each),
 *   2. the latest mini diagnosis (`mini_diagnosis_results.report_payload
 *      .scoreBreakdown.supporting`, raw 0–160 per task type),
 *   3. recent `practice_attempts` (score_pct × 1.6) as the fallback when a task
 *      type has never been assessed.
 *
 * Each task's `weight` is its largest share in the mock's skill-bucket formulas
 * (fixed-mock-score-buckets.ts), so `priority = (160 − score) × weight` ranks by
 * "how much fixing this moves the headline score", not just by how low it is.
 */

export type TaskWeaknessSource = "mock" | "mini" | "attempts";

export type TaskWeakness = {
  taskType: string;
  /** 0–160, from the newest source that covers this task type. */
  score160: number;
  /** Largest skill-bucket share (0–1) this task type holds in the fixed mock. */
  weight: number;
  /** (160 − score160) × weight — sort key, higher = fix first. */
  priority: number;
  source: TaskWeaknessSource;
  /** ISO timestamp of the source row. */
  at: string;
  isWeak: boolean;
};

/** Below this (0–160) a task counts as weak — mirrors WEAK_THRESHOLD 80% in weakness.ts. */
export const TASK_WEAK_THRESHOLD_160 = 128;

/** Largest weight each task type carries in any fixed-mock skill bucket. */
const TASK_BUCKET_WEIGHT: Record<string, number> = {
  vocabulary_reading: 0.55,
  read_and_write: 0.5,
  read_then_speak: 0.4,
  interactive_speaking: 0.4,
  interactive_conversation_mcq: 0.4,
  interactive_listening: 0.4, // mini-only stand-in for the conversation MCQ
  dictation: 0.3,
  fill_in_blanks: 0.25,
  reading_comprehension: 0.25, // practice-only task type; no mock bucket
  real_english_word: 0.2,
  write_about_photo: 0.2,
  speak_about_photo: 0.15,
  conversation_summary: 0.1,
  summarize_conversation: 0.1,
};
const DEFAULT_BUCKET_WEIGHT = 0.25;

const ATTEMPTS_LIMIT = 300;
const MIN_ATTEMPTS_FOR_SIGNAL = 3;

function clamp160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, Math.round(v)));
}

type Candidate = { score160: number; source: TaskWeaknessSource; at: string };

export type WeaknessVectorInputs = {
  /** Latest mock's graded steps, or null. */
  mock: { responses: { task_type?: unknown; score?: unknown }[]; at: string } | null;
  /** Latest mini diagnosis supporting scores (task type → 0–160), or null. */
  mini: { supporting: Record<string, unknown>; at: string } | null;
  /** Recent attempts, newest first. */
  attempts: { task_type: string; score_pct: number | null; created_at?: string | null }[];
};

/** Pure merge — separated from fetching so it can be unit-tested and reused. */
export function buildTaskWeaknessVector(inputs: WeaknessVectorInputs): TaskWeakness[] {
  const byTask = new Map<string, Candidate>();

  const offer = (taskType: string, candidate: Candidate) => {
    const prev = byTask.get(taskType);
    if (!prev) {
      byTask.set(taskType, candidate);
      return;
    }
    // Assessments (mock/mini) always beat attempts; among assessments, newest wins.
    const prevIsAssessment = prev.source !== "attempts";
    const nextIsAssessment = candidate.source !== "attempts";
    if (nextIsAssessment && (!prevIsAssessment || candidate.at > prev.at)) {
      byTask.set(taskType, candidate);
    }
  };

  if (inputs.mock) {
    const sums = new Map<string, { sum: number; n: number }>();
    for (const r of inputs.mock.responses) {
      if (typeof r?.task_type !== "string" || typeof r?.score !== "number") continue;
      const b = sums.get(r.task_type) ?? { sum: 0, n: 0 };
      b.sum += r.score;
      b.n += 1;
      sums.set(r.task_type, b);
    }
    for (const [taskType, { sum, n }] of sums) {
      offer(taskType, { score160: clamp160(sum / n), source: "mock", at: inputs.mock.at });
    }
  }

  if (inputs.mini && !Array.isArray(inputs.mini.supporting)) {
    for (const [taskType, raw] of Object.entries(inputs.mini.supporting)) {
      if (typeof raw !== "number") continue;
      // mini-diagnosis averages an EMPTY bucket to 0 (score-buckets.ts avg([])),
      // so a task that was never scored — e.g. an upload that failed, or a
      // partially graded payload — is indistinguishable from a true zero. A real
      // 0/160 on an attempted task is not a thing, while a false 0 would become
      // the single strongest weakness signal and pivot the whole plan onto a
      // skill the learner was never tested on. Treat 0 as "no data".
      if (raw <= 0) continue;
      offer(taskType, { score160: clamp160(raw), source: "mini", at: inputs.mini.at });
    }
  }

  const attemptSums = new Map<string, { sum: number; n: number; at: string }>();
  for (const row of inputs.attempts) {
    if (typeof row.task_type !== "string") continue;
    const b = attemptSums.get(row.task_type) ?? { sum: 0, n: 0, at: row.created_at ?? "" };
    b.sum += row.score_pct ?? 0;
    b.n += 1;
    attemptSums.set(row.task_type, b);
  }
  for (const [taskType, { sum, n, at }] of attemptSums) {
    if (n < MIN_ATTEMPTS_FOR_SIGNAL) continue;
    offer(taskType, { score160: clamp160((sum / n) * 1.6), source: "attempts", at });
  }

  const vector: TaskWeakness[] = Array.from(byTask.entries()).map(([taskType, c]) => {
    const weight = TASK_BUCKET_WEIGHT[taskType] ?? DEFAULT_BUCKET_WEIGHT;
    return {
      taskType,
      score160: c.score160,
      weight,
      priority: Math.round((160 - c.score160) * weight * 10) / 10,
      source: c.source,
      at: c.at,
      isWeak: c.score160 < TASK_WEAK_THRESHOLD_160,
    };
  });
  vector.sort((a, b) => b.priority - a.priority || a.score160 - b.score160);
  return vector;
}

/**
 * Fetch + merge for one user. Service-role reads scoped to the caller's own id
 * (mock/mini result tables are not readable via the request client's RLS on
 * every deployment). Any failed read degrades to "that source is absent".
 */
export async function computeTaskWeaknessVector(
  userId: string,
  options: {
    /**
     * Bangkok calendar date (YYYY-MM-DD). Attempts from this date onward are
     * EXCLUDED. Personalization passes today's date so a day's plan is derived
     * only from data that existed before the day began — otherwise finishing
     * exercises re-ranks the weaknesses, reshapes the very day being worked,
     * and can drive completed progress backwards mid-session.
     * Omit it for display-only reads, which should show the freshest picture.
     */
    attemptsBefore?: string;
  } = {},
): Promise<TaskWeakness[]> {
  const supabase = createServiceRoleSupabase();

  let attemptsQuery = supabase
    .from("practice_attempts")
    .select("task_type, score_pct, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(ATTEMPTS_LIMIT);
  if (options.attemptsBefore) {
    attemptsQuery = attemptsQuery.lt("created_at", `${options.attemptsBefore}T00:00:00.000+07:00`);
  }

  const [mockRes, miniRes, attemptsRes] = await Promise.all([
    supabase
      .from("mock_fixed_results")
      .select("report_payload, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mini_diagnosis_results")
      .select("report_payload, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    attemptsQuery,
  ]);

  const mockPayload = (mockRes.data?.report_payload ?? null) as { responses?: unknown } | null;
  const mock =
    mockPayload && Array.isArray(mockPayload.responses)
      ? {
          responses: mockPayload.responses as { task_type?: unknown; score?: unknown }[],
          at: (mockRes.data?.created_at as string) ?? "",
        }
      : null;

  const miniPayload = (miniRes.data?.report_payload ?? null) as {
    scoreBreakdown?: { supporting?: unknown };
  } | null;
  const supporting = miniPayload?.scoreBreakdown?.supporting;
  const mini =
    supporting && typeof supporting === "object"
      ? {
          supporting: supporting as Record<string, unknown>,
          at: (miniRes.data?.created_at as string) ?? "",
        }
      : null;

  return buildTaskWeaknessVector({
    mock,
    mini,
    attempts: (attemptsRes.data ?? []) as WeaknessVectorInputs["attempts"],
  });
}
