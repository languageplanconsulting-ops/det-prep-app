import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { fetchInteractiveSpeakingScenarios } from "../../../lib/api";
import type { InteractiveSpeakingScenario } from "../../../lib/types";

export default function InteractiveSpeakingScenarioListScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const { push } = useLuxuryRouter();
  const roundNum = Number(round);
  const [scenarios, setScenarios] = useState<InteractiveSpeakingScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchInteractiveSpeakingScenarios(roundNum);
      setScenarios(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scenarios");
    } finally {
      setLoading(false);
    }
  }, [roundNum]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Retry</Text>
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
        <Text style={styles.header}>Round {roundNum} · {scenarios.length} scenario(s)</Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>No scenarios uploaded for this round yet.</Text>}
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
});
