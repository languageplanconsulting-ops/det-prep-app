import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { LuxuryPressable } from "./LuxuryPressable";
import { sfxCorrect, sfxWrong } from "../lib/exam-sfx-mobile";
import { parseExplanation } from "../lib/explanation-parse";
import { useI18n } from "../lib/i18n";

/**
 * Multiple choice that teaches: a wrong pick is marked ✗ straight away with a hint (why that
 * option is wrong + the keyword), and the learner keeps trying until they find the answer.
 * Only the FIRST pick is reported for scoring.
 */
export function ChoiceQuestion({
  options,
  correctIndex,
  explanation,
  onDone,
  nextLabel,
}: {
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Called after the learner found the answer and tapped next: (first pick, wrong tries). */
  onDone: (firstPick: number, wrongTries: number) => void;
  nextLabel: string;
}) {
  const { t } = useI18n();
  const [first, setFirst] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [lastWrong, setLastWrong] = useState<number | null>(null);
  const parsed = parseExplanation(explanation);

  // a new question resets everything
  useEffect(() => {
    setFirst(null);
    setWrong([]);
    setSolved(false);
    setLastWrong(null);
  }, [options, correctIndex]);

  const pick = (i: number) => {
    if (solved || wrong.includes(i)) return;
    if (first === null) setFirst(i);
    if (i === correctIndex) {
      sfxCorrect();
      setSolved(true);
      setLastWrong(null);
    } else {
      sfxWrong();
      setWrong((w) => [...w, i]);
      setLastWrong(i);
    }
  };

  const wrongReason = lastWrong != null ? parsed.reasons.get(lastWrong + 1) : null;
  const rightReason = parsed.reasons.get(correctIndex + 1);

  return (
    <View>
      {options.map((opt, i) => {
        const isWrong = wrong.includes(i);
        const isRight = solved && i === correctIndex;
        return (
          <LuxuryPressable
            key={i}
            sound="none"
            scaleTo={0.98}
            disabled={solved || isWrong}
            style={[styles.option, isWrong && styles.optionWrong, isRight && styles.optionRight]}
            onPress={() => pick(i)}
          >
            <Text style={[styles.optionText, isWrong && styles.optionTextWrong, isRight && styles.optionTextRight]}>
              {isWrong ? "✗  " : isRight ? "✓  " : ""}
              {opt}
            </Text>
          </LuxuryPressable>
        );
      })}

      {!solved && lastWrong != null ? (
        <Animated.View key={`w${lastWrong}`} entering={FadeInDown.duration(260)} style={styles.feedbackWrong}>
          <Text style={styles.feedbackTitleWrong}>{t("✗ ยังไม่ใช่ — ลองอีกครั้งนะ", "✗ Not quite — try again")}</Text>
          {wrongReason ? <Text style={styles.feedbackText}>{wrongReason}</Text> : null}
          {parsed.keyword ? (
            <Text style={styles.feedbackHint}>
              {t("💡 คำใบ้: ฟังคำว่า ", "💡 Hint: listen for ")}
              <Text style={styles.keyword}>{parsed.keyword}</Text>
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {solved ? (
        <Animated.View entering={ZoomIn.duration(320)} style={styles.feedbackRight}>
          <Text style={styles.feedbackTitleRight}>
            {first === correctIndex ? t("✓ ถูกต้อง! เก่งมาก 🎉", "✓ Correct! 🎉") : t("✓ ถูกแล้ว!", "✓ That's it!")}
          </Text>
          {rightReason ? <Text style={styles.feedbackText}>{rightReason}</Text> : null}
          <LuxuryPressable style={styles.next} sound="submit" onPress={() => onDone(first ?? correctIndex, wrong.length)}>
            <Text style={styles.nextText}>{nextLabel}</Text>
          </LuxuryPressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 2, borderColor: "#111", borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: "#fff" },
  optionWrong: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  optionRight: { borderColor: "#059669", backgroundColor: "#ECFDF5" },
  optionText: { fontSize: 15, color: "#111", lineHeight: 21 },
  optionTextWrong: { color: "#B91C1C", textDecorationLine: "line-through" },
  optionTextRight: { color: "#047857", fontWeight: "800" },
  feedbackWrong: { borderRadius: 14, padding: 12, marginTop: 4, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74" },
  feedbackTitleWrong: { fontSize: 14, fontWeight: "900", color: "#C2410C", marginBottom: 4 },
  feedbackRight: { borderRadius: 14, padding: 12, marginTop: 4, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#6EE7B7" },
  feedbackTitleRight: { fontSize: 15, fontWeight: "900", color: "#047857", marginBottom: 4 },
  feedbackText: { fontSize: 13, lineHeight: 20, color: "#374151" },
  feedbackHint: { fontSize: 13, lineHeight: 20, color: "#374151", marginTop: 6 },
  keyword: { fontWeight: "900", color: "#111", backgroundColor: "#FFE88A" },
  next: { marginTop: 10, backgroundColor: "#004AAD", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  nextText: { color: "#FFCC00", fontWeight: "900", fontSize: 15 },
});
