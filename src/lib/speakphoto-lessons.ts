/**
 * พูดจากภาพ (Speak about photo) — ported from det-mobile/src/lib/speakphoto.ts.
 * Same dropdown-cloze + pronunciation-gate engine as Read & Speak, anchored
 * to a photo from the shared photo bank.
 */
import { SPEAKPHOTO_ITEMS } from "./speakphoto-lessons-data";

export type SpeakPhotoTier = "easy" | "medium" | "advanced";

export type SpeakPhotoBlank = {
  answer: string;
  options: string[];
  ruleEn: string;
  ruleTh: string;
};

export type SpeakPhotoVocab = { word: string; en: string; th: string };

export type SpeakPhotoItem = {
  id: string;
  tier: SpeakPhotoTier;
  level: "A2" | "B1" | "B2" | "C1";
  imageId: string;
  scene: string;
  topicTh: string;
  template: string;
  blanks: SpeakPhotoBlank[];
  answer: string;
  vocab: SpeakPhotoVocab[];
};

export { SPEAKPHOTO_ITEMS };

export const SPEAKPHOTO_UNIT_SIZE = 5;

export const SPEAKPHOTO_TIERS: {
  key: SpeakPhotoTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "A2–B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "พูดบรรยายภาพง่าย ๆ — ใครกำลังทำอะไร ที่ไหน" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "พูดบรรยายพร้อมรายละเอียดและอารมณ์ของภาพ" },
  { key: "advanced", th: "ระดับสูง", cefr: "B2", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "พูดบรรยายและตีความภาพด้วยประโยคที่ยาวขึ้น" },
];

export function speakPhotoByTier(tier: SpeakPhotoTier): SpeakPhotoItem[] {
  return SPEAKPHOTO_ITEMS.filter((i) => i.tier === tier);
}
export function speakPhotoUnits(tier: SpeakPhotoTier): SpeakPhotoItem[][] {
  const items = speakPhotoByTier(tier);
  const units: SpeakPhotoItem[][] = [];
  for (let i = 0; i < items.length; i += SPEAKPHOTO_UNIT_SIZE) units.push(items.slice(i, i + SPEAKPHOTO_UNIT_SIZE));
  return units;
}
export function speakPhotoUnit(tier: SpeakPhotoTier, unit: number): SpeakPhotoItem[] {
  return speakPhotoUnits(tier)[unit] ?? [];
}
