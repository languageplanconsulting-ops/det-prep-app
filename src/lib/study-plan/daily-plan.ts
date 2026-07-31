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

/**
 * Coerce a stored `items` jsonb blob into valid plan groups. Entries whose skill
 * isn't one of the five daily skills are dropped — an unrecognized skill can
 * never be matched by progress counting, so keeping it would make the day
 * permanently impossible to complete.
 */
export function normalizeDailyPlanItems(raw: unknown): DailyPlanItem[] {
  if (!Array.isArray(raw)) return [];
  const items: DailyPlanItem[] = [];
  for (const el of raw) {
    const o = (el ?? {}) as Record<string, unknown>;
    const skill = o.skill;
    const count = o.count;
    if (typeof skill !== "string" || !(skill in DAILY_SKILL_META)) continue;
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) continue;
    items.push({ skill: skill as DailyPlanSkill, count: Math.floor(count) });
  }
  return items;
}

/** practice_attempts/mock task_type → the daily-plan skill that trains it. */
export const TASK_TYPE_TO_DAILY_SKILL: Record<string, DailyPlanSkill> = {
  dictation: "dictation",
  fill_in_blanks: "fitb",
  vocabulary_reading: "vocab",
  reading_comprehension: "reading",
  real_english_word: "realword",
};

/** Higher number = weaker = wants more slots. Skills absent from the map are neutral. */
export type DailySkillPriority = Partial<Record<DailyPlanSkill, number>>;

/**
 * Reweight a fixed exam sequence toward the learner's weak skills, keeping the
 * total exercise count identical (same time budget). Deterministic:
 *  - budget = round(total / 5) slots move (1 for 5/10-min days, 2 for 20/30-min),
 *  - each moved slot is taken from the strongest prioritized skill still holding
 *    a slot and given to the weakest, then groups are re-ordered weakest-first
 *    so the day starts on the weakness. Zero-count groups drop out.
 * With no priorities (no assessment yet) the base sequence returns unchanged.
 */
export function personalizeExamItems(
  base: DailyPlanItem[],
  priorities: DailySkillPriority,
): DailyPlanItem[] {
  const items = base.map((it) => ({ ...it }));
  const ranked = Object.entries(priorities)
    .filter((e): e is [DailyPlanSkill, number] => typeof e[1] === "number")
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return items;

  const weakest = ranked[0][0];
  if (!items.some((it) => it.skill === weakest)) items.push({ skill: weakest, count: 0 });

  const total = planTotalCount(items);
  let budget = Math.max(1, Math.round(total / 5));
  const to = items.find((it) => it.skill === weakest)!;

  /**
   * Slot reallocation obeys two rules that together keep a day both focused and
   * balanced:
   *
   *  1. NEVER drop a skill entirely — a donor must keep at least one slot. A day
   *     that collapses to two or three skills stops resembling the real test.
   *  2. NEVER gut the learner's other weaknesses — a donor that is itself flagged
   *     weak gives up at most one slot, so feeding the worst weakness can't come
   *     mostly out of the second-worst (which is typically the other multi-slot
   *     group, and would otherwise be the first thing raided).
   *
   * Strongest skills donate first: those with no weakness signal at all, then the
   * least-weak signalled ones.
   */
  const donatedByWeakSkill = new Map<DailyPlanSkill, number>();
  const WEAK_DONOR_MAX = 1;

  while (budget > 0) {
    const donors = items
      .filter((it) => {
        if (it.skill === weakest || it.count <= 1) return false;
        const isWeakDonor = priorities[it.skill] !== undefined;
        if (!isWeakDonor) return true;
        return (donatedByWeakSkill.get(it.skill) ?? 0) < WEAK_DONOR_MAX;
      })
      .sort(
        (a, b) =>
          (priorities[a.skill] ?? Number.NEGATIVE_INFINITY) -
          (priorities[b.skill] ?? Number.NEGATIVE_INFINITY),
      );
    if (!donors.length) break;

    const from = donors[0];
    from.count -= 1;
    to.count += 1;
    budget -= 1;
    if (priorities[from.skill] !== undefined) {
      donatedByWeakSkill.set(from.skill, (donatedByWeakSkill.get(from.skill) ?? 0) + 1);
    }
  }

  const rank = (s: DailyPlanSkill) => priorities[s] ?? -1;
  return items.filter((it) => it.count > 0).sort((a, b) => rank(b.skill) - rank(a.skill));
}

const VALID_TIERS: DailyTier[] = [5, 10, 20, 30];
export function isDailyTier(n: number): n is DailyTier {
  return (VALID_TIERS as number[]).includes(n);
}
