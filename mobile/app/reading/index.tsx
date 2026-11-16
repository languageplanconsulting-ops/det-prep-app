import { RoundDifficultyPicker } from "../../components/RoundDifficultyPicker";
import { READING_DIFFICULTIES, READING_DIFFICULTY_MAX, READING_ROUNDS } from "../../lib/reading-constants";
import { useI18n } from "../../lib/i18n";

export default function ReadingHubScreen() {
  const { t } = useI18n();
  return (
    <RoundDifficultyPicker
      title={t("การอ่าน", "Reading")}
      subtitle={t("Interactive Reading เหมือนข้อสอบจริง — บทอ่านละ 6 ขั้นตอน ในเวลา 8 นาที", "Real-format Interactive Reading — 6 steps per passage on an 8-minute clock.")}
      basePath="/reading"
      difficulties={READING_DIFFICULTIES}
      maxScores={READING_DIFFICULTY_MAX}
      rounds={READING_ROUNDS}
    />
  );
}
