import {
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";

export function countConversationCorrect(itemOk: boolean[]): number {
  return itemOk.filter(Boolean).length;
}

/** Points earned = (correct / total steps) × level max (e.g. 60% of 85 ≈ 51). */
export function conversationScore(correctCount: number, maxScore: number): number {
  if (CONVERSATION_TOTAL_STEPS <= 0) return 0;
  return Math.round((correctCount / CONVERSATION_TOTAL_STEPS) * maxScore);
}

export function computeItemOk(
  scenarioPicks: (number | null)[],
  mainPicks: (number | null)[],
  args: {
    correctScenarioIndex: number[];
    correctMainIndex: number[];
  },
): boolean[] {
  const ok: boolean[] = [];
  for (let i = 0; i < CONVERSATION_SCENARIO_Q_COUNT; i++) {
    const p = scenarioPicks[i];
    ok.push(p != null && p === args.correctScenarioIndex[i]);
  }
  for (let j = 0; j < CONVERSATION_MAIN_Q_COUNT; j++) {
    const p = mainPicks[j];
    ok.push(p != null && p === args.correctMainIndex[j]);
  }
  return ok;
}
