import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { splitStars } from "../lib/vocab-match";

/**
 * Passage paragraph where `**word**` marks become tappable highlights
 * (instead of showing raw asterisks). Saved words turn green with a ✓.
 */
export function RichPassageText({
  text,
  style,
  savedWords,
  onPressWord,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Lowercased phrases already saved to the notebook. */
  savedWords?: Set<string>;
  onPressWord: (phrase: string) => void;
}) {
  const segments = splitStars(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        if (!seg.highlight) return <Text key={i}>{seg.text}</Text>;
        const saved = savedWords?.has(seg.text.trim().toLowerCase()) ?? false;
        return (
          <Text
            key={i}
            onPress={() => onPressWord(seg.text)}
            suppressHighlighting
            accessibilityRole="button"
            accessibilityHint="Show meaning"
            style={[styles.mark, saved && styles.markSaved]}
          >
            {seg.text}
            {saved ? " ✓" : ""}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    backgroundColor: "#FFF3B0",
    color: "#004AAD",
    fontWeight: "800",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: "#004AAD",
  },
  markSaved: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    textDecorationColor: "#15803D",
  },
});
