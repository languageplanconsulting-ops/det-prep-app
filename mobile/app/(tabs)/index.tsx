import { type ReactNode } from "react";
import { type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { useI18n } from "../../lib/i18n";
import { FadeInItem } from "../../components/Motion";

type Translate = ReturnType<typeof useI18n>["t"];
type Row = { title: string; sub: string; href: Href };

// Thai mode: Thai title + English task name. English mode: English title + Thai name.
const row = (t: Translate, th: string, en: string, href: Href): Row => ({
  title: t(th, en),
  sub: t(en, th),
  href,
});

const literacy = (t: Translate): Row[] => [
  row(t, "ตามคำบอก", "Dictation", "/dictation"),
  row(t, "เติมคำในช่องว่าง", "Fill in the blank", "/fitb"),
  row(t, "คำจริง / คำลวง", "Real word", "/realword"),
];

const comprehension = (t: Translate): Row[] => [
  row(t, "คำศัพท์", "Vocabulary", "/vocab"),
  row(t, "การอ่าน", "Reading", "/reading"),
];

const conversation = (t: Translate): Row[] => [
  row(t, "บทสนทนาโต้ตอบ", "Interactive conversation", "/conversation"),
  row(t, "ฟังแล้วสรุป", "Dialogue → summary", "/dialogue-summary"),
];

const lessons = (t: Translate): Row[] => [
  {
    title: t("ฟังสถานการณ์ในมหาวิทยาลัย", "Campus listening"),
    sub: t("Campus listening · บทเรียน", "ฟังสถานการณ์ในมหาวิทยาลัย · Lessons"),
    href: "/lessons" as Href,
  },
];

const production = (t: Translate): Row[] => [
  row(t, "เขียนบรรยายภาพ", "Write about the photo", "/write-about-photo"),
  row(t, "พูดบรรยายภาพ", "Speak about the photo", "/speak-about-photo"),
  row(t, "อ่านแล้วเขียน (เรียงความ)", "Read, then write (essay)", "/read-and-write"),
  row(t, "พูดโต้ตอบ", "Interactive speaking", "/interactive-speaking"),
];

export default function PracticeHubScreen() {
  const { push } = useLuxuryRouter();
  const { t } = useI18n();

  const rows = (list: Row[]) =>
    list.map((r) => (
      <HubRow key={r.title} title={r.title} sub={r.sub} onPress={() => push(r.href)} />
    ));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FadeInItem index={0} style={styles.hero}>
        <Text style={styles.heroLabel}>{t("แพ็กของคุณ", "Your plan")}</Text>
        <Text style={styles.heroTitle}>{t("ศูนย์ฝึก", "Practice hub")}</Text>
        <Text style={styles.heroSub}>
          {t(
            "ข้อสอบดึงจากฐานข้อมูลเดียวกับเว็บไซต์ คะแนนซิงก์กันทั้งสองฝั่ง",
            "Questions and scores sync with the website.",
          )}
        </Text>
      </FadeInItem>

      <FadeInItem index={1} step={70}>
        <LuxuryPressable style={styles.dailyCard} sound="tap" scaleTo={0.97} onPress={() => push("/daily" as Href)}>
          <Text style={styles.dailyEmoji}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>{t("ฝึกประจำวัน", "Daily practice")}</Text>
            <Text style={styles.dailySub}>
              {t("บอกเวลาที่มี แล้วเราสุ่มข้อที่คุณยังไม่เคยทำให้", "Tell us your time — we pick questions you haven't done")}
            </Text>
          </View>
          <Text style={styles.dailyChev}>›</Text>
        </LuxuryPressable>
      </FadeInItem>

      <FadeInItem index={1} step={70}>
        <LuxuryPressable style={styles.mockCard} sound="tap" scaleTo={0.97} onPress={() => push("/mock-test" as Href)}>
          <Text style={styles.dailyEmoji}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mockTitle}>{t("ศูนย์ข้อสอบจำลอง", "Mock test center")}</Text>
            <Text style={styles.mockSub}>
              {t("ข้อสอบจำลองเต็มชุด + เช็กระดับสั้น พร้อมคะแนนประมาณการ", "Full mock tests + mini diagnosis with an estimated score")}
            </Text>
          </View>
          <Text style={[styles.dailyChev, { color: "#FFCC00" }]}>›</Text>
        </LuxuryPressable>
      </FadeInItem>

      <Section
        index={1}
        title={t("การอ่านเขียนพื้นฐาน", "Literacy")}
        sub={t("ตามคำบอก · เติมคำ · คำจริง", "Dictation · Fill in the blank · Real word")}
      >
        {rows(literacy(t))}
      </Section>

      <Section
        index={2}
        title={t("ความเข้าใจ", "Comprehension")}
        sub={t("คำศัพท์ & การอ่าน", "Vocabulary & reading")}
      >
        {rows(comprehension(t))}
      </Section>

      <Section title={t("บทสนทนา", "Conversation")} index={3} sub={t("ฟังแล้วตอบ", "Listen and respond")}>
        {rows(conversation(t))}
      </Section>

      <Section
        index={4}
        title={t("บทเรียน", "Lessons")}
        sub={t("เรียนรู้ทีละสถานการณ์ · เฉพาะในแอป", "One scenario at a time · app only")}
      >
        {rows(lessons(t))}
      </Section>

      <Section
        index={5}
        title={t("การพูดและเขียน", "Production")}
        sub={t("เขียนและพูดจากภาพ · เรียงความ · พูดโต้ตอบ (ตรวจให้ทันที)", "Photo tasks · essay · interactive speaking (instant feedback)")}
      >
        {rows(production(t))}
      </Section>

      <Text style={styles.footnote}>
<<<<<<< HEAD
        {t("ข้อสอบจำลอง — กำลังจะมาในแอปเร็วๆ นี้", "Mock test — coming to the app next.")}
=======
        {t(
          "เขียนจากภาพ และพูดจากภาพ — กำลังจะมาในแอปเร็วๆ นี้",
          "Write-about-photo and speak-about-photo — coming to the app next.",
        )}
>>>>>>> refs/heads/claude/adoring-wright-03348c
      </Text>
    </ScrollView>
  );
}

function Section({
  title,
  sub,
  index = 0,
  children,
}: {
  title: string;
  sub: string;
  index?: number;
  children: ReactNode;
}) {
  return (
    <FadeInItem index={index} step={70} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
      <View style={styles.card}>{children}</View>
    </FadeInItem>
  );
}

function HubRow({
  title,
  sub,
  soon,
  onPress,
}: {
  title: string;
  sub: string;
  soon?: boolean;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  const soonLabel = t("เร็วๆ นี้", "Soon");
  return (
    <LuxuryPressable
      style={styles.row}
      disabled={!onPress}
      sound="none"
      scaleTo={0.98}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {soon ? <Text style={styles.soon}>{soonLabel}</Text> : <Text style={styles.chev}>›</Text>}
    </LuxuryPressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFCC00",
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#111",
    padding: 16,
    marginBottom: 20,
  },
  dailyEmoji: { fontSize: 30 },
  mockCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#004AAD",
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#111",
    padding: 16,
    marginBottom: 20,
  },
  mockTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  mockSub: { fontSize: 12, color: "#E6F0FF", marginTop: 3, fontWeight: "700" },
  dailyTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  dailySub: { fontSize: 12, color: "#3f3f46", marginTop: 3, fontWeight: "700" },
  dailyChev: { fontSize: 26, color: "#111", fontWeight: "900" },
  hero: {
    backgroundColor: "#004AAD",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroLabel: { color: "#cde0ff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 4 },
  heroSub: { color: "#e6f0ff", fontSize: 13, marginTop: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  sectionSub: { fontSize: 12, color: "#6B7280", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EAF1",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F8",
  },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  chev: { fontSize: 22, color: "#C4CBD8" },
  soon: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9aa3b2",
    backgroundColor: "#EEF0F4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  footnote: { fontSize: 12, color: "#6B7280", lineHeight: 18, textAlign: "center" },
});
