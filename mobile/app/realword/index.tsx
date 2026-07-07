import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { REALWORD_DIFFICULTIES, REALWORD_MAX_SCORE } from "../../lib/realword-constants";

export default function RealWordHubScreen() {
  return (
    <RoundDifficultyPicker
      title="Real word"
      subtitle="แตะคำจริง · เลี่ยงคำลวง — same scoring as the website."
      basePath="/realword"
      difficulties={REALWORD_DIFFICULTIES}
      maxScores={REALWORD_MAX_SCORE}
    />
  );
}
