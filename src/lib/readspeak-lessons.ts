/**
 * อ่านแล้วพูด (Read & Speak) — ported from det-mobile/src/lib/readspeak.ts.
 * Rebuild the model answer through dropdown blanks, then imitate it aloud
 * and reach ≥90% pronunciation accuracy to pass.
 */
import { READSPEAK_ITEMS } from "./readspeak-lessons-data";

export type ReadSpeakTier = "easy" | "medium" | "advanced";

export type ReadSpeakBlank = {
  answer: string;
  options: string[];
  ruleEn: string;
  ruleTh: string;
};

export type ReadSpeakVocab = { word: string; en: string; th: string };

/**
 * The four moves of a DET speaking answer: state it, explain why, give a
 * concrete example, close it off. Every model answer is built from these, and
 * VIP learners get them labelled + a build-the-answer drill.
 */
export type ReadSpeakMoveKind = "direct" | "explain" | "example" | "conclude";

export type ReadSpeakMove = { kind: ReadSpeakMoveKind; en: string; th: string };

export const MOVE_LABELS: Record<ReadSpeakMoveKind, { th: string; en: string; hintTh: string }> = {
  direct: { th: "ตอบตรงคำถาม", en: "Direct answer", hintTh: "ตอบคำถามให้ตรงในประโยคแรก อย่าเพิ่งเล่ารายละเอียด" },
  explain: { th: "อธิบายเหตุผล", en: "Explain", hintTh: "บอกว่าทำไมถึงเป็นแบบนั้น — ใช้ because / due to / this allows for" },
  example: { th: "ยกตัวอย่าง", en: "Provide an example", hintTh: "ยกตัวอย่างรูปธรรม — For example / For instance" },
  conclude: { th: "สรุป", en: "Conclude", hintTh: "สรุปกลับไปที่คำถาม — Overall / Therefore / In conclusion" },
};

export const MOVE_ORDER: ReadSpeakMoveKind[] = ["direct", "explain", "example", "conclude"];

export type ReadSpeakItem = {
  id: string;
  tier: ReadSpeakTier;
  level: "A2" | "B1" | "B2" | "C1";
  /** Always phrased as a question — this is what the examiner asks. */
  topic: string;
  topicTh: string;
  /** Recurring DET topic family (family, work, education, health, …). */
  family?: string;
  template: string;
  blanks: ReadSpeakBlank[];
  answer: string;
  /** The answer split into its four moves. Absent on not-yet-rewritten items. */
  moves?: ReadSpeakMove[];
  vocab: ReadSpeakVocab[];
};

export { READSPEAK_ITEMS };

export const READSPEAK_UNIT_SIZE = 5;

export const READSPEAK_TIERS: {
  key: ReadSpeakTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "A2–B1", color: "#1B9E54", soft: "#DCF5E6", ink: "#1B7A4B", icon: "🌱", blurbTh: "เล่าเรื่องใกล้ตัว — กิจวัตร ครอบครัว อาหาร การเดินทาง" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", ink: "#004AAD", icon: "⚡", blurbTh: "แสดงความเห็น — การศึกษา เทคโนโลยี สังคม พร้อมเหตุผลและตัวอย่าง" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", ink: "#6B45C7", icon: "👑", blurbTh: "โต้แย้งเชิงลึก — จริยธรรม เศรษฐกิจ อนาคต ด้วยภาษาซับซ้อน" },
];

export function readSpeakByTier(tier: ReadSpeakTier): ReadSpeakItem[] {
  return READSPEAK_ITEMS.filter((i) => i.tier === tier);
}
export function readSpeakUnits(tier: ReadSpeakTier): ReadSpeakItem[][] {
  const items = readSpeakByTier(tier);
  const units: ReadSpeakItem[][] = [];
  for (let i = 0; i < items.length; i += READSPEAK_UNIT_SIZE) units.push(items.slice(i, i + READSPEAK_UNIT_SIZE));
  return units;
}
export function readSpeakUnit(tier: ReadSpeakTier, unit: number): ReadSpeakItem[] {
  return readSpeakUnits(tier)[unit] ?? [];
}
