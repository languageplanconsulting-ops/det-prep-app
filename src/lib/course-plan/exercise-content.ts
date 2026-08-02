/**
 * Resolves a curriculum exercise into the exact items it runs.
 *
 * The ids come from question-sets.ts (generated, fixed, never randomised), and
 * this looks them up in the content banks so the session can render them
 * inline instead of sending the learner off to a separate practice page.
 */
import { REWRITE_BANKS, type RewriteItem } from "@/lib/course-plan/grammar-writing-bank";
import { listenSpeakItemById, type ListenSpeakItem } from "@/lib/course-plan/listen-speak-bank";
import { writeTopicItemById, type WriteTopicItem } from "@/lib/course-plan/write-topic-bank";
import { speakPhotoDrillById, type SpeakPhotoDrillItem } from "@/lib/course-plan/speak-photo-drill-bank";
import { questionsFor } from "@/lib/course-plan/question-sets";
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
  | { kind: "speakPattern"; items: never[] };

/**
 * Exercises with their own hand-authored bank, keyed by curriculum key rather
 * than task type — these are specific drills, not a whole task family.
 */
const BY_EXERCISE_KEY: Record<string, () => InlineExerciseContent | null> = Object.fromEntries(
  // Every grammar-foundation drill is a typed rewrite from the handout's bank.
  // gr-present used to run the SPEAKING pattern drill, which is not what that
  // page of the handout teaches — it teaches written -s/-es agreement.
  [
    "gr-tenses",
    "gr-present",
    "gr-complex",
    "gr-sub",
    "gr-relative",
    "gr-reduction",
    "wp-pattern",
  ].map((key) => [key, () => ({ kind: "rewrite" as const, items: REWRITE_BANKS[key]! })]),
);

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

  // NOTE: the read_then_speak (st-l1…4) and read_and_write (wt-l1…4) lessons are
  // gone. Both blocks now run three guided rebuild drills — see
  // listenSpeakItemFor / writeTopicItemFor — then three un-guided real attempts.
};

export function lessonRunnerRefFor(exerciseKey: string): LessonRunnerRef | null {
  return LESSON_UNIT_FOR_KEY[exerciseKey] ?? null;
}

/**
 * The guided "listen and speak" drills (rebuild → Thai → hear → say it back).
 *
 * One topic per exercise key so the planner can put them on separate days —
 * three different lecture topics rather than three passes at one.
 */
const LISTEN_SPEAK_FOR_KEY: Record<string, string> = {
  "st-ls1": "ls-1",
  "st-ls2": "ls-2",
  "st-ls3": "ls-3",
};

export function listenSpeakItemFor(exerciseKey: string): ListenSpeakItem | null {
  // MEDIUM/HARD reuse the same three lecture topics with an m-/h- prefix.
  const base = exerciseKey.replace(/^[mh]/, "");
  const id = LISTEN_SPEAK_FOR_KEY[exerciseKey] ?? LISTEN_SPEAK_FOR_KEY[base];
  return id ? listenSpeakItemById(id) : null;
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

/** Interactive speaking / conversation / dialogue-summary course practices. */
export function isInteractiveCourseExercise(taskType: string | null): boolean {
  return (
    taskType === "interactive_speaking" ||
    taskType === "interactive_conversation_mcq" ||
    taskType === "dialogue_summary" ||
    taskType === "conversation_summary"
  );
}

/** Reading + vocab exams — right/wrong report, no AI grading. */
export function isComprehensionExamExercise(taskType: string | null): boolean {
  return taskType === "reading_comprehension" || taskType === "vocabulary_reading";
}

/**
 * The guided "write 50 words" drills (rebuild → remember the skeleton).
 *
 * One essay TYPE per exercise key — reasons, opinion, descriptive — so the
 * planner spreads the three lecture patterns over separate days rather than
 * teaching all three in one sitting.
 */
const WRITE_TOPIC_FOR_KEY: Record<string, string> = {
  "wt-ws1": "wt-1",
  "wt-ws2": "wt-2",
  "wt-ws3": "wt-3",
};

export function writeTopicItemFor(exerciseKey: string): WriteTopicItem | null {
  const base = exerciseKey.replace(/^[mh]/, "");
  const id = WRITE_TOPIC_FOR_KEY[exerciseKey] ?? WRITE_TOPIC_FOR_KEY[base];
  return id ? writeTopicItemById(id) : null;
}

/**
 * Guided speak-about-photo drills (rebuild → Thai → hear → say it back), built
 * only from the photo lectures' own patterns and vocabulary.
 */
const SPEAK_PHOTO_FOR_KEY: Record<string, string> = {
  "sp-people": "spd-people",
  "sp-places": "spd-places",
  "sp-objects": "spd-city",
};

export function speakPhotoDrillFor(exerciseKey: string): SpeakPhotoDrillItem | null {
  const base = exerciseKey.replace(/^[mh]/, "");
  const id = SPEAK_PHOTO_FOR_KEY[exerciseKey] ?? SPEAK_PHOTO_FOR_KEY[base];
  return id ? speakPhotoDrillById(id) : null;
}
