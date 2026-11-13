import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn } from "react-native-reanimated";

import { LuxuryPressable } from "./LuxuryPressable";
import { sfxCorrect, sfxReveal } from "../lib/exam-sfx-mobile";
import { useI18n } from "../lib/i18n";
import type { HighlightVocab } from "../lib/vocab-match";

const mascot = require("../assets/mascot-doy.png");

const EXIT_MS = 220;

/** Example sentence with the vocabulary word bolded wherever it appears. */
function ExampleText({ example, word }: { example: string; word: string }) {
  const needle = word.trim().toLowerCase();
  const lower = example.toLowerCase();
  const at = needle ? lower.indexOf(needle) : -1;
  if (at < 0) return <Text style={styles.example}>“{example}”</Text>;
  return (
    <Text style={styles.example}>
      “{example.slice(0, at)}
      <Text style={styles.exampleWord}>{example.slice(at, at + needle.length)}</Text>
      {example.slice(at + needle.length)}”
    </Text>
  );
}

/**
 * Bottom-sheet word card for a tapped passage highlight: Thai meaning first,
 * English meaning, an example, and "save to notebook". Slides up softly and
 * slides back down before closing.
 */
export function WordCard({
  phrase,
  vocab,
  saved,
  onSave,
  onClose,
}: {
  /** The tapped text; null = closed. */
  phrase: string | null;
  vocab: HighlightVocab | null;
  saved: boolean;
  onSave: (vocab: HighlightVocab) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!phrase) return;
    setShown(true);
    setError(null);
    sfxReveal();
  }, [phrase]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // Let the slide-down play before the modal goes away.
  const close = () => {
    setShown(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, EXIT_MS);
  };

  const save = async () => {
    if (!vocab || saved || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(vocab);
      sfxCorrect();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("บันทึกไม่สำเร็จ ลองอีกครั้งนะ", "Couldn't save — try again"),
      );
    } finally {
      setBusy(false);
    }
  };

  const title = vocab?.word ?? phrase ?? "";

  return (
    <Modal visible={phrase !== null} transparent animationType="none" onRequestClose={close}>
      {shown ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(EXIT_MS)}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t("ปิด", "Close")}
          />
        </Animated.View>
      ) : null}

      {shown ? (
        <Animated.View
          entering={SlideInDown.springify().damping(17).stiffness(170)}
          exiting={SlideOutDown.duration(EXIT_MS)}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <View style={styles.coachRow}>
            <Image source={mascot} style={styles.mascot} resizeMode="contain" />
            <View style={styles.coachBubble}>
              <Text style={styles.coachText}>
                {vocab
                  ? t("คำนี้น่าจำนะ! 👀", "Worth remembering! 👀")
                  : t("คำนี้ยังไม่มีคำแปลในชุดนี้", "No meaning listed for this one yet")}
              </Text>
            </View>
          </View>

          <Text style={styles.word}>{title}</Text>

          {vocab ? (
            <>
              <Text style={styles.meaningTh}>{vocab.meaningTh}</Text>
              <Text style={styles.meaningEn}>{vocab.meaningEn}</Text>
              {vocab.example ? (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>{t("ตัวอย่างประโยค", "Example")}</Text>
                  <ExampleText example={vocab.example} word={vocab.word} />
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {saved ? (
                <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.btn, styles.btnSaved]}>
                  <Text style={styles.btnSavedText}>{t("บันทึกแล้ว ✓", "Saved ✓")}</Text>
                </Animated.View>
              ) : (
                <LuxuryPressable
                  style={[styles.btn, styles.btnSave, busy && styles.btnBusy]}
                  sound="none"
                  disabled={busy}
                  onPress={() => void save()}
                >
                  <Text style={styles.btnSaveText}>
                    {busy ? t("กำลังบันทึก…", "Saving…") : t("บันทึกลงสมุดจด 📒", "Save to notebook 📒")}
                  </Text>
                </LuxuryPressable>
              )}
            </>
          ) : null}

          <LuxuryPressable style={[styles.btn, styles.btnClose]} sound="tap" onPress={close}>
            <Text style={styles.btnCloseText}>{t("ปิด", "Close")}</Text>
          </LuxuryPressable>
        </Animated.View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: "#111",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  mascot: { width: 52, height: 52 },
  coachBubble: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coachText: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },
  word: { fontSize: 26, fontWeight: "900", color: "#004AAD" },
  meaningTh: { marginTop: 6, fontSize: 20, fontWeight: "800", color: "#111" },
  meaningEn: { marginTop: 4, fontSize: 14, color: "#6B7280", lineHeight: 20 },
  exampleBox: {
    marginTop: 14,
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 4,
    borderLeftColor: "#FFCC00",
    borderRadius: 10,
    padding: 12,
  },
  exampleLabel: { fontSize: 11, fontWeight: "800", color: "#92400E", marginBottom: 4 },
  example: { fontSize: 14, lineHeight: 21, color: "#374151", fontStyle: "italic" },
  exampleWord: { fontWeight: "900", color: "#004AAD", fontStyle: "normal" },
  error: { marginTop: 10, color: "#b91c1c", fontWeight: "700" },
  btn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#111",
  },
  btnSave: { backgroundColor: "#FFCC00" },
  btnBusy: { opacity: 0.7 },
  btnSaveText: { color: "#111", fontWeight: "900", fontSize: 16 },
  btnSaved: { backgroundColor: "#DCFCE7", borderColor: "#15803D" },
  btnSavedText: { color: "#15803D", fontWeight: "900", fontSize: 16 },
  btnClose: { marginTop: 10, backgroundColor: "#fff", borderWidth: 2, paddingVertical: 12 },
  btnCloseText: { color: "#111", fontWeight: "800" },
});
