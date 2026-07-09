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
 * Same idea for the fixed 20-step mock: abandon any in_progress row before
 * starting a new one. Without this, a session left open (tab closed, app
 * backgrounded/killed mid-exam on mobile) lingers forever and still counts
 * toward the monthly mock-test quota via countBillableMockFixedSessions.
 */
export async function abandonStaleFixedMockSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("mock_fixed_sessions")
    .update({ status: "abandoned", completed_at: now })
    .eq("user_id", userId)
    .eq("status", "in_progress");
}
