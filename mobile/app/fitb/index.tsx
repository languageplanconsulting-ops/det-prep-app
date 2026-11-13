import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { FITB_DIFFICULTIES, FITB_MAX_SCORE } from "../../lib/fitb-constants";
import { useI18n } from "../../lib/i18n";

export default function FitbHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("เติมคำในช่องว่าง", "Fill in the blank")}
      subtitle={t("ตรวจคะแนนแบบเดียวกับบนเว็บไซต์", "Same grading as the website.")}
      basePath="/fitb"
      difficulties={FITB_DIFFICULTIES}
      maxScores={FITB_MAX_SCORE}
    />
  );
}
