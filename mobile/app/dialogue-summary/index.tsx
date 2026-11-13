import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import {
  DIALOGUE_SUMMARY_DIFFICULTIES,
  DIALOGUE_SUMMARY_MAX_SCORES,
} from "../../lib/dialogue-summary-constants";
import { useI18n } from "../../lib/i18n";

export default function DialogueSummaryHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("ฟังแล้วสรุป", "Dialogue → summary")}
      subtitle={t("ฟังบทสนทนาแล้วเขียนสรุป — AI ตรวจโดยใช้เครดิต VIP", "Listen, then write a summary — AI grading uses your VIP credits.")}
      basePath="/dialogue-summary"
      difficulties={[...DIALOGUE_SUMMARY_DIFFICULTIES]}
      maxScores={DIALOGUE_SUMMARY_MAX_SCORES}
    />
  );
}
