/**
 * Randomized บทเรียน (lesson) queue builder for the web 🎲 picker.
 *
 * Mirrors det-mobile's daily-lesson engine (src/lib/daily-lesson.ts
 * DAILY_LESSON_COMPOSITION) one-to-one — same per-duration skill slots, in the
 * same run order — so "เลือกให้เลย" on the web produces the SAME lesson mix the
 * mobile app would for a given time budget.
 *
 * The one adaptation: on mobile every slot is an individual lesson ITEM played
 * by one combined runner. The web instead has a dedicated runner per sub-skill
 * (each already batches several items internally), so we collapse the mobile
 * composition to one queue entry per distinct sub-skill route (deduped by href)
 * and let that runner handle the reps. More time budget still pulls in more
 * sub-skills, exactly like mobile.
 */
import type { RandomDifficulty } from "@/lib/practice-random";
import type { QueueItem } from "@/lib/practice-queue-builder";

export type LessonDuration = 5 | 10 | 20 | 30;

/** Mobile lesson-skill tags (det-mobile lesson-seen.ts LessonSkillTag). */
type LessonSkill =
  | "dictation"
  | "photowrite"
  | "readspeak"
  | "speakphoto"
  | "realword_lesson"
  | "campusvocab"
  | "missingparagraph"
  | "findinfo"
  | "mainidea"
  | "readwrite"
  | "besttitle"
  | "vocabcomprehension";

/** Each mobile lesson skill → its closest live web runner + a Thai label/emoji. */
const LESSON_SKILL_ROUTE: Record<LessonSkill, { href: string; th: string; emoji: string }> = {
  dictation: { href: "/practice/lessons/dictation", th: "ตามคำบอก", emoji: "🎧" },
  photowrite: { href: "/practice/lessons/how-to-write/write-about-photo", th: "เขียนจากภาพ", emoji: "✍️" },
  readwrite: { href: "/practice/lessons/how-to-write/read-and-write", th: "อ่านแล้วเขียน", emoji: "📝" },
  readspeak: { href: "/practice/lessons/how-to-speak/read-and-speak", th: "อ่านแล้วพูด", emoji: "🎤" },
  speakphoto: { href: "/practice/lessons/how-to-speak/speak-about-photo", th: "พูดจากภาพ", emoji: "🗣️" },
  realword_lesson: { href: "/practice/lessons/real-word", th: "คำจริง / คำลวง", emoji: "🔤" },
  campusvocab: { href: "/practice/lessons/campus-vocab", th: "คำศัพท์ในมหาวิทยาลัย", emoji: "🎓" },
  missingparagraph: { href: "/practice/lessons/reading-skills/missing-paragraph", th: "ย่อหน้าที่หายไป", emoji: "🧩" },
  findinfo: { href: "/practice/lessons/reading-skills/find-info", th: "หาข้อมูลเฉพาะ", emoji: "🔎" },
  mainidea: { href: "/practice/lessons/reading-skills/main-idea", th: "ใจความสำคัญ", emoji: "💡" },
  besttitle: { href: "/practice/lessons/reading-skills/main-idea", th: "ชื่อเรื่องที่ดีที่สุด", emoji: "🏷️" },
  vocabcomprehension: { href: "/practice/lessons/campus-vocab", th: "ศัพท์ในบทอ่าน", emoji: "📚" },
};

/**
 * Per-duration ordered lesson-skill slots — copied verbatim from det-mobile's
 * DAILY_LESSON_COMPOSITION (the `skill` field of each slot, in order). Item
 * counts are dropped on the web since each runner batches its own reps.
 */
const LESSON_COMPOSITION: Record<LessonDuration, LessonSkill[]> = {
  5: ["dictation", "photowrite", "readspeak", "realword_lesson"],
  10: [
    "dictation",
    "photowrite",
    "readspeak",
    "speakphoto",
    "realword_lesson",
    "campusvocab",
    "missingparagraph",
    "findinfo",
    "mainidea",
    "besttitle",
  ],
  20: [
    "dictation",
    "photowrite",
    "readspeak",
    "speakphoto",
    "realword_lesson",
    "campusvocab",
    "missingparagraph",
    "findinfo",
    "mainidea",
    "besttitle",
    "readwrite",
  ],
  30: [
    "dictation",
    "photowrite",
    "readspeak",
    "speakphoto",
    "realword_lesson",
    "campusvocab",
    "missingparagraph",
    "findinfo",
    "mainidea",
    "besttitle",
    "readwrite",
    "vocabcomprehension",
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build one randomized lesson run for the chosen time budget. `difficulty` is
 * accepted for parity with the exam picker (and to keep the two flows visually
 * identical) but does not filter lesson content — the web lesson banks aren't
 * difficulty-tiered, matching mobile where the daily lesson is duration-only.
 */
export function buildRandomLessonQueue(
  _difficulty: RandomDifficulty,
  duration: LessonDuration,
): QueueItem[] {
  const seen = new Set<string>();
  const queue: QueueItem[] = [];
  for (const skill of shuffle(LESSON_COMPOSITION[duration])) {
    const route = LESSON_SKILL_ROUTE[skill];
    if (seen.has(route.href)) continue;
    seen.add(route.href);
    queue.push({ key: route.href, emoji: route.emoji, label: route.th, href: route.href });
  }
  return queue;
}
