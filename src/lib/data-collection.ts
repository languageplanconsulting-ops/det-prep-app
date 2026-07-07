import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Exam surfaces whose submissions we collect for review/refinement.
 * Keep in sync with the AI feedback surfaces used by the report routes.
 */
export type DataCollectionExamType =
  | "read_then_write"
  | "read_then_speak"
  | "write_about_photo"
  | "speak_about_photo"
  | "interactive_speaking"
  | "dialogue_summary"
  | "speaking_partner";

export const DATA_COLLECTION_EXAM_LABELS: Record<DataCollectionExamType, string> = {
  read_then_write: "Read, then write",
  read_then_speak: "Read, then speak",
  write_about_photo: "Write about photo",
  speak_about_photo: "Speak about photo",
  interactive_speaking: "Interactive speaking",
  dialogue_summary: "Dialogue → summary",
  speaking_partner: "My Speaking Partner",
};

type RecordInput = {
  userId: string | null;
  examType: DataCollectionExamType;
  attemptId?: string | null;
  promptTitle?: string | null;
  promptText?: string | null;
  submittedText: string;
  wordCount?: number | null;
  score160?: number | null;
  report: unknown;
};

/**
 * Fire-and-forget save of one production submission + its full report.
 * NEVER throws — data collection must never break a learner's grading response.
 * No-ops silently if the table isn't deployed yet.
 */
export async function recordDataCollectionSubmission(input: RecordInput): Promise<void> {
  try {
    const supabase = createServiceRoleSupabase();
    const wordCount =
      input.wordCount ?? input.submittedText.trim().split(/\s+/).filter(Boolean).length;
    await supabase.from("data_collection_submissions").insert({
      user_id: input.userId,
      exam_type: input.examType,
      attempt_id: input.attemptId ?? null,
      prompt_title: input.promptTitle ?? null,
      prompt_text: input.promptText ?? null,
      submitted_text: input.submittedText,
      word_count: wordCount,
      score160: input.score160 ?? null,
      report: input.report ?? {},
    });
  } catch (err) {
    console.error("[data-collection] save skipped:", err);
  }
}
