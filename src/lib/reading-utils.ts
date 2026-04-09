import type { ReadingMcBlock } from "@/types/reading";

export function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle MC options; returns list and whether each index is the correct answer. */
export function shuffleMcOptions(options: string[], correctAnswer: string): {
  shuffled: string[];
  correctIndex: number;
} {
  const shuffled = shuffleArray(options);
  let correctIndex = shuffled.findIndex((o) => answersMatch(o, correctAnswer));
  if (correctIndex < 0) correctIndex = shuffled.indexOf(correctAnswer);
  if (correctIndex < 0) correctIndex = 0;
  return { shuffled, correctIndex };
}

export function answersMatch(user: string, correct: string): boolean {
  const n = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  return n(user) === n(correct);
}

const TRUNC = 220;

function clip(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= TRUNC) return t;
  return `${t.slice(0, TRUNC)}…`;
}

/** Bilingual fallback when `explanationThai` is missing in admin data. */
export function buildFallbackReadingExplanation(
  block: Pick<ReadingMcBlock, "question" | "correctAnswer">,
): { en: string; th: string } {
  const q = clip(block.question);
  const c = clip(block.correctAnswer);
  return {
    en: `The correct answer fits the logical flow of all three paragraphs. It answers the question directly: “${q}” The key idea is: ${c} Your answer either shifted to a side topic or did not match the evidence in the passage as closely.`,
    th: `คำตอบที่ถูกต้องสอดคล้องกับลำดับความคิดของทั้งสามย่อหน้า และตอบคำถามนี้โดยตรง: “${q}” ใจความสำคัญคือ: ${c} คำตอบของคุณอาจหลุดไปหัวข้ออื่น หรือไม่ตรงกับหลักฐานในบทความเท่าที่ควร`,
  };
}
