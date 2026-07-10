import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import { computeSkillProgressSummary } from "@/lib/study-plan/daily-progress";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET /api/study-plan/skill-trends — per-skill recent-average + improvement delta across
 * the 5 daily-practice EXAM skills (dictation/fitb/vocab/reading/realword). Lesson-track
 * practice is intentionally excluded (see computeSkillProgressSummary).
 */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const trends = await computeSkillProgressSummary(user.id);
  return NextResponse.json({ trends }, { headers: NO_STORE_HEADERS });
}
