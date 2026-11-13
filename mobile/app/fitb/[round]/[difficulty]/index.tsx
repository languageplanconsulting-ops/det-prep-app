import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { FITB_MAX_SCORE } from "../../../../lib/fitb-constants";
import type { FitbDifficulty } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function FitbSetListScreen() {
  const { t } = useI18n();
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as FitbDifficulty;
  const cap = FITB_MAX_SCORE[diff] ?? 140;

  return (
    <PracticeSetList
      skill="fitb"
      round={roundNum}
      difficulty={diff}
      header={setListHeader(t, roundNum, difficulty, cap)}
      href={(setNumber) => `/fitb/${round}/${difficulty}/${setNumber}`}
      progress={{ taskType: "fill_in_blanks", contentSkill: "fitb" }}
    />
  );
}
