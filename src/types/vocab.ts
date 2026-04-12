/** Which difficulty list a passage appears under (must match the level the student picks). */
export type VocabPassageContentLevel = "easy" | "medium" | "hard";

/** Session / scoring tier chosen on the hub. */
export type VocabSessionLevel = "easy" | "medium" | "hard";

export type VocabRoundNum = 1 | 2 | 3 | 4 | 5;

export interface VocabBlankQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
  explanationThai: string;
}

export interface VocabCorrectWordEntry {
  word: string;
  synonyms: string[];
}

export interface VocabPassageUnit {
  passageNumber: number;
  contentLevel: VocabPassageContentLevel;
  /** Shown in the passage list */
  titleEn?: string;
  /** Use `[BLANK]` for each gap, or numbered `[BLANK 1]` … `[BLANK N]` (normalized on import). */
  passageText: string;
  blanks: VocabBlankQuestion[];
  /** Six entries, same order as blanks / blanks in the passage. */
  correctWords: VocabCorrectWordEntry[];
}

export interface VocabSet {
  setNumber: number;
  /** Present when stored in a round-scoped bank. */
  round?: VocabRoundNum;
  passages: VocabPassageUnit[];
}

/** Each round holds up to eight numbered sets (same shape as before). */
export type VocabFullBank = Record<VocabRoundNum, VocabSet[]>;

export interface VocabProgressRecord {
  bestScore: number;
  maxScore: number;
  lastScore: number;
  lastCorrectCount: number;
  updatedAt: string;
}

export interface VocabExamResultRow {
  blankIndex: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationThai: string;
}
