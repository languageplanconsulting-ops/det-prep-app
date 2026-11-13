import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { DICTATION_DIFFICULTIES, DICTATION_MAX_SCORE } from "../../lib/dictation-constants";
import { useI18n } from "../../lib/i18n";

export default function DictationHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("ตามคำบอก", "Dictation")}
      subtitle={t("เลือกรอบและระดับความยาก — ชุดเดียวกับบนเว็บไซต์", "Pick round and difficulty — same sets as the website.")}
      basePath="/dictation"
      difficulties={DICTATION_DIFFICULTIES}
      maxScores={DICTATION_MAX_SCORE}
    />
  );
}
