import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";

import { LuxuryPressable } from "./LuxuryPressable";
import { sfxReveal, sfxTap } from "../lib/exam-sfx-mobile";
import { useI18n } from "../lib/i18n";

const EXIT_MS = 220;

export type BlankHints = {
  meaning: string | null;
  context: string | null;
  grammar: string | null;
};

type HintKind = keyof BlankHints;

/** Context sentence with the 【 ? 】 marker drawn as a highlighted gap. */
function ContextText({ text }: { text: string }) {
  const [a, b] = text.split("【 ? 】");
  return (
    <Text style={styles.hintText}>
      {a}
      {b !== undefined ? <Text style={styles.contextGap}> ? </Text> : null}
      {b}
    </Text>
  );
}

/**
 * Bottom sheet for one vocabulary blank: the options as big buttons, and up to three hint
 * chips (Thai meaning / context / grammar). A hint opens inside the sheet's see-through box,
 * so the passage behind never moves. Slides up softly and back down before closing.
 */
export function AnswerSheet({
  blankNumber,
  total,
  options,
  hints,
  onPick,
  onHint,
  onClose,
}: {
  /** 1-based blank number; null = closed. */
  blankNumber: number | null;
  total: number;
  options: string[];
  hints: BlankHints;
  onPick: (option: string) => void;
  /** Called the first time a hint is opened for this blank. */
  onHint: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState<HintKind | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (blankNumber == null) return;
    setShown(true);
    setHint(null);
  }, [blankNumber]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const finish = (after: () => void) => {
    setShown(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(after, EXIT_MS);
  };

  const chips: { kind: HintKind; label: string }[] = [
    { kind: "meaning" as const, label: t("💡 ความหมาย", "💡 Meaning") },
    { kind: "context" as const, label: t("🔎 บริบท", "🔎 Context") },
    { kind: "grammar" as const, label: t("📐 ไวยากรณ์", "📐 Grammar") },
  ].filter((c) => hints[c.kind]);

  const openHint = (kind: HintKind) => {
    if (hint === kind) {
      setHint(null);
      sfxTap();
      return;
    }
    setHint(kind);
    sfxReveal();
    onHint();
  };

  return (
    <Modal visible={blankNumber !== null} transparent animationType="none" onRequestClose={() => finish(onClose)}>
      {shown ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(EXIT_MS)} style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => finish(onClose)}
            accessibilityRole="button"
            accessibilityLabel={t("ปิด", "Close")}
          />
        </Animated.View>
      ) : null}

      {shown ? (
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(180)}
          exiting={SlideOutDown.duration(EXIT_MS)}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {t(`ช่องที่ ${blankNumber} จาก ${total}`, `Blank ${blankNumber} of ${total}`)}
          </Text>

          {chips.length ? (
            <View style={styles.chipRow}>
              {chips.map((c) => (
                <LuxuryPressable
                  key={c.kind}
                  sound="none"
                  scaleTo={0.94}
                  style={[styles.chip, hint === c.kind && styles.chipOn]}
                  onPress={() => openHint(c.kind)}
                >
                  <Text style={[styles.chipText, hint === c.kind && styles.chipTextOn]}>{c.label}</Text>
                </LuxuryPressable>
              ))}
            </View>
          ) : null}

          {hint && hints[hint] ? (
            <Animated.View key={hint} entering={FadeInDown.duration(240)} style={styles.hintBox}>
              {hint === "context" ? <ContextText text={hints.context!} /> : <Text style={styles.hintText}>{hints[hint]}</Text>}
            </Animated.View>
          ) : null}

          <View style={styles.options}>
            {options.map((o, i) => (
              <Animated.View key={o} entering={FadeInDown.delay(60 + i * 40).duration(260)} style={styles.optionWrap}>
                <LuxuryPressable sound="none" scaleTo={0.95} style={styles.option} onPress={() => finish(() => onPick(o))}>
                  <Text style={styles.optionText}>{o}</Text>
                </LuxuryPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(17,24,39,0.28)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: "#111",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: "#D1D5DB", marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "900", color: "#004AAD", marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: "#FCD34D", backgroundColor: "#FFFBEB", paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#FFCC00", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "800", color: "#92400E" },
  chipTextOn: { color: "#111" },
  hintBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,74,173,0.25)",
    backgroundColor: "rgba(0,74,173,0.06)",
    padding: 12,
    marginBottom: 12,
  },
  hintText: { fontSize: 14, lineHeight: 21, color: "#1F2937" },
  contextGap: { backgroundColor: "#FFCC00", fontWeight: "900", color: "#111" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionWrap: { flexBasis: "48%", flexGrow: 1 },
  option: { borderWidth: 2, borderColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#fff" },
  optionText: { fontSize: 16, fontWeight: "800", color: "#111" },
});
