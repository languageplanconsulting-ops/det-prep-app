import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { CONVERSATION_FULL_SCORE } from "../../../../lib/conversation-constants";
import type { ConversationDifficulty } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function ConversationSetListScreen() {
  const { t } = useI18n();
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as ConversationDifficulty;

  return (
    <PracticeSetList
      skill="conversation"
      round={roundNum}
      difficulty={diff}
      header={setListHeader(t, roundNum, difficulty, CONVERSATION_FULL_SCORE)}
      href={(setNumber) => `/conversation/${round}/${difficulty}/${setNumber}`}
      progress={{ taskType: "interactive_listening", contentSkill: "conversation" }}
    />
  );
}
