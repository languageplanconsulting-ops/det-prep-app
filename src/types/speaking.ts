import type { ImprovementPoint, WritingCriterionReport } from "@/types/writing";

export type SpeakingRoundNum = 1 | 2 | 3 | 4 | 5;

export interface SpeakingQuestion {
  id: string;
  /**
   * Card image: `https://…` or `/path` or `data:image/…`, or an emoji / short label if not a URL.
   */
  thumbnail: string;
  promptEn: string;
  promptTh: string;
}

export interface SpeakingTopic {
  id: string;
  titleEn: string;
  titleTh: string;
  /** Short text to read before choosing a question */
  promptEn: string;
  promptTh: string;
  questions: SpeakingQuestion[];
  /** Learner hub round (1–5). Admin merge uses round 1. */
  round?: SpeakingRoundNum;
  /** Only topics with this flag appear in the learner hub (admin-uploaded). */
  uploadedByAdmin?: boolean;
}

/** B2/C1 upgrade row for a word used in the submission (Gemini + notebook). */
export interface SpeakingVocabularyUpgrade {
  id: string;
  originalWord: string;
  upgradedWord: string;
  meaningTh: string;
  exampleEn: string;
  exampleTh: string;
}

/** Hover highlights on punctuated transcript (good vs weak). */
export interface SpeakingTranscriptHighlight {
  id: string;
  start: number;
  end: number;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
}

export interface SpeakingAttemptReport {
  gradingSource?: "gemini" | "local";
  attemptId: string;
  topicId: string;
  /** Hub round when the attempt was made (default 1). */
  speakingRound?: SpeakingRoundNum;
  questionId: string;
  topicTitleEn: string;
  topicTitleTh: string;
  questionPromptEn: string;
  questionPromptTh: string;
  prepMinutes: number;
  transcript: string;
  /** Normalized text with punctuation for display and grading (AI); may match transcript if offline. */
  punctuatedTranscript?: string;
  wordCount: number;
  submittedAt: string;
  score160: number;
  grammar: WritingCriterionReport;
  vocabulary: WritingCriterionReport;
  coherence: WritingCriterionReport;
  taskRelevancy: WritingCriterionReport;
  improvementPoints: ImprovementPoint[];
  /** Task score includes +10 (capped at 100) when learner used personal or hypothetical personal experience. */
  taskPersonalExperienceBoostApplied?: boolean;
  /** Up to 10 B2/C1 vocabulary upgrades (Gemini). */
  vocabularyUpgradeSuggestions?: SpeakingVocabularyUpgrade[];
  /** Spans on punctuated transcript for hover comments (Gemini). */
  transcriptHighlights?: SpeakingTranscriptHighlight[];
}
