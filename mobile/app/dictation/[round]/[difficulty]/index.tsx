import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { DICTATION_MAX_SCORE } from "../../../../lib/dictation-constants";
import type { DictationDifficulty } from "../../../../lib/types";

export default function DictationSetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{
    round: string;
    difficulty: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as DictationDifficulty;
  const cap = DICTATION_MAX_SCORE[diff] ?? 85;

  return (
    <PracticeSetList
      skill="dictation"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${cap} pts per set`}
      href={(setNumber) => `/dictation/${round}/${difficulty}/${setNumber}`}
    />
  );
}
