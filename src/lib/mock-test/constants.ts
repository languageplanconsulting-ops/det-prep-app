import type { MockQuestionType } from "@/lib/mock-test/types";

/** Questions per phase (spec). */
export const PHASE_QUESTION_COUNTS: Record<number, number> = {
  1: 8,
  2: 8,
  3: 6,
  4: 6,
  5: 2,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
};

/** Phase → single question type for that phase. */
export const PHASE_QUESTION_TYPE: Record<number, MockQuestionType> = {
  1: "fill_in_blanks",
  2: "read_and_select",
  3: "interactive_listening",
  4: "vocabulary_in_context",
  5: "read_then_speak",
  6: "write_about_photo",
  7: "speak_about_photo",
  8: "summarize_conversation",
  9: "essay_writing",
};

/** Hard cutoff seconds per phase (1–9). */
export const PHASE_TIME_LIMIT_SECONDS: Record<number, number> = {
  1: 360,
  2: 300,
  3: 600,
  4: 300,
  5: 300,
  6: 480,
  7: 240,
  8: 300,
  9: 900,
};

export const ADAPTIVE_PHASE_MAX = 4;

export function isAdaptivePhase(phase: number): boolean {
  return phase >= 1 && phase <= ADAPTIVE_PHASE_MAX;
}
