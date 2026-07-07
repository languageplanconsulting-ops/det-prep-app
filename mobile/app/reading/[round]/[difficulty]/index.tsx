import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { READING_DIFFICULTY_MAX } from "../../../../lib/reading-constants";
import type { ReadingDifficulty } from "../../../../lib/types";

export default function ReadingSetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const cap = READING_DIFFICULTY_MAX[diff] ?? 160;

  return (
    <PracticeSetList
      skill="reading"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${cap} pts`}
      href={(setNumber) => `/reading/${round}/${difficulty}/${setNumber}`}
    />
  );
}
