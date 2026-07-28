import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Abandon all in-progress sessions for this user (no partial resume).
 */
export async function abandonStaleMockSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("mock_test_sessions")
    .update({ status: "abandoned", completed_at: now })
    .eq("user_id", userId)
    .eq("status", "in_progress");
}

/**
 * How long a half-finished fixed mock stays resumable. Inside this window the
 * learner can leave (tab closed, app killed, phone died) and pick the SAME set
 * back up on the exact step they stopped on — the credit was already spent, so
 * dropping their progress would just burn it twice.
 */
export const MOCK_FIXED_RESUME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function mockFixedResumeCutoffIso(now = new Date()): string {
  return new Date(now.getTime() - MOCK_FIXED_RESUME_WINDOW_MS).toISOString();
}

/**
 * Same idea for the fixed 20-step mock, but resume-aware: only sessions that
 * fell outside the resume window are abandoned. Anything newer stays
 * in_progress so `POST /api/mock-test/fixed/session` can hand it back instead
 * of starting the learner over at step 1 (and charging a second credit).
 * Without this sweep, expired rows would linger forever.
 */
export async function abandonStaleFixedMockSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date();
  await supabase
    .from("mock_fixed_sessions")
    .update({ status: "abandoned", completed_at: now.toISOString() })
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .lt("started_at", mockFixedResumeCutoffIso(now));
}
