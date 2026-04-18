import type { FixedSequenceTemplateStep } from "@/lib/mock-test/fixed-types";

export const FIXED_MOCK_STEP_COUNT = 20;
/** Wall-clock range for the full 20-step fixed mock (steps + short rests). */
export const FIXED_MOCK_ESTIMATED_DURATION_LABEL = "1h – 1h10";
export const FIXED_MOCK_VIP_MONTHLY_LIMIT = 10;

const REST_STEPS = new Set([5, 8, 12, 17]);
const REST_SEC = 45;

export const FIXED_SEQUENCE_TEMPLATE: FixedSequenceTemplateStep[] = [
  { stepIndex: 1, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 2, taskType: "write_about_photo", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 3, taskType: "dictation", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 4, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 5, taskType: "speak_about_photo", timeLimitSec: 60, restAfterStepSec: 45 },
  { stepIndex: 6, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 7, taskType: "write_about_photo", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 8, taskType: "vocabulary_reading", timeLimitSec: 480, restAfterStepSec: 45 },
  { stepIndex: 9, taskType: "speak_about_photo", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 10, taskType: "read_and_write", timeLimitSec: 300, restAfterStepSec: 0 },
  { stepIndex: 11, taskType: "fill_in_blanks", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 12, taskType: "read_then_speak", timeLimitSec: 300, restAfterStepSec: 45 },
  { stepIndex: 13, taskType: "interactive_conversation_mcq", timeLimitSec: 420, restAfterStepSec: 0 },
  { stepIndex: 14, taskType: "conversation_summary", timeLimitSec: 120, restAfterStepSec: 0 },
  { stepIndex: 15, taskType: "speak_about_photo", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 16, taskType: "dictation", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 17, taskType: "dictation", timeLimitSec: 60, restAfterStepSec: 45 },
  { stepIndex: 18, taskType: "dictation", timeLimitSec: 60, restAfterStepSec: 0 },
  { stepIndex: 19, taskType: "interactive_speaking", timeLimitSec: 480, restAfterStepSec: 0 },
  { stepIndex: 20, taskType: "real_english_word", timeLimitSec: 240, restAfterStepSec: 0 },
];

export function fixedSequenceRestAfter(stepIndex: number): number {
  return REST_STEPS.has(stepIndex) ? REST_SEC : 0;
}
