import { useLocalSearchParams } from "expo-router";

import { PracticeSetList } from "../../../../components/PracticeSetList";
import { VOCAB_SESSION_MAX } from "../../../../lib/vocab-constants";
import type { VocabSessionLevel } from "../../../../lib/types";
import { setListHeader, useI18n } from "../../../../lib/i18n";

export default function VocabSetListScreen() {
  const { t } = useI18n();
  const { round, level } = useLocalSearchParams<{ round: string; level: string }>();
  const roundNum = Number(round);
  const sessionLevel = level as VocabSessionLevel;
  const cap = VOCAB_SESSION_MAX[sessionLevel] ?? 160;

  return (
    <PracticeSetList
      skill="vocab"
      round={roundNum}
      difficulty={sessionLevel}
      header={setListHeader(t, roundNum, level, cap)}
      href={(setNumber) => `/vocab/${round}/${level}/${setNumber}`}
    />
  );
}
