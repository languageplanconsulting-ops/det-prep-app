import { useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { ScreenLoader } from "../../../components/MascotLoader";
import { FadeInItem } from "../../../components/Motion";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { fetchPracticeAttempts } from "../../../lib/api";
import { LOAD_FAILED, errorText, roundLabel, useI18n } from "../../../lib/i18n";
import { fetchWritingTopics } from "../../../lib/production-api";
import { PRODUCTION_MAX_SCORE, PRODUCTION_TASK_TYPE } from "../../../lib/production-constants";
import type { WritingTopic } from "../../../lib/production-types";

export default function ReadAndWriteTopicListScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const roundNum = Number(round);
  const { t } = useI18n();
  const { push } = useLuxuryRouter();
  const [topics, setTopics] = useState<WritingTopic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Latest score per topic from practice_attempts (newest first, web or app).
  const [latest, setLatest] = useState<Map<string, number>>(() => new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void fetchPracticeAttempts(PRODUCTION_TASK_TYPE.essay).then((attempts) => {
        const m = new Map<string, number>();
        for (const a of attempts) {
          const id = a.detail?.topicId;
          const s160 = a.detail?.score160;
          if (typeof id === "string" && typeof s160 === "number" && !m.has(id)) m.set(id, s160);
        }
        if (!cancelled) setLatest(m);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setTopics(await fetchWritingTopics(roundNum));
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [roundNum]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
        <LuxuryPressable style={[styles.retry]} onPress={() => void load()}>
          <Text style={styles.retryText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }
  if (!topics) return <ScreenLoader />;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={topics}
      keyExtractor={(x) => x.id}
      ListHeaderComponent={
        <Text style={styles.header}>
          {roundLabel(t, roundNum)} · {t(`${topics.length} หัวข้อ`, `${topics.length} topic(s)`)}
        </Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{t("รอบนี้ยังไม่มีหัวข้อ", "No topics in this round yet.")}</Text>
      }
      renderItem={({ item, index }) => (
        <FadeInItem index={index}>
          <LuxuryPressable
            style={[styles.row]}
            sound="none"
            scaleTo={0.98}
            onPress={() => push(`/read-and-write/${roundNum}/${encodeURIComponent(item.id)}` as Href)}
          >
            <Text style={styles.rowTitle}>{item.titleEn}</Text>
            {item.titleTh ? (
              <Text style={styles.rowSub} numberOfLines={2}>
                {item.titleTh}
              </Text>
            ) : null}
            {latest.has(item.id) ? (
              <Text style={styles.last}>
                {t("คะแนนล่าสุด", "Last score")} {Math.round(latest.get(item.id)!)}/{PRODUCTION_MAX_SCORE}
              </Text>
            ) : null}
          </LuxuryPressable>
        </FadeInItem>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  retry: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#004AAD", borderRadius: 10 },
  retryText: { color: "#FFCC00", fontWeight: "800" },
  list: { flex: 1, backgroundColor: "#F4F6FB" },
  listContent: { padding: 12, paddingBottom: 40 },
  header: { fontWeight: "800", marginBottom: 12, paddingHorizontal: 4 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 24 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: "900" },
  rowSub: { marginTop: 6, fontSize: 13, color: "#6B7280" },
  last: { marginTop: 6, fontSize: 13, fontWeight: "800", color: "#004AAD" },
});
