import { type ReactNode } from "react";
import { type Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";

const LITERACY = [
  { key: "dictation", title: "ตามคำบอก", sub: "Dictation", href: "/dictation" as const },
  { key: "fitb", title: "เติมคำในช่องว่าง", sub: "Fill in the blank", href: "/fitb" as const },
  { key: "realword", title: "คำจริง / คำลวง", sub: "Real word", href: "/realword" as const },
] as const;

const COMPREHENSION = [
  { title: "ศัพท์", sub: "Vocabulary", href: "/vocab" as const },
  { title: "การอ่าน", sub: "Reading", href: "/reading" as const },
] as const;

const CONVERSATION = [
  { title: "บทสนทนาโต้ตอบ", sub: "Interactive conversation", href: "/conversation" as const },
  { title: "ฟังแล้วสรุป", sub: "Dialogue → summary", href: "/dialogue-summary" as const },
] as const;

const LESSONS = [
  {
    title: "ฟังสถานการณ์ในมหาวิทยาลัย",
    sub: "Campus listening · บทเรียน",
    href: "/lessons" as Href,
  },
] as const;

const PRODUCTION = [
  { title: "พูดโต้ตอบ", sub: "Interactive speaking", href: "/interactive-speaking" as const },
] as const;

export default function PracticeHubScreen() {
  const { push } = useLuxuryRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>แพ็กของคุณ</Text>
        <Text style={styles.heroTitle}>Practice hub</Text>
        <Text style={styles.heroSub}>Questions sync from the same database as the website.</Text>
      </View>

      <Section title="Literacy" sub="ตามคำบอก · เติมคำ · คำจริง">
        {LITERACY.map((row) => (
          <HubRow
            key={row.key}
            title={row.title}
            sub={row.sub}
            onPress={() => push(row.href)}
          />
        ))}
      </Section>

      <Section title="Comprehension" sub="ศัพท์ & การอ่าน">
        {COMPREHENSION.map((row) => (
          <HubRow
            key={row.sub}
            title={row.title}
            sub={row.sub}
            onPress={() => push(row.href)}
          />
        ))}
      </Section>

      <Section title="Conversation" sub="ฟังแล้วตอบ">
        {CONVERSATION.map((row) => (
          <HubRow
            key={row.sub}
            title={row.title}
            sub={row.sub}
            onPress={() => push(row.href)}
          />
        ))}
      </Section>

      <Section title="บทเรียน" sub="เรียนรู้ทีละสถานการณ์ · mobile only">
        {LESSONS.map((row) => (
          <HubRow
            key={row.sub}
            title={row.title}
            sub={row.sub}
            onPress={() => push(row.href)}
          />
        ))}
      </Section>

      <Section title="Production" sub="พูด & เขียน (AI graded)">
        {PRODUCTION.map((row) => (
          <HubRow
            key={row.sub}
            title={row.title}
            sub={row.sub}
            onPress={() => push(row.href)}
          />
        ))}
      </Section>

      <Text style={styles.footnote}>
        Write-about-photo, speak-about-photo, and mock test — same APIs, mobile UI coming next.
      </Text>
    </ScrollView>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
      <View style={styles.card}>{children}</View>
    </View>
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
      {soon ? <Text style={styles.soon}>Soon</Text> : <Text style={styles.chev}>›</Text>}
    </LuxuryPressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
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
