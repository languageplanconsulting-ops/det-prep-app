import type { VocabSessionLevel } from "./types";

export const VOCAB_SESSION_MAX: Record<VocabSessionLevel, number> = {
  easy: 85,
  medium: 120,
  hard: 145,
};

export const VOCAB_SESSION_LEVELS: VocabSessionLevel[] = ["easy", "medium", "hard"];
