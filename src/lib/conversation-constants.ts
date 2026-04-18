import type { ConversationDifficulty } from "@/types/conversation";

/** Dashboard: Rounds 1…N each open straight to that round’s question bank (no difficulty hub). */
export const CONVERSATION_ROUND_COUNT = 5;

/** Built-in default bank seeds this many sets per difficulty; admins may add unlimited additional sets. */
export const CONVERSATION_SET_COUNT = 5;

/** Every interactive conversation set uses the same full score (no tier-based caps). */
export const CONVERSATION_FULL_SCORE = 160;

export const CONVERSATION_MAX_SCORE: Record<ConversationDifficulty, number> = {
  easy: CONVERSATION_FULL_SCORE,
  medium: CONVERSATION_FULL_SCORE,
  hard: CONVERSATION_FULL_SCORE,
};

export const CONVERSATION_DIFFICULTY_LABEL: Record<ConversationDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Learner practice + routing: Easy and Medium only (Hard tier removed; legacy hard sets migrate to Medium). */
export const CONVERSATION_DIFFICULTIES = ["easy", "medium"] as ConversationDifficulty[];

export const CONVERSATION_SCENARIO_Q_COUNT = 3;
export const CONVERSATION_MAIN_Q_COUNT = 5;
export const CONVERSATION_TOTAL_STEPS =
  CONVERSATION_SCENARIO_Q_COUNT + CONVERSATION_MAIN_Q_COUNT;

export function parseConversationRoundParam(s: string): number | null {
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1 || n > CONVERSATION_ROUND_COUNT) return null;
  return n;
}
