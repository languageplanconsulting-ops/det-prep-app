/**
 * หาย่อหน้าที่หายไป (Find the missing paragraph) — ported from
 * det-mobile/src/lib/missing-paragraph.ts. Each item shows a two-paragraph
 * passage with a sentence-completion blank between the paragraphs; the
 * learner picks the best bridging sentence from 4 options, then matches
 * tappable passage keywords to their Thai meaning.
 */
import { MISSING_PARAGRAPH_ITEMS } from "./missing-paragraph-lessons-data";

export type MissingParagraphTier = "easy" | "medium" | "advanced";
export type MissingParagraphDistractorType = "off_topic" | "too_narrow" | "meta";

export type MissingParagraphOption = {
  text: string;
  correct: boolean;
  rationaleEn: string;
  rationaleTh: string;
  distractorType?: MissingParagraphDistractorType;
};

export type MissingParagraphKeyword = {
  phrase: string;
  paragraph: 1 | 2;
  rationaleEn: string;
  rationaleTh: string;
  th: string;
};

export type MissingParagraphItem = {
  id: string;
  tier: MissingParagraphTier;
  level: "B1" | "B2" | "C1";
  title: string;
  titleTh: string;
  paragraph1: string;
  paragraph2: string;
  options: MissingParagraphOption[];
  keywords: MissingParagraphKeyword[];
};

export { MISSING_PARAGRAPH_ITEMS };

export const MISSING_PARAGRAPH_UNIT_SIZE = 5;

export const MISSING_PARAGRAPH_TIERS: {
  key: MissingParagraphTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "อ่านเรื่องใกล้ตัว แล้วหาประโยคที่หายไปให้ถูก" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "อ่านเรื่องเชิงวิชาการมากขึ้น แล้วจับใจความให้แม่น" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "เร็ว ๆ นี้" },
];

export function missingParagraphByTier(tier: MissingParagraphTier): MissingParagraphItem[] {
  return MISSING_PARAGRAPH_ITEMS.filter((i) => i.tier === tier);
}
export function missingParagraphUnits(tier: MissingParagraphTier): MissingParagraphItem[][] {
  const items = missingParagraphByTier(tier);
  const units: MissingParagraphItem[][] = [];
  for (let i = 0; i < items.length; i += MISSING_PARAGRAPH_UNIT_SIZE) units.push(items.slice(i, i + MISSING_PARAGRAPH_UNIT_SIZE));
  return units;
}
export function missingParagraphUnit(tier: MissingParagraphTier, unit: number): MissingParagraphItem[] {
  return missingParagraphUnits(tier)[unit] ?? [];
}
