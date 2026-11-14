import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "../lib/i18n";
import { parseExplanation } from "../lib/explanation-parse";

/** Reason text with the English quotes (word groups before a Thai gloss) in bold. */
function ReasonText({ text }: { text: string }) {
  // bold every "english words (ไทย)" pair so the key phrases jump out
  const parts = text.split(/([A-Za-z][A-Za-z' -]*[A-Za-z]\s*\([^)]*\))/g);
  return (
    <Text style={styles.reason}>
      {parts.map((p, i) =>
        /^[A-Za-z]/.test(p) && p.includes("(") ? (
          <Text key={i} style={styles.reasonEn}>
            {p}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

/**
 * A conversation explanation laid out for reading: the keyword as a highlighted chip, then one
 * bullet per option (✓ for the answer, ✗ otherwise) showing the option itself and why.
 */
export function ExplanationView({
  explanation,
  options,
  correctIndex,
  picked,
}: {
  explanation: string;
  options: string[];
  correctIndex: number;
  /** The learner's (first) pick, to mark "your answer". */
  picked?: number | null;
}) {
  const { t } = useI18n();
  const parsed = parseExplanation(explanation);

  return (
    <View>
      {parsed.keyword ? (
        <View style={styles.keyRow}>
          <Text style={styles.keyLabel}>{t("คีย์เวิร์ด", "Keyword")}</Text>
          <Text style={styles.keyChip}>{parsed.keyword}</Text>
        </View>
      ) : null}

      {options.map((opt, i) => {
        const n = i + 1;
        const right = i === correctIndex;
        const reason = parsed.reasons.get(n);
        return (
          <View key={i} style={[styles.bullet, right ? styles.bulletRight : null]}>
            <Text style={[styles.icon, right ? styles.iconRight : styles.iconWrong]}>{right ? "✓" : "✗"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.option, right && styles.optionRight]}>
                {opt}
                {picked === i ? <Text style={styles.yours}>{t("  · คุณเลือก", "  · your pick")}</Text> : null}
              </Text>
              {reason ? <ReasonText text={reason} /> : null}
            </View>
          </View>
        );
      })}

      {parsed.rest ? <Text style={styles.rest}>{parsed.rest}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  keyRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  keyLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  keyChip: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
    backgroundColor: "#FFE88A",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  bullet: { flexDirection: "row", gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6, backgroundColor: "#fff" },
  bulletRight: { backgroundColor: "#ECFDF5" },
  icon: { fontSize: 16, fontWeight: "900", width: 18, textAlign: "center", marginTop: 1 },
  iconRight: { color: "#059669" },
  iconWrong: { color: "#DC2626" },
  option: { fontSize: 14, fontWeight: "800", color: "#111", lineHeight: 20 },
  optionRight: { color: "#047857" },
  yours: { fontSize: 12, fontWeight: "800", color: "#004AAD" },
  reason: { fontSize: 13, color: "#4B5563", lineHeight: 20, marginTop: 3 },
  reasonEn: { fontWeight: "800", color: "#111" },
  rest: { fontSize: 13, color: "#4B5563", lineHeight: 20, marginTop: 6 },
});
