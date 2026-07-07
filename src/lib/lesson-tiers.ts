/**
 * Shared tier metadata for the บทเรียน lesson paths — the DET score each tier
 * is aimed at, and the mascot's explanation of how the locked "ด่าน" work.
 * Ported verbatim from det-mobile/src/lib/lesson-tiers.ts.
 */
export type LessonTierKey = "easy" | "medium" | "advanced";

export const DET_TARGET: Record<LessonTierKey, { score: string; th: string }> = {
  easy: { score: "90", th: "เหมาะกับคนที่ตั้งเป้าคะแนน DET ~90" },
  medium: { score: "115", th: "เหมาะกับคนที่ตั้งเป้าคะแนน DET ~115" },
  advanced: { score: "125+", th: "เหมาะกับคนที่ตั้งเป้าคะแนน DET 125 ขึ้นไป" },
};

export function lockExplainTh(unitSize: number): string {
  return `ด่านที่ 🔒 ล็อกอยู่ ต้องทำด่านก่อนหน้าให้จบก่อน (ด่านละ ${unitSize} ข้อ) ถึงจะปลดล็อกด่านต่อไป — ความคืบหน้าถูกบันทึกอัตโนมัติ ออกไปแล้วกลับมาทำต่อจากข้อเดิมได้เลย ไม่ต้องเริ่มใหม่`;
}
