import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { READING_DIFFICULTIES, READING_DIFFICULTY_MAX, READING_ROUNDS } from "../../lib/reading-constants";
import { useI18n } from "../../lib/i18n";

export default function ReadingHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("การอ่าน", "Reading")}
      subtitle={t("อ่านแล้วตอบคำถาม — ข้อสอบละ 4 คำถาม", "Read and answer — 4 questions per exam.")}
      basePath="/reading"
      difficulties={READING_DIFFICULTIES}
      maxScores={READING_DIFFICULTY_MAX}
      rounds={READING_ROUNDS}
    />
  );
}
