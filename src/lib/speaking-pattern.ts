/**
 * P'Doy's 4-part answer pattern for Read-and-then-speak (1–3 min speaking).
 *
 * Single source of truth: the locked/unlocked hint panel renders it as plain
 * sentences, and the Fast Track VIP note-taking scaffold renders the same
 * tokens with typable inputs in place of each blank.
 */

export type PatternToken = string | { blank: true; hint: string };
export type PatternPart = { th: string; tokens: PatternToken[] };

const b = (hint: string): PatternToken => ({ blank: true, hint });

export const SPEAKING_PATTERN_PARTS: PatternPart[] = [
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
];

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

/** Empty note grid: one string per blank, per part. */
export function emptyPatternNotes(): string[][] {
  return SPEAKING_PATTERN_PARTS.map((p) => Array(patternBlankCount(p)).fill(""));
}
