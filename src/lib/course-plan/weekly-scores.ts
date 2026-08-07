import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import type { TaskWeakness } from "@/lib/study-plan/weakness-vector";
import { rung, type RungLevel } from "@/lib/course-plan/rungs";

/**
 * Weekly rolling score per task type, for the /course score breakdown.
 *
 * Computed at READ time from practice_attempts rather than by a scheduled job:
 * the row counts here are small (one learner, a few hundred attempts), and a
 * cron would add a moving part that can silently stop without anyone noticing.
 *
 * Fallback chain, in order:
 *   1. this week's average from practice_attempts (score_pct × 1.6 → 0–160)
 *   2. last week's average, so a quiet week still shows something recent
 *   3. the weakness vector's latest known score (mock → mini → attempts)
 *   4. the one-time placement result, for a skill with no real attempts yet —
 *      lowest priority, since any real attempt should immediately supersede it
 *   5. nothing — the UI shows "ยังไม่มีข้อมูล"
 */

export type PlacementResult = {
  taskType: string;
  currentLevel: RungLevel;
  lastScore160: number | null;
  placedAt: string;
};

export type WeeklyScore = {
  taskType: string;
  /** 0–160. */
  score160: number;
  /** Where this number came from. */
  basis: "this_week" | "last_week" | "latest" | "placement";
  /** Attempts backing it. 0 when basis is "latest" or "placement". */
  attempts: number;
  /** Change vs the previous week, in 0–160 points. Null when not comparable. */
  deltaVsPrevWeek: number | null;
  /** ISO timestamp of the newest attempt in the window, when known. */
  at: string | null;
};

/** Bangkok-day bucket index (+07:00, no DST) — matches the rest of the app. */
function bangkokDayIndex(iso: string): number {
  return Math.floor((Date.parse(iso) + 7 * 3_600_000) / 86_400_000);
}

function average(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function clamp160(n: number): number {
  return Math.max(0, Math.min(160, Math.round(n)));
}

type AttemptRow = { task_type: string; score_pct: number | null; created_at: string };

/**
 * PostgREST reports an undeployed table as PGRST205 rather than Postgres' own
 * 42P01, so both have to be matched.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "")
  );
}

export async function computeWeeklyScores(
  userId: string,
  weakness: TaskWeakness[] = [],
  placements: PlacementResult[] = [],
): Promise<WeeklyScore[]> {
  const supabase = createServiceRoleSupabase();
  const since = new Date(Date.now() - 21 * 86_400_000).toISOString();

  let rows: AttemptRow[] = [];
  const { data, error } = await supabase
    .from("practice_attempts")
    .select("task_type, score_pct, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error && !isMissingTable(error)) {
    throw new Error(`[weekly-scores] attempts lookup failed: ${error.message}`);
  }
  rows = (data ?? []).filter((r) => typeof r.score_pct === "number") as AttemptRow[];

  const todayIdx = bangkokDayIndex(new Date().toISOString());
  const thisWeek = new Map<string, { scores: number[]; at: string }>();
  const lastWeek = new Map<string, number[]>();

  for (const r of rows) {
    const age = todayIdx - bangkokDayIndex(r.created_at);
    const score = clamp160((r.score_pct ?? 0) * 1.6);
    if (age < 0) continue;
    if (age < 7) {
      const cur = thisWeek.get(r.task_type);
      // rows arrive newest-first, so the first `at` seen is the newest
      if (cur) cur.scores.push(score);
      else thisWeek.set(r.task_type, { scores: [score], at: r.created_at });
    } else if (age < 14) {
      lastWeek.set(r.task_type, [...(lastWeek.get(r.task_type) ?? []), score]);
    }
  }

  const byTask = new Map(weakness.map((w) => [w.taskType, w]));
  const byPlacement = new Map(placements.map((p) => [p.taskType, p]));
  const taskTypes = new Set<string>([
    ...thisWeek.keys(),
    ...lastWeek.keys(),
    ...byTask.keys(),
    ...byPlacement.keys(),
  ]);

  const out: WeeklyScore[] = [];
  for (const taskType of taskTypes) {
    const cur = thisWeek.get(taskType);
    const prev = lastWeek.get(taskType);
    const prevAvg = prev && prev.length > 0 ? average(prev) : null;

    if (cur && cur.scores.length > 0) {
      const score = clamp160(average(cur.scores));
      out.push({
        taskType,
        score160: score,
        basis: "this_week",
        attempts: cur.scores.length,
        deltaVsPrevWeek: prevAvg === null ? null : Math.round(score - prevAvg),
        at: cur.at,
      });
      continue;
    }

    if (prevAvg !== null) {
      out.push({
        taskType,
        score160: clamp160(prevAvg),
        basis: "last_week",
        attempts: prev!.length,
        deltaVsPrevWeek: null,
        at: null,
      });
      continue;
    }

    const w = byTask.get(taskType);
    if (w) {
      out.push({
        taskType,
        score160: w.score160,
        basis: "latest",
        attempts: 0,
        deltaVsPrevWeek: null,
        at: w.at,
      });
      continue;
    }

    const p = byPlacement.get(taskType);
    if (p) {
      out.push({
        taskType,
        score160: p.lastScore160 ?? rung(p.currentLevel).entryScore,
        basis: "placement",
        attempts: 0,
        deltaVsPrevWeek: null,
        at: p.placedAt,
      });
    }
  }

  return out.sort((a, b) => a.score160 - b.score160);
}

/** This learner's placement-test results, or [] if none yet (including migration-not-deployed). */
export async function fetchSkillPlacements(userId: string): Promise<PlacementResult[]> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("course_skill_placement")
    .select("task_type, current_level, last_score160, placed_at")
    .eq("user_id", userId);

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(`[weekly-scores] placement lookup failed: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    taskType: r.task_type as string,
    currentLevel: r.current_level as RungLevel,
    lastScore160: r.last_score160 as number | null,
    placedAt: r.placed_at as string,
  }));
}
