/**
 * The 5-minute placement test.
 *
 * Purpose stated to the learner up front: this exists so they do not spend
 * weeks on skills they already have.
 *
 * Probe ladder, per skill — 2 items per level, 100% required to climb:
 *
 *   basic  ──not 100%──▶ placed BASIC
 *     │ 100%
 *   medium ──not 100%──▶ placed MEDIUM
 *     │ 100%
 *   hard   ──not 100%──▶ placed MEDIUM      ← deliberate: clearing medium but
 *     │ 100%                                  not hard still means the medium
 *   placed ADVANCED                           curriculum is where the work is
 *
 * Two items is a coarse instrument and 100% is a harsh bar, which is the point:
 * it is fast, and a false "you still need this level" only costs a few easy
 * sessions, whereas a false skip leaves a real hole in the foundation.
 */
import type { RungLevel } from "@/lib/course-plan/rungs";

export type PlacementLevel = "basic" | "medium" | "advanced";

export const PLACEMENT_TH: Record<PlacementLevel, string> = {
  basic: "พื้นฐาน",
  medium: "กลาง",
  advanced: "สูง",
};

/** Items asked per level in the probe. */
export const PROBE_ITEMS_PER_LEVEL = 2;
/** Accuracy required to climb to the next level. Nothing less than perfect. */
export const PROBE_PASS_RATIO = 1;

/** The order the probe walks. */
export const PROBE_LEVELS: RungLevel[] = ["easy", "medium", "hard"];

export type ProbeStep = {
  taskType: string;
  level: RungLevel;
  itemCount: number;
};

export type ProbeResult = {
  taskType: string;
  level: RungLevel;
  correct: number;
  total: number;
};

/** The next probe to ask, or null when this skill is settled. */
export function nextProbe(taskType: string, results: ProbeResult[]): ProbeStep | null {
  const forTask = results.filter((r) => r.taskType === taskType);

  for (const level of PROBE_LEVELS) {
    const done = forTask.find((r) => r.level === level);
    if (!done) {
      return { taskType, level, itemCount: PROBE_ITEMS_PER_LEVEL };
    }
    // Anything short of perfect stops the ladder here.
    if (done.total === 0 || done.correct / done.total < PROBE_PASS_RATIO) return null;
  }
  return null; // cleared every level
}

/**
 * Where the probe places a learner for one skill.
 *
 * Note the hard-level rule: failing `hard` still places them at MEDIUM, because
 * the medium curriculum is what will actually move them. Only a clean sweep of
 * all three reaches ADVANCED.
 */
export function placementFor(taskType: string, results: ProbeResult[]): PlacementLevel {
  const at = (level: RungLevel) => results.find((r) => r.taskType === taskType && r.level === level);
  const perfect = (r: ProbeResult | undefined) =>
    Boolean(r) && r!.total > 0 && r!.correct / r!.total >= PROBE_PASS_RATIO;

  if (!perfect(at("easy"))) return "basic";
  if (!perfect(at("medium"))) return "medium";
  if (!perfect(at("hard"))) return "medium";
  return "advanced";
}

export type SkillPlacement = {
  taskType: string;
  placement: PlacementLevel;
  /**
   * Tracks to schedule, in order.
   *
   * A basic placement does the basic curriculum AND THEN the medium one —
   * "go basic curriculum once it's done, add medium curriculum". A medium
   * placement skips straight to medium.
   */
  tracks: PlacementLevel[];
};

export function tracksFor(placement: PlacementLevel): PlacementLevel[] {
  switch (placement) {
    case "basic":
      return ["basic", "medium"];
    case "medium":
      return ["medium"];
    case "advanced":
      return ["advanced"];
  }
}

export function skillPlacement(taskType: string, results: ProbeResult[]): SkillPlacement {
  const placement = placementFor(taskType, results);
  return { taskType, placement, tracks: tracksFor(placement) };
}

/** Every skill's placement, from a full set of probe results. */
export function allPlacements(results: ProbeResult[]): SkillPlacement[] {
  const tasks = [...new Set(results.map((r) => r.taskType))];
  return tasks.map((t) => skillPlacement(t, results));
}

/**
 * Roughly how long the probe takes, for the "this takes 5 minutes" promise.
 *
 * Worst case is 3 levels x 2 items for every skill probed; most learners stop
 * after one or two levels, which is what keeps it near 5 minutes.
 */
export function estimatedProbeMinutes(taskTypes: string[], secondsPerItem = 20): number {
  const worstCaseItems = taskTypes.length * PROBE_LEVELS.length * PROBE_ITEMS_PER_LEVEL;
  return Math.ceil((worstCaseItems * secondsPerItem) / 60);
}

export const PLACEMENT_INTRO_TH =
  "ทำแบบวัดระดับสั้น ๆ ก่อน ประมาณ 5 นาที — เพื่อไม่ให้เสียเวลาไปกับทักษะที่คุณทำได้อยู่แล้ว";
