/**
 * เติมคำในช่องว่าง · ไวยากรณ์ (Grammar Fill-in-the-Blank) — a guided lesson under บทเรียน.
 *
 * A grammar-teaching version of the real Fill-in-the-Blank exam. It is split into
 * chapters, each teaching ONE grammar concept the DET FITB relies on:
 *   1. present-tense  — ประธานเอกพจน์ → กริยาเติม -s/-es/-ies
 *   2. past-tense     — โจทย์อดีต → กริยาช่อง 2
 *   3. passive-voice  — โครงสร้าง be + กริยาช่อง 3
 *   4. adverbs        — การสร้าง adverb (-ly) และตำแหน่งวาง
 *   5. transitions    — คำเชื่อม (However, Therefore, …) ต้นประโยค S+V
 *
 * Each chapter opens with a mascot (พี่ดอย) coaching card that teaches the rule in
 * Thai, then gives short passages that each have exactly FIVE blanks. Every blank uses
 * the same prefix-hint + Thai-clue structure as the normal FITB exam
 * (FitbSessionClient), scored with the shared prefix fill-in grader.
 *
 * Progress syncs with the shared Supabase lesson_unit_progress / lesson_item_seen
 * tables like every other บทเรียน topic (see project_lessons_web_port). Web-only for
 * now — this topic does not exist in det-mobile's LESSON_TOPICS yet.
 */
import { GRAMMAR_CHAPTERS } from "./grammar-fitb-data";
import type { MissingWord } from "./fitb-lesson-scoring";

export type GrammarChapterId =
  | "present-tense"
  | "past-tense"
  | "passive-voice"
  | "adverbs"
  | "transitions";

export type GrammarDifficulty = "easy" | "medium" | "hard";

export const GRAMMAR_DIFFICULTY_META: Record<
  GrammarDifficulty,
  { th: string; badge: string }
> = {
  easy: { th: "ง่าย", badge: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  medium: { th: "ปานกลาง", badge: "border-amber-300 bg-amber-50 text-amber-700" },
  hard: { th: "ยาก", badge: "border-rose-300 bg-rose-50 text-rose-700" },
};

export type GrammarBlank = {
  /** The full correct word. First `prefixLength` letters are shown; learner types the rest. */
  correctWord: string;
  /** Thai clue — what to fill and why (the coaching hint, revealed on demand). */
  clueTh: string;
  /** How many starting letters are shown as a hint (1–5, always < correctWord.length). */
  prefixLength: number;
  /** Accepted alternatives (rare — most grammar blanks have one answer). */
  synonyms?: string[];
  /** Bilingual-leaning Thai explanation shown after the learner submits. */
  explanationThai: string;
};

export type GrammarExercise = {
  id: string;
  difficulty: GrammarDifficulty;
  /** English passage containing exactly the markers [BLANK 1] … [BLANK 5], in order. */
  passage: string;
  /** Short Thai gloss of the passage's situation, for context. */
  passageTh: string;
  /** Exactly five blanks, aligned to [BLANK 1..5]. */
  blanks: GrammarBlank[];
};

export type GrammarChapter = {
  id: GrammarChapterId;
  th: string;
  en: string;
  icon: string;
  /** One-line Thai summary of the rule (shown on the hub card). */
  tagline: string;
  /** Heading of the coaching card. */
  ruleTitleTh: string;
  /** Mascot coaching paragraphs (Thai) that teach the rule before the exercises. */
  coachLines: string[];
  /** Worked examples shown in the coaching card. */
  examples: { en: string; th: string }[];
  exercises: GrammarExercise[];
};

export { GRAMMAR_CHAPTERS };

export function grammarChapter(id: string): GrammarChapter | undefined {
  return GRAMMAR_CHAPTERS.find((c) => c.id === id);
}

/** Map a lesson blank onto the shared prefix fill-in grader's shape. */
export function blankToMissingWord(b: GrammarBlank): MissingWord {
  return {
    correctWord: b.correctWord,
    clue: b.clueTh,
    prefix_length: b.prefixLength,
    synonyms: b.synonyms,
    explanationThai: b.explanationThai,
  };
}
