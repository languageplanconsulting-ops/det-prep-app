import type { VocabPassageContentLevel, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

export const VOCAB_HUB_SET_COUNT = 8;

export const VOCAB_ROUND_NUMBERS: VocabRoundNum[] = [1, 2, 3, 4, 5];
/**
 * Whole-slot cap: every difficulty of one slot counted together. The spec bank puts 20 passages
 * per contentLevel in a single slot per round (20 × 3 = 60), so this leaves a little headroom.
 */
export const VOCAB_MAX_PASSAGES_PER_SET = 75;
/**
 * Blanks a spec-shaped passage carries, by contentLevel (docs/reading-vocabulary/question-spec.md).
 * Scoring never reads this — it divides by the passage's real blank count — it only drives the
 * learner-facing "how long is this test" copy and the admin spec-conformance check.
 */
export const VOCAB_BLANK_COUNT_BY_LEVEL: Record<VocabPassageContentLevel, number> = {
  easy: 10,
  medium: 10,
  hard: 8,
};
/** Every blank in the spec bank offers exactly A–E. */
export const VOCAB_OPTIONS_PER_BLANK = 5;

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
