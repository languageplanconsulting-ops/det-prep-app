/**
 * Weakness → resource routing map (client-safe, framework-free).
 *
 * One entry per DET task type: where to LEARN (บทเรียน lesson bank), where to
 * DRILL (practice exam route), and which Duolingo Fast Track course chapter
 * teaches it. This is the Part-2 routing table of
 * docs/study-plan/personalized-calendar-design.md as data.
 */

export type WeaknessResource = {
  taskType: string;
  emoji: string;
  labelTh: string;
  /** บทเรียน route (free for signed-in users), when a lesson bank exists. */
  lessonHref?: string;
  /** Practice exam route (tier limits apply). */
  practiceHref?: string;
  /** Course chapter label (Duolingo Fast Track), shown next to the course link. */
  courseChapterTh?: string;
};

export const COURSE_HREF = "/course/duolingo-fast-track";

export const WEAKNESS_RESOURCES: Record<string, WeaknessResource> = {
  dictation: {
    taskType: "dictation",
    emoji: "🎧",
    labelTh: "ตามคำบอก (Listen & Type)",
    lessonHref: "/practice/lessons/dictation",
    practiceHref: "/practice/literacy/dictation",
    courseChapterTh: "บทที่ 10 — Listen and Type",
  },
  fill_in_blanks: {
    taskType: "fill_in_blanks",
    emoji: "✏️",
    labelTh: "เติมคำในช่องว่าง (C-Test)",
    lessonHref: "/practice/lessons/grammar-fitb",
    practiceHref: "/practice/literacy/fill-in-blank",
    courseChapterTh: "บทที่ 6 — C-Test (Read and Complete)",
  },
  real_english_word: {
    taskType: "real_english_word",
    emoji: "🔤",
    labelTh: "เลือกคำจริง (Read & Select)",
    lessonHref: "/practice/lessons/real-word",
    practiceHref: "/practice/literacy/real-word",
    courseChapterTh: "บทที่ 9 — Select Real English Word",
  },
  vocabulary_reading: {
    taskType: "vocabulary_reading",
    emoji: "📚",
    labelTh: "คำศัพท์จากการอ่าน",
    lessonHref: "/practice/lessons/campus-vocab",
    practiceHref: "/practice/comprehension/vocabulary",
    courseChapterTh: "บทที่ 15 — Vocabulary Skills",
  },
  reading_comprehension: {
    taskType: "reading_comprehension",
    emoji: "📖",
    labelTh: "การอ่านจับใจความ",
    lessonHref: "/practice/lessons/reading-skills",
    practiceHref: "/practice/comprehension/reading",
    courseChapterTh: "บทที่ 12 — Reading Comprehension",
  },
  write_about_photo: {
    taskType: "write_about_photo",
    emoji: "🖼️",
    labelTh: "เขียนบรรยายภาพ",
    lessonHref: "/practice/lessons/how-to-write/write-about-photo",
    practiceHref: "/practice/production/write-about-photo",
    courseChapterTh: "บทที่ 2 — Writing about a photo",
  },
  read_and_write: {
    taskType: "read_and_write",
    emoji: "📝",
    labelTh: "อ่านแล้วเขียน (Essay)",
    lessonHref: "/practice/lessons/how-to-write/read-and-write",
    practiceHref: "/practice/production/read-and-write",
    courseChapterTh: "บทที่ 7–8 — Write 50 words + Follow-up",
  },
  speak_about_photo: {
    taskType: "speak_about_photo",
    emoji: "🗣️",
    labelTh: "พูดบรรยายภาพ",
    lessonHref: "/practice/lessons/how-to-speak/speak-about-photo",
    practiceHref: "/practice/production/speak-about-photo",
    courseChapterTh: "บทที่ 3 — Speak about a photo",
  },
  read_then_speak: {
    taskType: "read_then_speak",
    emoji: "🎤",
    labelTh: "อ่านแล้วพูด",
    lessonHref: "/practice/lessons/how-to-speak/read-and-speak",
    practiceHref: "/practice/production/read-and-speak",
    courseChapterTh: "บทที่ 4 + 11 — Speaking + Read Aloud",
  },
  interactive_speaking: {
    taskType: "interactive_speaking",
    emoji: "💬",
    labelTh: "Interactive Speaking (ข้อสอบใหม่ 2026)",
    practiceHref: "/practice/production/interactive-speaking",
    courseChapterTh: "บทที่ 5 — Interactive Speaking",
  },
  interactive_conversation_mcq: {
    taskType: "interactive_conversation_mcq",
    emoji: "👂",
    labelTh: "บทสนทนา (Interactive Conversation)",
    practiceHref: "/practice/listening/interactive",
    courseChapterTh: "บทที่ 13 — Interactive Conversation",
  },
  interactive_listening: {
    taskType: "interactive_listening",
    emoji: "👂",
    labelTh: "การฟังบทสนทนา",
    practiceHref: "/practice/listening/interactive",
    courseChapterTh: "บทที่ 13 — Interactive Conversation",
  },
  conversation_summary: {
    taskType: "conversation_summary",
    emoji: "🧾",
    labelTh: "สรุปบทสนทนา",
    practiceHref: "/practice/listening/dialogue-summary",
    courseChapterTh: "บทที่ 13 — Conversation Summary",
  },
  summarize_conversation: {
    taskType: "summarize_conversation",
    emoji: "🧾",
    labelTh: "สรุปบทสนทนา",
    practiceHref: "/practice/listening/dialogue-summary",
    courseChapterTh: "บทที่ 13 — Conversation Summary",
  },
};

export function weaknessResourceFor(taskType: string): WeaknessResource | null {
  return WEAKNESS_RESOURCES[taskType] ?? null;
}
