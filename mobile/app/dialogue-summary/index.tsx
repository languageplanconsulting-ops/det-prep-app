import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import {
  DIALOGUE_SUMMARY_DIFFICULTIES,
  DIALOGUE_SUMMARY_MAX_SCORES,
} from "../../lib/dialogue-summary-constants";

export default function DialogueSummaryHubScreen() {
  return (
    <RoundDifficultyPicker
      title="Dialogue → summary"
      subtitle="ฟังบทสนทนาแล้วเขียนสรุป — AI grading uses your VIP credits."
      basePath="/dialogue-summary"
      difficulties={[...DIALOGUE_SUMMARY_DIFFICULTIES]}
      maxScores={DIALOGUE_SUMMARY_MAX_SCORES}
    />
  );
}
