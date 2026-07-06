import type { SupabaseClient } from "@supabase/supabase-js";

export type DayActivity = { date: string; attempts: number; avgScorePct: number; vocabSaved: number };

/**
 * What the learner ACTUALLY did each day, whether or not they followed the
 * study-plan calendar's suggested session — reconstructed from
 * practice_attempts (every auto-graded exercise, any surface) + notebook_sync
 * (vocab saves), so an off-plan study day still shows real activity instead
 * of looking blank on the calendar.
 */
export async function fetchRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  sinceDate: string,
): Promise<DayActivity[]> {
  const sinceIso = `${sinceDate}T00:00:00.000Z`;
  const [attemptsRes, notebookRes] = await Promise.all([
    supabase.from("practice_attempts").select("score_pct, created_at").eq("user_id", userId).gte("created_at", sinceIso),
    supabase.from("notebook_sync").select("payload, created_at").eq("user_id", userId).gte("created_at", sinceIso),
  ]);

  const byDate = new Map<string, DayActivity>();
  const dayOf = (iso: string) => iso.slice(0, 10);
  const entry = (d: string) => {
    let e = byDate.get(d);
    if (!e) { e = { date: d, attempts: 0, avgScorePct: 0, vocabSaved: 0 }; byDate.set(d, e); }
    return e;
  };

  for (const row of (attemptsRes.data ?? []) as { score_pct: number | null; created_at: string }[]) {
    const e = entry(dayOf(row.created_at));
    e.avgScorePct = Math.round((e.avgScorePct * e.attempts + (row.score_pct ?? 0)) / (e.attempts + 1));
    e.attempts += 1;
  }
  for (const row of (notebookRes.data ?? []) as { payload: { categoryIds?: string[] } | null; created_at: string }[]) {
    if (!row.payload?.categoryIds?.includes("vocabulary")) continue;
    entry(dayOf(row.created_at)).vocabSaved += 1;
  }
  return Array.from(byDate.values());
}
