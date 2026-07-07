import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { CONVERSATION_FULL_SCORE } from "../../../../lib/conversation-constants";
import type { ConversationDifficulty } from "../../../../lib/types";

export default function ConversationSetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as ConversationDifficulty;

  return (
    <PracticeSetList
      skill="conversation"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${CONVERSATION_FULL_SCORE} pts`}
      href={(setNumber) => `/conversation/${round}/${difficulty}/${setNumber}`}
    />
  );
}
