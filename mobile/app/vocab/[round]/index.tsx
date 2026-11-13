import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { VOCAB_SESSION_LEVELS, VOCAB_SESSION_MAX } from "../../../lib/vocab-constants";
import { difficultyLabel, maxPointsLabel, roundLabel, useI18n } from "../../../lib/i18n";
import { FadeInItem } from "../../../components/Motion";

export default function VocabLevelPickerScreen() {
  const { round } = useLocalSearchParams<{ round: string }>();
  const { push } = useLuxuryRouter();
  const { t } = useI18n();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{roundLabel(t, round)}</Text>
      <Text style={styles.sub}>
        {t("เลือกระดับความยาก — คะแนนสูงสุดขึ้นกับระดับ", "Choose difficulty — scoring uses this level’s cap.")}
      </Text>
      {VOCAB_SESSION_LEVELS.map((level, i) => (
        <FadeInItem key={level} index={i} step={60}>
          <LuxuryPressable
            key={level}
            style={styles.row}
            sound="none"
            scaleTo={0.98}
            onPress={() => push(`/vocab/${round}/${level}`)}
          >
            <Text style={styles.rowTitle}>{difficultyLabel(t, level)}</Text>
            <Text style={styles.cap}>{maxPointsLabel(t, VOCAB_SESSION_MAX[level])}</Text>
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
  rowTitle: { flex: 1, fontSize: 18, fontWeight: "900", textTransform: "capitalize" },
  cap: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
});
