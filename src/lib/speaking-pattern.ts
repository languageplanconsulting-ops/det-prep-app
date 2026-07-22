/**
 * P'Doy's answer patterns for Read-and-then-speak (1–3 min speaking).
 *
 * Two shapes, because the prompts come in two shapes:
 *  - "describe"  → Describe / Talk about / Explain a time when …  (4-part story)
 *  - "opinion"   → Do you agree …? / Which is better …? / How does X change Y?
 *                  (intro with both sides → reason 1 → reason 2 → conclusion)
 *
 * Single source of truth: the hint panel renders these as plain sentences, and
 * the Fast Track VIP note-taking scaffold renders the same tokens with typable
 * blanks in place of each `______`.
 */

export type PatternToken = string | { blank: true; hint: string };
export type PatternPart = { th: string; tokens: PatternToken[] };
export type PatternWord = { w: string; th: string };
export type PatternId = "describe" | "opinion";

export type SpeakingPattern = {
  id: PatternId;
  label: string;
  /** When to reach for this pattern (Thai). */
  useWhen: string;
  /** Example prompt wording that signals this pattern. */
  signal: string;
  parts: PatternPart[];
  /** 20 words / phrases that fit this pattern, with Thai glosses. */
  vocab: PatternWord[];
};

const b = (hint: string): PatternToken => ({ blank: true, hint });

const DESCRIBE: SpeakingPattern = {
  id: "describe",
  label: "เล่า / บรรยาย",
  useWhen: "โจทย์ให้เล่าเรื่องหรือบรรยายสิ่งหนึ่ง",
  signal: "Describe… / Talk about… / Explain a time when…",
  parts: [
    {
      th: "PART 1 · เปิดกว้าง → เข้าหัวข้อ",
      tokens: [
        "Throughout my life, I have ",
        b("ประสบการณ์กว้าง ๆ"),
        ". However, today I will describe ",
        b("หัวข้อวันนี้"),
        ".",
      ],
    },
    {
      th: "PART 2 · เล่ารายละเอียด (what / where / when / why / how)",
      tokens: [
        "To start, ",
        b("เริ่มเรื่องยังไง"),
        ". The reason why ",
        b("สิ่งนั้น"),
        " was that ",
        b("เพราะ…"),
        ". In terms of ",
        b("แง่มุม เช่น the place"),
        ", ",
        b("รายละเอียด"),
        ".",
      ],
    },
    {
      th: "PART 3 · เหตุผล 3 ข้อ + ตัวอย่าง",
      tokens: [
        "Moving on to why ",
        b("ทำไมถึงสำคัญ"),
        ". First of all, ",
        b("เหตุผลที่ 1"),
        ". Secondly, ",
        b("เหตุผลที่ 2"),
        ". Lastly, ",
        b("เหตุผลที่ 3"),
        ". For example, ",
        b("ตัวอย่างสั้น ๆ"),
        ".",
      ],
    },
    {
      th: "PART 4 · สรุป / อนาคต",
      tokens: [
        "In the future, I would ",
        b("จะทำอะไรต่อ"),
        ". If I could ",
        b("ถ้าย้อนเวลาได้…"),
        ", I would ",
        b("ก็จะ…"),
        ".",
      ],
    },
  ],
  vocab: [
    { w: "memorable", th: "น่าจดจำ" },
    { w: "unforgettable", th: "ลืมไม่ลง" },
    { w: "breathtaking", th: "สวยจนตะลึง" },
    { w: "bustling", th: "คึกคัก" },
    { w: "serene", th: "เงียบสงบ" },
    { w: "challenging", th: "ท้าทาย" },
    { w: "rewarding", th: "คุ้มค่า" },
    { w: "overwhelming", th: "ท่วมท้น" },
    { w: "I was impressed by", th: "ฉันประทับใจกับ" },
    { w: "what stood out was", th: "สิ่งที่โดดเด่นคือ" },
    { w: "at first glance", th: "แรกเห็น" },
    { w: "looking back", th: "มองย้อนกลับไป" },
    { w: "it turned out that", th: "กลายเป็นว่า" },
    { w: "I had the chance to", th: "ฉันได้มีโอกาส" },
    { w: "one thing I will never forget", th: "สิ่งที่ไม่มีวันลืม" },
    { w: "surrounded by", th: "รายล้อมไปด้วย" },
    { w: "a once-in-a-lifetime", th: "ครั้งหนึ่งในชีวิต" },
    { w: "gradually", th: "ค่อย ๆ" },
    { w: "eventually", th: "ในที่สุด" },
    { w: "ever since then", th: "ตั้งแต่นั้นมา" },
  ],
};

const OPINION: SpeakingPattern = {
  id: "opinion",
  label: "แสดงความเห็น / 2 ฝั่ง",
  useWhen: "โจทย์ถามความเห็น เห็นด้วยไหม หรือเปรียบเทียบ",
  signal: "Do you agree…? / Which is better…? / How does X change Y?",
  parts: [
    {
      th: "INTRODUCTION · ยกสองฝั่ง แล้วบอกจุดยืน",
      tokens: [
        "It is not easy to answer the question about ",
        b("หัวข้อ"),
        ". Some think that ",
        b("ความเห็นฝั่งที่ 1"),
        ". However, others believe that ",
        b("ความเห็นฝั่งที่ 2"),
        ". I think that ",
        b("จุดยืนของคุณ"),
        ", and I will explain my reasons.",
      ],
    },
    {
      th: "REASON 1 · เหตุผล → อธิบาย → ตัวอย่างตัวเอง → สรุป",
      tokens: [
        "Firstly, I think that ",
        b("เหตุผลที่ 1"),
        ". To explain it simply, this is because ",
        b("อธิบายง่าย ๆ ว่าเพราะ…"),
        ". Take me, for example; ",
        b("ตัวอย่างจากตัวเอง"),
        ". Therefore, it is clear that ",
        b("สรุปเหตุผลที่ 1"),
        ".",
      ],
    },
    {
      th: "REASON 2 · เหตุผล → อธิบาย → ตัวอย่างตัวเอง → สรุป",
      tokens: [
        "Moreover, I think that ",
        b("เหตุผลที่ 2"),
        ". To explain it simply, this is because ",
        b("อธิบายง่าย ๆ ว่าเพราะ…"),
        ". Take me, for instance; ",
        b("ตัวอย่างจากตัวเอง"),
        ". Therefore, it is clear that ",
        b("สรุปเหตุผลที่ 2"),
        ".",
      ],
    },
    {
      th: "CONCLUSION · ถ้ายังมีเวลาเหลือ",
      tokens: [
        "In conclusion, I believe that ",
        b("จุดยืนของคุณ (พูดซ้ำ)"),
        " because ",
        b("เหตุผลรวบยอด"),
        ".",
      ],
    },
  ],
  vocab: [
    { w: "in my opinion", th: "ในความเห็นของฉัน" },
    { w: "from my perspective", th: "จากมุมมองของฉัน" },
    { w: "I strongly believe that", th: "ฉันเชื่ออย่างยิ่งว่า" },
    { w: "it is widely accepted that", th: "เป็นที่ยอมรับกันว่า" },
    { w: "some argue that", th: "บางคนแย้งว่า" },
    { w: "on the contrary", th: "ในทางตรงกันข้าม" },
    { w: "having said that", th: "ถึงอย่างนั้นก็ตาม" },
    { w: "a major advantage", th: "ข้อดีสำคัญ" },
    { w: "a serious drawback", th: "ข้อเสียที่ร้ายแรง" },
    { w: "plays a crucial role in", th: "มีบทบาทสำคัญต่อ" },
    { w: "leads to", th: "นำไปสู่" },
    { w: "results in", th: "ส่งผลให้เกิด" },
    { w: "as a consequence", th: "ผลที่ตามมาคือ" },
    { w: "take … into account", th: "คำนึงถึง…" },
    { w: "to a great extent", th: "ในระดับที่มาก" },
    { w: "it is worth noting that", th: "น่าสังเกตว่า" },
    { w: "in the long run", th: "ในระยะยาว" },
    { w: "for this very reason", th: "ด้วยเหตุผลนี้เอง" },
    { w: "all things considered", th: "เมื่อพิจารณาทุกอย่างแล้ว" },
    { w: "that is precisely why", th: "นั่นคือเหตุผลว่าทำไม" },
  ],
};

export const SPEAKING_PATTERNS: SpeakingPattern[] = [DESCRIBE, OPINION];
export const DEFAULT_PATTERN_ID: PatternId = "describe";

export function getSpeakingPattern(id: PatternId | string | null | undefined): SpeakingPattern {
  return SPEAKING_PATTERNS.find((p) => p.id === id) ?? DESCRIBE;
}

export function isBlank(t: PatternToken): t is { blank: true; hint: string } {
  return typeof t !== "string";
}

/** The part as a plain sentence with `______` where the blanks are. */
export function patternPartSentence(part: PatternPart): string {
  return part.tokens.map((t) => (isBlank(t) ? "______" : t)).join("");
}

export function patternBlankCount(part: PatternPart): number {
  return part.tokens.filter(isBlank).length;
}

/** Empty note grid for a pattern: one string per blank, per part. */
export function emptyPatternNotes(pattern: SpeakingPattern): string[][] {
  return pattern.parts.map((p) => Array(patternBlankCount(p)).fill(""));
}
