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
import { READING_DIFFICULTY_MAX } from "../../../../../lib/reading-constants";
import type { ReadingDifficulty, ReadingSet } from "../../../../../lib/types";

export default function ReadingExamListScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const { push } = useLuxuryRouter();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const setNumber = Number(set);
  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSetMeta<ReadingSet>({
        skill: "reading",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setReadingSet(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load set");
    } finally {
      setLoading(false);
    }
  }, [roundNum, diff, setNumber]);

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

  if (error || !readingSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Set unavailable"}</Text>
        <LuxuryPressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Retry</Text>
        </LuxuryPressable>
      </View>
    );
  }

  const exams = readingSet.exams ?? [];
  const cap = READING_DIFFICULTY_MAX[diff];

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={exams.map((exam, i) => ({ exam, examNumber: i + 1 }))}
      keyExtractor={(row) => String(row.examNumber)}
      ListHeaderComponent={
        <Text style={styles.header}>
          Set {setNumber} · {exams.length} exam(s) · max {cap} pts each
        </Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>No exams in this set yet.</Text>}
      renderItem={({ item }) => (
        <LuxuryPressable
          style={styles.row}
          sound="none"
          scaleTo={0.98}
          onPress={() =>
            push(`/reading/${round}/${difficulty}/${set}/${item.examNumber}`)
          }
        >
          <Text style={styles.rowTitle}>
            Exam {item.examNumber}
            {item.exam.titleEn ? ` — ${item.exam.titleEn}` : ""}
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
