/** Content shapes for admin JSON uploads — matches your upload formats. */

export type ExamDifficulty = "easy" | "medium" | "hard";

export interface HighlightedWord {
  word: string;
  translation: string;
}

export interface McqItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  transcript?: string;
}

export interface InteractiveListeningExam {
  title: string;
  scenario: string;
  difficulty: ExamDifficulty;
  highlightedWords: HighlightedWord[];
  scenarioQuestions: McqItem[];
  mainQuestions: McqItem[];
}

export interface ReadingHighlightedVocab {
  word: string;
  meaningEn: string;
  meaningTh: string;
  example: string;
}

export interface ReadingFourOptionBlock {
  question: string;
  correctAnswer: string;
  options: string[];
  explanationThai: string;
}

export interface ReadingPassageSet {
  setNumber: number;
  passage: { p1: string; p2: string; p3: string };
  highlightedVocab: ReadingHighlightedVocab[];
  missingSentence: {
    correctSentence: string;
    options: string[];
    explanationThai: string;
  };
  informationLocation: ReadingFourOptionBlock;
  bestTitle: ReadingFourOptionBlock;
  mainIdea: ReadingFourOptionBlock;
}

export interface VocabBlankItem {
  correctWord: string;
  options: string[];
  explanationThai: string;
  synonyms: string[];
}

export interface VocabularyInContextExam {
  passage: string;
  missingWords: VocabBlankItem[];
}

export interface RealWordItem {
  set_id: string;
  difficulty: ExamDifficulty;
  word: string;
  is_real: boolean;
  explanationThai?: string;
  synonyms?: string;
}

export type PlanTier = "free" | "basic" | "premium" | "vip";
