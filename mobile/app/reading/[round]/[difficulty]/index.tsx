import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { READING_DIFFICULTY_MAX } from "../../../../lib/reading-constants";
import type { ReadingDifficulty } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function ReadingSetListScreen() {
  const { t } = useI18n();
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const cap = READING_DIFFICULTY_MAX[diff] ?? 160;

  return (
    <PracticeSetList
      skill="reading"
      round={roundNum}
      difficulty={diff}
      header={setListHeader(t, roundNum, difficulty, cap)}
      href={(setNumber) => `/reading/${round}/${difficulty}/${setNumber}`}
    />
  );
}
