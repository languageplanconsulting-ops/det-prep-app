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
