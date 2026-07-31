/**
 * Skill-progression simulation for the journey preview.
 *
 * Answers the four questions the fixed calendar cannot:
 *   1. When will each skill be "ready"?
 *   2. Which skill should be the focus right now?
 *   3. Will the learner hit their goal by the exam date?
 *   4. What happens when they plateau?
 *
 * ⚠️ This is a DESIGN SIMULATION, not a prediction engine. The gain curve is a
 * plausible shape (diminishing returns toward the ceiling), calibrated so a
 * 6-month/20-min plan moves a 90 to roughly 125. Real per-hour gain must be
 * measured from actual mock-to-mock deltas before any of this is shown to a
 * paying student or used in marketing.
 *
 * Scoring facts this relies on (Duolingo published, July 2024 subscore update):
 *   - Overall = the mean of the four individual subscores (R, W, L, S).
 *   - Every subscore is reported 10–160 in 5-point steps.
 * So the goal does NOT require the goal score in every skill — see
 * targetVectorFor().
 */

export type SkillKey = "reading" | "listening" | "writing" | "speaking";

export type ScoreVector = Record<SkillKey, number>;

export const SKILL_TH: Record<SkillKey, { th: string; emoji: string; productive: boolean }> = {
  reading: { th: "การอ่าน", emoji: "📖", productive: false },
  listening: { th: "การฟัง", emoji: "🎧", productive: false },
  writing: { th: "การเขียน", emoji: "✍️", productive: true },
  speaking: { th: "การพูด", emoji: "🎤", productive: true },
};

export const SKILL_KEYS: SkillKey[] = ["reading", "listening", "writing", "speaking"];

const CEILING = 160;
/** Subscore points per fully-focused 20-minute study day at maximum headroom. */
const BASE_GAIN_PER_DAY = 2.0;
/** A skill not currently in focus still drifts up from review/mixed practice. */
const MAINTENANCE_MULTIPLIER = 0.25;
/** Mocks needed at-or-above target before a skill counts as ready. */
const STABLE_MOCKS_REQUIRED = 2;
/** Overall gain across the last 3 mocks below which we call it a plateau. */
const PLATEAU_THRESHOLD = 5;

export function round5(n: number): number {
  return Math.max(10, Math.min(CEILING, Math.round(n / 5) * 5));
}

export function overallOf(v: ScoreVector): number {
  return round5((v.reading + v.listening + v.writing + v.speaking) / 4);
}

/**
 * Per-skill targets for a goal overall score.
 *
 * A skill already at or above the goal is HELD, never pushed higher — the
 * cheapest route to a higher average is always lifting the weak skills, and
 * asking a 130 reader to reach 145 for a 120 goal is both wasteful and
 * demoralising. The deficit is spread across the below-goal skills only, none
 * of which is ever asked to exceed the goal itself.
 *
 * This is what makes "you do not need 130 in everything" true and visible.
 */
export function targetVectorFor(goal: number, start: ScoreVector): ScoreVector {
  const raw: Record<SkillKey, number> = {
    reading: start.reading,
    listening: start.listening,
    writing: start.writing,
    speaking: start.speaking,
  };

  let deficit = goal * 4 - SKILL_KEYS.reduce((s, k) => s + raw[k], 0);

  // Spread the shortfall over the skills below the goal, capping each at the
  // goal. Repeats because capping one skill pushes its remainder onto others.
  for (let pass = 0; pass < 8 && deficit > 0.5; pass++) {
    const open = SKILL_KEYS.filter((k) => raw[k] < goal);
    if (open.length === 0) break;
    const share = deficit / open.length;
    for (const k of open) {
      const add = Math.min(goal - raw[k], share);
      raw[k] += add;
      deficit -= add;
    }
  }

  const out = {} as ScoreVector;
  for (const k of SKILL_KEYS) out[k] = round5(raw[k]);
  return out;
}

/**
 * Daily subscore gain. Diminishing returns toward the ceiling are what produce
 * the real-world plateau: 90 → 110 is fast, 115 → 130 is slow.
 */
function dailyGain(current: number, isFocus: boolean, minutes: number): number {
  const headroom = Math.max(0, (CEILING - current) / CEILING);
  const difficulty = Math.pow(headroom, 1.6);
  const focusMult = isFocus ? 1 : MAINTENANCE_MULTIPLIER;
  return BASE_GAIN_PER_DAY * difficulty * focusMult * (minutes / 20);
}

export type SkillState = {
  skill: SkillKey;
  current: number;
  target: number;
  /** Confirmed by STABLE_MOCKS_REQUIRED consecutive mocks at/above target. */
  ready: boolean;
  /** Mocks in a row at or above target so far. */
  stableCount: number;
  gapToTarget: number;
};

export type MockCheckpoint = {
  date: string;
  dayIndex: number;
  vector: ScoreVector;
  overall: number;
};

export type DayProgressState = {
  dayIndex: number;
  date: string;
  vector: ScoreVector;
  overall: number;
  /** Skill receiving focused practice this day. Null once all are ready. */
  focus: SkillKey | null;
  readySkills: SkillKey[];
  skills: SkillState[];
  /** Last measured mock overall, or null before the first mock. */
  lastMockOverall: number | null;
};

export type Milestone = {
  skill: SkillKey;
  dayIndex: number;
  date: string;
  score: number;
};

export type PlateauSignal = {
  detected: boolean;
  /** Skill capping the overall — the one furthest below its target. */
  cappingSkill: SkillKey | null;
  /** True when the cap is speaking/writing, where auto-grading can't diagnose. */
  needsHumanMarking: boolean;
  messageTh: string;
};

export type JourneyProgress = {
  days: DayProgressState[];
  mocks: MockCheckpoint[];
  milestones: Milestone[];
  target: ScoreVector;
  finalVector: ScoreVector;
  projectedOverall: number;
  goal: number;
  /** Projected to reach the goal on or before the exam date. */
  willReachGoal: boolean;
  /** First day the projection reaches the goal, if any. */
  goalReachedDayIndex: number | null;
  plateau: PlateauSignal;
};

export type SimulateInput = {
  start: ScoreVector;
  goal: number;
  minutesPerDay: number;
  /** One entry per calendar day: date + whether it is a study/mock/rest day. */
  days: { date: string; kind: "video" | "drill" | "mock" | "rest" }[];
};

/** Weakest skill still short of target — the one worth focusing on. */
function pickFocus(skills: SkillState[]): SkillKey | null {
  const open = skills.filter((s) => !s.ready);
  if (open.length === 0) return null;
  return open.reduce((worst, s) => (s.current < worst.current ? s : worst)).skill;
}

export function simulateJourney(input: SimulateInput): JourneyProgress {
  const target = targetVectorFor(input.goal, input.start);
  const vector: ScoreVector = { ...input.start };
  const stable: Record<SkillKey, number> = {
    reading: 0,
    listening: 0,
    writing: 0,
    speaking: 0,
  };
  const ready: Record<SkillKey, boolean> = {
    reading: false,
    listening: false,
    writing: false,
    speaking: false,
  };

  const days: DayProgressState[] = [];
  const mocks: MockCheckpoint[] = [];
  const milestones: Milestone[] = [];
  let lastMockOverall: number | null = null;
  let goalReachedDayIndex: number | null = null;

  input.days.forEach((d, i) => {
    const skillStates = (): SkillState[] =>
      SKILL_KEYS.map((k) => ({
        skill: k,
        current: round5(vector[k]),
        target: target[k],
        ready: ready[k],
        stableCount: stable[k],
        gapToTarget: Math.max(0, target[k] - round5(vector[k])),
      }));

    // Everything recorded for a day is the state the learner sees when they
    // OPEN the app that morning: scores so far, and the focus chosen from them.
    // The day's gain is applied afterwards so it shows up tomorrow — recording
    // post-gain scores next to a focus picked pre-gain made the UI contradict
    // itself (focus said "speaking" while the bars already showed it highest).
    const snapshot = skillStates();
    const focus = pickFocus(snapshot);
    const overall = overallOf(vector);
    if (goalReachedDayIndex === null && overall >= input.goal) goalReachedDayIndex = i;

    days.push({
      dayIndex: i,
      date: d.date,
      vector: { ...vector },
      overall,
      focus,
      readySkills: SKILL_KEYS.filter((k) => ready[k]),
      skills: snapshot,
      lastMockOverall,
    });

    if (d.kind !== "rest") {
      for (const k of SKILL_KEYS) {
        vector[k] = Math.min(CEILING, vector[k] + dailyGain(vector[k], k === focus, input.minutesPerDay));
      }
    }

    if (d.kind === "mock") {
      const measured: ScoreVector = {
        reading: round5(vector.reading),
        listening: round5(vector.listening),
        writing: round5(vector.writing),
        speaking: round5(vector.speaking),
      };
      const mockOverall = overallOf(measured);
      mocks.push({ date: d.date, dayIndex: i, vector: measured, overall: mockOverall });
      lastMockOverall = mockOverall;

      // A skill only becomes "ready" on measured evidence, never on the
      // simulation's running total — same rule the real product must use.
      for (const k of SKILL_KEYS) {
        if (measured[k] >= target[k]) {
          stable[k] += 1;
          if (stable[k] >= STABLE_MOCKS_REQUIRED && !ready[k]) {
            ready[k] = true;
            milestones.push({ skill: k, dayIndex: i, date: d.date, score: measured[k] });
          }
        } else {
          stable[k] = 0;
        }
      }
    }
  });

  const finalVector: ScoreVector = {
    reading: round5(vector.reading),
    listening: round5(vector.listening),
    writing: round5(vector.writing),
    speaking: round5(vector.speaking),
  };
  const projectedOverall = overallOf(finalVector);

  return {
    days,
    mocks,
    milestones,
    target,
    finalVector,
    projectedOverall,
    goal: input.goal,
    willReachGoal: projectedOverall >= input.goal,
    goalReachedDayIndex,
    plateau: detectPlateau(mocks, finalVector, target, projectedOverall, input.goal),
  };
}

export function detectPlateau(
  mocks: MockCheckpoint[],
  finalVector: ScoreVector,
  target: ScoreVector,
  projectedOverall: number,
  goal: number,
): PlateauSignal {
  const capping = SKILL_KEYS.reduce<SkillKey>((worst, k) => {
    const gap = target[k] - finalVector[k];
    const worstGap = target[worst] - finalVector[worst];
    return gap > worstGap ? k : worst;
  }, "reading");

  const gapExists = target[capping] - finalVector[capping] > 0;
  const recent = mocks.slice(-3);
  const movement =
    recent.length >= 3 ? recent[recent.length - 1].overall - recent[0].overall : Number.POSITIVE_INFINITY;

  const detected = projectedOverall < goal && (movement < PLATEAU_THRESHOLD || gapExists);
  const productive = SKILL_TH[capping].productive;

  let messageTh: string;
  if (!detected) {
    messageTh = "แผนกำลังไปได้ดี — ถึงเป้าตามกำหนด";
  } else if (productive) {
    messageTh = `ติดที่${SKILL_TH[capping].th} — ทักษะนี้ระบบตรวจเองไม่ได้แม่นพอ ต้องมีคนตรวจงานให้`;
  } else {
    messageTh = `ติดที่${SKILL_TH[capping].th} — โจทย์ที่ทำอยู่ง่ายเกินไปแล้ว ต้องขยับระดับความยากขึ้น`;
  }

  return {
    detected,
    cappingSkill: detected ? capping : null,
    needsHumanMarking: detected && productive,
    messageTh,
  };
}

/** Starting profiles for the preview's scenario picker. */
export const START_PRESETS: { key: string; th: string; vector: ScoreVector; goal: number }[] = [
  {
    key: "beginner90",
    th: "เริ่มที่ 90 — อยากได้ 120",
    vector: { reading: 100, listening: 95, writing: 85, speaking: 80 },
    goal: 120,
  },
  {
    key: "stuck115",
    th: "ติดที่ 115 — อยากได้ 130",
    vector: { reading: 130, listening: 125, writing: 105, speaking: 100 },
    goal: 130,
  },
  {
    key: "reader105",
    th: "อ่านเก่ง พูดไม่ได้ (105)",
    vector: { reading: 130, listening: 115, writing: 95, speaking: 80 },
    goal: 120,
  },
  {
    key: "low70",
    th: "เริ่มจากศูนย์ (70)",
    vector: { reading: 80, listening: 75, writing: 65, speaking: 60 },
    goal: 110,
  },
];
