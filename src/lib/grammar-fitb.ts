/**
 * เติมคำในช่องว่าง · ไวยากรณ์ (Grammar Fill-in-the-Blank) — a guided lesson under บทเรียน.
 *
 * A grammar-teaching version of the real Fill-in-the-Blank exam, structured as an
 * unlockable 3-level journey (easy → medium → hard), NOT as separate per-grammar-point
 * chapters. Every level mixes ALL grammar topics together (present tense, past tense,
 * present perfect, passive voice, adverbs, transitions) — only the vocabulary register
 * and grammar subtlety scale with the level (easy=B1/DET<100, medium=B2/DET115-120,
 * hard=C1/DET125+). Above every exercise, a coach bubble shows the specific grammar
 * reminder for THAT exercise's topic (looked up dynamically via `exercise.topic`),
 * since topics are interleaved within a level rather than grouped.
 *
 * A level must be finished at 100% (every blank exactly correct, retrying only the
 * wrong ones) to unlock the next level — see GrammarLevelRunner.
 *
 * Every blank uses the same prefix-hint + Thai-clue structure as the normal FITB exam
 * (FitbSessionClient), scored with the shared prefix fill-in grader. Progress syncs
 * with the shared Supabase lesson_unit_progress / lesson_item_seen tables like every
 * other บทเรียน topic (see project_lessons_web_port). Web-only for now.
 */
import { GRAMMAR_EXERCISES } from "./grammar-fitb-data";
import type { MissingWord } from "./fitb-lesson-scoring";

export type GrammarTopicId =
  | "present-tense"
  | "past-tense"
  | "perfect-tense"
  | "passive-voice"
  | "adverbs"
  | "transitions";

export type GrammarTopicMeta = {
  id: GrammarTopicId;
  th: string;
  en: string;
  icon: string;
  /** Short rule reminder shown in the coach bubble above any exercise of this topic. */
  tipTh: string;
};

export const GRAMMAR_TOPICS: GrammarTopicMeta[] = [
  {
    id: "present-tense",
    th: "ปัจจุบัน (Present simple)",
    en: "Present simple",
    icon: "🔵",
    tipTh: "ย่อหน้านี้เป็น ปัจจุบัน — ถ้าประธานเป็นเอกพจน์ (he/she/it) กริยาต้องเติม -s/-es/-ies เสมอ (have→has, do→does, be→is) แต่ถ้าประธานเป็นพหูพจน์ กริยาไม่ต้องเติมอะไร",
  },
  {
    id: "past-tense",
    th: "อดีต (Past simple)",
    en: "Past simple",
    icon: "🟣",
    tipTh: "ย่อหน้านี้เป็น อดีต — เปลี่ยนกริยาเป็นช่อง 2 เสมอ (regular เติม -ed หรือ irregular ต้องจำเป็นคำๆ เช่น go→went, have→had)",
  },
  {
    id: "perfect-tense",
    th: "Present Perfect",
    en: "Present perfect",
    icon: "🟡",
    tipTh: "สังเกตคำอย่าง already / never / ever / since / for / just — สัญญาณของ present perfect: have/has + กริยาช่อง 3 (ไม่ใช่ช่อง 2) และผันตามประธาน (he/she/it → has)",
  },
  {
    id: "passive-voice",
    th: "ประโยค Passive",
    en: "Passive voice",
    icon: "🟢",
    tipTh: "ประธานเป็นผู้ถูกกระทำ — ใช้ verb to be (is/are/was/were) + กริยาช่อง 3 ให้ตรงกับประธานและกาลของประโยค",
  },
  {
    id: "adverbs",
    th: "คำวิเศษณ์ (Adverb)",
    en: "Adverbs",
    icon: "🟠",
    tipTh: "เติม -ly จาก adjective เพื่อสร้าง adverb (careful→carefully) ระวังรูปพิเศษ hard/fast/well และวางตำแหน่งให้ถูก — adverb ความถี่วางหน้ากริยาแท้/หลัง verb to be",
  },
  {
    id: "transitions",
    th: "คำเชื่อม (Transitions)",
    en: "Transitional words",
    icon: "🔗",
    tipTh: "เลือกคำเชื่อมต้นประโยคให้ตรงความหมาย (ขัดแย้ง=However, ผลลัพธ์=Therefore, เพิ่มเติม=Moreover) แล้วตามด้วยจุลภาคเสมอ: Connector, S+V",
  },
];

export function grammarTopicMeta(id: GrammarTopicId): GrammarTopicMeta {
  return GRAMMAR_TOPICS.find((t) => t.id === id) ?? GRAMMAR_TOPICS[0]!;
}

export type GrammarDifficulty = "easy" | "medium" | "hard";

/**
 * Difficulty is framed by the DET score band it targets, not just linguistic
 * difficulty — matches how the app already talks about score goals elsewhere
 * (Mock test 0–160). CEFR level sets the vocabulary/register of the passage:
 * easy=B1, medium=B2, hard=C1.
 */
export const GRAMMAR_DIFFICULTY_META: Record<
  GrammarDifficulty,
  { th: string; badge: string; cefr: string; scoreBand: string; goalTh: string }
> = {
  easy: {
    th: "ง่าย",
    badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
    cefr: "B1",
    scoreBand: "ต่ำกว่า 100",
    goalTh: "เหมาะกับผู้ที่ตั้งเป้าคะแนนต่ำกว่า 100",
  },
  medium: {
    th: "ปานกลาง",
    badge: "border-amber-300 bg-amber-50 text-amber-700",
    cefr: "B2",
    scoreBand: "115–120",
    goalTh: "เหมาะกับผู้ที่ตั้งเป้าคะแนน 115–120",
  },
  hard: {
    th: "ยาก",
    badge: "border-rose-300 bg-rose-50 text-rose-700",
    cefr: "C1",
    scoreBand: "125 ขึ้นไป",
    goalTh: "เหมาะกับผู้ที่ตั้งเป้าคะแนน 125 ขึ้นไป",
  },
};

/** Sequential unlock order — a level opens once the previous one is 100% complete. */
export const GRAMMAR_LEVEL_ORDER: GrammarDifficulty[] = ["easy", "medium", "hard"];

export type GrammarBlank = {
  /** The full correct word. First `prefixLength` letters are shown; learner types the rest. */
  correctWord: string;
  /** Thai clue — what to fill and why (the coaching hint, revealed on demand). */
  clueTh: string;
  /** How many starting letters are shown as a hint (1–10, always < correctWord.length). */
  prefixLength: number;
  /** Accepted alternatives (rare — most grammar blanks have one answer). */
  synonyms?: string[];
  /** Bilingual-leaning Thai explanation shown after the learner submits. */
  explanationThai: string;
};

export type GrammarExercise = {
  id: string;
  topic: GrammarTopicId;
  difficulty: GrammarDifficulty;
  /** Article-style English headline shown above the passage. */
  titleEn: string;
  /** English passage containing exactly the markers [BLANK 1] … [BLANK 5], in order.
   * Academic/informational content (a real scientific, historical, or process fact) —
   * NOT a mundane daily-routine scene. Vocabulary register matches the exercise's
   * difficulty (B1/B2/C1, see GRAMMAR_DIFFICULTY_META). */
  passage: string;
  /** Short Thai gloss of the passage's topic, for context. */
  passageTh: string;
  /** Exactly five blanks, aligned to [BLANK 1..5]. */
  blanks: GrammarBlank[];
};

export { GRAMMAR_EXERCISES };

/** All exercises for one level, in stable authored order (topic, then id) — this is the
 * canonical order used for progress-unit indices. Runtime play order is a shuffled
 * queue of indices into THIS list, built by the runner (see GrammarLevelRunner). */
export function exercisesForLevel(level: GrammarDifficulty): GrammarExercise[] {
  return GRAMMAR_EXERCISES.filter((e) => e.difficulty === level);
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
