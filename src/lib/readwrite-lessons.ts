/**
 * อ่านแล้วเขียน (Read & Write) — ported from det-mobile/src/lib/readwrite.ts.
 * The learner rebuilds a model essay through blanks (dropdown "choose" mode
 * or type-the-remainder "fill" mode, per item), then reads the finished essay.
 */
import { READWRITE_ITEMS } from "./readwrite-lessons-data";

export type ReadWriteTier = "easy" | "medium" | "advanced";
export type ReadWriteMode = "choose" | "fill";
export type ReadWriteBlankKind = "grammar" | "vocabulary";

/** "choose" = tap a dropdown option · "type" = prefix hint + one box per missing letter */
export type ReadWriteBlankMode = "choose" | "type";

export type ReadWriteBlank = {
  answer: string;
  options?: string[];
  prefixLength?: number;
  kind?: ReadWriteBlankKind;
  mode?: ReadWriteBlankMode;
  /** Thai meaning of the word — the tap-to-reveal hint on a typed blank. */
  meaningTh?: string;
  synonyms?: string[];
  ruleEn: string;
  ruleTh: string;
};

/** Blanks predate `mode`; fall back to the old "has options = dropdown" rule. */
export function readWriteBlankMode(b: ReadWriteBlank): ReadWriteBlankMode {
  return b.mode ?? (b.options?.length ? "choose" : "type");
}

export type ReadWriteVocab = { word: string; en: string; th: string };

export type ReadWriteItem = {
  id: string;
  tier: ReadWriteTier;
  level: "A2" | "B1" | "B2" | "C1";
  mode: ReadWriteMode;
  topic: string;
  topicTh: string;
  template: string;
  blanks: ReadWriteBlank[];
  answer: string;
  vocab: ReadWriteVocab[];
};

export { READWRITE_ITEMS };

export const READWRITE_UNIT_SIZE = 5;

export const READWRITE_TIERS: {
  key: ReadWriteTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "A2–B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "เขียนเล่าเรื่องใกล้ตัว — ครอบครัว งานอดิเรก ชีวิตประจำวัน" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "เขียนแสดงความเห็นแบบมีโครง — เหตุผล ตัวอย่าง บทสรุป" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "เขียนเชิงโต้แย้งเชิงวิชาการ — ข้อโต้แย้ง ข้อยกเว้น สำนวนซับซ้อน" },
];

export function readWriteByTier(tier: ReadWriteTier): ReadWriteItem[] {
  return READWRITE_ITEMS.filter((i) => i.tier === tier);
}
export function readWriteUnits(tier: ReadWriteTier): ReadWriteItem[][] {
  const items = readWriteByTier(tier);
  const units: ReadWriteItem[][] = [];
  for (let i = 0; i < items.length; i += READWRITE_UNIT_SIZE) units.push(items.slice(i, i + READWRITE_UNIT_SIZE));
  return units;
}
export function readWriteUnit(tier: ReadWriteTier, unit: number): ReadWriteItem[] {
  return readWriteUnits(tier)[unit] ?? [];
}
