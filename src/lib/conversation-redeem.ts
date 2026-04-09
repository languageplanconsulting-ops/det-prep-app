import {
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import type { ConversationExam } from "@/types/conversation";

export const CONVERSATION_ALL_STEP_INDICES = Array.from(
  { length: CONVERSATION_TOTAL_STEPS },
  (_, i) => i,
);

/** Prefill locked correct answers and list only wrong step indices for redeem flows. */
export function buildConversationRedeemState(
  exam: ConversationExam,
  itemOk: boolean[],
): {
  activeSteps: number[];
  scenarioPicks: (number | null)[];
  mainPicks: (number | null)[];
} {
  if (itemOk.length !== CONVERSATION_TOTAL_STEPS) {
    return {
      activeSteps: [...CONVERSATION_ALL_STEP_INDICES],
      scenarioPicks: Array.from({ length: CONVERSATION_SCENARIO_Q_COUNT }, () => null),
      mainPicks: Array.from({ length: CONVERSATION_MAIN_Q_COUNT }, () => null),
    };
  }
  const wrong = CONVERSATION_ALL_STEP_INDICES.filter((s) => !itemOk[s]);
  const sp = Array.from({ length: CONVERSATION_SCENARIO_Q_COUNT }, () => null as number | null);
  const mp = Array.from({ length: CONVERSATION_MAIN_Q_COUNT }, () => null as number | null);
  for (let s = 0; s < CONVERSATION_TOTAL_STEPS; s++) {
    if (itemOk[s]) {
      if (s < CONVERSATION_SCENARIO_Q_COUNT) {
        sp[s] = exam.scenarioQuestions[s].correctIndex;
      } else {
        mp[s - CONVERSATION_SCENARIO_Q_COUNT] =
          exam.mainQuestions[s - CONVERSATION_SCENARIO_Q_COUNT].correctIndex;
      }
    }
  }
  return {
    activeSteps: wrong.length ? wrong : [...CONVERSATION_ALL_STEP_INDICES],
    scenarioPicks: sp,
    mainPicks: mp,
  };
}
