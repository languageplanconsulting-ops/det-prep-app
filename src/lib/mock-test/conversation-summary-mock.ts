/** Phase 10 — interactive turns then summary; stored in question `content.turns`. */
export type ConversationSummaryTurn = {
  question_en: string;
  question_th?: string;
  /** Shown after the conversation as the “right” / model line in the recap. */
  reference_answer_en: string;
  reference_answer_th?: string;
};

export function isInteractiveConversationSummaryContent(
  c: Record<string, unknown>,
): boolean {
  const t = c.turns;
  if (!Array.isArray(t) || t.length < 2) return false;
  return t.every((row) => {
    if (!row || typeof row !== "object") return false;
    const o = row as Record<string, unknown>;
    return (
      typeof o.question_en === "string" &&
      o.question_en.trim().length > 0 &&
      typeof o.reference_answer_en === "string" &&
      o.reference_answer_en.trim().length > 0
    );
  });
}
