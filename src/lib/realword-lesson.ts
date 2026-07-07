/**
 * คำจริง (Real word) lesson — shared types + helpers.
 * Ported from det-mobile/src/lib/realword-lesson.ts to keep the mechanic
 * identical: same REALWORD_UNIT_SIZE (10) so tier/unit numbering lines up
 * with mobile, same word/misspelling shape.
 */
import { REALWORD_LESSON_ITEMS } from "./realword-lesson-data";

export type RealWordTier = "easy" | "medium" | "advanced";

export type RealWordItem = {
  id: string;
  tier: RealWordTier;
  level: "A2" | "B1" | "B2" | "C1";
  /** The correctly-spelled real word. */
  word: string;
  /** A common misspelling of the word (not itself a real word). */
  misspelling: string;
  meaningEn: string;
  meaningTh: string;
};

export { REALWORD_LESSON_ITEMS };

export const REALWORD_UNIT_SIZE = 10;

export const REALWORD_TIERS: {
  key: RealWordTier;
  th: string;
  en: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", en: "Easy", cefr: "B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "คำที่ใช้บ่อยและมักสะกดผิด — ฝึกจับผิดการสะกด" },
  { key: "medium", th: "ระดับกลาง", en: "Medium", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "คำระดับกลางที่สะกดยากขึ้น — ดูออกว่าถูกหรือผิด" },
  { key: "advanced", th: "ระดับสูง", en: "Advanced", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "คำยากระดับสูงที่คนสะกดผิดบ่อยที่สุด" },
];

export function realWordByTier(tier: RealWordTier): RealWordItem[] {
  return REALWORD_LESSON_ITEMS.filter((i) => i.tier === tier);
}

export function realWordUnits(tier: RealWordTier): RealWordItem[][] {
  const items = realWordByTier(tier);
  const units: RealWordItem[][] = [];
  for (let i = 0; i < items.length; i += REALWORD_UNIT_SIZE) {
    units.push(items.slice(i, i + REALWORD_UNIT_SIZE));
  }
  return units;
}

export function realWordUnit(tier: RealWordTier, unit: number): RealWordItem[] {
  return realWordUnits(tier)[unit] ?? [];
}
