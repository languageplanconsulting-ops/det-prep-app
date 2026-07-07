import type { ConversationDifficulty } from "./types";

export const CONVERSATION_FULL_SCORE = 160;
export const CONVERSATION_SCENARIO_Q_COUNT = 3;
export const CONVERSATION_MAIN_Q_COUNT = 5;
export const CONVERSATION_TOTAL_STEPS =
  CONVERSATION_SCENARIO_Q_COUNT + CONVERSATION_MAIN_Q_COUNT;

/** Practice hub: easy and medium only (matches website). */
export const CONVERSATION_DIFFICULTIES: ConversationDifficulty[] = ["easy", "medium"];
