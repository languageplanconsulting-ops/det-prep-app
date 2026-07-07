import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import {
  CONVERSATION_DIFFICULTIES,
  CONVERSATION_FULL_SCORE,
} from "../../../lib/conversation-constants";

export default function ConversationLevelPickerScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const { push } = useLuxuryRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Round {round}</Text>
      <Text style={styles.sub}>
        Max {CONVERSATION_FULL_SCORE} pts per set · 3 scenario + 5 main questions.
      </Text>
      {CONVERSATION_DIFFICULTIES.map((level) => (
        <LuxuryPressable
          key={level}
          style={styles.row}
          sound="none"
          scaleTo={0.98}
          onPress={() => push(`/conversation/${round}/${level}`)}
        >
          <Text style={styles.rowTitle}>{level}</Text>
          <Text style={styles.chev}>›</Text>
        </LuxuryPressable>
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
  rowTitle: { flex: 1, fontSize: 18, fontWeight: "900", textTransform: "capitalize" },
  chev: { fontSize: 22, color: "#C4CBD8" },
});
