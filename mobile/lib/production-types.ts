/**
 * Write About the Photo, Speak About the Photo and Read-then-Write (essay).
 * Mirrors the website's src/types/{photo-speak,speaking,writing}.ts — only the
 * fields the app reads. The grading routes return the full web report objects.
 */

export type PhotoTaskType = "write_about_photo" | "speak_about_photo";

export interface PhotoItemProgress {
  item_id: string;
  latest_score160: number;
  best_score160: number;
  latest_attempt_id: string;
  attempt_count: number;
  updated_at: string;
}

/** One row of photo_speak_items (shared by both photo tasks), with this learner's progress. */
export interface PhotoItem {
  id: string;
  title_en: string;
  title_th: string;
  image_url: string;
  prompt_en: string;
  prompt_th: string;
  keywords: string[];
  context_en: string | null;
  creator: string | null;
  provider: string | null;
  license: string | null;
  sort_order: number;
  progress: PhotoItemProgress | null;
}

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
  followUps?: WritingFollowUpPrompt[];
  round?: number;
}

export interface BilingualLine {
  en: string;
  th: string;
}

export interface CriterionBreakdownPoint extends BilingualLine {
  id: string;
  excerpt?: string;
  suggestionEn?: string;
  suggestionTh?: string;
  topicEn?: string;
  topicTh?: string;
}

export interface CriterionToPerfect {
  missingEn: string;
  missingTh: string;
  examples: { id: string; en: string; th: string }[];
}

export interface ProductionCriterionReport {
  id: string;
  weight: number;
  scorePercent: number;
  pointsOn160: number;
  summary: BilingualLine;
  breakdown: CriterionBreakdownPoint[];
  toPerfect?: CriterionToPerfect;
}

export interface ImprovementPoint extends BilingualLine {
  id: string;
  category: string;
}

/** A span of the punctuated submission with a short comment (good or needs work). */
export interface SubmissionHighlight {
  id?: string;
  start: number;
  end: number;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
}

export interface VocabularyUpgrade {
  id: string;
  originalWord: string;
  upgradedWord: string;
  meaningTh: string;
  exampleEn: string;
  exampleTh: string;
}

export interface ScoreRungChange {
  id: string;
  start: number;
  end: number;
  category: string;
  original: string;
  noteTh: string;
  noteEn: string;
}

export interface ScoreRungSample {
  id: string;
  target160: number;
  bandLabel: string;
  text: string;
  wordCount: number;
  changes: ScoreRungChange[];
  headlineEn: string;
  headlineTh: string;
}

export interface ScoreRungLadder {
  currentScore160: number;
  learnerWordCount: number;
  rungs: ScoreRungSample[];
}

interface ProductionReportBase {
  attemptId: string;
  score160: number;
  wordCount: number;
  submittedAt: string;
  grammar: ProductionCriterionReport;
  vocabulary: ProductionCriterionReport;
  coherence: ProductionCriterionReport;
  taskRelevancy: ProductionCriterionReport;
  improvementPoints: ImprovementPoint[];
  vocabularyUpgradeSuggestions?: VocabularyUpgrade[];
  scoreRungs?: ScoreRungLadder;
  taskPersonalExperienceBoostApplied?: boolean;
  gradingSource?: "gemini" | "local";
}

export interface PhotoAttemptReport extends ProductionReportBase {
  kind: "photo-speak";
  topicId: string;
  questionId: string;
  topicTitleEn: string;
  topicTitleTh: string;
  questionPromptEn: string;
  questionPromptTh: string;
  prepMinutes: number;
  transcript: string;
  punctuatedTranscript?: string;
  transcriptHighlights?: SubmissionHighlight[];
  imageUrl: string;
  taskKeywords: string[];
  originHub?: "speak-about-photo" | "write-about-photo";
}

export interface WritingAttemptReport extends ProductionReportBase {
  topicId: string;
  topicTitleEn: string;
  topicTitleTh: string;
  prepMinutes: number;
  essay: string;
  punctuatedEssay?: string;
  mainSubmissionHighlights?: SubmissionHighlight[];
  followUpResponses?: {
    promptEn: string;
    promptTh: string;
    answer: string;
    answerPunctuated?: string;
  }[];
  followUpSubmissionHighlights?: SubmissionHighlight[][];
}
