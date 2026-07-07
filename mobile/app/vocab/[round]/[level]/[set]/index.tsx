import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "../../../../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../../../../hooks/useLuxuryRouter";
import { fetchPracticeSetMeta } from "../../../../../lib/api";
import { VOCAB_SESSION_MAX } from "../../../../../lib/vocab-constants";
import type { VocabSessionLevel, VocabSet } from "../../../../../lib/types";

export default function VocabPassageListScreen() {
  const { round, level, set } = useLocalSearchParams<{
    round: string;
    level: string;
    set: string;
  }>();
  const { push } = useLuxuryRouter();
  const roundNum = Number(round);
  const sessionLevel = level as VocabSessionLevel;
  const setNumber = Number(set);
  const [vocabSet, setVocabSet] = useState<VocabSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSetMeta<VocabSet>({
        skill: "vocab",
        round: roundNum,
        set: setNumber,
      });
      setVocabSet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load set");
    } finally {
      setLoading(false);
    }
  }, [roundNum, setNumber]);

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

  if (error || !vocabSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Set unavailable"}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Retry</Text>
        </LuxuryPressable>
      </View>
    );
  }

  const passages = vocabSet.passages
    .filter((p) => p.contentLevel === sessionLevel)
    .sort((a, b) => a.passageNumber - b.passageNumber);
  const cap = VOCAB_SESSION_MAX[sessionLevel];

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={passages}
      keyExtractor={(p) => String(p.passageNumber)}
      ListHeaderComponent={
        <Text style={styles.header}>
          Set {setNumber} · {level} · max {cap} pts · 6 blanks each
        </Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No passages at this level in set {setNumber}.</Text>
      }
      renderItem={({ item }) => (
        <LuxuryPressable
          style={styles.row}
          sound="none"
          scaleTo={0.98}
          onPress={() =>
            push(`/vocab/${round}/${level}/${set}/${item.passageNumber}`)
          }
        >
          <Text style={styles.rowTitle}>
            Passage {item.passageNumber}
            {item.titleEn ? ` — ${item.titleEn}` : ""}
          </Text>
          <Text style={styles.chev}>›</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
    marginBottom: 10,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  chev: { fontSize: 22, color: "#C4CBD8" },
});
