import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { recordAttemptWeakness } from "@/lib/production-weakness";
import type { CriterionBreakdownPoint } from "@/types/writing";

/**
 * Durable record of a learner's submission, written BEFORE grading starts.
 *
 * The guarantee this buys: a learner never loses an answer they already wrote
 * or recorded, and never sees an error page for it. If grading can't finish
 * inside the request, the job stays `pending` and gets re-graded — by their own
 * polling, and by the cron sweep if they close the tab — until a REAL AI report
 * exists. There is deliberately no heuristic fallback anywhere in this path.
 */

export type GradingJobSurface =
  | "read_then_write"
  | "read_then_speak"
  | "write_about_photo"
  | "speak_about_photo";

export type GradingJobStatus = "pending" | "done" | "abandoned";

export type GradingJob = {
  id: string;
  userId: string | null;
  surface: GradingJobSurface;
  attemptId: string;
  payload: Record<string, unknown>;
  status: GradingJobStatus;
  attempts: number;
  report: Record<string, unknown> | null;
  creditCharged: boolean;
  createdAt: string;
};

/** Stop re-grading after this many failed passes — see `abandoned` handling. */
export const GRADING_JOB_MAX_ATTEMPTS = 25;

/** Shown while a job is still pending. Never phrased as an error. */
export const GRADING_PENDING_MESSAGE_TH = "กำลังตรวจอยู่ โปรดรอสักครู่";
export const GRADING_PENDING_MESSAGE_EN =
  "Still grading — please wait a moment. Your work is saved.";

type Row = {
  id: string;
  user_id: string | null;
  surface: string;
  attempt_id: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  report: Record<string, unknown> | null;
  credit_charged: boolean;
  created_at: string;
};

function toJob(r: Row): GradingJob {
  return {
    id: r.id,
    userId: r.user_id,
    surface: r.surface as GradingJobSurface,
    attemptId: r.attempt_id,
    payload: r.payload ?? {},
    status: (r.status as GradingJobStatus) ?? "pending",
    attempts: r.attempts ?? 0,
    report: r.report,
    creditCharged: r.credit_charged === true,
    createdAt: r.created_at,
  };
}

/**
 * Record the submission before grading. Idempotent on `attemptId`: a repeat
 * submission (double-tap, client retry) returns the existing job instead of
 * grading — and charging — twice.
 *
 * Never throws. If the table isn't deployed yet, grading still runs exactly as
 * it does today; we just lose the durability, which must not break a learner
 * mid-submission.
 */
export async function claimGradingJob(input: {
  userId: string | null;
  surface: GradingJobSurface;
  attemptId: string;
  payload: Record<string, unknown>;
}): Promise<GradingJob | null> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data: existing } = await supabase
      .from("grading_jobs")
      .select("*")
      .eq("attempt_id", input.attemptId)
      .maybeSingle();
    if (existing) return toJob(existing as Row);

    const { data, error } = await supabase
      .from("grading_jobs")
      .insert({
        user_id: input.userId,
        surface: input.surface,
        attempt_id: input.attemptId,
        payload: input.payload,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      // Unique-violation race: another request claimed it a moment ago.
      const { data: raced } = await supabase
        .from("grading_jobs")
        .select("*")
        .eq("attempt_id", input.attemptId)
        .maybeSingle();
      if (raced) return toJob(raced as Row);
      console.error("[grading-jobs] claim failed:", error.message);
      return null;
    }
    return toJob(data as Row);
  } catch (e) {
    console.error("[grading-jobs] claim skipped:", e);
    return null;
  }
}

export async function getGradingJob(attemptId: string): Promise<GradingJob | null> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data } = await supabase
      .from("grading_jobs")
      .select("*")
      .eq("attempt_id", attemptId)
      .maybeSingle();
    return data ? toJob(data as Row) : null;
  } catch (e) {
    console.error("[grading-jobs] read skipped:", e);
    return null;
  }
}

/** Store the finished REAL report. After this the learner can always re-open it. */
export async function completeGradingJob(input: {
  attemptId: string;
  report: unknown;
  creditCharged: boolean;
}): Promise<void> {
  try {
    const supabase = createServiceRoleSupabase();
    // `neq status done` makes this the pending → done TRANSITION, not just a
    // write. Nothing stops the learner's own polling request and the cron sweep
    // from grading the same pending job at once; both then land here. That was
    // harmless while this only stamped a status, but the weakness recorder below
    // increments a counter, and the same mistake must not be counted twice for
    // one attempt. The loser of the race updates no row and records nothing.
    const { data } = await supabase
      .from("grading_jobs")
      .update({
        status: "done",
        report: input.report ?? {},
        credit_charged: input.creditCharged,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("attempt_id", input.attemptId)
      .neq("status", "done")
      .select("user_id, surface")
      .maybeSingle<{ user_id: string | null; surface: string | null }>();

    await recordAttemptWeakness({
      userId: data?.user_id,
      surface: data?.surface,
      attemptId: input.attemptId,
      grammarBreakdown: grammarBreakdownOf(input.report),
    });
  } catch (e) {
    console.error("[grading-jobs] complete skipped:", e);
  }
}

/**
 * Pulls `grammar.breakdown` out of a finished report. Every production report
 * type (writing, speaking, photo, interactive) carries the same
 * `WritingCriterionReport` under `grammar`, so one reader covers all of them.
 */
function grammarBreakdownOf(report: unknown): CriterionBreakdownPoint[] {
  const grammar = (report as { grammar?: { breakdown?: unknown } } | null)?.grammar;
  const breakdown = grammar?.breakdown;
  return Array.isArray(breakdown) ? (breakdown as CriterionBreakdownPoint[]) : [];
}

/**
 * Record a failed pass. The job stays `pending` so it will be tried again —
 * it only becomes `abandoned` after GRADING_JOB_MAX_ATTEMPTS, which means
 * something is systematically broken and needs a human, not another retry.
 */
export async function recordGradingJobFailure(input: {
  attemptId: string;
  attempts: number;
  error: string;
}): Promise<void> {
  try {
    const supabase = createServiceRoleSupabase();
    const next = input.attempts + 1;
    await supabase
      .from("grading_jobs")
      .update({
        attempts: next,
        last_error: input.error.slice(0, 1000),
        status: next >= GRADING_JOB_MAX_ATTEMPTS ? "abandoned" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("attempt_id", input.attemptId);
  } catch (e) {
    console.error("[grading-jobs] failure record skipped:", e);
  }
}

/** Oldest unfinished jobs, for the cron sweep. */
export async function listPendingGradingJobs(limit = 10): Promise<GradingJob[]> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data } = await supabase
      .from("grading_jobs")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", GRADING_JOB_MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(limit);
    return ((data as Row[]) ?? []).map(toJob);
  } catch (e) {
    console.error("[grading-jobs] list skipped:", e);
    return [];
  }
}
