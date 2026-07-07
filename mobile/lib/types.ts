export type DictationDifficulty = "easy" | "medium" | "hard";
export type DictationRoundNum = 1 | 2 | 3 | 4 | 5;
export type FitbDifficulty = DictationDifficulty;
export type ReadingDifficulty = DictationDifficulty;
export type VocabSessionLevel = DictationDifficulty;
export type VocabPassageContentLevel = DictationDifficulty;

export interface DictationItem {
  id: string;
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
  audioPath: string;
  audioUrl?: string;
  transcript: string;
  hintText: string;
}

export type FitbBlankGrade = "exact" | "close" | "wrong";

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
  round: DictationRoundNum;
  difficulty: FitbDifficulty;
  cefrLevel: string;
  passage: string;
  missingWords: FitbMissingWord[];
}

export interface ReadingMcBlock {
  question: string;
  correctAnswer: string;
  options: string[];
  explanationThai?: string;
}

export interface ReadingPassage {
  p1: string;
  p2: string;
  p3: string;
}

export interface ReadingExamUnit {
  titleEn?: string;
  passage: ReadingPassage;
  highlightedVocab: {
    word: string;
    meaningEn: string;
    meaningTh: string;
    example: string;
  }[];
  missingSentence: ReadingMcBlock;
  informationLocation: ReadingMcBlock;
  bestTitle: ReadingMcBlock;
  mainIdea: ReadingMcBlock;
}

export interface ReadingSet {
  setNumber: number;
  difficulty?: ReadingDifficulty;
  round?: DictationRoundNum;
  exams: ReadingExamUnit[];
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

export interface VocabBlankQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
  explanationThai: string;
}

export interface VocabPassageUnit {
  passageNumber: number;
  contentLevel: VocabPassageContentLevel;
  titleEn?: string;
  passageText: string;
  blanks: VocabBlankQuestion[];
  correctWords: { word: string; synonyms: string[] }[];
}

export interface VocabSet {
  setNumber: number;
  round?: DictationRoundNum;
  passages: VocabPassageUnit[];
}

export interface VocabExamResultRow {
  blankIndex: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationThai: string;
}

export type PracticeSkillId =
  | "dictation"
  | "fitb"
  | "reading"
  | "vocab"
  | "realword"
  | "conversation"
  | "dialogue_summary";

export type RealWordDifficulty = DictationDifficulty;

export interface RealWordCard {
  word: string;
  is_real: boolean;
  explanationThai: string;
  synonyms: string;
}

export interface RealWordSet {
  setNumber: number;
  setId: string;
  difficulty: RealWordDifficulty;
  round?: DictationRoundNum;
  words: RealWordCard[];
}

export type ConversationDifficulty = "easy" | "medium" | "hard";

export interface ConversationScenarioQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ConversationMainQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  transcript: string;
}

export interface ConversationExam {
  id: string;
  title: string;
  difficulty: ConversationDifficulty;
  round?: number;
  scenario: string;
  highlightedWords: { word: string; translation: string }[];
  scenarioQuestions: ConversationScenarioQuestion[];
  mainQuestions: ConversationMainQuestion[];
  setNumber: number;
}

export type DialogueSummaryDifficulty = DictationDifficulty;

export interface DialogueTurn {
  speaker: string;
  text: string;
}

export interface DialogueSummaryExam {
  id: string;
  round: DictationRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
  titleEn: string;
  titleTh: string;
  scenarioSentences: string[];
  dialogue: DialogueTurn[];
}

export interface DialogueSummaryCriterionReport {
  id: "relevancy" | "grammar" | "flow" | "vocabulary";
  weight: number;
  scorePercent: number;
  pointsOn160: number;
  summary: { en: string; th: string };
}

export interface DialogueSummaryAttemptReport {
  attemptId: string;
  score160: number;
  wordCount: number;
  summary: string;
  relevancy: DialogueSummaryCriterionReport;
  grammar: DialogueSummaryCriterionReport;
  flow: DialogueSummaryCriterionReport;
  vocabulary: DialogueSummaryCriterionReport;
  gradingSource?: "gemini" | "local";
}

export interface InteractiveSpeakingScenario {
  id: string;
  titleEn: string;
  titleTh: string;
  starterQuestionEn: string;
  starterQuestionTh: string;
  thumbnail?: string;
  round?: DictationRoundNum;
}

export interface InteractiveSpeakingTurnRecord {
  turnIndex: number;
  questionEn: string;
  questionTh: string;
  transcript: string;
}

export interface InteractiveSpeakingAttemptReport {
  kind: "interactive-speaking";
  attemptId: string;
  scenarioId: string;
  scenarioTitleEn: string;
  score160: number;
  wordCount: number;
  turns: InteractiveSpeakingTurnRecord[];
  grammar: { scorePercent: number; summary: { en: string; th: string } };
  vocabulary: { scorePercent: number; summary: { en: string; th: string } };
  coherence: { scorePercent: number; summary: { en: string; th: string } };
  taskRelevancy: { scorePercent: number; summary: { en: string; th: string } };
  gradingSource?: "gemini" | "local";
}

export type UserTier = "free" | "basic" | "premium" | "vip";

export interface QuotaSummary {
  tier: UserTier;
  isAdmin?: boolean;
  email?: string;
  ai: { totalRemaining: number; totalLimit: number };
}
