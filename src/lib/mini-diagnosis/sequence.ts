import type { MiniDiagnosisTemplateStep } from "@/lib/mini-diagnosis/types";

export const MINI_DIAGNOSIS_STEP_COUNT = 9;
export const MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT = 1;
export const MINI_DIAGNOSIS_DURATION_LABEL = "17m 30s";

export const MINI_DIAGNOSIS_SEQUENCE_TEMPLATE: MiniDiagnosisTemplateStep[] = [
  { stepIndex: 1, taskType: "dictation", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 2, taskType: "dictation", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 3, taskType: "real_english_word", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 4, taskType: "vocabulary_reading", timeLimitSec: 300, restAfterStepSec: 30 },
  { stepIndex: 5, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 6, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 30 },
  { stepIndex: 7, taskType: "interactive_listening", timeLimitSec: 90, restAfterStepSec: 30 },
  { stepIndex: 8, taskType: "write_about_photo", timeLimitSec: 60, restAfterStepSec: 0, isAiGraded: true },
  { stepIndex: 9, taskType: "read_then_speak", timeLimitSec: 180, restAfterStepSec: 0, isAiGraded: true },
];
