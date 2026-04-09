import { CONVERSATION_ROUND_COUNT } from "@/lib/conversation-constants";
import type {
  ConversationBankByRound,
  ConversationDifficulty,
  ConversationExam,
} from "@/types/conversation";

function emptyRoundBank(): Record<ConversationDifficulty, ConversationExam[]> {
  return { easy: [], medium: [], hard: [] };
}

/** No seeded exams — content comes only from admin JSON uploads. */
export function buildDefaultConversationBank(): ConversationBankByRound {
  const out: ConversationBankByRound = {};
  for (let r = 1; r <= CONVERSATION_ROUND_COUNT; r++) {
    out[r] = emptyRoundBank();
  }
  return out;
}
