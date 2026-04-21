import type { MockQuestionType } from "@/lib/mock-test/types";

export type MiniDiagnosisTaskType = Extract<
  MockQuestionType,
  | "dictation"
  | "real_english_word"
  | "vocabulary_reading"
  | "fill_in_blanks"
  | "interactive_listening"
  | "write_about_photo"
  | "read_then_speak"
>;

export type MiniDiagnosisTemplateStep = {
  stepIndex: number;
  taskType: MiniDiagnosisTaskType;
  timeLimitSec: number;
  restAfterStepSec: number;
  isAiGraded?: boolean;
};

export type MiniDiagnosisUploadRow = {
  step_index: number;
  task_type: MiniDiagnosisTaskType;
  time_limit_sec: number;
  rest_after_step_sec?: number;
  is_ai_graded?: boolean;
  content: Record<string, unknown>;
  correct_answer?: Record<string, unknown> | null;
};
