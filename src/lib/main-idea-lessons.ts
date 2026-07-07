/**
 * ใจความสำคัญ + ชื่อเรื่อง (Main idea & title) — ported from
 * det-mobile/src/lib/main-idea.ts, reuses missing-paragraph's passages +
 * keywords for its tutorial phase.
 */
import { MAIN_IDEA_ITEMS } from "./main-idea-lessons-data";

export type MainIdeaTier = "easy" | "medium" | "advanced";

export type MainIdeaOption = {
  text: string;
  correct: boolean;
  rationaleEn: string;
  rationaleTh: string;
};

export type MainIdeaItem = {
  id: string;
  /** Links back to a MissingParagraphItem id — same passage + keywords are reused. */
  refId: string;
  tier: MainIdeaTier;
  level: "B1" | "B2" | "C1";
  options: MainIdeaOption[];
};

export { MAIN_IDEA_ITEMS };

export const MAIN_IDEA_UNIT_SIZE = 5;

export const MAIN_IDEA_TIERS: {
  key: MainIdeaTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "ตามคำใบ้ แล้วจับใจความสำคัญของเรื่อง" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "แยกใจความสำคัญออกจากรายละเอียดปลีกย่อย" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "เร็ว ๆ นี้" },
];

export function mainIdeaByTier(tier: MainIdeaTier): MainIdeaItem[] {
  return MAIN_IDEA_ITEMS.filter((i) => i.tier === tier);
}
export function mainIdeaUnits(tier: MainIdeaTier): MainIdeaItem[][] {
  const items = mainIdeaByTier(tier);
  const units: MainIdeaItem[][] = [];
  for (let i = 0; i < items.length; i += MAIN_IDEA_UNIT_SIZE) units.push(items.slice(i, i + MAIN_IDEA_UNIT_SIZE));
  return units;
}
export function mainIdeaUnit(tier: MainIdeaTier, unit: number): MainIdeaItem[] {
  return mainIdeaUnits(tier)[unit] ?? [];
}
