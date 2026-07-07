import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { READING_DIFFICULTIES, READING_DIFFICULTY_MAX } from "../../lib/reading-constants";

export default function ReadingHubScreen() {
  return (
    <RoundDifficultyPicker
      title="Reading"
      subtitle="อ่านแล้วตอบคำถาม — 4 questions per exam."
      basePath="/reading"
      difficulties={READING_DIFFICULTIES}
      maxScores={READING_DIFFICULTY_MAX}
    />
  );
}
