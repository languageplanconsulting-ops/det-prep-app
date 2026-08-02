/**
 * "Summarising the conversation in 75 seconds" — the lecture
 * เทคนิคการเขียน Conversation Summary (chapter "Interactive Conversation").
 *
 * The handout is short and unusually prescriptive: five connectors, one
 * three-move shape, and two worked summaries built from exactly those pieces.
 * That is the whole method, so it fits in one small bank.
 *
 * Shown above the summary box (ConversationSummaryPattern) so the learner is
 * looking at the connectors while they type, not two screens away from them.
 */

/** The five words the handout says to use, in the order it lists them. */
export const SUMMARY_CONNECTORS: { en: string; th: string }[] = [
  { en: "However", th: "แต่ทว่า — ใช้หักมุมเข้าปัญหา" },
  { en: "Therefore", th: "ดังนั้น — ใช้บอกสิ่งที่เขาตัดสินใจทำ" },
  { en: "Eventually / Ultimately", th: "ในที่สุด — ใช้เปิดผลลัพธ์ตอนจบ" },
  { en: "After + …", th: "หลังจาก… — ใช้ทำประโยคซับซ้อน" },
  { en: "As long as", th: "ตราบใดที่ — ใช้ใส่เงื่อนไขปิดท้าย" },
];

/** The three moves the worked examples follow. */
export const SUMMARY_SKELETON: { en: string; th: string }[] = [
  {
    en: "[Person] wishes to / received ______.",
    th: "บอกสถานการณ์ตั้งต้นว่าใครต้องการอะไร หรือได้อะไรมา",
  },
  {
    en: "However, this might ______, therefore [he/she/I] decided to ______.",
    th: "บอกปัญหาที่ตามมา แล้วบอกว่าเขาจึงตัดสินใจทำอะไร",
  },
  {
    en: "Eventually, after ______, [he/she/I] decided to ______ as long as ______.",
    th: "ปิดท้ายด้วยผลลัพธ์หลังปรึกษา พร้อมเงื่อนไข",
  },
];

/** The handout's own two summaries, kept verbatim as the models to imitate. */
export const SUMMARY_EXAMPLES: { titleTh: string; en: string }[] = [
  {
    titleTh: "ตัวอย่างที่ 1 — นักเรียนขอคำปรึกษาเรื่องไปเรียนต่อต่างประเทศ",
    en: "The student wishes to participate in the study program abroad. However, this might cause him to delay his graduation, therefore he decides to ask his professor for consultation. Eventually, after getting the advice, he decides to pursue the study abroad program as long as he can start his research project earlier.",
  },
  {
    titleTh: "ตัวอย่างที่ 2 — พนักงานได้ข้อเสนองานใหม่ ต้องย้ายเมือง",
    en: "I received an offer to work for a big company. However, I was required to move to another city for the job, therefore I decided to ask my mentor for advice. Ultimately, after the consultation, the manager decided to put me in contact with the HR department to help with my relocation.",
  },
];

export const SUMMARY_TIME_LIMIT_TH = "สรุปบทสนทนาให้จบใน 75 วินาที";
