/**
 * The four single-skill drills, each one or two steps of the real Interactive Reading task.
 * Plain module (not "use client") so both the server-rendered hub and the client runner can read it.
 */
export type DrillKind = "cloze" | "text-completion" | "highlight" | "idea-title";

export const DRILLS: Record<
  DrillKind,
  { slug: string; steps: number[]; th: string; blurbTh: string; icon: string; bg: string; teachTh: string }
> = {
  cloze: {
    slug: "cloze",
    steps: [0],
    th: "เติมคำในช่องว่าง",
    blurbTh: "ขั้นที่ 1 ของ Interactive Reading · ให้คะแนนทีละช่อง",
    icon: "🔤",
    bg: "bg-emerald-50",
    teachTh:
      "ช่องว่างในข้อสอบจริงไม่ได้วัดแค่คำศัพท์ — เกินครึ่งเป็นคำไวยากรณ์ เช่น is / who / for / it / most ดังนั้นให้อ่านทั้งประโยคก่อนเลือก อย่าเดาจากความหมายของคำเดี่ยว ๆ",
  },
  "text-completion": {
    slug: "missing-paragraph",
    steps: [1],
    th: "เติมประโยคที่หายไป",
    blurbTh: "ขั้นที่ 2 · เลือกประโยคที่เติมลงบทอ่านได้ดีที่สุด",
    icon: "🧩",
    bg: "bg-orange-50",
    teachTh:
      "เคล็ดลับคือ อ่านประโยคถัดจากช่องว่างแล้วดูคำเชื่อม (Still… / Here… / And that…) ประโยคที่ถูกคือประโยคที่ทำให้คำเชื่อมนั้นมีความหมาย ตัวลวงมักอ่านลื่นแต่ทำให้ประโยคถัดไปลอย",
  },
  highlight: {
    slug: "find-info",
    steps: [2, 3],
    th: "ไฮไลต์คำตอบ",
    blurbTh: "ขั้นที่ 3–4 · ลากคลุมข้อความที่ตอบคำถาม",
    icon: "🔎",
    bg: "bg-sky-50",
    teachTh:
      "เฉลยในข้อสอบจริงสั้นได้ถึง 2–3 คำ (เช่น “the canopy layer”) และยาวได้ถึงทั้งอนุประโยค กฎคือไฮไลต์ให้สั้นที่สุดเท่าที่ยังตอบคำถามครบ — ลากทั้งประโยคทั้งที่เฉลยเป็นวลีสั้น จะถือว่าผิด",
  },
  "idea-title": {
    slug: "main-idea",
    steps: [4, 5],
    th: "แนวคิดที่กล่าวถึง + ชื่อเรื่อง",
    blurbTh: "ขั้นที่ 5–6 · คนละคำถามกัน อย่าใช้วิธีเดียวกัน",
    icon: "💡",
    bg: "bg-violet-50",
    teachTh:
      "สองข้อนี้ไม่เหมือนกัน — “แนวคิดที่กล่าวถึง” เฉลยคือการพูดซ้ำประโยคที่มีอยู่จริงในบทอ่าน (ไม่ใช่การตีความลึก) ส่วน “ชื่อเรื่อง” เป็นวลีสั้น 3–6 คำ ที่ต้องครอบคลุมทั้งเรื่อง ไม่ใช่รายละเอียดจุดเดียว",
  },
};

export const DRILL_ORDER: DrillKind[] = ["cloze", "text-completion", "highlight", "idea-title"];
