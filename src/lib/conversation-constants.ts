import type { ConversationDifficulty } from "@/types/conversation";

/** Dashboard: show only Round 1, then difficulty, then sets. */
export const CONVERSATION_ROUND_COUNT = 1;

/** Built-in default bank seeds this many sets per difficulty; admins may add unlimited additional sets. */
export const CONVERSATION_SET_COUNT = 5;

export const CONVERSATION_MAX_SCORE: Record<ConversationDifficulty, number> = {
  easy: 85,
  medium: 125,
  hard: 160,
};

export const CONVERSATION_DIFFICULTY_LABEL: Record<ConversationDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const CONVERSATION_DIFFICULTIES: ConversationDifficulty[] = ["easy", "medium", "hard"];

export const CONVERSATION_SCENARIO_Q_COUNT = 3;
export const CONVERSATION_MAIN_Q_COUNT = 5;
export const CONVERSATION_TOTAL_STEPS =
  CONVERSATION_SCENARIO_Q_COUNT + CONVERSATION_MAIN_Q_COUNT;

export function parseConversationRoundParam(s: string): number | null {
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1 || n > CONVERSATION_ROUND_COUNT) return null;
  return n;
}
