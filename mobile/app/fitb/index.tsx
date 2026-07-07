import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { FITB_DIFFICULTIES, FITB_MAX_SCORE } from "../../lib/fitb-constants";

export default function FitbHubScreen() {
  return (
    <RoundDifficultyPicker
      title="Fill in the blank"
      subtitle="เติมคำในช่องว่าง — same grading as the website."
      basePath="/fitb"
      difficulties={FITB_DIFFICULTIES}
      maxScores={FITB_MAX_SCORE}
    />
  );
}
