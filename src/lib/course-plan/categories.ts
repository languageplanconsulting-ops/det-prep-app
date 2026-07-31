/**
 * Study-block model for the /course page.
 *
 * Blocks are the DET *integrated* subscores, because those are what the score
 * report actually shows the student:
 *   Literacy = Reading + Writing · Comprehension = Reading + Listening
 *   Production = Speaking + Writing · Conversation = Speaking + Listening
 *
 * Every task type is filed under the block it moves most, and every course
 * chapter is filed under a block so "show me the lessons for Production" can be
 * answered without tagging the DB rows (course_lessons carries no category yet).
 */

export type StudyBlockKey = "production" | "conversation" | "comprehension" | "literacy" | "general";

export type StudyBlock = {
  key: StudyBlockKey;
  th: string;
  subtitleTh: string;
  emoji: string;
  /** Tailwind tone token used by the UI. */
  tone: "rose" | "violet" | "sky" | "emerald" | "slate";
};

export const STUDY_BLOCKS: StudyBlock[] = [
  {
    key: "production",
    th: "Production",
    subtitleTh: "พูด + เขียน — ส่วนที่คนไทยเสียคะแนนมากที่สุด",
    emoji: "🎤",
    tone: "rose",
  },
  {
    key: "conversation",
    th: "Conversation",
    subtitleTh: "ฟัง + พูด — โจทย์โต้ตอบแบบใหม่ปี 2026",
    emoji: "💬",
    tone: "violet",
  },
  {
    key: "comprehension",
    th: "Comprehension",
    subtitleTh: "อ่าน + ฟัง — จับใจความและฟังจับรายละเอียด",
    emoji: "🎧",
    tone: "sky",
  },
  {
    key: "literacy",
    th: "Literacy",
    subtitleTh: "อ่าน + เขียน — คำศัพท์ ไวยากรณ์ ความแม่นยำ",
    emoji: "📖",
    tone: "emerald",
  },
  {
    key: "general",
    th: "ภาพรวม & ซ้อมจริง",
    subtitleTh: "แนะนำข้อสอบ กลยุทธ์ และการจำลองสอบ",
    emoji: "🧭",
    tone: "slate",
  },
];

export function studyBlock(key: StudyBlockKey): StudyBlock {
  return STUDY_BLOCKS.find((b) => b.key === key) ?? STUDY_BLOCKS[STUDY_BLOCKS.length - 1];
}

/** Which block each weakness task type belongs to. Keys match WEAKNESS_RESOURCES. */
export const TASK_BLOCK: Record<string, StudyBlockKey> = {
  write_about_photo: "production",
  speak_about_photo: "production",
  read_and_write: "production",
  read_then_speak: "production",
  interactive_speaking: "conversation",
  interactive_conversation_mcq: "conversation",
  interactive_listening: "conversation",
  conversation_summary: "conversation",
  summarize_conversation: "conversation",
  dictation: "comprehension",
  reading_comprehension: "comprehension",
  real_english_word: "literacy",
  fill_in_blanks: "literacy",
  vocabulary_reading: "literacy",
};

/**
 * Default study order for a learner who has NOT taken a mock test yet.
 *
 * Founder-specified order: productive skills first (they carry the most upside
 * and take longest to move), then the mechanical ones, then reading last.
 * Once a mock or mini-diagnosis exists, the weakness vector overrides this.
 */
export const DEFAULT_TASK_PRIORITY: string[] = [
  "write_about_photo",
  "speak_about_photo",
  "read_and_write",
  "read_then_speak",
  "dictation",
  "real_english_word",
  "interactive_speaking",
  "interactive_conversation_mcq",
  "fill_in_blanks",
  "reading_comprehension",
  "vocabulary_reading",
];

/** Thai labels for the tasks shown in the score breakdown and planner. */
export const TASK_LABEL_TH: Record<string, string> = {
  write_about_photo: "เขียนบรรยายภาพ",
  speak_about_photo: "พูดบรรยายภาพ",
  read_and_write: "เขียนตามหัวข้อ (50 คำ)",
  read_then_speak: "พูดตามหัวข้อ",
  dictation: "ตามคำบอก",
  real_english_word: "เลือกคำจริง",
  interactive_speaking: "Interactive Speaking",
  interactive_conversation_mcq: "Interactive Conversation",
  interactive_listening: "Interactive Listening",
  conversation_summary: "สรุปบทสนทนา",
  summarize_conversation: "สรุปบทสนทนา",
  fill_in_blanks: "เติมคำในช่องว่าง",
  reading_comprehension: "ทักษะการอ่าน",
  vocabulary_reading: "คำศัพท์จากการอ่าน",
};

export function taskLabel(taskType: string): string {
  return TASK_LABEL_TH[taskType] ?? taskType;
}

/**
 * Course chapter → study block, matched on the chapter title.
 *
 * Chapters came from the Thinkific export and carry no category column, so the
 * match is by title. Ordered most-specific first: "Interactive Speaking" must
 * win before the looser "Speak"/"Speaking" rules.
 */
const CHAPTER_RULES: { test: RegExp; block: StudyBlockKey }[] = [
  { test: /interactive speaking/i, block: "conversation" },
  { test: /interactive conversation/i, block: "conversation" },
  { test: /write.*photo|writing about a photo/i, block: "production" },
  { test: /speak about a photo|พูด.*ภาพ/i, block: "production" },
  { test: /write 50|follow-up response|เขียน/i, block: "production" },
  { test: /speaking \(|read then speak|ฝึกการพูด/i, block: "production" },
  { test: /listen and type/i, block: "comprehension" },
  { test: /reading comprehension/i, block: "comprehension" },
  { test: /c-test|read and complete/i, block: "literacy" },
  { test: /real.*english word/i, block: "literacy" },
  { test: /vocabulary/i, block: "literacy" },
  { test: /read aloud/i, block: "general" },
  { test: /ภาพรวม|guide|จำลองสอบ/i, block: "general" },
];

const VALID_BLOCKS: StudyBlockKey[] = [
  "production",
  "conversation",
  "comprehension",
  "literacy",
  "general",
];

/**
 * The block a chapter belongs to.
 *
 * Prefers `course_chapters.study_block` (migration 043). Title matching is the
 * fallback for rows that predate the column or were never tagged — it
 * classifies all 15 current chapters correctly, but breaks on a rename.
 *
 * `study_block = 'retired'` maps to "general" here; use isRetiredChapter() to
 * detect it, so retired chapters still render with their warning.
 */
export function blockForChapter(title: string, studyBlock?: string | null): StudyBlockKey {
  if (studyBlock === "retired") return "general";
  if (studyBlock && VALID_BLOCKS.includes(studyBlock as StudyBlockKey)) {
    return studyBlock as StudyBlockKey;
  }
  for (const rule of CHAPTER_RULES) {
    if (rule.test.test(title)) return rule.block;
  }
  return "general";
}

/**
 * Chapters teaching question types Duolingo removed on 1 July 2025.
 * Surfaced with a warning rather than hidden, so the admin can see what still
 * needs deleting from the course.
 */
/**
 * The specific DET task a chapter teaches, so the day's exercise practises the
 * skill the day's video just taught.
 *
 * Without this the planner pairs a "writing about a photo" video with a
 * "speak about a photo" drill, which teaches nothing. Null = a general chapter
 * (orientation, full-mock guides) with no single matching drill.
 */
const CHAPTER_TASK_RULES: { test: RegExp; task: string }[] = [
  { test: /interactive speaking/i, task: "interactive_speaking" },
  { test: /interactive conversation/i, task: "interactive_conversation_mcq" },
  { test: /writing about a photo|write.*photo/i, task: "write_about_photo" },
  { test: /speak about a photo/i, task: "speak_about_photo" },
  { test: /speaking \(1-3|read then speak/i, task: "read_then_speak" },
  { test: /write 50 words|follow-up response/i, task: "read_and_write" },
  { test: /c-test|read and complete/i, task: "fill_in_blanks" },
  { test: /real.*english word/i, task: "real_english_word" },
  { test: /listen and type/i, task: "dictation" },
  { test: /reading comprehension/i, task: "reading_comprehension" },
  { test: /vocabulary/i, task: "vocabulary_reading" },
];

export function taskForChapter(title: string): string | null {
  for (const rule of CHAPTER_TASK_RULES) {
    if (rule.test.test(title)) return rule.task;
  }
  return null;
}

export function isRetiredChapter(title: string, studyBlock?: string | null): boolean {
  if (studyBlock === "retired") return true;
  if (studyBlock) return false; // explicitly tagged as something else — trust it
  return /read aloud/i.test(title) || /listen\s*\/\s*read then speak/i.test(title);
}

/**
 * Difficulty rung inferred from a lesson title, for rows that predate
 * migration 044. Mirrors the seeding rules in that migration.
 */
export function levelForLessonTitle(title: string): "easy" | "medium" | "hard" {
  if (/ระดับง่าย|เริ่มต้น|พื้นฐาน/.test(title)) return "easy";
  if (/130\+|125\+|C1|B2-C1|ยาก/.test(title)) return "hard";
  return "medium";
}
