import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { DIALOGUE_SUMMARY_MAX_SCORES } from "../../../../lib/dialogue-summary-constants";
import type { DialogueSummaryDifficulty } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function DialogueSummarySetListScreen() {
  const { t } = useI18n();
  const { round, difficulty } = useLocalSearchParams<{ round: string; difficulty: string }>();
  const roundNum = Number(round);
  const diff = difficulty as DialogueSummaryDifficulty;
  const cap = DIALOGUE_SUMMARY_MAX_SCORES[diff] ?? 160;

  return (
    <PracticeSetList
      skill="dialogue_summary"
      round={roundNum}
      difficulty={diff}
      header={setListHeader(t, roundNum, difficulty, cap)}
      href={(setNumber) => `/dialogue-summary/${round}/${difficulty}/${setNumber}`}
      progress={{ taskType: "dialogue_summary", contentSkill: "dialogue_summary" }}
    />
  );
}
