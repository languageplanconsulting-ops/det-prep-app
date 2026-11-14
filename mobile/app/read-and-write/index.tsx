import RoundHubScreen from "../../components/RoundHubScreen";
import { useI18n } from "../../lib/i18n";

export default function ReadAndWriteRoundHubScreen() {
  const { t } = useI18n();
  return (
    <RoundHubScreen
      title={t("อ่านแล้วเขียน (เรียงความ)", "Read, then write (essay)")}
      subtitle={t(
        "อ่านโจทย์ เขียน 5 นาที อย่างน้อย 50 คำ · ได้คะแนนและคำแนะนำทันที",
        "Read the prompt, write for 5 minutes, 50+ words · instant score and feedback.",
      )}
      basePath="/read-and-write"
    />
  );
}
