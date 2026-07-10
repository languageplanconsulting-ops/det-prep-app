import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import {
  buildDailyPlanItems,
  isDailyTier,
  planTotalCount,
  type DailyPlanItem,
  type DailyTier,
  type DailyTrack,
} from "@/lib/study-plan/daily-plan";
import { computeDayProgress, computeSkillProgressSummary } from "@/lib/study-plan/daily-progress";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeItems(raw: unknown): DailyPlanItem[] {
  if (!Array.isArray(raw)) return [];
  const items: DailyPlanItem[] = [];
  for (const el of raw) {
    const o = (el ?? {}) as Record<string, unknown>;
    if (typeof o.skill === "string" && typeof o.count === "number" && o.count > 0) {
      items.push({ skill: o.skill as DailyPlanItem["skill"], count: o.count });
    }
  }
  return items;
}

/**
 * GET /api/study-plan/daily?date=YYYY-MM-DD
 * Returns the day's plan (saved, or a virtual default from the user's schedule that is NOT
 * persisted until they act), plus per-skill-group progress and per-skill improvement trends.
 */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { data: row } = await supabase
    .from("study_plan_daily_plans")
    .select("track, duration_minutes, items")
    .eq("user_id", user.id)
    .eq("plan_date", date)
    .maybeSingle();

  let track: DailyTrack;
  let tier: DailyTier;
  let items: DailyPlanItem[];
  const persisted = !!row;

  // Fetched unconditionally so an invalid stored duration_minutes (e.g. a future writer
  // persisting 60, which the DB CHECK constraint permits but this route's own POST rejects)
  // falls back to the user's real schedule default here too — matching /daily/range's
  // fallback exactly, so the two endpoints can never disagree on the same day's tier/items.
  const { data: sched } = await supabase
    .from("study_plan_schedules")
    .select("default_duration_minutes")
    .eq("user_id", user.id)
    .maybeSingle();
  const scheduleDefaultTier: DailyTier = isDailyTier(sched?.default_duration_minutes as number)
    ? (sched!.default_duration_minutes as DailyTier)
    : 10;

  if (row) {
    track = row.track === "lesson" ? "lesson" : "exam";
    tier = isDailyTier(row.duration_minutes) ? row.duration_minutes : scheduleDefaultTier;
    const saved = normalizeItems(row.items);
    items = saved.length ? saved : buildDailyPlanItems(tier, track);
  } else {
    tier = scheduleDefaultTier;
    track = "exam";
    items = buildDailyPlanItems(tier, track);
  }

  const [progress, trends] = await Promise.all([
    computeDayProgress(user.id, date, items),
    computeSkillProgressSummary(user.id).catch(() => []),
  ]);

  return NextResponse.json(
    { plan: { date, track, tier, items, total: planTotalCount(items), persisted }, progress, trends },
    { headers: NO_STORE_HEADERS },
  );
}

/**
 * POST /api/study-plan/daily — set/override this day's plan.
 * Body: { date: YYYY-MM-DD, track: "exam"|"lesson", durationMinutes: 5|10|20|30 }.
 * Rebuilds the fixed sequence for that tier+track and pins it so it's stable + resumable.
 */
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
  const date = o.date;
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const track: DailyTrack = o.track === "lesson" ? "lesson" : "exam";
  const dur = o.durationMinutes;
  if (typeof dur !== "number" || !isDailyTier(dur)) {
    return NextResponse.json({ error: "durationMinutes must be 5, 10, 20, or 30" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const items = buildDailyPlanItems(dur, track);
  const { error } = await supabase.from("study_plan_daily_plans").upsert(
    {
      user_id: user.id,
      plan_date: date,
      track,
      duration_minutes: dur,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,plan_date" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

  const progress = await computeDayProgress(user.id, date, items);
  return NextResponse.json(
    { plan: { date, track, tier: dur, items, total: planTotalCount(items), persisted: true }, progress },
    { headers: NO_STORE_HEADERS },
  );
}
