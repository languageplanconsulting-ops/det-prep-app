/**
 * Fallback seconds per slot when `mock_questions.time_limit_sec` is null.
 * Align with product timing notes in `stage-sequences.ts`; override per row in DB when needed.
 */

import type { AssemblySlot } from "@/lib/mock-test/v2/types";

export function v2FallbackSecondsForSlot(slot: AssemblySlot): number {
  const t = slot.questionType;
  if (t === "real_english_word") return 60;
  if (t === "fill_in_blanks") return 120;
  if (t === "dictation") return 60;
  if (t === "write_about_photo") return 60;
  if (t === "vocabulary_reading") return 420;
  if (t === "interactive_listening") return 465;
  if (t === "read_then_speak") return slot.stage === 3 ? 300 : 90;
  if (t === "speak_about_photo") return 90;
  if (t === "read_and_write") return 480;
  if (t === "interactive_speaking") return 220;
  return 300;
}
