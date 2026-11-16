import { type Href, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { ScreenLoader } from "../../components/MascotLoader";
import { FadeInItem } from "../../components/Motion";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { fetchPracticeAttempts } from "../../lib/api";
import { LOAD_FAILED, errorText, useI18n } from "../../lib/i18n";
import {
  SFITB_MAX_SCORE,
  SFITB_SECONDS_PER_ITEM,
  SFITB_TASK_TYPE,
  fetchSfitbExams,
  type SfitbExamSummary,
} from "../../lib/sentence-fitb";

const ROUND = 1;

export default function SentenceFillHubScreen() {
  const { t } = useI18n();
  const { push } = useLuxuryRouter();
  const [exams, setExams] = useState<SfitbExamSummary[] | null>(null);
  const [best, setBest] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, rows] = await Promise.all([fetchSfitbExams(ROUND), fetchPracticeAttempts(SFITB_TASK_TYPE)]);
      const out: Record<number, number> = {};
      for (const r of rows) {
        const m = /^sentence-fitb:r(\d+):e(\d+)$/.exec(String(r.detail?.contentKey ?? ""));
        if (!m || Number(m[1]) !== ROUND) continue;
        const s = Math.round(((r.score_pct ?? 0) / 100) * SFITB_MAX_SCORE);
        out[Number(m[2])] = Math.max(out[Number(m[2])] ?? 0, s);
      }
      setExams(list);
      setBest(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, []);

  // refresh scores when coming back from an exam
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }
  if (!exams) return <ScreenLoader />;
  const done = Object.keys(best).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FadeInItem index={0} style={styles.hero}>
        <Text style={styles.badge}>{t("ใหม่ · ตรงกับข้อสอบจริง", "New · matches the real test")}</Text>
        <Text style={styles.title}>{t("เติมคำในประโยค", "Fill in the Blanks (sentence)")}</Text>
        <Text style={styles.sub}>
          {t(
            `ข้อสอบ DET ตอนนี้มี Fill in the Blanks แบบประโยคเดี่ยว: เห็นตัวอักษรแรก แล้วเติมที่เหลือให้ครบ ข้อละ ${SFITB_SECONDS_PER_ITEM} วินาที`,
            `The real DET now has a one-sentence Fill in the Blanks: see the first letters, complete the word, ${SFITB_SECONDS_PER_ITEM} seconds each.`,
          )}
        </Text>
        <Text style={styles.meta}>
          {t(`รอบที่ ${ROUND} · ${exams.length} ชุด · ชุดละ 8 ประโยค · ทำแล้ว ${done}`, `Round ${ROUND} · ${exams.length} sets · 8 sentences each · ${done} done`)}
        </Text>
      </FadeInItem>
      <View style={styles.grid}>
        {exams.map((e) => {
          const s = best[e.exam];
          return (
            <LuxuryPressable
              key={e.exam}
              style={[styles.tile, s === undefined ? null : s >= SFITB_MAX_SCORE ? styles.tilePerfect : styles.tileDone]}
              sound="tap"
              scaleTo={0.96}
              onPress={() => push(`/sentence-fill/${ROUND}/${e.exam}` as Href)}
            >
              <Text style={styles.tileLabel}>{t("ชุดที่", "Set")}</Text>
              <Text style={styles.tileNum}>{e.exam}</Text>
              <Text style={styles.tileScore}>{s === undefined ? t("ยังไม่ทำ", "New") : `${s}/${SFITB_MAX_SCORE}`}</Text>
            </LuxuryPressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  hero: { backgroundColor: "#004AAD", borderRadius: 20, padding: 18, marginBottom: 16 },
  badge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "900",
    color: "#004AAD",
    backgroundColor: "#FFCC00",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  title: { marginTop: 8, fontSize: 22, fontWeight: "900", color: "#fff" },
  sub: { marginTop: 6, fontSize: 13, color: "#E6F0FF", lineHeight: 20 },
  meta: { marginTop: 10, fontSize: 12, fontWeight: "800", color: "#cde0ff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7EAF1",
    padding: 12,
  },
  tileDone: { backgroundColor: "#FFF8E1", borderColor: "#FCD34D" },
  tilePerfect: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  tileLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  tileNum: { fontSize: 22, fontWeight: "900", color: "#111" },
  tileScore: { marginTop: 2, fontSize: 11, fontWeight: "800", color: "#4B5563" },
});
