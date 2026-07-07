/**
 * เขียนจากภาพ (Write about photo) — ported from det-mobile/src/lib/photo-write.ts.
 * Same dropdown-cloze engine as Read & Write, anchored to a photo.
 */
import { PHOTOWRITE_ITEMS } from "./photo-write-lessons-data";

export type PhotoWriteTier = "easy" | "medium" | "advanced";

export type PhotoWriteBlank = {
  answer: string;
  options: string[];
  ruleEn: string;
  ruleTh: string;
};

export type PhotoWriteVocab = { word: string; en: string; th: string };

export type PhotoWriteItem = {
  id: string;
  tier: PhotoWriteTier;
  level: "A2" | "B1" | "B2" | "C1";
  imageId: string;
  scene: string;
  topicTh: string;
  template: string;
  blanks: PhotoWriteBlank[];
  answer: string;
  vocab: PhotoWriteVocab[];
};

export { PHOTOWRITE_ITEMS };

export const PHOTOWRITE_UNIT_SIZE = 5;

export const PHOTOWRITE_TIERS: {
  key: PhotoWriteTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "A2–B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "บรรยายภาพง่าย ๆ — ใครกำลังทำอะไร ที่ไหน" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "บรรยายพร้อมตีความ — อารมณ์ บรรยากาศ และรายละเอียด" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "บรรยายและวิเคราะห์ภาพด้วยภาษาซับซ้อน" },
];

export function photoWriteByTier(tier: PhotoWriteTier): PhotoWriteItem[] {
  return PHOTOWRITE_ITEMS.filter((i) => i.tier === tier);
}
export function photoWriteUnits(tier: PhotoWriteTier): PhotoWriteItem[][] {
  const items = photoWriteByTier(tier);
  const units: PhotoWriteItem[][] = [];
  for (let i = 0; i < items.length; i += PHOTOWRITE_UNIT_SIZE) units.push(items.slice(i, i + PHOTOWRITE_UNIT_SIZE));
  return units;
}
export function photoWriteUnit(tier: PhotoWriteTier, unit: number): PhotoWriteItem[] {
  return photoWriteUnits(tier)[unit] ?? [];
}
