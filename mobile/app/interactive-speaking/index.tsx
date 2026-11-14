import RoundHubScreen from "../../components/RoundHubScreen";
import { useI18n } from "../../lib/i18n";

export default function InteractiveSpeakingRoundHubScreen() {
  const { t } = useI18n();
  return (
    <RoundHubScreen
      title={t("พูดโต้ตอบ", "Interactive speaking")}
      subtitle={t("สถานการณ์ละ 6 รอบ · ถามต่อจากคำตอบของคุณ · ตรวจด้วยเครดิต VIP", "6 turns per scenario · follow-up questions · VIP grading.")}
      basePath="/interactive-speaking"
    />
  );
}
