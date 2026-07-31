/**
 * The rung ladder: how a student climbs one skill from where they are to where
 * they want to be.
 *
 * The whole personalisation model is three rules over 11 task types × 3 levels
 * = 33 cells. No student's plan is authored by hand; every path is generated
 * from their own score vector.
 *
 *   1. ENTRY    — the current score picks the rung they start on.
 *   2. CHECK    — 5 questions from the rung below confirm they can skip it.
 *   3. PROMOTE  — hit the rung's exit score twice in a row to move up.
 *
 * Scores are DET's 0–160 scale. Overall = the mean of the four individual
 * subscores, so lifting a weak skill is always the cheapest route up.
 */

export type RungLevel = "easy" | "medium" | "hard";

export const RUNG_TH: Record<RungLevel, string> = {
  easy: "ง่าย",
  medium: "กลาง",
  hard: "ยาก",
};

export const RUNG_ORDER: RungLevel[] = ["easy", "medium", "hard"];

export type Rung = {
  level: RungLevel;
  th: string;
  /** Scores at or above this enter here (and below the next rung's entry). */
  entryScore: number;
  /** Reaching this twice promotes to the next rung. */
  exitScore: number;
};

/**
 * Band edges. `easy` catches everything below 95; `hard` is open-ended because
 * its exit is the learner's own goal, not a fixed number.
 */
export const RUNGS: Rung[] = [
  { level: "easy", th: "ง่าย", entryScore: 0, exitScore: 100 },
  { level: "medium", th: "กลาง", entryScore: 95, exitScore: 120 },
  { level: "hard", th: "ยาก", entryScore: 120, exitScore: 160 },
];

export function rung(level: RungLevel): Rung {
  return RUNGS.find((r) => r.level === level) ?? RUNGS[0];
}

/** Accuracy on the 5-question check at or above which the rung is skipped. */
export const CHECK_PASS_RATIO = 0.85;
/** Questions in a placement check. */
export const CHECK_QUESTION_COUNT = 5;
/** Consecutive assessments at/above the exit score needed to be promoted. */
export const PROMOTE_STREAK = 2;

/** The rung a score lands on, before any placement check. */
export function rungForScore(score160: number): RungLevel {
  if (score160 >= RUNGS[2].entryScore) return "hard";
  if (score160 >= RUNGS[1].entryScore) return "medium";
  return "easy";
}

export function nextRung(level: RungLevel): RungLevel | null {
  const i = RUNG_ORDER.indexOf(level);
  return i >= 0 && i < RUNG_ORDER.length - 1 ? RUNG_ORDER[i + 1] : null;
}

export function prevRung(level: RungLevel): RungLevel | null {
  const i = RUNG_ORDER.indexOf(level);
  return i > 0 ? RUNG_ORDER[i - 1] : null;
}

export type PlacementCheck = {
  taskType: string;
  /** The rung being confirmed as skippable. */
  level: RungLevel;
  questionCount: number;
  /** Ratio needed to skip. */
  passRatio: number;
  reasonTh: string;
};

/**
 * Whether entering `level` should be preceded by a check of the rung below.
 *
 * A score of 90 in dictation is rarely "evenly 90" — it is usually 100 on
 * everything except one systematic fault. Five questions find that in two
 * minutes instead of burning three weeks on content they did not need, or
 * skipping a hole they did.
 */
export function placementCheckFor(taskType: string, entry: RungLevel): PlacementCheck | null {
  const below = prevRung(entry);
  if (!below) return null;
  return {
    taskType,
    level: below,
    questionCount: CHECK_QUESTION_COUNT,
    passRatio: CHECK_PASS_RATIO,
    reasonTh: `เช็ก ${CHECK_QUESTION_COUNT} ข้อระดับ${RUNG_TH[below]} — ถ้าได้ ${Math.round(
      CHECK_PASS_RATIO * 100,
    )}% ขึ้นไป ข้ามไประดับ${RUNG_TH[entry]} ได้เลย`,
  };
}

/** Apply a completed check: pass keeps the entry rung, fail drops one rung. */
export function applyCheckResult(entry: RungLevel, correct: number, total: number): RungLevel {
  if (total <= 0) return entry;
  if (correct / total >= CHECK_PASS_RATIO) return entry;
  return prevRung(entry) ?? entry;
}

export type RungStep = {
  taskType: string;
  level: RungLevel;
  /** Score this step is trying to reach. */
  goalScore: number;
  /** Where the learner is when this step begins. */
  fromScore: number;
  /** Set on the first step when a placement check should run first. */
  check: PlacementCheck | null;
};

/**
 * The rungs a learner must climb in ONE task type to reach their target.
 *
 * Example — dictation 90 → 130:
 *   easy   (90 → 100)   with a check of… nothing, easy is the bottom
 *   medium (100 → 120)
 *   hard   (120 → 130)
 *
 * Example — dictation 125 → 130:
 *   hard   (125 → 130)  with a 5-question check of medium first
 */
export function rungPath(taskType: string, currentScore: number, targetScore: number): RungStep[] {
  const steps: RungStep[] = [];
  if (targetScore <= currentScore) return steps;

  let level = rungForScore(currentScore);
  let from = currentScore;
  let guard = 0;

  while (guard++ < RUNG_ORDER.length) {
    const r = rung(level);
    // The last rung stops at the learner's target, not at the band's ceiling.
    const goal = Math.min(targetScore, r.exitScore);
    steps.push({
      taskType,
      level,
      goalScore: goal,
      fromScore: from,
      check: steps.length === 0 ? placementCheckFor(taskType, level) : null,
    });

    if (goal >= targetScore) break;
    const next = nextRung(level);
    if (!next) break;
    from = goal;
    level = next;
  }

  return steps;
}

export type SkillTarget = { taskType: string; currentScore: number; targetScore: number };

/**
 * Every rung a learner must climb, across every skill, weakest first.
 *
 * This is the "100 types of student" answer: the caller passes a score vector
 * and a goal, and gets back that student's entire path. Nothing is authored
 * per student.
 */
export function fullRungPlan(targets: SkillTarget[]): RungStep[] {
  return [...targets]
    .sort((a, b) => a.currentScore - b.currentScore)
    .flatMap((t) => rungPath(t.taskType, t.currentScore, t.targetScore));
}

/**
 * Per-skill targets for an overall goal.
 *
 * A skill already at or above the goal is held rather than pushed higher —
 * the cheapest route to a higher average is always lifting the weak skills.
 * Mirrors targetVectorFor() in study-plan/journey-progress.ts.
 */
export function skillTargetsFor(
  scores: { taskType: string; score160: number }[],
  goalOverall: number,
): SkillTarget[] {
  if (scores.length === 0) return [];
  const raw = new Map(scores.map((s) => [s.taskType, s.score160]));
  let deficit = goalOverall * scores.length - scores.reduce((s, x) => s + x.score160, 0);

  for (let pass = 0; pass < 8 && deficit > 0.5; pass++) {
    const open = scores.filter((s) => (raw.get(s.taskType) ?? 0) < goalOverall);
    if (open.length === 0) break;
    const share = deficit / open.length;
    for (const s of open) {
      const cur = raw.get(s.taskType) ?? 0;
      const add = Math.min(goalOverall - cur, share);
      raw.set(s.taskType, cur + add);
      deficit -= add;
    }
  }

  return scores.map((s) => ({
    taskType: s.taskType,
    currentScore: s.score160,
    targetScore: Math.round((raw.get(s.taskType) ?? s.score160) / 5) * 5,
  }));
}
