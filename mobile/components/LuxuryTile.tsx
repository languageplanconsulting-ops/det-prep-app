import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";

export function LuxuryTile({
  title,
  subtitle,
  disabled,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <LuxuryPressable
      style={[styles.tile, disabled && styles.tileDisabled]}
      disabled={disabled}
      sound="none"
      scaleTo={0.97}
      onPress={onPress}
    >
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={styles.chev}>›</Text>}
    </LuxuryPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 16,
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
  },
  tileDisabled: { opacity: 0.45 },
  body: { flex: 1 },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { marginTop: 6, fontSize: 12, color: "#6B7280", fontWeight: "700" },
  chev: { fontSize: 22, color: "#C4CBD8" },
});
