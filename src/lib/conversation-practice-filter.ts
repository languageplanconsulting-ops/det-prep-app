import type { ConversationExam } from "@/types/conversation";

/**
 * Legacy seeded “empty slot” exams (before the bank shipped empty). Learners should not see these.
 */
export function isUploadedConversationExam(exam: ConversationExam): boolean {
  const scenario = exam.scenario?.trim() ?? "";
  if (!scenario) return false;
  if (
    scenario.includes("This is placeholder content.") &&
    scenario.includes("replace this set")
  ) {
    return false;
  }
  return true;
}

export function filterConversationExamsForPractice(
  exams: ConversationExam[] | undefined,
): ConversationExam[] {
  if (!exams?.length) return [];
  return exams.filter(isUploadedConversationExam);
}
