export type WritingHighlightType =
  | "grammar"
  | "vocabulary"
  | "coherence"
  | "task";

/** Up to three short follow-up prompts after the main writing task (DET-style). */
export interface WritingFollowUpPrompt {
  promptEn: string;
  promptTh: string;
}

export interface WritingTopic {
  id: string;
  titleEn: string;
  titleTh: string;
  promptEn: string;
  promptTh: string;
  /** Optional 1–3 follow-up questions answered after the main essay. */
  followUps?: WritingFollowUpPrompt[];
  /** Hub round 1–5 (no difficulty band for writing). Defaults to 1 if omitted. */
  round?: 1 | 2 | 3 | 4 | 5;
  /** @deprecated Optional tag only; not used for routing. */
  difficulty?: "easy" | "medium" | "hard";
}

export interface BilingualLine {
  en: string;
  th: string;
}

export interface CriterionBreakdownPoint extends BilingualLine {
  id: string;
  excerpt?: string;
  /** Concrete fix or better wording (speaking/photo reports from AI). */
  suggestionEn?: string;
  suggestionTh?: string;
}

export interface WritingCriterionReport {
  id: string;
  weight: number;
  scorePercent: number;
  pointsOn160: number;
  summary: BilingualLine;
  breakdown: CriterionBreakdownPoint[];
}

export interface ImprovementPoint extends BilingualLine {
  id: string;
  category: WritingHighlightType | "general";
}

/** Hover highlights on punctuated writing (same UX as read-and-speak transcript). */
export interface WritingSubmissionHighlight {
  id: string;
  start: number;
  end: number;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
}

export interface EssayHighlight {
  start: number;
  end: number;
  type: WritingHighlightType;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
  /** Hover card — main label */
  headlineEn?: string;
  headlineTh?: string;
  /** e.g. "Although + S + V, S + V." for strong grammar */
  patternEn?: string;
  patternTh?: string;
  /** e.g. "+ Grammar: good complex structure" or "− Grammar: SVA issue" */
  scoreLineEn?: string;
  scoreLineTh?: string;
  /** Shown when isPositive is false */
  fixEn?: string;
  fixTh?: string;
}

export interface StudySentenceSuggestion extends BilingualLine {
  id: string;
}

export interface StudyVocabularySuggestion {
  id: string;
  termEn: string;
  termTh: string;
  noteEn: string;
  noteTh: string;
}

/** Same shape as photo “vocabulary upgrade” rows (B2/C1 alternatives). */
export interface WritingVocabularyUpgrade {
  id: string;
  originalWord: string;
  upgradedWord: string;
  meaningTh: string;
  exampleEn: string;
  exampleTh: string;
}

export interface WritingAttemptReport {
  gradingSource?: "gemini" | "local";
  attemptId: string;
  topicId: string;
  topicTitleEn: string;
  topicTitleTh: string;
  prepMinutes: number;
  /** Task score includes +10 (capped at 100) when learner used personal or hypothetical personal experience. */
  taskPersonalExperienceBoostApplied?: boolean;
  /** Main task response only (first writing box) — raw as typed. */
  essay: string;
  /** Present when the topic had follow-ups; answers in the same order (raw). */
  followUpResponses?: Array<{
    promptEn: string;
    promptTh: string;
    answer: string;
    /** Punctuation-normalized answer for display/scoring (Gemini). */
    answerPunctuated?: string;
  }>;
  /**
   * Main essay after punctuation pass (read-and-speak style). When set, submission UI
   * uses this + `mainSubmissionHighlights` instead of legacy `highlights` on raw essay.
   */
  punctuatedEssay?: string;
  /** Highlights on `punctuatedEssay` (green / amber hover). */
  mainSubmissionHighlights?: WritingSubmissionHighlight[];
  /** Parallel to follow-up answers; each array is highlights on that answer’s punctuated text. */
  followUpSubmissionHighlights?: WritingSubmissionHighlight[][];
  /**
   * Legacy: full raw bundle for old highlight offsets. Prefer punctuated fields when present.
   */
  submissionForReview?: string;
  wordCount: number;
  submittedAt: string;
  score160: number;
  grammar: WritingCriterionReport;
  vocabulary: WritingCriterionReport;
  coherence: WritingCriterionReport;
  taskRelevancy: WritingCriterionReport;
  improvementPoints: ImprovementPoint[];
  highlights: EssayHighlight[];
  /** Up to 7 bilingual sentence patterns to practise (filled by scorer or local fallback). */
  studySentences?: StudySentenceSuggestion[];
  /** Up to 10 vocabulary items with short notes (filled by scorer or local fallback). */
  studyVocabulary?: StudyVocabularySuggestion[];
  /** When Gemini returns B2/C1 upgrade pairs (aligned with write-about-photo). */
  vocabularyUpgradeSuggestions?: WritingVocabularyUpgrade[];
}

export interface NotebookCustomCategory {
  id: string;
  name: string;
  createdAt: string;
}

/** Saved notebook row. Always includes built-in `all` plus ≥1 of grammar | vocabulary | production-feedback; optional custom category ids. */
export interface NotebookEntry {
  id: string;
  source:
    | "writing-read-and-write"
    | "speaking-read-and-speak"
    | "speak-about-photo"
    | "write-about-photo"
    | "reading-comprehension"
    | "vocabulary-comprehension"
    | "fill-in-blank"
    | "interactive-conversation"
    | "real-word"
    | "dialogue-summary"
    | "interactive-speaking";
  categoryIds: string[];
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  /**
   * When set, the list shows `bodyEn`/`bodyTh` as a short preview and offers “See in full”
   * (e.g. entire read-then-speak report).
   */
  fullBodyEn?: string;
  fullBodyTh?: string;
  /** Learner's own note for this card. */
  userNote: string;
  excerpt?: string;
  attemptId?: string;
  createdAt: string;
}
