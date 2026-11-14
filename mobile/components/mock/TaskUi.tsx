import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from "react-native";

import { LuxuryPressable } from "../LuxuryPressable";
import { useI18n } from "../../lib/i18n";
import { fmtClock } from "../../lib/mock-test";

export const C = {
  blue: "#004AAD",
  yellow: "#FFCC00",
  ink: "#111827",
  sub: "#6B7280",
  line: "#E7EAF1",
  bg: "#F4F6FB",
  green: "#059669",
  red: "#DC2626",
  amber: "#D97706",
};

/** Instruction block shown at the top of a task (Thai/English per UI language). */
export function TaskInstruction({ th, en }: { th?: string; en?: string }) {
  const { t, lang } = useI18n();
  const main = t(th || en || "", en || th || "");
  const other = lang === "th" ? en : th;
  if (!main) return null;
  return (
    <View style={s.instruction}>
      <Text style={s.instructionMain}>{main}</Text>
      {other && other !== main ? <Text style={s.instructionSub}>{other}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
  tone = "blue",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "blue" | "yellow" | "ghost" | "red";
}) {
  return (
    <LuxuryPressable
      style={[
        s.btn,
        tone === "yellow" ? s.btnYellow : tone === "ghost" ? s.btnGhost : tone === "red" ? s.btnRed : s.btnBlue,
      ]}
      sound={tone === "ghost" ? "tap" : "submit"}
      disabled={disabled || busy}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator color={tone === "yellow" || tone === "ghost" ? C.blue : C.yellow} />
      ) : (
        <Text
          style={[
            s.btnText,
            tone === "yellow" ? s.btnTextDark : tone === "ghost" ? s.btnTextGhost : tone === "red" ? s.btnTextLight : null,
          ]}
        >
          {label}
        </Text>
      )}
    </LuxuryPressable>
  );
}

export function SubmitButton({
  onPress,
  disabled,
  busy,
  label,
}: {
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  return (
    <PrimaryButton
      label={busy ? t("กำลังส่ง…", "Sending…") : (label ?? t("ส่งคำตอบ", "Submit"))}
      onPress={onPress}
      disabled={disabled}
      busy={busy}
    />
  );
}

export function OptionButton({
  label,
  selected,
  onPress,
  disabled,
  state,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Reveal colouring after an answer is locked in. */
  state?: "correct" | "wrong" | null;
}) {
  return (
    <LuxuryPressable
      style={[
        s.option,
        selected ? s.optionSelected : null,
        state === "correct" ? s.optionCorrect : state === "wrong" ? s.optionWrong : null,
      ]}
      sound="tap"
      scaleTo={0.98}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[s.optionText, selected ? s.optionTextSelected : null]}>{label}</Text>
    </LuxuryPressable>
  );
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function AnswerBox({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  editable = true,
  showWords = true,
  minWords,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
  showWords?: boolean;
  minWords?: number;
}) {
  const { t } = useI18n();
  const words = countWords(value);
  return (
    <View>
      <TextInput
        style={[s.answerBox, { minHeight }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? t("พิมพ์คำตอบเป็นภาษาอังกฤษ…", "Type your answer in English…")}
        placeholderTextColor="#9CA3AF"
        multiline
        textAlignVertical="top"
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        editable={editable}
      />
      {showWords ? (
        <Text style={[s.wordCount, minWords && words < minWords ? { color: C.amber } : null]}>
          {t(`${words} คำ`, `${words} words`)}
          {minWords ? t(` · แนะนำอย่างน้อย ${minWords} คำ`, ` · aim for ${minWords}+`) : ""}
        </Text>
      ) : null}
    </View>
  );
}

/** Photo with a loading / failed state (exam photos are remote URLs). */
export function TaskPhoto({ uri, onReady }: { uri: string; onReady?: () => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => setState("loading"), [uri]);
  return (
    <View style={s.photoWrap}>
      {uri ? (
        <Image
          source={{ uri }}
          style={s.photo}
          resizeMode="cover"
          onLoad={() => {
            setState("ok");
            onReady?.();
          }}
          onError={() => {
            setState("error");
            onReady?.();
          }}
        />
      ) : null}
      {state === "loading" && uri ? (
        <View style={s.photoOverlay}>
          <ActivityIndicator color={C.blue} />
        </View>
      ) : null}
      {state === "error" || !uri ? (
        <View style={s.photoOverlay}>
          <Text style={s.photoErr}>{t("โหลดภาพไม่สำเร็จ", "Photo could not load")}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Small inline countdown for a phase inside a task (prep / speak). */
export function PhaseClock({ label, seconds, tone = "blue" }: { label: string; seconds: number; tone?: "blue" | "red" }) {
  return (
    <View style={[s.phaseClock, tone === "red" ? s.phaseClockRed : null]}>
      <Text style={[s.phaseClockLabel, tone === "red" ? { color: "#fff" } : null]}>{label}</Text>
      <Text style={[s.phaseClockTime, tone === "red" ? { color: "#fff" } : null]}>{fmtClock(seconds)}</Text>
    </View>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "error" }) {
  return (
    <View style={[s.note, tone === "warn" ? s.noteWarn : tone === "error" ? s.noteError : null]}>
      <Text style={[s.noteText, tone === "error" ? { color: "#991B1B" } : tone === "warn" ? { color: "#92400E" } : null]}>
        {children}
      </Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

export const taskStyles = StyleSheet.create({
  gap: { gap: 12 },
  passage: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
  },
  passageText: { fontSize: 16, lineHeight: 26, color: C.ink },
  question: { fontSize: 16, fontWeight: "800", color: C.ink, lineHeight: 23 },
  muted: { fontSize: 13, color: C.sub, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF1FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: "800", color: C.blue },
});

const s = StyleSheet.create({
  instruction: { gap: 2 },
  instructionMain: { fontSize: 14, fontWeight: "800", color: C.ink, lineHeight: 20 },
  instructionSub: { fontSize: 12, color: C.sub, lineHeight: 17 },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnBlue: { backgroundColor: C.blue },
  btnYellow: { backgroundColor: C.yellow, borderWidth: 2, borderColor: C.ink },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB" },
  btnRed: { backgroundColor: C.red },
  btnText: { color: C.yellow, fontSize: 16, fontWeight: "900" },
  btnTextDark: { color: C.ink },
  btnTextGhost: { color: "#374151", fontWeight: "800" },
  btnTextLight: { color: "#fff" },
  option: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: C.line,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  optionSelected: { borderColor: C.blue, backgroundColor: "#EAF1FF" },
  optionCorrect: { borderColor: "#10B981", backgroundColor: "#ECFDF5" },
  optionWrong: { borderColor: "#F87171", backgroundColor: "#FEF2F2" },
  optionText: { fontSize: 15, color: C.ink, fontWeight: "600", lineHeight: 21 },
  optionTextSelected: { color: C.blue, fontWeight: "800" },
  answerBox: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#D6DCE8",
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    lineHeight: 23,
    color: C.ink,
  },
  wordCount: { fontSize: 12, color: C.sub, marginTop: 6, textAlign: "right", fontWeight: "700" },
  photoWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  photo: { width: "100%", height: "100%" },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  photoErr: { fontSize: 13, color: C.sub, fontWeight: "700" },
  phaseClock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EAF1FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  phaseClockRed: { backgroundColor: C.red },
  phaseClockLabel: { fontSize: 13, fontWeight: "800", color: C.blue },
  phaseClockTime: { fontSize: 18, fontWeight: "900", color: C.blue, fontVariant: ["tabular-nums"] },
  note: { backgroundColor: "#EFF6FF", borderRadius: 12, padding: 12 },
  noteWarn: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D" },
  noteError: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5" },
  noteText: { fontSize: 13, lineHeight: 19, color: "#1E3A8A", fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: C.blue, letterSpacing: 1 },
});
