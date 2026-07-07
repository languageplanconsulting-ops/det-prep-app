import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { LuxuryTile } from "./LuxuryTile";
import { useLuxuryRouter } from "../hooks/useLuxuryRouter";
import { fetchPracticeSetList } from "../lib/api";
import type { PracticeSkillId } from "../lib/types";

type Props = {
  skill: PracticeSkillId;
  round: number;
  difficulty: string;
  header: string;
  href: (setNumber: number) => string;
};

export function PracticeSetList({ skill, round, difficulty, header, href }: Props) {
  const { push } = useLuxuryRouter();
  const [setNumbers, setSetNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nums = await fetchPracticeSetList({
        skill,
        round,
        difficulty,
      });
      setSetNumbers(nums);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sets");
    } finally {
      setLoading(false);
    }
  }, [skill, round, difficulty]);

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
      data={Array.from({ length: 40 }, (_, i) => i + 1)}
      keyExtractor={(n) => String(n)}
      numColumns={2}
      ListHeaderComponent={<Text style={styles.header}>{header}</Text>}
      renderItem={({ item: setNumber }) => {
        const available = setNumbers.includes(setNumber);
        return (
          <LuxuryTile
            title={`Set ${setNumber}`}
            subtitle={available ? "Open" : "No data"}
            disabled={!available}
            onPress={() => push(href(setNumber))}
          />
        );
      }}
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
});
