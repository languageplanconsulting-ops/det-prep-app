import type { VocabPassageContentLevel, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

export const VOCAB_HUB_SET_COUNT = 8;

export const VOCAB_ROUND_NUMBERS: VocabRoundNum[] = [1, 2, 3, 4, 5];
/** Per set, per difficulty (easy / medium / hard content). */
export const VOCAB_MAX_PASSAGES_PER_SET = 40;
export const VOCAB_BLANK_COUNT = 6;

export const VOCAB_SESSION_MAX: Record<VocabSessionLevel, number> = {
  easy: 85,
  medium: 120,
  hard: 145,
};

export const VOCAB_SESSION_LABEL: Record<VocabSessionLevel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const VOCAB_CONTENT_LEVEL_LABEL: Record<VocabPassageContentLevel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function parseVocabSessionParam(s: string): VocabSessionLevel | null {
  if (s === "easy" || s === "medium" || s === "hard") return s;
  return null;
}

export function parsePassageNumberParam(s: string): number | null {
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function parseSetNumberParam(s: string): number | null {
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1 || n > VOCAB_HUB_SET_COUNT) return null;
  return n;
}
