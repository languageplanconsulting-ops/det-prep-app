/** 0–160 scale; anchors: A1=50, A2=80, B1=110, B2=130, C1=140, C2=155 */

export const CEFR_ANCHORS = {
  A1: 50,
  A2: 80,
  B1: 110,
  B2: 130,
  C1: 140,
  C2: 155,
} as const;

export type CefrLevel = "Pre-A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export function scoreToCefr(score: number): CefrLevel {
  const s = Math.max(0, Math.min(160, score));
  if (s >= CEFR_ANCHORS.C2) return "C2";
  if (s >= CEFR_ANCHORS.C1) return "C1";
  if (s >= CEFR_ANCHORS.B2) return "B2";
  if (s >= CEFR_ANCHORS.B1) return "B1";
  if (s >= CEFR_ANCHORS.A2) return "A2";
  if (s >= CEFR_ANCHORS.A1) return "A1";
  return "Pre-A1";
}

export function cefrLabel(score: number): string {
  return `${scoreToCefr(score)} · ${score}/160`;
}
