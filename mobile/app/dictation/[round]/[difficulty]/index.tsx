import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { DICTATION_MAX_SCORE } from "../../../../lib/dictation-constants";
import type { DictationDifficulty } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function DictationSetListScreen() {
  const { t } = useI18n();
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
      header={setListHeader(t, roundNum, difficulty, cap)}
      href={(setNumber) => `/dictation/${round}/${difficulty}/${setNumber}`}
      progress={{ taskType: "dictation", contentSkill: "dictation" }}
    />
  );
}
