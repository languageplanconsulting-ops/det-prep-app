import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { VOCAB_SESSION_MAX } from "../../../../lib/vocab-constants";
import type { VocabSessionLevel } from "../../../../lib/types";

export default function VocabSetListScreen() {
  const { round, level } = useLocalSearchParams<{ round: string; level: string }>();
  const roundNum = Number(round);
  const sessionLevel = level as VocabSessionLevel;
  const cap = VOCAB_SESSION_MAX[sessionLevel] ?? 160;

  return (
    <PracticeSetList
      skill="vocab"
      round={roundNum}
      difficulty={sessionLevel}
      header={`Round ${roundNum} · ${level} · max ${cap} pts`}
      href={(setNumber) => `/vocab/${round}/${level}/${setNumber}`}
    />
  );
}
