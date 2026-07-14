import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const VALID_SKILLS = new Set(["dictation", "fitb", "vocab", "reading", "realword"]);

/**
 * GET /api/study-plan/practice-minutes?since=YYYY-MM-DD
 * The caller's own freeform timed-practice rows (for the calendar to surface
 * "🎲 ฝึกอิสระ XX นาที" per day). Falls back to an empty list if the table
 * hasn't been migrated to this DB yet, so the calendar never hard-errors.
 */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("study_plan_practice_minutes")
    .select("practice_date, skill, minutes, sets_done, words_learned")
    .eq("user_id", user.id)
    .gte("practice_date", since)
    .order("practice_date", { ascending: false });

  // Table may not be deployed to the live DB yet — degrade gracefully.
  if (error) return NextResponse.json({ rows: [] }, { headers: NO_STORE_HEADERS });

  return NextResponse.json({ rows: data ?? [] }, { headers: NO_STORE_HEADERS });
}

/** POST /api/study-plan/practice-minutes — record one finished timed-random session. */
export async function POST(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const practiceDate = o.practiceDate;
  const skill = o.skill;
  if (typeof practiceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(practiceDate)) {
    return NextResponse.json({ error: "practiceDate must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (typeof skill !== "string" || !VALID_SKILLS.has(skill)) {
    return NextResponse.json({ error: "invalid skill" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const clampInt = (v: unknown, max: number) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  };

  const { error } = await supabase.from("study_plan_practice_minutes").insert({
    user_id: user.id,
    practice_date: practiceDate,
    skill,
    minutes: clampInt(o.minutes, 600),
    sets_done: clampInt(o.setsDone, 1000),
    words_learned: clampInt(o.wordsLearned, 1000),
    source: typeof o.source === "string" ? o.source.slice(0, 40) : "randomized-timed",
  });
  // Missing table (not yet migrated) shouldn't block the learner's finish screen.
  if (error) return NextResponse.json({ ok: false, skipped: true }, { headers: NO_STORE_HEADERS });

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
