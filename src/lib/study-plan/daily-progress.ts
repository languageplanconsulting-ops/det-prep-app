import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  DAILY_SKILL_META,
  DAILY_EXAM_TASK_TYPES,
  type DailyPlanItem,
  type DailyPlanSkill,
} from "./daily-plan";

/**
 * Derives daily-practice progress from the shared `practice_attempts` log — the fix for
 * the "any activity → whole day green" bug. Progress is PER SKILL GROUP, so a day is only
 * complete when every group's required count is met; otherwise it's honestly partial.
 *
 * Also computes per-skill improvement trends (recent avg + delta vs the prior window) for
 * the EXAM track only, so the calendar can tell a learner "your dictation is improving".
 *
 * Cross-platform for free: both web and mobile write practice_attempts with the same
 * task_type, so counting attempts here reflects work done on either device.
 */

export type GroupProgress = {
  skill: DailyPlanSkill;
  count: number;
  done: number;
  complete: boolean;
};

export type DayProgress = {
  groups: GroupProgress[];
  totalDone: number;
  total: number;
  complete: boolean;
};

export type SkillTrend = {
  skill: DailyPlanSkill;
  th: string;
  emoji: string;
  attempts: number;
  recentAvgPct: number | null;
  /** recent-window mean minus prior-window mean; null until there are two full windows. */
  deltaPoints: number | null;
  improved: boolean;
};

// Bangkok is UTC+7 with no DST — a "calendar day" for a Thai learner is this offset window.
const TZ_OFFSET = "+07:00";
const IMPROVEMENT_THRESHOLD_POINTS = 10;
const WINDOW_SIZE = 5;

const TASK_TO_SKILL: Record<string, DailyPlanSkill> = Object.fromEntries(
  (Object.entries(DAILY_SKILL_META) as [DailyPlanSkill, { taskType: string }][]).map(
    ([skill, m]) => [m.taskType, skill],
  ),
) as Record<string, DailyPlanSkill>;

function average(list: number[]): number {
  return list.reduce((a, b) => a + b, 0) / list.length;
}

/** Per-skill-group completion for one calendar day, derived from that day's attempts. */
export async function computeDayProgress(
  userId: string,
  planDate: string,
  items: DailyPlanItem[],
): Promise<DayProgress> {
  const supabase = createServiceRoleSupabase();
  const start = `${planDate}T00:00:00.000${TZ_OFFSET}`;
  const end = `${planDate}T23:59:59.999${TZ_OFFSET}`;

  const { data } = await supabase
    .from("practice_attempts")
    .select("task_type")
    .eq("user_id", userId)
    .gte("created_at", start)
    .lte("created_at", end);

  const perSkill = new Map<DailyPlanSkill, number>();
  for (const row of (data ?? []) as { task_type: string }[]) {
    const skill = TASK_TO_SKILL[row.task_type];
    if (!skill) continue;
    perSkill.set(skill, (perSkill.get(skill) ?? 0) + 1);
  }

  const groups: GroupProgress[] = items.map((it) => {
    const done = Math.min(perSkill.get(it.skill) ?? 0, it.count);
    return { skill: it.skill, count: it.count, done, complete: done >= it.count };
  });
  const total = groups.reduce((s, g) => s + g.count, 0);
  const totalDone = groups.reduce((s, g) => s + g.done, 0);
  return { groups, total, totalDone, complete: total > 0 && totalDone >= total };
}

/** Per-skill trend across recent EXAM attempts — feeds the "you're improving" panel. */
export async function computeSkillProgressSummary(userId: string): Promise<SkillTrend[]> {
  const supabase = createServiceRoleSupabase();
  // Fetch the MOST RECENT 2000 attempts (descending), then reverse to chronological order below —
  // an ascending-order query with the same limit would instead return the OLDEST 2000, making the
  // "recent window" stale garbage for any learner with more than 2000 lifetime attempts.
  const { data } = await supabase
    .from("practice_attempts")
    .select("task_type, score_pct, created_at")
    .eq("user_id", userId)
    .in("task_type", DAILY_EXAM_TASK_TYPES)
    .order("created_at", { ascending: false })
    .limit(2000);

  const chronological = [...(data ?? [])].reverse();

  const bySkill = new Map<DailyPlanSkill, number[]>();
  for (const row of chronological as { task_type: string; score_pct: number | null }[]) {
    const skill = TASK_TO_SKILL[row.task_type];
    if (!skill || row.score_pct == null) continue;
    const list = bySkill.get(skill) ?? [];
    list.push(row.score_pct);
    bySkill.set(skill, list);
  }

  return (Object.keys(DAILY_SKILL_META) as DailyPlanSkill[]).map((skill) => {
    const scores = bySkill.get(skill) ?? [];
    const meta = DAILY_SKILL_META[skill];
    if (scores.length === 0) {
      return { skill, th: meta.th, emoji: meta.emoji, attempts: 0, recentAvgPct: null, deltaPoints: null, improved: false };
    }
    const recent = scores.slice(-WINDOW_SIZE);
    const recentAvgPct = Math.round(average(recent));
    let deltaPoints: number | null = null;
    let improved = false;
    if (scores.length >= WINDOW_SIZE * 2) {
      const prior = scores.slice(-WINDOW_SIZE * 2, -WINDOW_SIZE);
      deltaPoints = Math.round(average(recent) - average(prior));
      improved = deltaPoints >= IMPROVEMENT_THRESHOLD_POINTS;
    }
    return { skill, th: meta.th, emoji: meta.emoji, attempts: scores.length, recentAvgPct, deltaPoints, improved };
  });
}
