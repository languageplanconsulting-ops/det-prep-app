/**
 * The web บทเรียน (Lessons) topic list — single source of truth for every place that
 * offers "pick a lesson" (the 🎲 random-practice picker, the study-plan calendar's
 * lesson track, and the practice-hub sidebar).
 *
 * Mirrors det-mobile's `LESSON_TOPICS` (src/lib/lessons.ts) one-to-one — same order,
 * same Thai labels, same icons — so the lesson experience matches the mobile app. Each
 * topic routes to its already-built, live-synced web runner under /practice/lessons/*.
 * Progress syncs with mobile automatically via the shared lesson_unit_progress /
 * lesson_item_seen Supabase tables (see project_lessons_web_port).
 */

export type LessonTopic = {
  /** URL slug under /practice/lessons/<slug>. */
  slug: string;
  th: string;
  en: string;
  descTh: string;
  emoji: string;
};

export const LESSON_TOPICS: LessonTopic[] = [
  {
    slug: "dictation",
    th: "ตามคำบอก",
    en: "Dictation",
    descTh: "ฟังเสียง แล้วเรียงคำให้ถูกลำดับ — ฝึกผันกริยาและวางคอมมา",
    emoji: "🎧",
  },
  {
    slug: "reading-skills",
    th: "ทักษะการอ่าน",
    en: "Reading skills",
    descTh: "หาย่อหน้าที่หายไป หาข้อมูลเฉพาะ และจับใจความสำคัญ",
    emoji: "🧩",
  },
  {
    slug: "how-to-write",
    th: "บทฝึกสำหรับโจทย์เขียน",
    en: "How to write",
    descTh: "พื้นฐานการเขียน — อ่านแล้วเขียน และเขียนบรรยายภาพ",
    emoji: "✍️",
  },
  {
    slug: "how-to-speak",
    th: "บทฝึกสำหรับโจทย์พูด",
    en: "How to speak",
    descTh: "พื้นฐานการพูด — อ่านแล้วพูด และพูดจากภาพ",
    emoji: "🎤",
  },
  {
    slug: "real-word",
    th: "คำจริง",
    en: "Real word",
    descTh: "ตัดสินว่าคำสะกดถูกหรือผิด ถ้าผิดให้แก้ให้ถูก แล้วเรียนความหมาย",
    emoji: "🔤",
  },
  {
    slug: "campus-vocab",
    th: "คำศัพท์ในมหาวิทยาลัย",
    en: "Campus Vocabulary",
    descTh: "ฟังสถานการณ์ในมหาวิทยาลัย แล้วเติมคำศัพท์เฉพาะที่หายไปให้ถูก",
    emoji: "🎓",
  },
  {
    slug: "grammar-fitb",
    th: "เติมคำในช่องว่าง (ไวยากรณ์)",
    en: "Fill-in-the-blank Grammar",
    descTh: "ฝึกไวยากรณ์ทีละบท — ปัจจุบัน/อดีต/passive/adverb/คำเชื่อม แล้วเติมคำในย่อหน้า 5 ช่อง",
    emoji: "✏️",
  },
];

/** Href to a lesson topic's runner. */
export function lessonTopicHref(slug: string): string {
  return `/practice/lessons/${slug}`;
}
