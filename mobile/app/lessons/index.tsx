import { type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import {
  CAMPUS_LISTENING_SCENARIOS,
} from "../../lib/campus-listening-lessons";
import { getCompletedScenarioIds } from "../../lib/campus-lesson-progress";

export default function LessonsHubScreen() {
  const { push } = useLuxuryRouter();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    void getCompletedScenarioIds().then(setDone);
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>บทเรียน · Mobile only</Text>
        <Text style={styles.heroTitle}>ฟังสถานการณ์ในมหาวิทยาลัย</Text>
        <Text style={styles.heroSub}>
          ฟังบทสนทนาในวิทยาเขต แล้วเติมคำศัพท์จากความหมายที่ได้ยิน — 20 สถานการณ์ × 3 คำถาม
        </Text>
      </View>

      <Text style={styles.sectionTitle}>สถานการณ์ทั้งหมด</Text>
      <View style={styles.card}>
        {CAMPUS_LISTENING_SCENARIOS.map((sc, i) => {
          const completed = done.has(sc.id);
          return (
            <LuxuryPressable
              key={sc.id}
              style={[styles.row, i === CAMPUS_LISTENING_SCENARIOS.length - 1 && styles.rowLast]}
              sound="tap"
              onPress={() => push(`/lessons/${sc.id}` as Href)}
            >
              <View style={styles.numWrap}>
                <Text style={styles.num}>{sc.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{sc.titleTh}</Text>
                <Text style={styles.rowSub}>{sc.titleEn}</Text>
                <Text style={styles.keywords}>{sc.keywords.join(" · ")}</Text>
              </View>
              {completed ? (
                <Text style={styles.doneBadge}>✓</Text>
              ) : (
                <Text style={styles.chev}>›</Text>
              )}
            </LuxuryPressable>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        พี่ดอยจะแนะนำก่อนทุกข้อ · ตอบผิดจะสอนคำศัพท์และบันทึกลงสมุดได้
      </Text>
    </ScrollView>
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
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  heroSub: { color: "#e6f0ff", fontSize: 13, marginTop: 8, lineHeight: 19 },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 10 },
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F8",
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  numWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 13, fontWeight: "800", color: "#004AAD" },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  keywords: { fontSize: 11, color: "#94A3B8", marginTop: 4 },
  chev: { fontSize: 22, color: "#C4CBD8" },
  doneBadge: {
    fontSize: 16,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  footnote: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 16,
  },
});
