/** Bilingual strings in content use "English / Thai" — surface Thai for wrong-answer hints. */
export function conversationExplanationThai(explanation: string): string {
  const parts = explanation.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1]!;
  return explanation.trim();
}
