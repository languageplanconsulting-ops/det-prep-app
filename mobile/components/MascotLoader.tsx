import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useI18n } from "../lib/i18n";

const mascot = require("../assets/mascot-doy.png");

/** Lines shown while AI grading runs — same voice as the website's grading loader. */
const GRADING_MESSAGES: { th: string; en: string }[] = [
  { th: "กำลังวิเคราะห์คำตอบของคุณ…", en: "Analyzing your response…" },
  { th: "กำลังตรวจว่าตอบตรงโจทย์ไหม…", en: "Checking task relevance…" },
  { th: "กำลังประเมินไวยากรณ์…", en: "Evaluating grammar…" },
  { th: "กำลังดูความลื่นไหลของคำตอบ…", en: "Analyzing response flow…" },
  { th: "กำลังตรวจการใช้คำศัพท์…", en: "Reviewing vocabulary use…" },
  { th: "กำลังสรุปจุดแข็งและจุดที่ควรพัฒนา…", en: "Summarizing strengths and next steps…" },
];

const MSG_INTERVAL_MS = 2600;

/** Eased fake progress for grading: fast at first, slows near 95% until the result lands. */
function easeProgress(elapsedSec: number): number {
  return Math.min(95, 95 * (1 - Math.exp(-elapsedSec / 16)));
}

function BouncingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 260, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(y);
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/**
 * Friendly loading state: พี่ดอย bobbing with a soft shadow, a label and
 * bouncing dots — replaces bare spinners so waits feel alive, not frozen.
 * `grading` adds rotating "what the AI is checking" lines and a progress bar.
 */
export function MascotLoader({
  label,
  grading = false,
  size = 96,
}: {
  label?: string;
  grading?: boolean;
  size?: number;
}) {
  const { t } = useI18n();
  const bob = useSharedValue(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 520, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
    );
    return () => cancelAnimation(bob);
  }, [bob]);

  useEffect(() => {
    if (!grading) return;
    const started = Date.now();
    const msgTimer = setInterval(
      () => setMsgIndex((i) => (i + 1) % GRADING_MESSAGES.length),
      MSG_INTERVAL_MS,
    );
    const progressTimer = setInterval(
      () => setProgress(Math.floor(easeProgress((Date.now() - started) / 1000))),
      150,
    );
    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
    };
  }, [grading]);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -12 * bob.value },
      { rotate: `${(bob.value - 0.5) * 6}deg` },
      { scaleY: 1 - 0.04 * (1 - bob.value) },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 - 0.08 * bob.value,
    transform: [{ scaleX: 1 - 0.25 * bob.value }],
  }));

  const msg = GRADING_MESSAGES[msgIndex]!;
  const text = label ?? (grading ? t("กำลังตรวจ…", "Grading…") : t("กำลังโหลด…", "Loading…"));

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={text}
    >
      <Animated.View style={mascotStyle}>
        <Image
          source={mascot}
          style={{ width: size, height: size }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
      <Animated.View style={[styles.shadow, { width: size * 0.55 }, shadowStyle]} />

      <View style={styles.labelRow}>
        <Text style={styles.label}>{text}</Text>
        <View style={styles.dots}>
          <BouncingDot delay={0} />
          <BouncingDot delay={140} />
          <BouncingDot delay={280} />
        </View>
      </View>

      {grading ? (
        <>
          <Animated.Text
            key={msgIndex}
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(200)}
            style={styles.message}
          >
            {t(msg.th, msg.en)}
          </Animated.Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.percent}>{progress}%</Text>
        </>
      ) : null}
    </Animated.View>
  );
}

/** Full-screen centered loader for screens that are still fetching content. */
export function ScreenLoader(props: { label?: string; grading?: boolean }) {
  return (
    <View style={styles.screen}>
      <MascotLoader {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F6FB",
  },
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 12, maxWidth: 320 },
  shadow: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#111",
    marginTop: 4,
  },
  labelRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 14 },
  label: { fontSize: 15, fontWeight: "800", color: "#004AAD" },
  dots: { flexDirection: "row", gap: 4, marginLeft: 6, marginBottom: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#004AAD" },
  message: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    minHeight: 36,
  },
  track: {
    marginTop: 8,
    width: 220,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E7EAF1",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: "#FFCC00" },
  percent: { marginTop: 6, fontSize: 12, fontWeight: "800", color: "#6B7280" },
});
