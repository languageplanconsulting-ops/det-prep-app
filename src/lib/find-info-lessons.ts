/**
 * หาข้อมูลเฉพาะ (Find specific information) — ported from
 * det-mobile/src/lib/find-info.ts, reuses missing-paragraph's passages.
 * A paraphrased question; the learner highlights the exact passage span
 * that states the answer.
 */
import { FIND_INFO_ITEMS } from "./find-info-lessons-data";

export type FindInfoTier = "easy" | "medium" | "advanced";

export type FindInfoParaphrase = {
  questionTerm: string;
  passageTerm: string;
  th: string;
  rationaleEn: string;
  rationaleTh: string;
};

export type FindInfoItem = {
  id: string;
  /** Links back to a MissingParagraphItem id — same passage is reused. */
  refId: string;
  tier: FindInfoTier;
  level: "B1" | "B2" | "C1";
  questionEn: string;
  questionTh: string;
  answerPhrase: string;
  answerParagraph: 1 | 2;
  paraphrase: FindInfoParaphrase;
};

export { FIND_INFO_ITEMS };

export const FIND_INFO_UNIT_SIZE = 5;

export const FIND_INFO_TIERS: {
  key: FindInfoTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "หาประโยคที่ถูกถามถึงในย่อหน้าให้เจอ" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "จับคำพ้องความหมายในเนื้อเรื่องวิชาการ" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "เร็ว ๆ นี้" },
];

export function findInfoByTier(tier: FindInfoTier): FindInfoItem[] {
  return FIND_INFO_ITEMS.filter((i) => i.tier === tier);
}
export function findInfoUnits(tier: FindInfoTier): FindInfoItem[][] {
  const items = findInfoByTier(tier);
  const units: FindInfoItem[][] = [];
  for (let i = 0; i < items.length; i += FIND_INFO_UNIT_SIZE) units.push(items.slice(i, i + FIND_INFO_UNIT_SIZE));
  return units;
}
export function findInfoUnit(tier: FindInfoTier, unit: number): FindInfoItem[] {
  return findInfoUnits(tier)[unit] ?? [];
}
