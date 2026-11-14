import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { LuxuryPressable } from "./LuxuryPressable";
import { useI18n } from "../lib/i18n";
import { useSpeech } from "../lib/speech";

/**
 * Listening prompt: a big speaker button that plays the line (tap again to repeat) and the
 * text hidden behind "show text", like the real test where you listen before you read.
 */
export function ListenCard({
  text,
  audioUri,
  label,
  autoPlay = true,
  revealable = true,
}: {
  /** What is spoken (also the transcript shown on reveal). */
  text: string;
  audioUri?: string | null;
  label: string;
  autoPlay?: boolean;
  /** false = no "show text" button (the text is shown elsewhere). */
  revealable?: boolean;
}) {
  const { t } = useI18n();
  const { play, playing, loading, error } = useSpeech();
  const [revealed, setRevealed] = useState(false);
  const [plays, setPlays] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    setRevealed(false);
    setPlays(0);
    if (autoPlay) {
      setPlays(1);
      void play(text, audioUri);
    }
    // a new line (next question) replays from scratch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (playing) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0, { duration: 520 })), -1);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 160 });
    }
  }, [playing, pulse]);

  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.12 * pulse.value }], opacity: 0.25 + 0.35 * pulse.value }));

  const onPlay = () => {
    setPlays((n) => n + 1);
    void play(text, audioUri);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.btnWrap}>
          <Animated.View style={[styles.ring, ring]} />
          <LuxuryPressable style={styles.playBtn} sound="none" scaleTo={0.92} onPress={onPlay} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFCC00" /> : <Text style={styles.playIcon}>{plays > 0 ? "↻" : "▶"}</Text>}
          </LuxuryPressable>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.status}>
            {loading
              ? t("กำลังเตรียมเสียง…", "Preparing audio…")
              : playing
                ? t("กำลังเล่น…", "Playing…")
                : plays > 0
                  ? t("แตะเพื่อฟังอีกครั้ง", "Tap to listen again")
                  : t("แตะเพื่อฟัง", "Tap to listen")}
          </Text>
          {error ? <Text style={styles.error}>{t("เล่นเสียงไม่ได้ ลองอีกครั้ง", "Couldn't play — try again")}</Text> : null}
        </View>
        {revealable ? (
          <LuxuryPressable style={[styles.reveal, revealed && styles.revealOn]} sound="tap" onPress={() => setRevealed((r) => !r)}>
            <Text style={[styles.revealText, revealed && styles.revealTextOn]}>
              {revealed ? t("ซ่อนข้อความ", "Hide text") : t("👁 ดูข้อความ", "👁 Show text")}
            </Text>
          </LuxuryPressable>
        ) : null}
      </View>
      {revealable && revealed ? (
        <Animated.View entering={FadeIn.duration(240)} style={styles.textBox}>
          <Text style={styles.text}>{text}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: "#111", borderRadius: 16, padding: 14, backgroundColor: "#F8FAFF", marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  btnWrap: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "#004AAD" },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#004AAD", alignItems: "center", justifyContent: "center" },
  playIcon: { color: "#FFCC00", fontSize: 22, fontWeight: "900" },
  status: { fontSize: 14, fontWeight: "800", color: "#111" },
  error: { fontSize: 12, color: "#B91C1C", marginTop: 2 },
  reveal: { borderRadius: 999, borderWidth: 2, borderColor: "#004AAD", paddingHorizontal: 10, paddingVertical: 6 },
  revealOn: { backgroundColor: "#004AAD" },
  revealText: { fontSize: 12, fontWeight: "800", color: "#004AAD" },
  revealTextOn: { color: "#FFCC00" },
  textBox: { marginTop: 12, borderRadius: 12, backgroundColor: "rgba(0,74,173,0.06)", padding: 12 },
  text: { fontSize: 15, lineHeight: 23, color: "#111" },
});
