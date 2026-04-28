export type FitbDifficulty = "easy" | "medium" | "hard";

/** Practice rounds (1–5). Content is grouped per round, then per difficulty. */
export type FitbRoundNum = 1 | 2 | 3 | 4 | 5;

export interface FitbMissingWord {
  correctWord: string;
  clue: string;
  prefix_length: number;
  explanationThai: string;
  synonyms: string[];
}

export interface FitbSet {
  setNumber: number;
  setId: string;
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  cefrLevel: string;
  passage: string;
  missingWords: FitbMissingWord[];
}

/** Bank: round → difficulty → sets */
export type FitbFullBank = Record<FitbRoundNum, Record<FitbDifficulty, FitbSet[]>>;

export type FitbBlankGrade = "exact" | "close" | "wrong";

export interface FitbProgressRecord {
  bestScore: number;
  maxScore: number;
  /** True only for exact matches (used for redeem locks). */
  lastBlankOk: boolean[] | null;
  lastGrades?: FitbBlankGrade[];
  /** Full word the user assembled (prefix + typed remainder) per blank. */
  lastUserAnswers?: string[];
  lastClueUsed?: boolean[];
  updatedAt: string;
  userId?: string;
}
