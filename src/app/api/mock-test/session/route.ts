import { NextResponse } from "next/server";

import { isMockTestAvailableNow } from "@/lib/mock-test/mock-test-availability";
import { isUserAdminRole } from "@/lib/mock-test/mock-test-server-access";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export async function POST() {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publicOpen = isMockTestAvailableNow();
    if (!publicOpen && !(await isUserAdminRole(supabase, user.id))) {
      return NextResponse.json(
        { error: "Mock test is not available yet." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("mock_test_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        current_phase: 1,
        current_difficulty: "medium",
        consecutive_correct: 0,
        consecutive_wrong: 0,
        phase_responses: {},
        ai_responses: {},
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 70 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[mock-test/session] insert", error.message);
      return NextResponse.json({ error: "Could not create session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: data.id });
  } catch (e) {
    console.error("[mock-test/session]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
