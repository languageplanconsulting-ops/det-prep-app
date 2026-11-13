import RoundHubScreen from "../../components/RoundHubScreen";
import { useI18n } from "../../lib/i18n";

export default function VocabRoundHubScreen() {
  const { t } = useI18n();
  return (
    <RoundHubScreen
      title={t("คำศัพท์", "Vocabulary")}
      subtitle={t("เลือกรอบ แล้วเลือกระดับความยาก", "Pick a round, then difficulty level.")}
      basePath="/vocab"
    />
  );
}
