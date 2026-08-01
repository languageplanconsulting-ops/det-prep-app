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
  | {
      kind: "pass_ratio";
      count: number;
      ratio: number;
      strictPunctuation?: boolean;
      /** Advanced dictation: `ratio` OR a clean punctuation run passes. */
      orNoPunctuationErrors?: boolean;
    }
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
  | { kind: "average_tracked" }
  /**
   * At least ONE exercise sharing `groupKey` must reach `minScore`. Used for
   * write/speak-about-photo at MEDIUM: the learner reviews and retries until
   * any one of the six clears the bar, rather than all six.
   */
  | { kind: "min_score_group"; minScore: number; groupKey: string }
  /**
   * Every topic attempted must clear `minScore`. The panel shows the best and
   * the lowest attempt by topic name, and the lowest gets a "redeem myself"
   * button — the block is only done once nothing sits below the bar.
   */
  | { kind: "min_score_all_topics"; minScore: number; redeemLowest: true };

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
  /** Primary task type; the default way videos are matched to this block. */
  taskType: string | null;
  /**
   * Match videos by title instead of task type.
   *
   * Needed where a chapter's task type is too coarse: the C-Test chapter maps
   * to fill_in_blanks, which would drag all seven of its walkthrough videos
   * into "grammar foundation" — teaching a whole question type before the
   * learner has even seen what the exam looks like.
   */
  videoMatch?: RegExp;
  level: RungLevel;
  order: number;
  exercises: CurriculumExercise[];
  noteTh?: string;
};

const m = (minutes: number) => minutes;

export const EASY_TRACK: CurriculumBlock[] = [
  {
    key: "orientation",
    titleTh: "รู้จักข้อสอบก่อน",
    taskType: null,
    videoMatch: /ภาพรวมข้อสอบ|Update ข้อสอบ|วิธีการใช้ APP/i,
    level: "easy",
    order: 0,
    noteTh: "ต้องมาก่อนทุกอย่าง — ยังไม่รู้ว่าข้อสอบหน้าตาแบบไหน ก็ยังฝึกอะไรไม่ได้",
    exercises: [],
  },
  {
    key: "grammar-foundation",
    titleTh: "ปูพื้นฐานไวยากรณ์",
    taskType: null,
    videoMatch: /แกรมม่าร์|ไวยากรณ์|grammar/i,
    level: "easy",
    order: 1,
    noteTh: "ปูไวยากรณ์ก่อน — เขียนและพูดจะยังทำไม่ได้ถ้าไวยากรณ์ยังไม่แน่น",
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
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน แบบฝึกของแต่ละวันอิงหัวข้อของเลกเชอร์วันนั้น",
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
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน แบบฝึกของแต่ละวันอิงหัวข้อของเลกเชอร์วันนั้น",
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
    key: "c-test",
    titleTh: "เติมคำในช่องว่าง (C-Test)",
    taskType: "fill_in_blanks",
    level: "easy",
    // Directly after dictation (order 4) — the founder's sequencing.
    order: 4.5,
    noteTh: "ข้อนี้วัดคำศัพท์เป็นหลัก ฟังเลกเชอร์อย่างเดียวไม่พอ ต้องฝึกบ่อย ๆ",
    exercises: [
      {
        key: "ct-easy",
        titleTh: "ตลุยโจทย์ C-Test ระดับง่าย",
        taskType: "fill_in_blanks",
        gate: { kind: "pass_ratio", count: 10, ratio: 0.8 },
        minutes: 8,
        spreadDays: 3,
      },
    ],
  },
  {
    key: "reading-skills",
    titleTh: "ทักษะการอ่าน",
    taskType: "reading_comprehension",
    level: "easy",
    order: 11,
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
    order: 12,
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
      }${gate.orNoPunctuationErrors ? " หรือไม่ผิดคอมมาเลย" : ""}`;
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
    case "min_score_group":
      return `ต้องมีอย่างน้อย 1 ข้อในกลุ่มนี้ได้ ${gate.minScore}+`;
    case "min_score_all_topics":
      return `ทุกหัวข้อต้องได้ ${gate.minScore}+ — แก้ตัวข้อที่ต่ำสุดได้จนกว่าจะไม่มีข้อไหนต่ำกว่านี้`;
  }
}

export function blockByKey(key: string): CurriculumBlock | null {
  return EASY_TRACK.find((b) => b.key === key) ?? null;
}

/** Total planned minutes for a block, videos excluded. */
export function blockExerciseMinutes(block: CurriculumBlock): number {
  return block.exercises.reduce((s, e) => s + e.minutes, 0);
}

// ---------------------------------------------------------------------------
// MEDIUM track
// ---------------------------------------------------------------------------

/**
 * The MEDIUM curriculum.
 *
 * Same block order as EASY, with the bars raised where the founder specified:
 *   - dictation gains a third tier (hard, 80%)
 *   - write/speak about photo must produce ONE answer at 110+, not all of them
 *   - write/speak about topic move from 100+ to 110+
 *   - interactive speaking stays at 100+
 *   - real word gains a hard stage after the medium one
 *
 * A learner placed BASIC runs EASY_TRACK first and then this; a learner placed
 * MEDIUM starts here (see placement.ts).
 */
export const MEDIUM_TRACK: CurriculumBlock[] = [
  {
    key: "m-grammar-foundation",
    titleTh: "ปูพื้นฐานไวยากรณ์ (กลาง)",
    taskType: null,
    videoMatch: /แกรมม่าร์|ไวยากรณ์|grammar/i,
    level: "medium",
    order: 1,
    exercises: [
      { key: "mgr-conj", titleTh: "คำเชื่อม + อนุประโยค", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "mgr-present", titleTh: "Present tense: -s / -es", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "mgr-runon", titleTh: "เลี่ยงประโยค run-on", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "mgr-transition", titleTh: "คำเชื่อมความ (transitional words)", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "mgr-tense", titleTh: "อดีต / passive / อนาคต", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "mgr-relative", titleTh: "which / who / that", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
    ],
  },
  {
    key: "m-dictation",
    titleTh: "ตามคำบอก (กลาง)",
    taskType: "dictation",
    level: "medium",
    order: 2,
    exercises: [
      { key: "mdic-easy", titleTh: "สุ่ม 5 ข้อระดับง่าย", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.9 }, minutes: 8 },
      { key: "mdic-medium", titleTh: "5 ข้อระดับกลาง — เครื่องหมายวรรคตอนต้องถูกทั้งหมด", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.9, strictPunctuation: true }, minutes: 8 },
      { key: "mdic-hard", titleTh: "5 ข้อระดับยาก", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.8 }, minutes: 8 },
    ],
  },
  {
    key: "m-write-photo",
    titleTh: "เขียนบรรยายภาพ (กลาง)",
    taskType: "write_about_photo",
    level: "medium",
    order: 3,
    noteTh: "ดูเลกเชอร์ก่อน แล้วค่อยลงมือ — ต้องมีอย่างน้อย 1 ข้อได้ 110+ ถ้ายังไม่ถึง ให้ทบทวนแล้วลองใหม่",
    exercises: [
      { key: "mwp-people", titleTh: "เขียนเกี่ยวกับคน", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
      { key: "mwp-objects", titleTh: "เขียนเกี่ยวกับสิ่งของ", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
      { key: "mwp-places", titleTh: "เขียนเกี่ยวกับสถานที่", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
    ],
  },
  {
    key: "m-speak-photo",
    titleTh: "พูดบรรยายภาพ (กลาง)",
    taskType: "speak_about_photo",
    level: "medium",
    order: 4,
    noteTh: "ดูเลกเชอร์ก่อน — นับรวมกับเขียนบรรยายภาพ ขอแค่ 1 ข้อในกลุ่มนี้ได้ 110+",
    exercises: [
      { key: "msp-people", titleTh: "พูดเกี่ยวกับคน", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
      { key: "msp-objects", titleTh: "พูดเกี่ยวกับสิ่งของ", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
      { key: "msp-places", titleTh: "พูดเกี่ยวกับสถานที่", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 110, groupKey: "photo-110" }, minutes: 8 },
    ],
  },
  {
    key: "m-write-topic",
    titleTh: "เขียนตามหัวข้อ (กลาง)",
    taskType: "read_and_write",
    level: "medium",
    order: 5,
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน แบบฝึกอิงหัวข้อของเลกเชอร์วันนั้น",
    exercises: [
      { key: "mwt-l1", titleTh: "บทเรียนที่ 1", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mwt-l2", titleTh: "บทเรียนที่ 2", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mwt-l3", titleTh: "บทเรียนที่ 3", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mwt-l4", titleTh: "บทเรียนที่ 4", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mwt-real", titleTh: "เขียนจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "read_and_write", gate: { kind: "min_score", minScore: 110, retries: 2, reflectOnImprove: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "m-speak-topic",
    titleTh: "พูดตามหัวข้อ (กลาง)",
    taskType: "read_then_speak",
    level: "medium",
    order: 6,
    noteTh: "มีหลายหัวข้อ — กระจายหลายวัน",
    exercises: [
      { key: "mst-l1", titleTh: "บทเรียนที่ 1", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mst-l2", titleTh: "บทเรียนที่ 2", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mst-l3", titleTh: "บทเรียนที่ 3", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mst-l4", titleTh: "บทเรียนที่ 4", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mst-real", titleTh: "พูดจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "read_then_speak", gate: { kind: "min_score", minScore: 110, retries: 2, reflectOnImprove: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "m-interactive-speaking",
    titleTh: "Interactive Speaking (กลาง)",
    taskType: "interactive_speaking",
    level: "medium",
    order: 7,
    exercises: [
      { key: "mis-l1", titleTh: "บทเรียนที่ 1", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mis-l2", titleTh: "บทเรียนที่ 2", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mis-l3", titleTh: "บทเรียนที่ 3", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mis-l4", titleTh: "บทเรียนที่ 4", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "mis-real", titleTh: "พูดโต้ตอบจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "interactive_speaking", gate: { kind: "min_score", minScore: 100, retries: 2, reflectOnImprove: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "m-interactive-conversation",
    titleTh: "Interactive Conversation (กลาง)",
    taskType: "interactive_conversation_mcq",
    level: "medium",
    order: 8,
    exercises: [
      { key: "mic-set", titleTh: "แบบฝึก 3 ชุด — เก็บคะแนนสูงสุด", taskType: "interactive_conversation_mcq", gate: { kind: "best_of", attempts: 3 }, minutes: 8, spreadDays: 3 },
    ],
  },
  {
    key: "m-real-word",
    titleTh: "เลือกคำจริง (กลาง)",
    taskType: "real_english_word",
    level: "medium",
    order: 9,
    noteTh: "กระจายหลายวัน คละง่ายกับกลาง แล้วปิดท้ายด้วยระดับยาก 3 ชุด",
    exercises: [
      { key: "mrw-ladder", titleTh: "ระดับ 1 → ผ่านติดกัน 2 ครั้ง → ระดับ 2 (ผ่านติดกัน 3 ครั้ง)", taskType: "real_english_word", gate: { kind: "consecutive", needed: 2, thenLevel: "medium", thenNeeded: 3 }, minutes: 6, spreadDays: 5 },
      { key: "mrw-hard", titleTh: "ระดับยาก 3 ชุด", taskType: "real_english_word", gate: { kind: "consecutive", needed: 3 }, minutes: 6, spreadDays: 3 },
    ],
  },
  {
    key: "m-c-test",
    titleTh: "เติมคำในช่องว่าง (C-Test, กลาง)",
    taskType: "fill_in_blanks",
    level: "medium",
    order: 2.5,
    noteTh: "ข้อนี้วัดคำศัพท์เป็นหลัก ฟังเลกเชอร์อย่างเดียวไม่พอ ต้องฝึกบ่อย ๆ",
    exercises: [
      { key: "mct", titleTh: "ตลุยโจทย์ C-Test ระดับกลาง", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 8, spreadDays: 3 },
    ],
  },
  {
    key: "m-reading-skills",
    titleTh: "ทักษะการอ่าน (กลาง)",
    taskType: "reading_comprehension",
    level: "medium",
    order: 11,
    noteTh: "กระจายตลอด 1 สัปดาห์ เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      { key: "mrs-exam", titleTh: "ข้อสอบจริง — เก็บคะแนนเฉลี่ย", taskType: "reading_comprehension", gate: { kind: "average_tracked" }, minutes: 8, spreadDays: 7 },
    ],
  },
  {
    key: "m-reading-vocab",
    titleTh: "คำศัพท์จากการอ่าน (กลาง)",
    taskType: "vocabulary_reading",
    level: "medium",
    order: 12,
    noteTh: "กระจายตลอด 1 สัปดาห์ เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      { key: "mrv-exam", titleTh: "ข้อสอบจริง — เก็บคะแนนเฉลี่ย", taskType: "vocabulary_reading", gate: { kind: "average_tracked" }, minutes: 8, spreadDays: 7 },
    ],
  },
];


// ---------------------------------------------------------------------------
// HARD track
// ---------------------------------------------------------------------------

/**
 * The HARD curriculum.
 *
 * Bars raised again over MEDIUM:
 *   - dictation gains an ADVANCED stage: 6 runs, 90% or a clean comma run
 *   - write/speak about photo need one answer at 120+ (was 110)
 *   - write/speak about topic move to 120+, and every topic must clear it —
 *     the panel surfaces the lowest attempt with a "redeem myself" button
 *   - interactive speaking stays at 100+
 *
 * NOTE: the brief gives speak-about-topic a 110+ gate in one line and then
 * "until nothing gets below 120" in the next. 120 is used here so the redeem
 * rule is coherent; flagged for the founder to confirm.
 */
export const HARD_TRACK: CurriculumBlock[] = [
  {
    key: "h-grammar-foundation",
    titleTh: "ปูพื้นฐานไวยากรณ์ (สูง)",
    taskType: null,
    videoMatch: /แกรมม่าร์|ไวยากรณ์|grammar/i,
    level: "hard",
    order: 1,
    exercises: [
      { key: "hgr-conj", titleTh: "คำเชื่อม + อนุประโยค", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "hgr-present", titleTh: "Present tense: -s / -es", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "hgr-runon", titleTh: "เลี่ยงประโยค run-on", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "hgr-transition", titleTh: "คำเชื่อมความ (transitional words)", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "hgr-tense", titleTh: "อดีต / passive / อนาคต", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
      { key: "hgr-relative", titleTh: "which / who / that", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 6 },
    ],
  },
  {
    key: "h-dictation",
    titleTh: "ตามคำบอก (สูง)",
    taskType: "dictation",
    level: "hard",
    order: 2,
    noteTh: "เลกเชอร์ระดับสูงจะมาหลังจบระดับกลาง แล้วต้องทำอีก 6 รอบ",
    exercises: [
      { key: "hdic-easy", titleTh: "สุ่ม 5 ข้อระดับง่าย", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.9 }, minutes: 8 },
      { key: "hdic-medium", titleTh: "5 ข้อระดับกลาง — เครื่องหมายวรรคตอนต้องถูกทั้งหมด", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.9, strictPunctuation: true }, minutes: 8 },
      { key: "hdic-hard", titleTh: "5 ข้อระดับยาก", taskType: "dictation", gate: { kind: "pass_ratio", count: 5, ratio: 0.8 }, minutes: 8 },
      { key: "hdic-advanced", titleTh: "ระดับสูง 6 รอบ", taskType: "dictation", gate: { kind: "pass_ratio", count: 6, ratio: 0.9, orNoPunctuationErrors: true }, minutes: 10, spreadDays: 6 },
    ],
  },
  {
    key: "h-write-photo",
    titleTh: "เขียนบรรยายภาพ (สูง)",
    taskType: "write_about_photo",
    level: "hard",
    order: 3,
    noteTh: "ดูเลกเชอร์ก่อน — ต้องมีอย่างน้อย 1 ข้อได้ 120+",
    exercises: [
      { key: "hwp-people", titleTh: "เขียนเกี่ยวกับคน", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
      { key: "hwp-objects", titleTh: "เขียนเกี่ยวกับสิ่งของ", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
      { key: "hwp-places", titleTh: "เขียนเกี่ยวกับสถานที่", taskType: "write_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
    ],
  },
  {
    key: "h-speak-photo",
    titleTh: "พูดบรรยายภาพ (สูง)",
    taskType: "speak_about_photo",
    level: "hard",
    order: 4,
    noteTh: "นับรวมกับเขียนบรรยายภาพ — ขอแค่ 1 ข้อในกลุ่มนี้ได้ 120+",
    exercises: [
      { key: "hsp-people", titleTh: "พูดเกี่ยวกับคน", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
      { key: "hsp-objects", titleTh: "พูดเกี่ยวกับสิ่งของ", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
      { key: "hsp-places", titleTh: "พูดเกี่ยวกับสถานที่", taskType: "speak_about_photo", gate: { kind: "min_score_group", minScore: 120, groupKey: "photo-120" }, minutes: 8 },
    ],
  },
  {
    key: "h-write-topic",
    titleTh: "เขียนตามหัวข้อ (สูง)",
    taskType: "read_and_write",
    level: "hard",
    order: 5,
    noteTh: "แผงจะโชว์หัวข้อที่ทำได้ดีที่สุดและแย่ที่สุด — กดแก้ตัวข้อที่แย่ที่สุดได้",
    exercises: [
      { key: "hwt-l1", titleTh: "บทเรียนที่ 1", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hwt-l2", titleTh: "บทเรียนที่ 2", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hwt-l3", titleTh: "บทเรียนที่ 3", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hwt-l4", titleTh: "บทเรียนที่ 4", taskType: "read_and_write", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hwt-real", titleTh: "เขียนจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "read_and_write", gate: { kind: "min_score_all_topics", minScore: 120, redeemLowest: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "h-speak-topic",
    titleTh: "พูดตามหัวข้อ (สูง)",
    taskType: "read_then_speak",
    level: "hard",
    order: 6,
    noteTh: "แผงจะโชว์หัวข้อที่ทำได้ดีที่สุดและแย่ที่สุด — กดแก้ตัวข้อที่แย่ที่สุดได้",
    exercises: [
      { key: "hst-l1", titleTh: "บทเรียนที่ 1", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hst-l2", titleTh: "บทเรียนที่ 2", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hst-l3", titleTh: "บทเรียนที่ 3", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hst-l4", titleTh: "บทเรียนที่ 4", taskType: "read_then_speak", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "hst-real", titleTh: "พูดจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "read_then_speak", gate: { kind: "min_score_all_topics", minScore: 120, redeemLowest: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "h-interactive-speaking",
    titleTh: "Interactive Speaking (สูง)",
    taskType: "interactive_speaking",
    level: "hard",
    order: 7,
    exercises: [
      { key: "his-l1", titleTh: "บทเรียนที่ 1", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "his-l2", titleTh: "บทเรียนที่ 2", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "his-l3", titleTh: "บทเรียนที่ 3", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "his-l4", titleTh: "บทเรียนที่ 4", taskType: "interactive_speaking", gate: { kind: "pass_ratio", count: 1, ratio: 1 }, minutes: 6, isLesson: true },
      { key: "his-real", titleTh: "พูดโต้ตอบจริง (ไม่จำกัดจำนวนครั้ง)", taskType: "interactive_speaking", gate: { kind: "min_score", minScore: 100, retries: 2, reflectOnImprove: true }, minutes: 10, spreadDays: 4 },
    ],
  },
  {
    key: "h-interactive-conversation",
    titleTh: "Interactive Conversation (สูง)",
    taskType: "interactive_conversation_mcq",
    level: "hard",
    order: 8,
    exercises: [
      { key: "hic-set", titleTh: "แบบฝึก 3 ชุด — เก็บคะแนนสูงสุด", taskType: "interactive_conversation_mcq", gate: { kind: "best_of", attempts: 3 }, minutes: 8, spreadDays: 3 },
    ],
  },
  {
    key: "h-real-word",
    titleTh: "เลือกคำจริง (สูง)",
    taskType: "real_english_word",
    level: "hard",
    order: 9,
    noteTh: "กระจายหลายวัน คละง่ายกับกลาง แล้วปิดท้ายด้วยระดับยาก 3 ชุด",
    exercises: [
      { key: "hrw-ladder", titleTh: "ระดับ 1 → ผ่านติดกัน 2 ครั้ง → ระดับ 2 (ผ่านติดกัน 3 ครั้ง)", taskType: "real_english_word", gate: { kind: "consecutive", needed: 2, thenLevel: "medium", thenNeeded: 3 }, minutes: 6, spreadDays: 5 },
      { key: "hrw-hard", titleTh: "ระดับยาก 3 ชุด", taskType: "real_english_word", gate: { kind: "consecutive", needed: 3 }, minutes: 6, spreadDays: 3 },
    ],
  },
  {
    key: "h-c-test",
    titleTh: "เติมคำในช่องว่าง (C-Test, สูง)",
    taskType: "fill_in_blanks",
    level: "hard",
    order: 2.5,
    noteTh: "ข้อนี้วัดคำศัพท์เป็นหลัก ฟังเลกเชอร์อย่างเดียวไม่พอ ต้องฝึกบ่อย ๆ",
    exercises: [
      { key: "hct", titleTh: "ตลุยโจทย์ C-Test ระดับยาก", taskType: "fill_in_blanks", gate: { kind: "pass_ratio", count: 10, ratio: 0.8 }, minutes: 8, spreadDays: 3 },
    ],
  },
  {
    key: "h-reading-skills",
    titleTh: "ทักษะการอ่าน (สูง)",
    taskType: "reading_comprehension",
    level: "hard",
    order: 11,
    noteTh: "กระจายตลอด 1 สัปดาห์ เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      { key: "hrs-exam", titleTh: "ข้อสอบจริง — เก็บคะแนนเฉลี่ย", taskType: "reading_comprehension", gate: { kind: "average_tracked" }, minutes: 8, spreadDays: 7 },
    ],
  },
  {
    key: "h-reading-vocab",
    titleTh: "คำศัพท์จากการอ่าน (สูง)",
    taskType: "vocabulary_reading",
    level: "hard",
    order: 12,
    noteTh: "กระจายตลอด 1 สัปดาห์ เก็บคะแนนเฉลี่ยไว้โชว์บนแผง",
    exercises: [
      { key: "hrv-exam", titleTh: "ข้อสอบจริง — เก็บคะแนนเฉลี่ย", taskType: "vocabulary_reading", gate: { kind: "average_tracked" }, minutes: 8, spreadDays: 7 },
    ],
  },
];

/** Curriculum for a placement level. */
export const TRACKS = {
  basic: EASY_TRACK,
  medium: MEDIUM_TRACK,
  advanced: HARD_TRACK,
} as const;

/**
 * The blocks to schedule for a set of tracks, in order.
 *
 * A BASIC placement returns EASY then MEDIUM ("go basic curriculum once it's
 * done, add medium curriculum"). Orders are offset so the second track's blocks
 * always follow the first's.
 */
export function blocksForTracks(tracks: readonly ("basic" | "medium" | "advanced")[]): CurriculumBlock[] {
  const out: CurriculumBlock[] = [];
  tracks.forEach((t, i) => {
    for (const b of TRACKS[t]) out.push({ ...b, order: b.order + i * 100 });
  });
  return out;
}


// ---------------------------------------------------------------------------
// Daily fill-in-the-blanks warm-up
// ---------------------------------------------------------------------------

/**
 * Fill in the Blanks is the most vocabulary-dependent question on the test, and
 * vocabulary does not come from watching lectures — it comes from meeting words
 * repeatedly. So rather than teaching it once, the learner is offered two items
 * at the START of every lecture day, mixed one rung above their own level to
 * keep pushing exposure.
 */
export type WarmupItem = { level: RungLevel };

export const WARMUP_ITEM_COUNT = 2;

export function fillBlankWarmup(track: "basic" | "medium" | "advanced"): WarmupItem[] {
  switch (track) {
    case "basic":
      return [{ level: "easy" }, { level: "medium" }];
    case "medium":
    case "advanced":
      return [{ level: "medium" }, { level: "hard" }];
  }
}

export const WARMUP_PROMPT_TH =
  "อยากอุ่นเครื่องด้วยข้อ “เติมคำในช่องว่าง” 2 ข้อก่อนเริ่มบทเรียนไหม?";

export const WARMUP_WHY_TH =
  "ข้อนี้วัดคำศัพท์เป็นหลัก — ดูเลกเชอร์อย่างเดียวไม่พอ ต้องเจอคำใหม่บ่อย ๆ ทุกวัน";

/** Compact rung labels for warm-up chips. */
export const RUNG_TH_SHORT: Record<RungLevel, string> = {
  easy: "ง่าย",
  medium: "กลาง",
  hard: "ยาก",
};
