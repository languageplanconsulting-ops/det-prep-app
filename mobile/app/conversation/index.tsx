import RoundHubScreen from "../../components/RoundHubScreen";
import { useI18n } from "../../lib/i18n";

export default function ConversationRoundHubScreen() {
  const { t } = useI18n();
  return (
    <RoundHubScreen
      title={t("บทสนทนาโต้ตอบ", "Interactive conversation")}
      subtitle={t("ฟังบทสนทนาแล้วตอบคำถาม — 8 ขั้นตอนเหมือนบนเว็บไซต์", "Listen and answer — same 8 steps as the website.")}
      basePath="/conversation"
    />
  );
}
