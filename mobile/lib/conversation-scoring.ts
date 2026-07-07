import { CONVERSATION_TOTAL_STEPS } from "./conversation-constants";

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
  for (let i = 0; i < 3; i++) {
    const p = scenarioPicks[i];
    ok.push(p != null && p === args.correctScenarioIndex[i]);
  }
  for (let j = 0; j < 5; j++) {
    const p = mainPicks[j];
    ok.push(p != null && p === args.correctMainIndex[j]);
  }
  return ok;
}
