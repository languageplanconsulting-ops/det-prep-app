/**
 * The per-skill placement test.
 *
 * Purpose stated to the learner up front: this exists so they do not spend
 * weeks on skills they already have — and so a skill they're weak in starts
 * at the right level too, independently of every other skill.
 *
 * Probe ladder, per skill — 2 items per level, 100% required to climb:
 *
 *   easy   ──not 100%──▶ placed EASY
 *     │ 100%
 *   medium ──not 100%──▶ placed MEDIUM
 *     │ 100%
 *   hard   ──not 100%──▶ placed MEDIUM      ← deliberate: clearing medium but
 *     │ 100%                                  not hard still means the medium
 *   placed HARD                               curriculum is where the work is
 *
 * Two items is a coarse instrument and 100% is a harsh bar, which is the point:
 * it is fast, and a false "you still need this level" only costs a few easy
 * sessions, whereas a false skip leaves a real hole in the foundation.
 *
 * This only applies to the 6 "objective" task types (right/wrong graded, no AI).
 * The other 6 (write_about_photo, speak_about_photo, read_and_write,
 * read_then_speak, interactive_speaking, dialogue_summary) are AI-graded and use
 * ONE submission, bucketed directly via rungForScore() — no ladder walk, since
 * asking for 2 AI-graded submissions per level would make the whole test far
 * too long (see estimatedProbeMinutes below).
 */
import { rungForScore, type RungLevel } from "@/lib/course-plan/rungs";

/** Items asked per level in the probe. */
export const PROBE_ITEMS_PER_LEVEL = 2;
/** Accuracy required to climb to the next level. Nothing less than perfect. */
export const PROBE_PASS_RATIO = 1;

/** The order the probe walks. */
export const PROBE_LEVELS: RungLevel[] = ["easy", "medium", "hard"];

/** The 6 right/wrong graded task types that walk the 2-item ladder. */
export const OBJECTIVE_PLACEMENT_TASKS = [
  "dictation",
  "real_english_word",
  "fill_in_blanks",
  "reading_comprehension",
  "vocabulary_reading",
  "interactive_conversation_mcq",
] as const;

/** The 6 AI-graded task types placed by a single scored submission. */
export const AI_GRADED_PLACEMENT_TASKS = [
  "write_about_photo",
  "speak_about_photo",
  "read_and_write",
  "read_then_speak",
  "interactive_speaking",
  "dialogue_summary",
] as const;

// ---------------------------------------------------------------------------
// The 3-skill core probe
// ---------------------------------------------------------------------------

/**
 * Only THREE skills are actually measured.
 *
 * Probing all twelve was a ~22-minute exam standing between a paying learner and
 * their first lesson — the single largest drop-off in the funnel, and it bought
 * precision the curriculum does not need on day one. These three span the
 * modalities that actually differ between learners:
 *
 *   fill_in_blanks    → written accuracy: grammar, spelling, vocabulary
 *   dictation         → listening
 *   write_about_photo → free production under time
 *
 * Everything else is inferred (see INFERRED_FROM) and then corrected by the rung
 * ladder within a session or two of real work — which is a better instrument
 * than two multiple-choice items anyway. Cost of a wrong inference: a few easy
 * sessions. Cost of the long exam: they never start.
 */
export const CORE_OBJECTIVE_PLACEMENT_TASKS = ["fill_in_blanks", "dictation"] as const;
export const CORE_AI_PLACEMENT_TASKS = ["write_about_photo"] as const;

/** The probe order — objective ladders first, so two skills settle in ~2 minutes. */
export const CORE_PLACEMENT_TASKS = [
  ...CORE_OBJECTIVE_PLACEMENT_TASKS,
  ...CORE_AI_PLACEMENT_TASKS,
] as const;

export type CorePlacementTask = (typeof CORE_PLACEMENT_TASKS)[number];

/**
 * Which measured skill(s) each unmeasured skill takes its level from.
 *
 * Where a skill draws on two modalities it lists both and takes the LOWER of the
 * two — a learner who writes well but cannot hear the prompt is not ready for
 * hard dialogue summary, and starting too low is the cheap mistake.
 */
export const INFERRED_FROM: Record<string, CorePlacementTask[]> = {
  // Written accuracy carries the reading/vocabulary family.
  real_english_word: ["fill_in_blanks"],
  reading_comprehension: ["fill_in_blanks"],
  vocabulary_reading: ["fill_in_blanks"],
  // Listening carries the interactive-comprehension family.
  interactive_conversation_mcq: ["dictation"],
  // Production carries speaking.
  speak_about_photo: ["write_about_photo"],
  // Mixed: read + produce.
  read_and_write: ["fill_in_blanks", "write_about_photo"],
  read_then_speak: ["fill_in_blanks", "write_about_photo"],
  // Mixed: listen + produce.
  dialogue_summary: ["dictation", "write_about_photo"],
  interactive_speaking: ["dictation", "write_about_photo"],
};

const LEVEL_RANK: Record<RungLevel, number> = { easy: 0, medium: 1, hard: 2 };

/** The more conservative of two levels. */
function lowerLevel(a: RungLevel, b: RungLevel): RungLevel {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

export type InferredPlacement = {
  taskType: string;
  level: RungLevel;
  /** False for the three skills that were actually tested. */
  inferred: boolean;
};

/**
 * Fan the three measured levels out to all twelve skills.
 *
 * Returns the measured three unchanged plus nine inferred, so the caller can
 * persist a complete placement after a ~5-minute test instead of a ~22-minute
 * one. Anything the map cannot resolve falls back to "easy".
 */
export function inferPlacements(measured: Map<string, RungLevel>): InferredPlacement[] {
  const out: InferredPlacement[] = [];

  for (const task of CORE_PLACEMENT_TASKS) {
    out.push({ taskType: task, level: measured.get(task) ?? "easy", inferred: false });
  }

  for (const [taskType, sources] of Object.entries(INFERRED_FROM)) {
    const levels = sources
      .map((s) => measured.get(s))
      .filter((l): l is RungLevel => Boolean(l));
    const level = levels.length === 0 ? "easy" : levels.reduce(lowerLevel);
    out.push({ taskType, level, inferred: true });
  }

  return out;
}

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
 * Where the ladder places a learner for one objective skill.
 *
 * Note the hard-level rule: failing `hard` still places them at MEDIUM, because
 * the medium curriculum is what will actually move them. Only a clean sweep of
 * all three reaches HARD.
 */
export function placementFor(taskType: string, results: ProbeResult[]): RungLevel {
  const at = (level: RungLevel) => results.find((r) => r.taskType === taskType && r.level === level);
  const perfect = (r: ProbeResult | undefined) =>
    Boolean(r) && r!.total > 0 && r!.correct / r!.total >= PROBE_PASS_RATIO;

  if (!perfect(at("easy"))) return "easy";
  if (!perfect(at("medium"))) return "medium";
  if (!perfect(at("hard"))) return "medium";
  return "hard";
}

/** Where a single AI-graded submission places a learner — just bucket the score. */
export function placementForScore(score160: number): RungLevel {
  return rungForScore(score160);
}

export type SkillPlacement = { taskType: string; placement: RungLevel };

export function skillPlacement(taskType: string, results: ProbeResult[]): SkillPlacement {
  return { taskType, placement: placementFor(taskType, results) };
}

/** Every objective skill's placement, from a full set of probe results. */
export function allPlacements(results: ProbeResult[]): SkillPlacement[] {
  const tasks = [...new Set(results.map((r) => r.taskType))];
  return tasks.map((t) => skillPlacement(t, results));
}

/**
 * Roughly how long the full 12-skill placement takes.
 *
 * Objective types: worst case 3 levels x 2 items each, ~20s/item (mostly
 * instant local grading). AI-graded types: one submission each, but that means
 * real typing/speaking plus a Gemini grading wait — budgeted at ~100s worst
 * case, far longer than an objective item. Most learners stop an objective
 * ladder after one or two levels and this is a worst-case ceiling, not a
 * typical time — shown to set expectations, not as a promise.
 */
export function estimatedProbeMinutes(
  objectiveTaskTypes: readonly string[],
  aiGradedTaskTypes: readonly string[],
  secondsPerObjectiveItem = 20,
  secondsPerAiGradedItem = 100,
): number {
  const objectiveSeconds =
    objectiveTaskTypes.length * PROBE_LEVELS.length * PROBE_ITEMS_PER_LEVEL * secondsPerObjectiveItem;
  const aiGradedSeconds = aiGradedTaskTypes.length * secondsPerAiGradedItem;
  return Math.ceil((objectiveSeconds + aiGradedSeconds) / 60);
}

export const PLACEMENT_INTRO_TH =
  "ตอบสั้น ๆ 3 ทักษะ แล้วเราจะจัดระดับให้ครบทั้ง 12 ทักษะทันที — ไม่ต้องสอบทีละอัน ระดับที่ได้ไม่ใช่คำตัดสิน ระบบจะปรับขึ้น-ลงให้เองตลอดเวลาที่คุณเรียน";

export const PLACEMENT_SKIP_TH = "ข้ามไปเริ่มเรียนเลย — ระบบจะปรับระดับให้เองระหว่างเรียน";

/** The three things being measured, for the intro card. */
export const CORE_PROBE_BLURB_TH: Record<CorePlacementTask, string> = {
  fill_in_blanks: "ความแม่นของคำศัพท์และไวยากรณ์",
  dictation: "การฟัง",
  write_about_photo: "การเขียนเองแบบจับเวลา",
};
