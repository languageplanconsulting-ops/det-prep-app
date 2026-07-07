import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { fitbPrefix } from "../lib/campus-fitb";

type Props = {
  index: number;
  promptEn: string;
  correctWord: string;
  prefixLength: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Prefix-hint letter boxes for campus listening FITB. */
export function PrefixLetterInput({
  index,
  promptEn,
  correctWord,
  prefixLength,
  value,
  onChange,
  disabled = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  const { prefix, remainingLength } = fitbPrefix(correctWord, prefixLength);
  const typed = value.slice(0, remainingLength);

  return (
    <View style={styles.card}>
      <Text style={styles.prompt}>
        {index + 1}. {promptEn}
      </Text>
      <View style={styles.tiles}>
        {prefix.split("").map((ch, k) => (
          <View key={`p${k}`} style={styles.prefixTile}>
            <Text style={styles.prefixText}>{ch}</Text>
          </View>
        ))}
        <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
          <TextInput
            style={styles.hiddenInput}
            editable={!disabled}
            value={typed}
            maxLength={remainingLength}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={(t) => onChange(t.slice(0, remainingLength))}
            accessibilityLabel={`Blank ${index + 1}`}
          />
          {Array.from({ length: remainingLength }, (_, k) => {
            const ch = typed[k];
            const isCursor =
              focused && k === Math.min(typed.length, remainingLength - 1) && !ch;
            return (
              <View
                key={`s${k}`}
                style={[
                  styles.slot,
                  ch ? styles.slotFilled : isCursor ? styles.slotCursor : styles.slotEmpty,
                ]}
              >
                <Text style={[styles.slotText, ch ? styles.slotTextFilled : null]}>
                  {ch ?? "_"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  prompt: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    lineHeight: 22,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  prefixTile: {
    minWidth: 34,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  prefixText: {
    fontFamily: "Menlo",
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    padding: 2,
  },
  inputWrapFocused: {
    borderWidth: 2,
    borderColor: "rgba(0, 74, 173, 0.55)",
  },
  hiddenInput: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  slot: {
    minWidth: 34,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
  },
  slotEmpty: {
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
  },
  slotFilled: {
    borderColor: "#004AAD",
    backgroundColor: "#FFFFFF",
  },
  slotCursor: {
    borderColor: "#004AAD",
    backgroundColor: "#EFF6FF",
  },
  slotText: {
    fontFamily: "Menlo",
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
  },
  slotTextFilled: {
    color: "#0F172A",
  },
});
