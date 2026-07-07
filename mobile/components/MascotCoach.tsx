import { Image, StyleSheet, Text, View } from "react-native";

const mascot = require("../assets/mascot-doy.png");

type Props = {
  text: string;
  sub?: string;
  size?: "md" | "lg";
};

/** พี่ดอย coaching bubble — shown before each lesson step. */
export function MascotCoach({ text, sub, size = "md" }: Props) {
  const avatarSize = size === "lg" ? 64 : 48;
  return (
    <View style={styles.row}>
      <Image
        source={mascot}
        style={{ width: avatarSize, height: avatarSize }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  bubble: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 20,
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
});
