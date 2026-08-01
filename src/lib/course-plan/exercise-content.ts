/**
 * Resolves a curriculum exercise into the exact items it runs.
 *
 * The ids come from question-sets.ts (generated, fixed, never randomised), and
 * this looks them up in the content banks so the session can render them
 * inline instead of sending the learner off to a separate practice page.
 */
import { REWRITE_BANKS, type RewriteItem } from "@/lib/course-plan/grammar-writing-bank";
import { questionsFor } from "@/lib/course-plan/question-sets";
import { speakPatternsFor, type SpeakPatternItem } from "@/lib/course-plan/speak-pattern-bank";
import { DICTATION_LESSONS, type DictationLesson } from "@/lib/dictation-lessons";
import { GRAMMAR_EXERCISES, type GrammarExercise } from "@/lib/grammar-fitb";
import { REALWORD_LESSON_ITEMS, type RealWordItem } from "@/lib/realword-lesson";

export type InlineKind = "dictation" | "grammar" | "realword" | "rewrite" | "speakPattern";

/** Task types that can be answered and graded inside the session modal. */
const INLINE_KIND: Record<string, InlineKind> = {
  dictation: "dictation",
  fill_in_blanks: "grammar",
  real_english_word: "realword",
};

export type InlineExerciseContent =
  | { kind: "dictation"; items: DictationLesson[] }
  | { kind: "grammar"; items: GrammarExercise[] }
  | { kind: "realword"; items: RealWordItem[] }
  | { kind: "rewrite"; items: RewriteItem[] }
  | { kind: "speakPattern"; items: SpeakPatternItem[] };

/**
 * Exercises with their own hand-authored bank, keyed by curriculum key rather
 * than task type — these are specific drills, not a whole task family.
 */
const BY_EXERCISE_KEY: Record<string, () => InlineExerciseContent | null> = {
  "gr-conj": () => ({ kind: "rewrite", items: REWRITE_BANKS["gr-conj"] }),
  "gr-transition": () => ({ kind: "rewrite", items: REWRITE_BANKS["gr-transition"] }),
  "gr-runon": () => ({ kind: "rewrite", items: REWRITE_BANKS["gr-runon"] }),
  "gr-relative": () => ({ kind: "rewrite", items: REWRITE_BANKS["gr-relative"] }),
  "gr-present": () => ({ kind: "speakPattern", items: SPEAK_PATTERN_ALL }),
};

const SPEAK_PATTERN_ALL: SpeakPatternItem[] = [
  ...speakPatternsFor("photo"),
  ...speakPatternsFor("topic"),
];

/**
 * The items an exercise runs, or null when it has no inline bank — speaking,
 * writing and the interactive question types still need their own runners.
 */
export function inlineContentFor(
  exerciseKey: string,
  taskType: string | null,
): InlineExerciseContent | null {
  // MEDIUM/HARD reuse the same drills with an m-/h- prefix.
  const base = exerciseKey.replace(/^[mh]/, "");
  const authored = BY_EXERCISE_KEY[exerciseKey] ?? BY_EXERCISE_KEY[base];
  if (authored) {
    const c = authored();
    if (c && c.items.length > 0) return c;
  }

  if (!taskType) return null;
  const kind = INLINE_KIND[taskType];
  if (!kind) return null;

  const ids = questionsFor(exerciseKey);
  if (ids.length === 0) return null;

  if (kind === "dictation") {
    const items = ids
      .map((id) => DICTATION_LESSONS.find((x) => x.id === id))
      .filter((x): x is DictationLesson => Boolean(x));
    return items.length ? { kind, items } : null;
  }
  if (kind === "grammar") {
    const items = ids
      .map((id) => GRAMMAR_EXERCISES.find((x) => x.id === id))
      .filter((x): x is GrammarExercise => Boolean(x));
    return items.length ? { kind, items } : null;
  }
  if (kind !== "realword") return null;
  const items = ids
    .map((id) => REALWORD_LESSON_ITEMS.find((x) => x.id === id))
    .filter((x): x is RealWordItem => Boolean(x));
  return items.length ? { kind: "realword", items } : null;
}

export function canRunInline(exerciseKey: string, taskType: string | null): boolean {
  return inlineContentFor(exerciseKey, taskType) !== null;
}

/**
 * The photo-write / speak-photo / read-write / read-speak "how to" lessons
 * (isLesson steps, plus the EASY-tier photo tasks which use the same cloze
 * mechanic rather than a full AI report) run through their own dedicated
 * runner components, not the generic per-item views above. Selection is a
 * fixed {tier, unit} pair, not a randomised draw.
 */
export type LessonRunnerKind = "photowrite" | "speakphoto" | "readwrite" | "readspeak";
export type LessonRunnerTier = "easy" | "medium" | "advanced";
export type LessonRunnerRef = { kind: LessonRunnerKind; tier: LessonRunnerTier; unit: number };

const LESSON_UNIT_FOR_KEY: Record<string, LessonRunnerRef> = {
  "wp-people": { kind: "photowrite", tier: "easy", unit: 1 },
  "wp-objects": { kind: "photowrite", tier: "easy", unit: 2 },
  "wp-places": { kind: "photowrite", tier: "easy", unit: 3 },
  "sp-people": { kind: "speakphoto", tier: "easy", unit: 1 },
  "sp-objects": { kind: "speakphoto", tier: "easy", unit: 2 },
  "sp-places": { kind: "speakphoto", tier: "easy", unit: 3 },

  "wt-l1": { kind: "readwrite", tier: "easy", unit: 1 },
  "wt-l2": { kind: "readwrite", tier: "easy", unit: 2 },
  "wt-l3": { kind: "readwrite", tier: "easy", unit: 3 },
  "wt-l4": { kind: "readwrite", tier: "easy", unit: 4 },
  "mwt-l1": { kind: "readwrite", tier: "medium", unit: 1 },
  "mwt-l2": { kind: "readwrite", tier: "medium", unit: 2 },
  "mwt-l3": { kind: "readwrite", tier: "medium", unit: 3 },
  "mwt-l4": { kind: "readwrite", tier: "medium", unit: 4 },
  "hwt-l1": { kind: "readwrite", tier: "advanced", unit: 1 },
  "hwt-l2": { kind: "readwrite", tier: "advanced", unit: 2 },
  "hwt-l3": { kind: "readwrite", tier: "advanced", unit: 3 },
  "hwt-l4": { kind: "readwrite", tier: "advanced", unit: 4 },

  "st-l1": { kind: "readspeak", tier: "easy", unit: 1 },
  "st-l2": { kind: "readspeak", tier: "easy", unit: 2 },
  "st-l3": { kind: "readspeak", tier: "easy", unit: 3 },
  "st-l4": { kind: "readspeak", tier: "easy", unit: 4 },
  "mst-l1": { kind: "readspeak", tier: "medium", unit: 1 },
  "mst-l2": { kind: "readspeak", tier: "medium", unit: 2 },
  "mst-l3": { kind: "readspeak", tier: "medium", unit: 3 },
  "mst-l4": { kind: "readspeak", tier: "medium", unit: 4 },
  "hst-l1": { kind: "readspeak", tier: "advanced", unit: 1 },
  "hst-l2": { kind: "readspeak", tier: "advanced", unit: 2 },
  "hst-l3": { kind: "readspeak", tier: "advanced", unit: 3 },
  "hst-l4": { kind: "readspeak", tier: "advanced", unit: 4 },
};

export function lessonRunnerRefFor(exerciseKey: string): LessonRunnerRef | null {
  return LESSON_UNIT_FOR_KEY[exerciseKey] ?? null;
}

/**
 * The four "real submission" production task types: a full Gemini-graded
 * report, gated on a score rather than a right/wrong count. These run through
 * ProductionExerciseRunner, which embeds the same session + report components
 * the standalone practice pages use.
 */
const PRODUCTION_GATE_KINDS = new Set(["min_score", "min_score_group", "min_score_all_topics"]);

export function isProductionExercise(
  taskType: string | null,
  gateKind: string | undefined,
): boolean {
  if (!taskType || !gateKind) return false;
  if (!PRODUCTION_GATE_KINDS.has(gateKind)) return false;
  return (
    taskType === "write_about_photo" ||
    taskType === "speak_about_photo" ||
    taskType === "read_and_write" ||
    taskType === "read_then_speak"
  );
}
