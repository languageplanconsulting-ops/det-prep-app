import type { BilingualLine } from "@/types/writing";

export type DialogueSummaryDifficulty = "easy" | "medium" | "hard";

export type DialogueSummaryRoundNum = 1 | 2 | 3 | 4 | 5;

export type DialogueSummaryFullBank = Record<
  DialogueSummaryRoundNum,
  Record<DialogueSummaryDifficulty, DialogueSummaryExam[]>
>;

export interface DialogueTurn {
  speaker: string;
  text: string;
}

export interface DialogueSummaryExam {
  id: string;
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
  titleEn: string;
  titleTh: string;
  /** Exactly five sentences setting the scene. */
  scenarioSentences: string[];
  /** About ten turns of dialogue. */
  dialogue: DialogueTurn[];
}

export interface DialogueSummaryProgressRecord {
  bestScore160: number;
  updatedAt: string;
}

export type DialogueSummaryHighlightType = "grammar" | "flow" | "vocabulary";

export interface DialogueSummaryCriterionReport {
  id: "relevancy" | "grammar" | "flow" | "vocabulary";
  weight: number;
  scorePercent: number;
  pointsOn160: number;
  summary: BilingualLine;
  breakdown: { id: string; en: string; th: string; excerpt?: string }[];
}

export interface DialogueSummaryImprovementPoint extends BilingualLine {
  id: string;
  category: DialogueSummaryHighlightType | "relevancy" | "general";
}

export interface DialogueSummaryHighlight {
  start: number;
  end: number;
  type: DialogueSummaryHighlightType;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
  headlineEn?: string;
  headlineTh?: string;
  scoreLineEn?: string;
  scoreLineTh?: string;
  fixEn?: string;
  fixTh?: string;
}

export interface DialogueSummaryAttemptReport {
  gradingSource?: "gemini" | "local";
  attemptId: string;
  examId: string;
  titleEn: string;
  titleTh: string;
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
  summary: string;
  wordCount: number;
  submittedAt: string;
  score160: number;
  relevancy: DialogueSummaryCriterionReport;
  grammar: DialogueSummaryCriterionReport;
  flow: DialogueSummaryCriterionReport;
  vocabulary: DialogueSummaryCriterionReport;
  improvementPoints: DialogueSummaryImprovementPoint[];
  highlights: DialogueSummaryHighlight[];
}
