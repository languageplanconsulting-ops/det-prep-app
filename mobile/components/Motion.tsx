import { useEffect, useState, type ReactNode } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

/**
 * Soft cascade for list rows / report blocks: each item fades and rises in a
 * little after the one before (capped so long lists don't drag).
 */
export function FadeInItem({
  index = 0,
  step = 45,
  maxDelay = 420,
  style,
  children,
}: {
  index?: number;
  step?: number;
  maxDelay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(380)
        .delay(Math.min(index * step, maxDelay))
        .springify()
        .damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Counts a number up from 0 with an ease-out curve (for score reveals). */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/** Score text that pops in and counts up to its final value. */
export function AnimatedScore({
  value,
  max,
  format,
  style,
}: {
  value: number;
  max: number;
  /** Builds the label, e.g. (n, max) => t(`คะแนน: ${n}/${max}`, …). */
  format: (shown: number, max: number) => string;
  style?: StyleProp<TextStyle>;
}) {
  const shown = useCountUp(value);
  return (
    <Animated.View entering={ZoomIn.duration(420).springify().damping(14)}>
      <Text style={style}>{format(shown, max)}</Text>
    </Animated.View>
  );
}

const great = require("../assets/mascot-great.png");
const suggest = require("../assets/mascot-suggest.png");

/**
 * Result mascot for report screens — thumbs-up พี่ดอย for strong scores,
 * the "let's review" pose otherwise. Same art as the website's CelebrateMascot.
 */
export function ResultMascot({ ratio, message }: { ratio: number; message: string }) {
  const good = ratio >= 0.75;
  return (
    <Animated.View entering={ZoomIn.delay(120).duration(460).springify().damping(12)} style={styles.mascotRow}>
      <Image
        source={good ? great : suggest}
        style={styles.mascot}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={[styles.bubble, good ? styles.bubbleGood : styles.bubbleTry]}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mascotRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  mascot: { width: 72, height: 72 },
  bubble: { flex: 1, borderRadius: 14, borderWidth: 2, padding: 12 },
  bubbleGood: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  bubbleTry: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  bubbleText: { fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
});
