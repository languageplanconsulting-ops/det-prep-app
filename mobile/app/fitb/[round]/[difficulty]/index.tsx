import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { FITB_MAX_SCORE } from "../../../../lib/fitb-constants";
import type { FitbDifficulty } from "../../../../lib/types";

export default function FitbSetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as FitbDifficulty;
  const cap = FITB_MAX_SCORE[diff] ?? 140;

  return (
    <PracticeSetList
      skill="fitb"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${cap} pts`}
      href={(setNumber) => `/fitb/${round}/${difficulty}/${setNumber}`}
    />
  );
}
