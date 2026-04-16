export type FixedTaskType =
  | "fill_in_blanks"
  | "write_about_photo"
  | "dictation"
  | "real_english_word"
  | "vocabulary_reading"
  | "speak_about_photo"
  | "read_and_write"
  | "read_then_speak"
  | "interactive_conversation_mcq"
  | "interactive_speaking"
  | "conversation_summary";

export type FixedSequenceTemplateStep = {
  stepIndex: number;
  taskType: FixedTaskType;
  timeLimitSec: number;
  restAfterStepSec: number;
};

export type FixedSetUploadRow = {
  step_index: number;
  task_type: FixedTaskType;
  time_limit_sec: number;
  rest_after_step_sec?: number;
  is_ai_graded?: boolean;
  content: Record<string, unknown>;
  correct_answer?: Record<string, unknown> | null;
};
