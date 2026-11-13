import type { Href } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../components/LuxuryPressable";
import { useLuxuryRouter } from "../hooks/useLuxuryRouter";
import { PRACTICE_ROUNDS } from "../lib/fitb-constants";
import { difficultyLabel, maxPointsLabel, roundLabel, useI18n } from "../lib/i18n";
import { FadeInItem } from "./Motion";

type Difficulty = "easy" | "medium" | "hard";

export function RoundDifficultyPicker({
  title,
  subtitle,
  basePath,
  difficulties,
  maxScores,
}: {
  title: string;
  subtitle: string;
  basePath: string;
  difficulties: Difficulty[];
  maxScores: Record<Difficulty, number>;
}) {
  const { push } = useLuxuryRouter();
  const { t } = useI18n();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>

      {PRACTICE_ROUNDS.map((round, i) => (
        <FadeInItem key={round} index={i} step={60} style={styles.roundBlock}>
          <Text style={styles.roundTitle}>{roundLabel(t, round)}</Text>
          <View style={styles.diffRow}>
            {difficulties.map((diff) => (
              <LuxuryPressable
                key={diff}
                style={styles.diffBtn}
                sound="none"
                scaleTo={0.94}
                onPress={() => push(`${basePath}/${round}/${diff}` as Href)}
              >
                <Text style={styles.diffLabel}>{difficultyLabel(t, diff)}</Text>
                <Text style={styles.diffCap}>{maxPointsLabel(t, maxScores[diff])}</Text>
              </LuxuryPressable>
            ))}
          </View>
        </FadeInItem>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 6, marginBottom: 20 },
  roundBlock: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
    marginBottom: 12,
  },
  roundTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  diffRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  diffBtn: {
    flexGrow: 1,
    minWidth: "28%",
    backgroundColor: "#004AAD",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  diffLabel: { color: "#FFCC00", fontWeight: "900", textTransform: "capitalize" },
  diffCap: { color: "#cde0ff", fontSize: 10, marginTop: 4, fontWeight: "700" },
});
