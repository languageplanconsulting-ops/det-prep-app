import { NextResponse } from "next/server";

import { resolvePlanIdentity } from "@/lib/study-plan/plan-identity";
import {
  buildDailyPlanItems,
  isDailyTier,
  normalizeDailyPlanItems,
  personalizeExamItems,
  planTotalCount,
  type DailyPlanItem,
  type DailyTier,
  type DailyTrack,
} from "@/lib/study-plan/daily-plan";
import { computeDayProgress, computeSkillProgressSummary } from "@/lib/study-plan/daily-progress";
import {
  bangkokToday,
  computeDayExtras,
  dailyPrioritiesFromVector,
  shouldPersonalizeDate,
  type DayExtra,
} from "@/lib/study-plan/personal-plan";
import { computeTaskWeaknessVector, type TaskWeakness } from "@/lib/study-plan/weakness-vector";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeItems = normalizeDailyPlanItems;

/**
 * GET /api/study-plan/daily?date=YYYY-MM-DD
 * Returns the day's plan (saved, or a virtual default from the user's schedule that is NOT
 * persisted until they act), plus per-skill-group progress and per-skill improvement trends.
 */
export async function GET(req: Request) {
  const identity = await resolvePlanIdentity(req);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  const { supabase, userId } = identity;

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { data: row } = await supabase
    .from("study_plan_daily_plans")
    .select("track, duration_minutes, items")
    .eq("user_id", userId)
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
    .eq("user_id", userId)
    .maybeSingle();
  const scheduleDefaultTier: DailyTier = isDailyTier(sched?.default_duration_minutes as number)
    ? (sched!.default_duration_minutes as DailyTier)
    : 10;

  // Computed at most once per request and reused by both personalization and the
  // extras engine (each call costs 3 queries).
  let vector: TaskWeakness[] | null = null;
  const weaknessVector = async (): Promise<TaskWeakness[]> => {
    if (!vector) {
      // Cutoff = today: the plan for any day is derived only from data that
      // existed before today began, so working through a day never reshapes it.
      vector = await computeTaskWeaknessVector(userId, {
        attemptsBefore: bangkokToday(),
      }).catch(() => [] as TaskWeakness[]);
    }
    return vector;
  };

  let focus: { taskType: string; source: string } | null = null;
  if (row) {
    track = row.track === "lesson" ? "lesson" : "exam";
    tier = isDailyTier(row.duration_minutes) ? row.duration_minutes : scheduleDefaultTier;
    const saved = normalizeItems(row.items);
    items = saved.length ? saved : buildDailyPlanItems(tier, track);
  } else {
    tier = scheduleDefaultTier;
    track = "exam";
    items = buildDailyPlanItems(tier, track);
    // Virtual (not yet pinned) exam days from today onward personalize toward the
    // newest weakness signal; saved days keep their pinned items so a started day
    // never reshuffles, and past days keep the base sequence so their completion
    // can't be retroactively invalidated.
    if (track === "exam" && shouldPersonalizeDate(date)) {
      const { priorities, focus: vectorFocus } = dailyPrioritiesFromVector(await weaknessVector());
      items = personalizeExamItems(items, priorities);
      focus = vectorFocus;
    }
  }

  const [progress, trends, extras] = await Promise.all([
    computeDayProgress(userId, date, items),
    computeSkillProgressSummary(userId).catch(() => []),
    computeDayExtras({ userId, date, tier, vector: await weaknessVector() }).catch(
      () => [] as DayExtra[],
    ),
  ]);

  return NextResponse.json(
    { plan: { date, track, tier, items, total: planTotalCount(items), persisted, focus }, progress, trends, extras },
    { headers: NO_STORE_HEADERS },
  );
}

/**
 * POST /api/study-plan/daily — set/override this day's plan.
 * Body: { date: YYYY-MM-DD, track: "exam"|"lesson", durationMinutes: 5|10|20|30 }.
 * Rebuilds the fixed sequence for that tier+track and pins it so it's stable + resumable.
 */
export async function POST(req: Request) {
  const identity = await resolvePlanIdentity(req);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  const { supabase, userId } = identity;

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

  let items = buildDailyPlanItems(dur, track);
  let focus: { taskType: string; source: string } | null = null;
  let postVector: TaskWeakness[] = [];
  if (track === "exam" && shouldPersonalizeDate(date)) {
    postVector = await computeTaskWeaknessVector(userId, {
      attemptsBefore: bangkokToday(),
    }).catch(() => [] as TaskWeakness[]);
    const { priorities, focus: vectorFocus } = dailyPrioritiesFromVector(postVector);
    items = personalizeExamItems(items, priorities);
    focus = vectorFocus;
  }
  const { error } = await supabase.from("study_plan_daily_plans").upsert(
    {
      user_id: userId,
      plan_date: date,
      track,
      duration_minutes: dur,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,plan_date" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

  const [progress, extras] = await Promise.all([
    computeDayProgress(userId, date, items),
    computeDayExtras({
      userId,
      date,
      tier: dur,
      vector: postVector.length ? postVector : undefined,
    }).catch(() => [] as DayExtra[]),
  ]);
  return NextResponse.json(
    { plan: { date, track, tier: dur, items, total: planTotalCount(items), persisted: true, focus }, progress, extras },
    { headers: NO_STORE_HEADERS },
  );
}
