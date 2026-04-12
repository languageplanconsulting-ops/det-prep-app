import { NextResponse } from "next/server";

import { buildStage1Assembly } from "@/lib/mock-test/v2/attempt-assembler";
import { isMockTestAvailableNow } from "@/lib/mock-test/mock-test-availability";
import { isUserAdminRole } from "@/lib/mock-test/mock-test-server-access";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/**
 * Creates engine v2 session with Stage 1 slots only (pool-randomized).
 */
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

    const { slots, acc, state } = await buildStage1Assembly(supabase, user.id);

    const { data, error } = await supabase
      .from("mock_test_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        engine_version: 2,
        current_phase: 1,
        current_difficulty: "medium",
        consecutive_correct: 0,
        consecutive_wrong: 0,
        phase_responses: {},
        ai_responses: {},
        assembly: {
          ...state,
          accumulator: {
            usedContentFamilies: [...acc.usedContentFamilies],
            usedQuestionIds: [...acc.usedQuestionIds],
            usedAssetKeys: [...acc.usedAssetKeys],
          },
        },
        v2_response_log: [],
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[mock-test/v2/session]", error?.message);
      return NextResponse.json({ error: "Could not create session" }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: data.id,
      slots,
      engineVersion: 2,
    });
  } catch (e) {
    console.error("[mock-test/v2/session]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
