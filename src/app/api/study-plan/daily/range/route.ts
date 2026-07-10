import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  DAILY_SKILL_META,
  buildDailyPlanItems,
  isDailyTier,
  planTotalCount,
  type DailyPlanItem,
  type DailyPlanSkill,
  type DailyTier,
  type DailyTrack,
} from "@/lib/study-plan/daily-plan";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 62;

const TASK_TO_SKILL: Record<string, DailyPlanSkill> = Object.fromEntries(
  (Object.entries(DAILY_SKILL_META) as [DailyPlanSkill, { taskType: string }][]).map(
    ([skill, m]) => [m.taskType, skill],
  ),
) as Record<string, DailyPlanSkill>;

function toUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}
function fromUtcDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export type RangeDaySummary = {
  date: string;
  persisted: boolean;
  track: DailyTrack;
  tier: DailyTier;
  items: DailyPlanItem[];
  total: number;
  totalDone: number;
  complete: boolean;
};

/**
 * GET /api/study-plan/daily/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Batched per-day progress for calendar rendering — one round trip instead of one
 * /api/study-plan/daily call per visible day. For each date: the day's plan (saved
 * override, or the virtual default from the user's schedule) plus per-skill-group
 * completion counts, derived from that date range's practice_attempts in a single query
 * (see src/lib/study-plan/daily-progress.ts for the per-day version this mirrors).
 */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "start and end must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const startDay = toUtcDay(start);
  const endDay = toUtcDay(end);
  if (endDay < startDay || endDay - startDay > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "invalid or too-large date range" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const [{ data: schedule }, { data: plans }] = await Promise.all([
    supabase
      .from("study_plan_schedules")
      .select("default_duration_minutes")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("study_plan_daily_plans")
      .select("plan_date, track, duration_minutes, items")
      .eq("user_id", user.id)
      .gte("plan_date", start)
      .lte("plan_date", end),
  ]);

  const defaultTier: DailyTier = isDailyTier(schedule?.default_duration_minutes as number)
    ? (schedule!.default_duration_minutes as DailyTier)
    : 10;

  const planByDate = new Map<
    string,
    { track: DailyTrack; tier: DailyTier; items: DailyPlanItem[] }
  >();
  for (const row of (plans ?? []) as {
    plan_date: string;
    track: string;
    duration_minutes: number;
    items: unknown;
  }[]) {
    const track: DailyTrack = row.track === "lesson" ? "lesson" : "exam";
    const tier: DailyTier = isDailyTier(row.duration_minutes) ? (row.duration_minutes as DailyTier) : defaultTier;
    const rawItems = Array.isArray(row.items) ? (row.items as DailyPlanItem[]) : [];
    const items = rawItems.length > 0 ? rawItems : buildDailyPlanItems(tier, track);
    planByDate.set(row.plan_date, { track, tier, items });
  }

  // One batched attempts query for the whole range (service role — RLS-immune, avoids N
  // per-day round trips). created_at is timestamptz; bucket to a Bangkok (+07:00) calendar
  // date client-side so a 23:xx attempt lands on the day the learner experienced it as.
  const svc = createServiceRoleSupabase();
  const { data: attempts } = await svc
    .from("practice_attempts")
    .select("task_type, created_at")
    .eq("user_id", user.id)
    .gte("created_at", `${start}T00:00:00.000+07:00`)
    .lte("created_at", `${end}T23:59:59.999+07:00`);

  const doneCountByDateSkill = new Map<string, Map<DailyPlanSkill, number>>();
  for (const row of (attempts ?? []) as { task_type: string; created_at: string }[]) {
    const skill = TASK_TO_SKILL[row.task_type];
    if (!skill) continue;
    // Convert to Bangkok local date (UTC+7, no DST) for correct day-bucketing.
    const bkkMs = Date.parse(row.created_at) + 7 * 3_600_000;
    const date = new Date(bkkMs).toISOString().slice(0, 10);
    const perSkill = doneCountByDateSkill.get(date) ?? new Map<DailyPlanSkill, number>();
    perSkill.set(skill, (perSkill.get(skill) ?? 0) + 1);
    doneCountByDateSkill.set(date, perSkill);
  }

  const days: RangeDaySummary[] = [];
  for (let d = startDay; d <= endDay; d++) {
    const date = fromUtcDay(d);
    const plan = planByDate.get(date);
    const persisted = !!plan;
    const track: DailyTrack = plan?.track ?? "exam";
    const tier: DailyTier = plan?.tier ?? defaultTier;
    const items: DailyPlanItem[] = plan?.items ?? buildDailyPlanItems(tier, track);

    const perSkillDone = doneCountByDateSkill.get(date) ?? new Map<DailyPlanSkill, number>();
    let totalDone = 0;
    for (const it of items) {
      totalDone += Math.min(perSkillDone.get(it.skill) ?? 0, it.count);
    }
    const total = planTotalCount(items);
    days.push({ date, persisted, track, tier, items, total, totalDone, complete: total > 0 && totalDone >= total });
  }

  return NextResponse.json({ days }, { headers: NO_STORE_HEADERS });
}
