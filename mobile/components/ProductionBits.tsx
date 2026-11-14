import { StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { useI18n } from "../lib/i18n";

/** Short exam rules as icon bullets (intro screens). */
export function RuleList({ rules }: { rules: { icon: string; text: string }[] }) {
  return (
    <View style={styles.rules}>
      {rules.map((r) => (
        <View key={r.text} style={styles.ruleRow}>
          <Text style={styles.ruleIcon}>{r.icon}</Text>
          <Text style={styles.ruleText}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Sentence starters shown before the timer starts. */
export function StarterChips({ title, starters }: { title: string; starters: string[] }) {
  return (
    <View style={styles.starters}>
      <Text style={styles.startersTitle}>{title}</Text>
      <View style={styles.chipWrap}>
        {starters.map((s) => (
          <Text key={s} style={styles.chip}>
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** "23 words · need 15+" — green once the minimum is met. */
export function WordCountLine({ count, min }: { count: number; min: number }) {
  const { t } = useI18n();
  const ok = count >= min;
  return (
    <Text style={[styles.wordCount, ok ? styles.wordOk : styles.wordShort]}>
      {t(`${count} คำ`, `${count} word${count === 1 ? "" : "s"}`)}
      {ok
        ? t(" ✓ ส่งตรวจได้", " ✓ ready to submit")
        : t(` · ต้องมีอย่างน้อย ${min} คำ (อีก ${min - count})`, ` · need ${min}+ (${min - count} more)`)}
    </Text>
  );
}

/** Shown when the exam timer hits zero; the answer box is locked behind it. */
export function TimeUpNotice({
  count,
  min,
  onKeepWriting,
}: {
  count: number;
  min: number;
  onKeepWriting: () => void;
}) {
  const { t } = useI18n();
  const enough = count >= min;
  return (
    <View style={styles.timeUp}>
      <Text style={styles.timeUpTitle}>{t("⏰ หมดเวลา!", "⏰ Time's up!")}</Text>
      <Text style={styles.timeUpText}>
        {enough
          ? t("ในข้อสอบจริงคำตอบจะถูกส่งตอนนี้ กดส่งตรวจได้เลย", "In the real test your answer is sent now — submit it below.")
          : t(
              `ยังไม่ถึง ${min} คำ จึงยังส่งตรวจไม่ได้ ลองเขียนต่อแบบไม่จับเวลา หรือเริ่มใหม่`,
              `Under ${min} words, so it can't be graded yet. Keep writing without the timer, or start over.`,
            )}
      </Text>
      {!enough ? (
        <LuxuryPressable style={[styles.keepBtn]} onPress={onKeepWriting}>
          <Text style={styles.keepBtnText}>{t("เขียนต่อ (ไม่จับเวลา)", "Keep writing (untimed)")}</Text>
        </LuxuryPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rules: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E6EF",
    padding: 12,
    gap: 8,
  },
  ruleRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  ruleIcon: { fontSize: 16, width: 22, textAlign: "center" },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 21, color: "#1F2937", fontWeight: "600" },
  starters: { marginTop: 14 },
  startersTitle: { fontSize: 13, fontWeight: "900", color: "#374151", marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    fontSize: 13,
    fontWeight: "700",
    color: "#004AAD",
    backgroundColor: "#E8F0FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  wordCount: { marginTop: 8, fontSize: 13, fontWeight: "800" },
  wordOk: { color: "#15803D" },
  wordShort: { color: "#B45309" },
  timeUp: {
    marginTop: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FCA5A5",
    padding: 12,
  },
  timeUpTitle: { fontSize: 16, fontWeight: "900", color: "#B91C1C" },
  timeUpText: { marginTop: 4, fontSize: 13, lineHeight: 20, color: "#7F1D1D" },
  keepBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keepBtnText: { fontSize: 13, fontWeight: "900", color: "#111" },
});
