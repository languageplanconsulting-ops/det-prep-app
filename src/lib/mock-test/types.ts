import type { Difficulty } from "@/lib/access-control";

export type MockQuestionType =
  | "fill_in_blanks"
  | "read_and_select"
  | "interactive_listening"
  | "vocabulary_in_context"
  | "read_then_speak"
  | "write_about_photo"
  | "speak_about_photo"
  | "summarize_conversation"
  | "essay_writing";

export type MockSkill =
  | "literacy"
  | "comprehension"
  | "conversation"
  | "production";

export type AdaptiveState = {
  currentDifficulty: Difficulty;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  phase: number;
};

export type AdaptiveLog = {
  questionId: string;
  difficulty: string;
  isCorrect: boolean;
  pointsEarned: number;
  difficultyAfter: string;
  timestamp: string;
};

export type PhaseResponseItem = {
  questionId: string;
  questionType: MockQuestionType;
  difficulty: Difficulty;
  isCorrect: boolean;
  pointsEarned: number;
  answer: unknown;
  timestamp: string;
  /** Set after AI grading (0–10) */
  aiScore?: number;
};

export type MockQuestionRow = {
  id: string;
  phase: number;
  question_type: MockQuestionType;
  skill: MockSkill;
  difficulty: Difficulty;
  content: Record<string, unknown>;
  correct_answer: Record<string, unknown> | null;
  is_ai_graded: boolean;
  is_active: boolean;
};

export type Subscores = {
  literacy: number;
  comprehension: number;
  conversation: number;
  production: number;
};

export type ScoreBand = {
  key: string;
  labelEn: string;
  labelTh: string;
  min: number;
  max: number;
};
