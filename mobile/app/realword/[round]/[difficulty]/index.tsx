import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { REALWORD_MAX_SCORE } from "../../../../lib/realword-constants";
import type { RealWordDifficulty } from "../../../../lib/types";

export default function RealWordSetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as RealWordDifficulty;
  const cap = REALWORD_MAX_SCORE[diff] ?? 85;

  return (
    <PracticeSetList
      skill="realword"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${cap} pts`}
      href={(setNumber) => `/realword/${round}/${difficulty}/${setNumber}`}
    />
  );
}
