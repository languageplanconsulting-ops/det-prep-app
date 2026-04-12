/**
 * Maps canonical “exam language” labels to DB `mock_questions.question_type`.
 * Edit here if you add new pool types.
 */

import type { MockQuestionType } from "@/lib/mock-test/types";

/** Human labels from product spec → DB column. */
export const TASK = {
  readAndSelect: "read_and_select",
  /** Real English Word (set) */
  realEnglishWord: "real_english_word",
  fillInBlanks: "fill_in_blanks",
  /** Listen and Type / Dictation (typed listening) */
  listenAndType: "dictation",
  writeAboutPhoto: "write_about_photo",
  /** Interactive Reading (composite set in UI) */
  interactiveReading: "vocabulary_reading",
  interactiveListening: "interactive_listening",
  readThenSpeak: "read_then_speak",
  speakAboutPhoto: "speak_about_photo",
  /** Interactive Writing */
  interactiveWriting: "read_and_write",
  interactiveSpeaking: "interactive_speaking",
} as const satisfies Record<string, MockQuestionType>;

/** Which macro skill a task contributes to for subscore blending. */
export function macroSkillForTaskType(qt: MockQuestionType): "reading" | "listening" | "writing" | "speaking" {
  switch (qt) {
    case "read_and_select":
    case "real_english_word":
    case "fill_in_blanks":
    case "vocabulary_reading":
      return "reading";
    case "dictation":
    case "interactive_listening":
      return "listening";
    case "write_about_photo":
    case "read_and_write":
    case "essay_writing":
      return "writing";
    case "read_then_speak":
    case "speak_about_photo":
    case "interactive_speaking":
      /** Listening subscore uses this too; placement blends by task_type, not this field. */
      return "speaking";
    default:
      return "reading";
  }
}

/** For contribution columns: single-skill tasks put 100% of task_score into their macro bucket. */
export function contributionVector(
  qt: MockQuestionType,
  taskScore0To100: number,
): Pick<
  import("@/lib/mock-test/v2/types").V2ResponseRecord,
  "reading_contrib" | "listening_contrib" | "writing_contrib" | "speaking_contrib"
> {
  const z = Math.max(0, Math.min(100, taskScore0To100));
  const macro = macroSkillForTaskType(qt);
  return {
    reading_contrib: macro === "reading" ? z : 0,
    listening_contrib: macro === "listening" ? z : 0,
    writing_contrib: macro === "writing" ? z : 0,
    speaking_contrib: macro === "speaking" ? z : 0,
  };
}
