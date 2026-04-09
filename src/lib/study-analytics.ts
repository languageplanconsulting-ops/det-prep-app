import "server-only";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export type SkillSeconds = Record<string, number>;

export type WeeklyDayRow = {
  /** UTC date YYYY-MM-DD */
  date: string;
  bySkill: SkillSeconds;
  totalSeconds: number;
};

export type MonthWeekRow = {
  /** 1-based index within the month (week 1 = days 1–7, etc.) */
  weekIndex: number;
  startDay: number;
  endDay: number;
  bySkill: SkillSeconds;
  totalSeconds: number;
};

export type SkillBreakdownRow = {
  skill: string;
  seconds: number;
  percentage: number;
};

async function requireUserClient(userId: string) {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error("Unauthorized");
  }
  return supabase;
}

function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseUtcDay(isoDate: string): { start: Date; end: Date } {
  const start = new Date(`${isoDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(d: Date): Date {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next;
}

function emptySkillRecord(): SkillSeconds {
  return {
    literacy: 0,
    comprehension: 0,
    conversation: 0,
    production: 0,
    mock_test: 0,
  };
}

function addSeconds(target: SkillSeconds, skill: string, seconds: number) {
  if (!seconds || seconds <= 0) return;
  if (target[skill] === undefined) target[skill] = 0;
  target[skill] += seconds;
}

/**
 * Total seconds studied on a calendar day (UTC), per skill. Uses completed sessions with `ended_at` on that day.
 */
export async function getDailyStudyTime(
  userId: string,
  date: Date | string,
): Promise<SkillSeconds> {
  const supabase = await requireUserClient(userId);
  const iso =
    typeof date === "string"
      ? date.length >= 10
        ? date.slice(0, 10)
        : utcDayKey(new Date(date))
      : utcDayKey(date);
  const { start, end } = parseUtcDay(iso);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("skill, duration_seconds")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("ended_at", "is", null)
    .gte("ended_at", start.toISOString())
    .lt("ended_at", end.toISOString());

  if (error) {
    console.error("[study-analytics] getDailyStudyTime", error.message);
    throw new Error("Failed to load daily study time");
  }

  const out = emptySkillRecord();
  for (const row of data ?? []) {
    const sec = row.duration_seconds ?? 0;
    addSeconds(out, row.skill, sec);
  }
  return out;
}

/**
 * All-time seconds per skill (completed sessions only).
 */
export async function getAllTimeStudyTime(userId: string): Promise<SkillSeconds> {
  const supabase = await requireUserClient(userId);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("skill, duration_seconds")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("duration_seconds", "is", null);

  if (error) {
    console.error("[study-analytics] getAllTimeStudyTime", error.message);
    throw new Error("Failed to load study totals");
  }

  const out = emptySkillRecord();
  for (const row of data ?? []) {
    addSeconds(out, row.skill, row.duration_seconds ?? 0);
  }
  return out;
}

/**
 * Last 7 UTC days including today, per day and per skill.
 */
export async function getWeeklyStudyTime(userId: string): Promise<WeeklyDayRow[]> {
  const supabase = await requireUserClient(userId);
  const now = new Date();

  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const rangeStart = new Date(todayStart);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("skill, duration_seconds, ended_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("ended_at", "is", null)
    .gte("ended_at", rangeStart.toISOString());

  if (error) {
    console.error("[study-analytics] getWeeklyStudyTime", error.message);
    throw new Error("Failed to load weekly study time");
  }

  const byDay = new Map<string, SkillSeconds>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    byDay.set(utcDayKey(d), emptySkillRecord());
  }

  for (const row of data ?? []) {
    if (!row.ended_at) continue;
    const key = utcDayKey(new Date(row.ended_at));
    if (!byDay.has(key)) continue;
    addSeconds(byDay.get(key)!, row.skill, row.duration_seconds ?? 0);
  }

  const rows: WeeklyDayRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const key = utcDayKey(d);
    const bySkill = byDay.get(key) ?? emptySkillRecord();
    const totalSeconds = Object.values(bySkill).reduce((a, b) => a + b, 0);
    rows.push({ date: key, bySkill, totalSeconds });
  }

  return rows;
}

/**
 * Current UTC month, grouped into week buckets (days 1–7, 8–14, …).
 */
export async function getMonthlyStudyTime(userId: string): Promise<MonthWeekRow[]> {
  const supabase = await requireUserClient(userId);
  const now = new Date();
  const monthStart = startOfUtcMonth(now);
  const monthEnd = endOfUtcMonth(now);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("skill, duration_seconds, ended_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("ended_at", "is", null)
    .gte("ended_at", monthStart.toISOString())
    .lt("ended_at", monthEnd.toISOString());

  if (error) {
    console.error("[study-analytics] getMonthlyStudyTime", error.message);
    throw new Error("Failed to load monthly study time");
  }

  const lastDay = new Date(monthEnd);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const daysInMonth = lastDay.getUTCDate();

  const weekCount = Math.ceil(daysInMonth / 7);
  const weeks: MonthWeekRow[] = [];
  for (let w = 0; w < weekCount; w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min((w + 1) * 7, daysInMonth);
    weeks.push({
      weekIndex: w + 1,
      startDay,
      endDay,
      bySkill: emptySkillRecord(),
      totalSeconds: 0,
    });
  }

  for (const row of data ?? []) {
    if (!row.ended_at) continue;
    const day = new Date(row.ended_at).getUTCDate();
    const weekIdx = Math.floor((day - 1) / 7);
    if (weekIdx < 0 || weekIdx >= weeks.length) continue;
    const bucket = weeks[weekIdx];
    addSeconds(bucket.bySkill, row.skill, row.duration_seconds ?? 0);
  }

  for (const w of weeks) {
    w.totalSeconds = Object.values(w.bySkill).reduce((a, b) => a + b, 0);
  }

  return weeks;
}

/**
 * Consecutive UTC days with at least one completed session (streak ends at first gap).
 * If today has no activity, the streak can still include yesterday onward.
 */
export async function getStudyStreak(userId: string): Promise<number> {
  const supabase = await requireUserClient(userId);

  const { data, error } = await supabase
    .from("study_sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("ended_at", "is", null);

  if (error) {
    console.error("[study-analytics] getStudyStreak", error.message);
    throw new Error("Failed to load study streak");
  }

  const daysWithSessions = new Set<string>();
  for (const row of data ?? []) {
    if (row.ended_at) daysWithSessions.add(utcDayKey(new Date(row.ended_at)));
  }

  const today = new Date();
  const todayKey = utcDayKey(today);

  let streak = 0;
  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0),
  );

  let allowSkipToday = !daysWithSessions.has(todayKey);

  for (let i = 0; i < 730; i++) {
    const key = utcDayKey(cursor);
    if (daysWithSessions.has(key)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      allowSkipToday = false;
      continue;
    }
    if (allowSkipToday && key === todayKey) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      allowSkipToday = false;
      continue;
    }
    break;
  }

  return streak;
}

/**
 * Share of study time (seconds) per skill as percentages of the completed-session total.
 */
export async function getSkillBreakdown(userId: string): Promise<SkillBreakdownRow[]> {
  const totals = await getAllTimeStudyTime(userId);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return Object.keys(emptySkillRecord()).map((skill) => ({
      skill,
      seconds: 0,
      percentage: 0,
    }));
  }

  return Object.entries(totals).map(([skill, seconds]) => ({
    skill,
    seconds,
    percentage: Math.round((seconds / total) * 1000) / 10,
  }));
}
