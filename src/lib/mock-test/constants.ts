import type { MockQuestionType } from "@/lib/mock-test/types";
import { VOCAB_READING_MOCK_STEPS } from "@/lib/mock-test/vocabulary-reading-mock";

/** 10 phases — mock-only bank (parallel skill types; not shared with practice storage). */
export const MOCK_TEST_PHASE_COUNT = 10;

/** Questions per phase. */
export const PHASE_QUESTION_COUNTS: Record<number, number> = {
  1: 8,
  2: 8,
  3: 8,
  4: VOCAB_READING_MOCK_STEPS,
  5: 1,
  6: 2,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
};

/** Phase → single question type for that phase. */
export const PHASE_QUESTION_TYPE: Record<number, MockQuestionType> = {
  1: "fill_in_blanks",
  2: "dictation",
  3: "real_english_word",
  4: "vocabulary_reading",
  5: "read_and_write",
  6: "read_then_speak",
  7: "write_about_photo",
  8: "speak_about_photo",
  9: "interactive_speaking",
  10: "conversation_summary",
};

/** Hard cutoff seconds per phase (1–10). */
export const PHASE_TIME_LIMIT_SECONDS: Record<number, number> = {
  1: 360,
  2: 300,
  3: 300,
  4: 540,
  5: 900,
  6: 300,
  7: 480,
  8: 240,
  9: 300,
  10: 420,
};

/** Phases 1–4: adaptive difficulty (MCQ / exact match). */
export const ADAPTIVE_PHASE_MAX = 4;

export function isAdaptivePhase(phase: number): boolean {
  return phase >= 1 && phase <= ADAPTIVE_PHASE_MAX;
}
