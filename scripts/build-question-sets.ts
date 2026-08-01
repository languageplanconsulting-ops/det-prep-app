/**
 * Generates the FIXED question set for every curriculum exercise.
 *
 *   npx tsx scripts/build-question-sets.ts
 *
 * Writes src/lib/course-plan/question-sets.ts.
 *
 * Nothing is randomised. Each exercise gets a specific, ordered list of item
 * ids taken from the content banks, so every learner at a given level sees the
 * same questions in the same order — which is what makes a score comparable
 * between two students and between two attempts by the same student.
 *
 * Selection is deterministic: filter the bank by task and tier, then take the
 * first N in file order. Re-running with unchanged banks produces an identical
 * file, so this is safe to commit and diff.
 */
import { writeFileSync } from "node:fs";

import {
  EASY_TRACK,
  HARD_TRACK,
  MEDIUM_TRACK,
  type CurriculumBlock,
  type CurriculumExercise,
} from "../src/lib/course-plan/curriculum";

import { REWRITE_BANKS } from "../src/lib/course-plan/grammar-writing-bank";
import { SPEAK_PATTERN_ITEMS } from "../src/lib/course-plan/speak-pattern-bank";
import { DICTATION_LESSONS } from "../src/lib/dictation-lessons-data";
import { GRAMMAR_EXERCISES } from "../src/lib/grammar-fitb-data";
import { REALWORD_LESSON_ITEMS } from "../src/lib/realword-lesson-data";
import { READSPEAK_ITEMS } from "../src/lib/readspeak-lessons-data";
import { READWRITE_ITEMS } from "../src/lib/readwrite-lessons-data";
import { PHOTOWRITE_ITEMS } from "../src/lib/photo-write-lessons-data";
import { SPEAKPHOTO_ITEMS } from "../src/lib/speakphoto-lessons-data";
import { MAIN_IDEA_ITEMS } from "../src/lib/main-idea-lessons-data";
import { CAMPUS_VOCAB_SCENARIOS } from "../src/lib/campus-vocab-lessons-data";

type Tier = "easy" | "medium" | "advanced";
type Item = { id: string; tier?: string };

/** Bank per task type. `null` where no bank exists yet. */
const BANKS: Record<string, Item[] | null> = {
  dictation: DICTATION_LESSONS as unknown as Item[],
  real_english_word: REALWORD_LESSON_ITEMS as unknown as Item[],
  read_then_speak: READSPEAK_ITEMS as unknown as Item[],
  read_and_write: READWRITE_ITEMS as unknown as Item[],
  write_about_photo: PHOTOWRITE_ITEMS as unknown as Item[],
  speak_about_photo: SPEAKPHOTO_ITEMS as unknown as Item[],
  reading_comprehension: MAIN_IDEA_ITEMS as unknown as Item[],
  vocabulary_reading: CAMPUS_VOCAB_SCENARIOS as unknown as Item[],
  fill_in_blanks: GRAMMAR_EXERCISES as unknown as Item[],
  // No bank of their own — these run against live AI/interactive flows.
  interactive_speaking: null,
  interactive_conversation_mcq: null,
};

/** Curriculum block level -> bank tier. Banks call the top tier "advanced". */
const TIER_FOR_LEVEL: Record<string, Tier> = {
  easy: "easy",
  medium: "medium",
  hard: "advanced",
};

/**
 * Grammar exercises are topic-specific, and the bank's topics only cover some
 * of them. Unmapped keys are reported rather than filled with the wrong topic.
 */
const GRAMMAR_TOPIC: Record<string, string[]> = {
  "gr-present": ["present-tense"],
  "gr-transition": ["transitions"],
  "gr-tense": ["past-tense", "passive-voice", "perfect-tense"],
  // No bank topic yet: conjunctions, run-on sentences, relative clauses.
  "gr-conj": [],
  "gr-runon": [],
  "gr-relative": [],
};

/** How many items an exercise needs, read from its gate. */
function countFor(ex: CurriculumExercise): number {
  switch (ex.gate.kind) {
    case "pass_ratio":
      return ex.gate.count;
    case "best_of":
      return ex.gate.attempts;
    case "consecutive":
      return ex.gate.needed + (ex.gate.thenNeeded ?? 0);
    case "min_score":
    case "min_score_group":
    case "min_score_all_topics":
      return 3; // open practice — three prompts is enough to retry against
    case "average_tracked":
      return 5;
  }
}

const gaps: string[] = [];
const sets: Record<string, string[]> = {};
/**
 * How far into each pool we have already drawn.
 *
 * Without this, every exercise sharing a task+tier took the SAME first N items
 * — so "write about people", "write about objects" and "write about places"
 * were literally the same three prompts.
 */
const cursor = new Map<string, number>();

function baseKey(key: string): string {
  return key.replace(/^m/, "").replace(/^h/, "");
}

/** Exercises with their own hand-authored bank, keyed by curriculum key. */
const AUTHORED: Record<string, string[]> = {
  ...Object.fromEntries(
    Object.entries(REWRITE_BANKS).map(([k, items]) => [k, items.map((i) => i.id)]),
  ),
  "gr-present": SPEAK_PATTERN_ITEMS.map((i) => i.id),
};

function pick(block: CurriculumBlock, ex: CurriculumExercise): string[] {
  // MEDIUM/HARD reuse the same drills under an m-/h- prefix.
  const authored = AUTHORED[ex.key] ?? AUTHORED[baseKey(ex.key)];
  if (authored) return authored;

  const bank = BANKS[ex.taskType];
  if (bank === null) {
    gaps.push(`${ex.key} (${ex.taskType}) — no item bank; runs live`);
    return [];
  }
  if (!bank) {
    gaps.push(`${ex.key} (${ex.taskType}) — UNKNOWN task type`);
    return [];
  }

  const want = countFor(ex);
  const tier = TIER_FOR_LEVEL[block.level] ?? "easy";

  let pool = bank as (Item & { topic?: string; difficulty?: string })[];

  if (ex.taskType === "fill_in_blanks") {
    // Grammar is selected by topic first, then difficulty.
    const topics = GRAMMAR_TOPIC[baseKey(ex.key)] ?? GRAMMAR_TOPIC[ex.key];
    if (topics && topics.length === 0) {
      gaps.push(`${ex.key} — "${ex.titleTh}" has no matching grammar topic in the bank`);
      return [];
    }
    const diff = tier === "advanced" ? "hard" : tier;
    pool = pool.filter(
      (i) => (!topics || topics.includes(i.topic ?? "")) && i.difficulty === diff,
    );
  } else {
    const tiered = pool.filter((i) => i.tier === tier);
    // Some banks have no tier field at all (campus vocab) — use them whole.
    pool = tiered.length > 0 ? tiered : pool;
  }

  const poolKey = `${ex.taskType}:${block.level}:${
    ex.taskType === "fill_in_blanks" ? baseKey(ex.key) : ""
  }`;
  const from = cursor.get(poolKey) ?? 0;
  // Wrap rather than run dry when a bank is smaller than the total demand.
  const chosen =
    pool.length === 0
      ? []
      : Array.from({ length: Math.min(want, pool.length) }, (_, k) =>
          pool[(from + k) % pool.length].id,
        );
  cursor.set(poolKey, from + chosen.length);

  if (chosen.length < want) {
    gaps.push(
      `${ex.key} — wanted ${want}, bank only had ${chosen.length} at tier "${tier}"`,
    );
  }
  return chosen;
}

for (const track of [EASY_TRACK, MEDIUM_TRACK, HARD_TRACK]) {
  for (const block of track) {
    for (const ex of block.exercises) {
      if (ex.isLesson) continue; // teaching steps, not scored items
      sets[ex.key] = pick(block, ex);
    }
  }
}

const filled = Object.values(sets).filter((v) => v.length > 0).length;
const empty = Object.entries(sets).filter(([, v]) => v.length === 0);

const out = `// GENERATED by scripts/build-question-sets.ts — do not edit by hand.
// Re-run that script after changing the curriculum or the content banks.
//
// Fixed question sets: every exercise maps to specific item ids, in order.
// Nothing is randomised, so two learners at the same level answer the same
// questions and their scores mean the same thing.

/** Exercise key -> the exact item ids that exercise runs, in order. */
export const QUESTION_SETS: Record<string, string[]> = ${JSON.stringify(sets, null, 2)};

/** Exercises with no items yet — see the build log for why. */
export const UNFILLED_EXERCISES: string[] = ${JSON.stringify(
  empty.map(([k]) => k),
  null,
  2,
)};

export function questionsFor(exerciseKey: string): string[] {
  return QUESTION_SETS[exerciseKey] ?? [];
}
`;

writeFileSync("src/lib/course-plan/question-sets.ts", out);

console.log("");
console.log(`  exercises with a fixed set : ${filled}`);
console.log(`  exercises still empty      : ${empty.length}`);
console.log("");
if (gaps.length) {
  console.log("  Gaps that need content or a decision:");
  for (const g of [...new Set(gaps)]) console.log(`    · ${g}`);
  console.log("");
}
console.log("  wrote src/lib/course-plan/question-sets.ts");
console.log("");
