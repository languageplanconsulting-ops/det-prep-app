import type { Href } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { useLuxuryRouter } from "../hooks/useLuxuryRouter";
import { PRACTICE_ROUNDS } from "../lib/fitb-constants";
import { roundLabel, useI18n } from "../lib/i18n";
import { FadeInItem } from "./Motion";

export default function RoundHubScreen({
  title,
  subtitle,
  basePath,
}: {
  title: string;
  subtitle: string;
  basePath: string;
}) {
  const { push } = useLuxuryRouter();
  const { t } = useI18n();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      {PRACTICE_ROUNDS.map((round, i) => (
        <FadeInItem key={round} index={i} step={60}>
          <LuxuryPressable
            key={round}
            style={styles.row}
            sound="none"
            scaleTo={0.98}
            onPress={() => push(`${basePath}/${round}` as Href)}
          >
            <Text style={styles.rowTitle}>{roundLabel(t, round)}</Text>
            <Text style={styles.chev}>›</Text>
          </LuxuryPressable>
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
  rowTitle: { flex: 1, fontSize: 18, fontWeight: "900" },
  chev: { fontSize: 22, color: "#C4CBD8" },
});
