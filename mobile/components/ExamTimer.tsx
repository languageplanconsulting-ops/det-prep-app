import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { formatClock } from "../lib/production-constants";

/** Exam-style countdown: label, m:ss clock and a draining bar that turns red near the end. */
export function ExamTimer({
  left,
  total,
  label,
  urgentAt = 10,
}: {
  left: number;
  total: number;
  label: string;
  urgentAt?: number;
}) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left <= urgentAt;
  const width = useSharedValue(ratio);

  useEffect(() => {
    width.value = withTiming(ratio, { duration: 900, easing: Easing.linear });
  }, [ratio, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={styles.wrap} accessibilityRole="timer" accessibilityLabel={`${label} ${formatClock(left)}`}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.clock, urgent ? styles.clockUrgent : null]}>{formatClock(left)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, urgent ? styles.fillUrgent : null, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "800", color: "#374151", flexShrink: 1 },
  clock: { fontSize: 22, fontWeight: "900", color: "#004AAD", fontVariant: ["tabular-nums"] },
  clockUrgent: { color: "#DC2626" },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: "#004AAD" },
  fillUrgent: { backgroundColor: "#DC2626" },
});
