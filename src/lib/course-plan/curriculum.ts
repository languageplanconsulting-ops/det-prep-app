/**
 * The EASY track, block by block.
 *
 * Replaces the old "one video + a rotation of unrelated drills" day, which
 * scheduled a speaking exercise before the speaking lesson had been taught.
 * Here a block is finished before the next one starts: its videos first, then
 * the exercises that practise exactly what those videos taught.
 *
 * Nothing in this file schedules anything. It is the ordered curriculum; the
 * planner (planner.ts) pours it into days and lets whatever does not fit flow
 * to the next session as carry-over.
 */
import type { RungLevel } from "@/lib/course-plan/rungs";

/**
 * How a learner proves they are done with an exercise.
 *
 * These are the gates the founder specified per block — they are deliberately
 * different per exercise, because "done" means something different for a
 * dictation drill than for an open-ended speaking answer.
 */
export type ExerciseGate =
  /** N items, must hit `ratio` correct. `strictPunctuation` for dictation. */
  | { kind: "pass_ratio"; count: number; ratio: number; strictPunctuation?: boolean }
  /** Clear `needed` sessions in a row before moving up a level. */
  | { kind: "consecutive"; needed: number; thenLevel?: string; thenNeeded?: number }
  /**
   * Open practice scored 0–160. Must reach `minScore`; if the first attempt is
   * below it, they retry up to `retries` times and simply have to beat their
   * own first attempt. Beating it triggers the "what did you fix?" prompt,
   * which saves to the notebook as a production note.
   */
  | { kind: "min_score"; minScore: number; retries: number; reflectOnImprove: true }
  /** Fixed set of attempts; the best score is kept and shown on the panel. */
  | { kind: "best_of"; attempts: number }
  /** No pass mark — the rolling average is tracked and shown on the panel. */
  | { kind: "average_tracked" };

export type CurriculumExercise = {
  key: string;
  titleTh: string;
  /** Weakness task type this drills, for routing into the right runner. */
  taskType: string;
  gate: ExerciseGate;
  minutes: number;
  /**
   * Spread this exercise across at least this many separate days. Used where
   * repetition over time matters more than volume in one sitting.
   */
  spreadDays?: number;
  /** Teaching lesson rather than scored practice. */
  isLesson?: boolean;
  noteTh?: string;
};

export type CurriculumBlock = {
  key: string;
  titleTh: string;
  /** Primary task type; also how videos are matched to this block. */
  taskType: string | null;
  level: RungLevel;
  order: number;
  exercises: CurriculumExercise[];
  noteTh?: string;
};

const m = (minutes: number) => minutes;

export const EASY_TRACK: CurriculumBlock[] = [
  {
    key: "grammar-foundation",
    titleTh: "ปูพื้นฐานไวยากรณ์",
    taskType: "fill_in_blanks",
    level: "easy",
    order: 1,
    noteTh: "ต้องมาก่อนทุกบท — เขียนและพูดจะยังทำไม่ได้ถ้าไวยากรณ์ยังไม่แน่น",
    exercises: [
      { key: "gr-conj", titleTh: "คำเชื่อม + อนุประโยค", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
      { key: "gr-present", titleTh: "Present tense: -s / -es", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
      { key: "gr-runon", titleTh: "เลี่ยงประโยค run-on", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
      { key: "gr-transition", titleTh: "คำเชื่อมความ (transitional words)", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
      { key: "gr-tense", titleTh: "อดีต / passive / อนาคต", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
      { key: "gr-relative", titleTh: "which / who / that", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: m(6) },
    ],
  },
  {
    key: "write-photo",
    titleTh: "เขียนบรรยายภาพ",
    taskType: "write_about_photo",
    level: "easy",
    order: 2,
    exercises: [
      { key: "wp-people", titleTh: "เขียนเกี่ยวกับคน", taskType: "write_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
      { key: "wp-objects", titleTh: "เขียนเกี่ยวกับสิ่งของ", taskType: "write_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
      { key: "wp-places", titleTh: "เขียนเกี่ยวกับสถานที่", taskType: "write_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
    ],
  },
  {
    key: "speak-photo",
    titleTh: "พูดบรรยายภาพ",
    taskType: "speak_about_photo",
    level: "easy",
    order: 3,
    exercises: [
      { key: "sp-people", titleTh: "พูดเกี่ยวกับคน", taskType: "speak_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
      { key: "sp-objects", titleTh: "พูดเกี่ยวกับสิ่งของ", taskType: "speak_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
      { key: "sp-places", titleTh: "พูดเกี่ยวกับสถานที่", taskType: "speak_about_photo", gate: { kind: "pass_ratio", count: 3, ratio: 0.8 }, minutes: m(8) },
    ],
  },
  {
    key: "dictation",
    titleTh: "ตามคำบอก",
    taskType: "dictation",
    level: "easy",
    order: 4,
    exercises: [
      { key: "dic-easy", titleTh: "สุ่ม 5 ข้อระดับง่าย", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.9 }, minutes: m(8) },
      {
        key: "dic-medium",
        titleTh: "5 ข้อระดับกลาง — เครื่องหมายวรรคตอนต้องถูกทั้งหมด",
        taskType: "dictation",
        gate: { kind: "pass_ratio", count: 5, ratio: 0.9, strictPunctuation: true },
        minutes: m(8),
      },
    ],
  },
  {
    key: "write-topic",
    titleTh: "เขียนตามหัวข้อ (50 คำ)",
    taskType: "read_and_write",
    level: "easy",
    order: 5,
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน แบบฝึกของแต่ละวันอิงหัวข้อของคลิปวันนั้น",
    exercises: [
      { key: "wt-l1", titleTh: "บทเรียนที่ 1", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "wt-l2", titleTh: "บทเรียนที่ 2", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "wt-l3", titleTh: "บทเรียนที่ 3", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "wt-l4", titleTh: "บทเรียนที่ 4", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      {
        key: "wt-real",
        titleTh: "เขียนจริง (ไม่จำกัดจำนวนครั้ง)",
        taskType: "read_and_write",
        gate: { kind: "min_score", minScore: 100, retries: 2, reflectOnImprove: true },
        minutes: m(10),
        spreadDays: 4,
        noteTh: "ต้องได้ 100+ ถ้าต่ำกว่า ให้ลองอีก 1–2 ครั้งจนดีกว่าครั้งแรก",
      },
    ],
  },
  {
    key: "speak-topic",
    titleTh: "พูดตามหัวข้อ",
    taskType: "read_then_speak",
    level: "easy",
    order: 6,
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน แบบฝึกของแต่ละวันอิงหัวข้อของคลิปวันนั้น",
    exercises: [
      { key: "st-l1", titleTh: "บทเรียนที่ 1", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "st-l2", titleTh: "บทเรียนที่ 2", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "st-l3", titleTh: "บทเรียนที่ 3", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "st-l4", titleTh: "บทเรียนที่ 4", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      {
        key: "st-real",
        titleTh: "พูดจริง (ไม่จำกัดจำนวนครั้ง)",
        taskType: "read_then_speak",
        gate: { kind: "min_score", minScore: 100, retries: 2, reflectOnImprove: true },
        minutes: m(10),
        spreadDays: 4,
        noteTh: "ต้องได้ 100+ ถ้าต่ำกว่า ให้ลองอีก 1–2 ครั้งจนดีกว่าครั้งแรก",
      },
    ],
  },
  {
    key: "interactive-speaking",
    titleTh: "Interactive Speaking",
    taskType: "interactive_speaking",
    level: "easy",
    order: 7,
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน",
    exercises: [
      { key: "is-l1", titleTh: "บทเรียนที่ 1", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "is-l2", titleTh: "บทเรียนที่ 2", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "is-l3", titleTh: "บทเรียนที่ 3", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      { key: "is-l4", titleTh: "บทเรียนที่ 4", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: m(6), isLesson: true },
      {
        key: "is-real",
        titleTh: "พูดโต้ตอบจริง (ไม่จำกัดจำนวนครั้ง)",
        taskType: "interactive_speaking",
        gate: { kind: "min_score", minScore: 100, retries: 2, reflectOnImprove: true },
        minutes: m(10),
        spreadDays: 4,
      },
    ],
  },
  {
    key: "interactive-conversation",
    titleTh: "Interactive Conversation",
    taskType: "interactive_conversation_mcq",
    level: "easy",
    order: 8,
    exercises: [
      {
        key: "ic-set",
        titleTh: "แบบฝึก 3 ชุด — เก็บคะแนนสูงสุด",
        taskType: "interactive_conversation_mcq",
        gate: { kind: "best_of", attempts: 3 },
        minutes: m(8),
        spreadDays: 3,
      },
    ],
  },
  {
    key: "real-word",
    titleTh: "เลือกคำจริง",
    taskType: "real_english_word",
    level: "easy",
    order: 9,
    noteTh: "กระจายหลายวัน คละง่ายกับกลางตามเวลาที่เลือกไว้",
    exercises: [
      {
        key: "rw-ladder",
        titleTh: "ระดับ 1 → ผ่านติดกัน 2 ครั้ง → ระดับ 2 (ต้องผ่านติดกัน 3 ครั้ง)",
        taskType: "real_english_word",
        gate: { kind: "consecutive", needed: 2, thenLevel: "medium", thenNeeded: 3 },
        minutes: m(6),
        spreadDays: 5,
      },
    ],
  },
  {
    key: "reading-skills",
    titleTh: "ทักษะการอ่าน",
    taskType: "reading_comprehension",
    level: "easy",
    order: 10,
    noteTh: "กระจายตลอด 1 สัปดาห์ ใช้ข้อสอบจริงระดับง่าย เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      {
        key: "rs-exam",
        titleTh: "ข้อสอบจริงระดับง่าย — เก็บคะแนนเฉลี่ย",
        taskType: "reading_comprehension",
        gate: { kind: "average_tracked" },
        minutes: m(8),
        spreadDays: 7,
      },
    ],
  },
  {
    key: "reading-vocab",
    titleTh: "คำศัพท์จากการอ่าน",
    taskType: "vocabulary_reading",
    level: "easy",
    order: 11,
    noteTh: "กระจายตลอด 1 สัปดาห์ ระดับง่าย เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      {
        key: "rv-exam",
        titleTh: "ข้อสอบจริงระดับง่าย — เก็บคะแนนเฉลี่ย",
        taskType: "vocabulary_reading",
        gate: { kind: "average_tracked" },
        minutes: m(8),
        spreadDays: 7,
      },
    ],
  },
];

/** One-line Thai description of a gate, for the day card. */
export function gateLabel(gate: ExerciseGate): string {
  switch (gate.kind) {
    case "pass_ratio":
      return `${gate.count} ข้อ · ผ่าน ${Math.round(gate.ratio * 100)}%${
        gate.strictPunctuation ? " · วรรคตอนต้องถูกหมด" : ""
      }`;
    case "consecutive":
      return `ผ่านติดกัน ${gate.needed} ครั้ง${
        gate.thenNeeded ? ` แล้วอีก ${gate.thenNeeded} ครั้งในระดับถัดไป` : ""
      }`;
    case "min_score":
      return `ต้องได้ ${gate.minScore}+ (ถ้าต่ำกว่า ลองอีก ${gate.retries} ครั้ง)`;
    case "best_of":
      return `${gate.attempts} ชุด · เก็บคะแนนสูงสุด`;
    case "average_tracked":
      return "เก็บคะแนนเฉลี่ย";
  }
}

export function blockByKey(key: string): CurriculumBlock | null {
  return EASY_TRACK.find((b) => b.key === key) ?? null;
}

/** Total planned minutes for a block, videos excluded. */
export function blockExerciseMinutes(block: CurriculumBlock): number {
  return block.exercises.reduce((s, e) => s + e.minutes, 0);
}
