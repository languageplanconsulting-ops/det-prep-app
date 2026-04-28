export type ReadingDifficulty = "easy" | "medium" | "hard";

export type ReadingRoundNum = 1 | 2 | 3 | 4 | 5;

export interface ReadingVocabItem {
  word: string;
  meaningEn: string;
  meaningTh: string;
  example: string;
}

/** One multiple-choice block (missing paragraph, info location, title, main idea). */
export interface ReadingMcBlock {
  question: string;
  /** Normalised from admin `correctAnswer` or `correctSentence` (missing paragraph). */
  correctAnswer: string;
  options: string[];
  explanationThai?: string;
}

export interface ReadingPassage {
  p1: string;
  p2: string;
  p3: string;
}

/**
 * One reading exam (one passage + 4 question blocks + vocab).
 * A set contains many of these (e.g. 10+).
 */
export interface ReadingExamUnit {
  /** Shown in the exam chooser list (optional). */
  titleEn?: string;
  passage: ReadingPassage;
  highlightedVocab: ReadingVocabItem[];
  missingSentence: ReadingMcBlock;
  informationLocation: ReadingMcBlock;
  bestTitle: ReadingMcBlock;
  mainIdea: ReadingMcBlock;
}

/**
 * A numbered set holding multiple exams (e.g. Set 1 → Exam 1…10).
 * Admin JSON: `{ "setNumber": 1, "exams": [ ... ] }` or legacy one exam at top level.
 */
export interface ReadingSet {
  setNumber: number;
  /** Optional for backward compatibility with older local data. */
  difficulty?: ReadingDifficulty;
  /** Set when stored in a round-scoped bank (rounds 1–5). */
  round?: ReadingRoundNum;
  exams: ReadingExamUnit[];
}

/** Round → difficulty → sets (same shape as dictation / FITB). */
export type ReadingFullBank = Record<ReadingRoundNum, Record<ReadingDifficulty, ReadingSet[]>>;

export interface ReadingProgressRecord {
  bestScore: number;
  maxScore: number;
  lastScore: number;
  lastCorrectCount: number;
  updatedAt: string;
  userId?: string;
}

export type ReadingQuestionKey =
  | "missingSentence"
  | "informationLocation"
  | "bestTitle"
  | "mainIdea";

export interface ReadingExamResultRow {
  key: ReadingQuestionKey;
  label: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationThai?: string;
}
