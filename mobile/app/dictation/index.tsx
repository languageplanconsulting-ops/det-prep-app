import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { DICTATION_DIFFICULTIES, DICTATION_MAX_SCORE } from "../../lib/dictation-constants";

export default function DictationHubScreen() {
  return (
    <RoundDifficultyPicker
      title="Dictation"
      subtitle="Pick round and difficulty — same sets as the website."
      basePath="/dictation"
      difficulties={DICTATION_DIFFICULTIES}
      maxScores={DICTATION_MAX_SCORE}
    />
  );
}
