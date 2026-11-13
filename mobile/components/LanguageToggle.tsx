import { StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "./LuxuryPressable";
import { useI18n, type Lang } from "../lib/i18n";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "th", label: "ไทย" },
  { lang: "en", label: "EN" },
];

/** Small TH | EN switch. `onDark` for use in the blue header bar. */
export function LanguageToggle({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <View
      style={[styles.wrap, onDark && styles.wrapDark]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Language / ภาษา"
    >
      {OPTIONS.map((o) => {
        const active = o.lang === lang;
        return (
          <LuxuryPressable
            key={o.lang}
            style={[styles.opt, active && (onDark ? styles.optActiveDark : styles.optActive)]}
            sound="tap"
            scaleTo={0.92}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => setLang(o.lang)}
          >
            <Text
              style={[
                styles.label,
                onDark && styles.labelDark,
                active && (onDark ? styles.labelActiveDark : styles.labelActive),
              ]}
            >
              {o.label}
            </Text>
          </LuxuryPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 999,
    padding: 2,
    backgroundColor: "#fff",
  },
  wrapDark: { borderColor: "#FFCC00", backgroundColor: "transparent", marginRight: 12 },
  opt: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  optActive: { backgroundColor: "#004AAD" },
  optActiveDark: { backgroundColor: "#FFCC00" },
  label: { fontWeight: "800", fontSize: 13, color: "#111" },
  labelDark: { color: "#FFCC00" },
  labelActive: { color: "#FFCC00" },
  labelActiveDark: { color: "#004AAD" },
});
