import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { fetchInteractiveSpeakingScenarios, fetchPracticeAttempts } from "../../../lib/api";
import type { InteractiveSpeakingScenario } from "../../../lib/types";
import { LOAD_FAILED, errorText, roundLabel, useI18n } from "../../../lib/i18n";
import { ScreenLoader } from "../../../components/MascotLoader";

export default function InteractiveSpeakingScenarioListScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const { push } = useLuxuryRouter();
  const { t } = useI18n();
  const roundNum = Number(round);
  const [scenarios, setScenarios] = useState<InteractiveSpeakingScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Latest score per scenario, from web or app (server returns newest first).
  const [latestScore, setLatestScore] = useState<Map<string, number>>(() => new Map());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void fetchPracticeAttempts("interactive_speaking").then((attempts) => {
        const m = new Map<string, number>();
        for (const a of attempts) {
          const id = a.detail?.scenarioId;
          const s160 = a.detail?.score160;
          if (typeof id === "string" && typeof s160 === "number" && !m.has(id)) m.set(id, s160);
        }
        if (!cancelled) setLatestScore(m);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchInteractiveSpeakingScenarios(roundNum);
      setScenarios(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [roundNum]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ScreenLoader />;

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={scenarios}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <Text style={styles.header}>
          {roundLabel(t, roundNum)} ·{" "}
          {t(`${scenarios.length} สถานการณ์`, `${scenarios.length} scenario(s)`)}
        </Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>
          {t("รอบนี้ยังไม่มีสถานการณ์", "No scenarios uploaded for this round yet.")}
        </Text>}
      renderItem={({ item }) => (
        <LuxuryPressable
          style={styles.row}
          sound="none"
          scaleTo={0.98}
          onPress={() => push(`/interactive-speaking/${round}/${item.id}`)}
        >
          <Text style={styles.rowTitle}>{item.titleEn}</Text>
          <Text style={styles.rowSub} numberOfLines={2}>
            {item.titleTh}
          </Text>
          {latestScore.has(item.id) ? (
            <Text style={styles.last}>
              {t("คะแนนล่าสุด", "Last score")} {Math.round(latestScore.get(item.id)!)}/160
            </Text>
          ) : null}
        </LuxuryPressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  retry: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#004AAD",
    borderRadius: 10,
  },
  retryText: { color: "#FFCC00", fontWeight: "800" },
  list: { flex: 1, backgroundColor: "#F4F6FB" },
  listContent: { padding: 12 },
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
