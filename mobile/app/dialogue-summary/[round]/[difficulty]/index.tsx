import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { DIALOGUE_SUMMARY_MAX_SCORES } from "../../../../lib/dialogue-summary-constants";
import type { DialogueSummaryDifficulty } from "../../../../lib/types";

export default function DialogueSummarySetListScreen() {
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as DialogueSummaryDifficulty;
  const cap = DIALOGUE_SUMMARY_MAX_SCORES[diff] ?? 160;

  return (
    <PracticeSetList
      skill="dialogue_summary"
      round={roundNum}
      difficulty={diff}
      header={`Round ${roundNum} · ${difficulty} · max ${cap} pts`}
      href={(setNumber) => `/dialogue-summary/${round}/${difficulty}/${setNumber}`}
    />
  );
}
