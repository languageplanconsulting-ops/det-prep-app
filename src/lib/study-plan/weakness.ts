import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Weakness aggregation for the study-plan dashboard.
 *
 * Auto-graded skills (dictation/fitb/vocab/reading/realword) come from
 * `practice_attempts` (shared with the mobile app's Daily Practice).
 * AI-graded production dimensions (grammar/vocabulary/coherence/taskRelevancy)
 * come from `data_collection_submissions.report` — the same full report every
 * writing/speaking/photo-speak/interactive-speaking/dialogue-summary route
 * already saves via recordDataCollectionSubmission(). That table is
 * admin-only by RLS, so this reads it with the service-role key and scopes
 * the query to the caller's own user id manually (never exposes other rows).
 */

const WEAK_THRESHOLD = 80;
const RECENT_ATTEMPTS_LIMIT = 300;

export type SkillWeakness = {
  taskType: string;
  difficulty: string;
  attempts: number;
  avgScorePct: number;
  isWeak: boolean;
};

const DIMENSIONS = ["grammar", "vocabulary", "coherence", "taskRelevancy"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type DimensionWeakness = {
  dimension: Dimension;
  attempts: number;
  avgScorePercent: number;
  isWeak: boolean;
};

export type WeaknessReport = {
  autoGraded: SkillWeakness[];
  aiGraded: DimensionWeakness[];
  weakestDimension: DimensionWeakness | null;
  latestPrediction: { target: number; predicted: number } | null;
};

export async function computeWeaknessReport(userId: string): Promise<WeaknessReport> {
  const supabase = createServiceRoleSupabase();

  const { data: predictionRow } = await supabase
    .from("study_plan_results")
    .select("target, predicted")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestPrediction = predictionRow
    ? { target: predictionRow.target as number, predicted: predictionRow.predicted as number }
    : null;

  const { data: attempts } = await supabase
    .from("practice_attempts")
    .select("task_type, score_pct, detail")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ATTEMPTS_LIMIT);

  const bySkill = new Map<string, { sum: number; n: number }>();
  for (const row of (attempts ?? []) as {
    task_type: string;
    score_pct: number | null;
    detail: Record<string, unknown> | null;
  }[]) {
    const difficulty = typeof row.detail?.difficulty === "string" ? (row.detail.difficulty as string) : "unknown";
    const key = `${row.task_type}:${difficulty}`;
    const bucket = bySkill.get(key) ?? { sum: 0, n: 0 };
    bucket.sum += row.score_pct ?? 0;
    bucket.n += 1;
    bySkill.set(key, bucket);
  }
  const autoGraded: SkillWeakness[] = Array.from(bySkill.entries()).map(([key, { sum, n }]) => {
    const [taskType, difficulty] = key.split(":");
    const avg = Math.round(sum / n);
    return { taskType, difficulty, attempts: n, avgScorePct: avg, isWeak: avg < WEAK_THRESHOLD };
  });

  const { data: submissions } = await supabase
    .from("data_collection_submissions")
    .select("report")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ATTEMPTS_LIMIT);

  const byDim = new Map<Dimension, { sum: number; n: number }>();
  for (const row of (submissions ?? []) as { report: Record<string, unknown> | null }[]) {
    for (const dim of DIMENSIONS) {
      const c = row.report?.[dim] as { scorePercent?: unknown } | undefined;
      if (c && typeof c.scorePercent === "number") {
        const bucket = byDim.get(dim) ?? { sum: 0, n: 0 };
        bucket.sum += c.scorePercent;
        bucket.n += 1;
        byDim.set(dim, bucket);
      }
    }
  }
  const aiGraded: DimensionWeakness[] = DIMENSIONS.filter((d) => byDim.has(d)).map((d) => {
    const { sum, n } = byDim.get(d)!;
    const avg = Math.round(sum / n);
    return { dimension: d, attempts: n, avgScorePercent: avg, isWeak: avg < WEAK_THRESHOLD };
  });

  const weakestDimension = aiGraded.length
    ? aiGraded.reduce((a, b) => (a.avgScorePercent <= b.avgScorePercent ? a : b))
    : null;

  return { autoGraded, aiGraded, weakestDimension, latestPrediction };
}
