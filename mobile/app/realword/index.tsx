import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { REALWORD_DIFFICULTIES, REALWORD_MAX_SCORE } from "../../lib/realword-constants";
import { useI18n } from "../../lib/i18n";

export default function RealWordHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("คำจริง / คำลวง", "Real word")}
      subtitle={t("แตะคำจริง · เลี่ยงคำลวง — คิดคะแนนแบบเดียวกับเว็บไซต์", "Tap real words, avoid traps — same scoring as the website.")}
      basePath="/realword"
      difficulties={REALWORD_DIFFICULTIES}
      maxScores={REALWORD_MAX_SCORE}
    />
  );
}
