/**
 * Daily-plan sequence engine — the deterministic "recipe" for one calendar day.
 *
 * Ported from the mobile app's fixed sequences (det-mobile/src/lib/daily-practice.ts
 * CATEGORY_TIER_AUTO / DAILY_SEQUENCES) so the WEB day plan is no longer random and
 * matches mobile exactly, skill-for-skill, per time budget. Kept framework-free (no
 * "server-only", no React) so the API route, the calendar card, and the runner can all
 * share one source of truth.
 *
 * A day plan is an ordered list of skill GROUPS ({ skill, count }). The learner can run
 * the whole thing ("ทำทั้งหมดเลย") or one group at a time (tap "dictation" → its N
 * dictations). Per-group progress is derived elsewhere from practice_attempts.
 */

export type DailyTier = 5 | 10 | 20 | 30;
export type DailyTrack = "exam" | "lesson";

/** The auto-graded skills a daily EXAM plan is built from (the embeddable-inline ones). */
export type DailyPlanSkill = "dictation" | "fitb" | "vocab" | "reading" | "realword";

export type DailyPlanItem = { skill: DailyPlanSkill; count: number };

/** Per-skill display + the practice_attempts.task_type it logs as (the cross-platform match key). */
export const DAILY_SKILL_META: Record<
  DailyPlanSkill,
  { emoji: string; th: string; taskType: string }
> = {
  dictation: { emoji: "🎧", th: "ตามคำบอก", taskType: "dictation" },
  fitb: { emoji: "✏️", th: "เติมคำในช่องว่าง", taskType: "fill_in_blanks" },
  vocab: { emoji: "📚", th: "ศัพท์", taskType: "vocabulary_reading" },
  reading: { emoji: "📖", th: "การอ่าน", taskType: "reading_comprehension" },
  realword: { emoji: "🔤", th: "คำจริง", taskType: "real_english_word" },
};

/** All task_types that count as "daily exam practice" for progress/improvement stats. */
export const DAILY_EXAM_TASK_TYPES: string[] = Object.values(DAILY_SKILL_META).map(
  (m) => m.taskType,
);

/**
 * Fixed EXAM-track sequences per time budget, grouped by skill in run order.
 * The 20-min plan mirrors mobile's literacy tier-20 auto sequence
 * (dictation×3 → fitb×2 → vocab → reading → realword) — the exact set the founder approved
 * in the calendar preview.
 */
const EXAM_SEQUENCES: Record<DailyTier, DailyPlanItem[]> = {
  5: [
    { skill: "dictation", count: 1 },
    { skill: "fitb", count: 1 },
    { skill: "vocab", count: 1 },
    { skill: "reading", count: 1 },
    { skill: "realword", count: 1 },
  ],
  10: [
    { skill: "dictation", count: 2 },
    { skill: "fitb", count: 2 },
    { skill: "vocab", count: 1 },
    { skill: "realword", count: 1 },
  ],
  20: [
    { skill: "dictation", count: 3 },
    { skill: "fitb", count: 2 },
    { skill: "vocab", count: 1 },
    { skill: "reading", count: 1 },
    { skill: "realword", count: 1 },
  ],
  30: [
    { skill: "dictation", count: 3 },
    { skill: "fitb", count: 3 },
    { skill: "vocab", count: 2 },
    { skill: "reading", count: 2 },
    { skill: "realword", count: 2 },
  ],
};

/**
 * The ordered skill groups for one day, given the time budget and track.
 * (Lesson-track plans are not skill-group sequences — they route into the lessons hub —
 * so this returns [] for "lesson"; callers branch on track before rendering groups.)
 */
export function buildDailyPlanItems(tier: DailyTier, track: DailyTrack): DailyPlanItem[] {
  if (track === "lesson") return [];
  return EXAM_SEQUENCES[tier].map((it) => ({ ...it }));
}

/** Total number of exercises in a plan (sum of group counts). */
export function planTotalCount(items: DailyPlanItem[]): number {
  return items.reduce((sum, it) => sum + it.count, 0);
}

const VALID_TIERS: DailyTier[] = [5, 10, 20, 30];
export function isDailyTier(n: number): n is DailyTier {
  return (VALID_TIERS as number[]).includes(n);
}
