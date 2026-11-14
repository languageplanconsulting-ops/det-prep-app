import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { LuxuryPressable } from "../LuxuryPressable";
import { useSpeechCapture, type CaptureError } from "../../hooks/useSpeechCapture";
import { useI18n } from "../../lib/i18n";
import { fmtClock } from "../../lib/mock-test";
import { AnswerBox, C, Note, countWords } from "./TaskUi";

export const SPEAK_MIN_WORDS = 15;

function PulseDot() {
  const v = useSharedValue(1);
  useEffect(() => {
    v.value = withRepeat(withTiming(0.3, { duration: 600 }), -1, true);
    return () => cancelAnimation(v);
  }, [v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[st.dot, style]} />;
}

export function captureErrorText(t: (th: string, en: string) => string, e: CaptureError): string | null {
  if (e === "mic") return t("ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน — พิมพ์คำตอบแทนได้", "Microphone permission denied — you can type your answer instead.");
  if (e === "start") return t("เริ่มอัดเสียงไม่ได้ — พิมพ์คำตอบแทนได้", "Could not start recording — type your answer instead.");
  if (e === "transcribe")
    return t("แปลงเสียงเป็นข้อความไม่สำเร็จ — อัดใหม่หรือพิมพ์คำตอบได้", "Could not turn your speech into text — record again or type it.");
  return null;
}

/**
 * Start / stop a spoken answer with an editable transcript underneath
 * (web mock's read-then-speak and speak-about-photo capture). Starting a new
 * recording replaces the transcript, like the website.
 */
export function SpeechCaptureBox({
  value,
  onChange,
  disabled,
  capture,
  minWords = SPEAK_MIN_WORDS,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  capture: ReturnType<typeof useSpeechCapture>;
  minWords?: number;
}) {
  const { t } = useI18n();
  const words = countWords(value);
  const err = captureErrorText(t, capture.error);

  return (
    <View style={st.wrap}>
      {capture.state === "recording" ? (
        <LuxuryPressable
          style={[st.btn, st.btnStop]}
          sound="submit"
          disabled={disabled}
          onPress={() => {
            void capture.stop().then((text) => onChange(text));
          }}
        >
          <View style={st.row}>
            <PulseDot />
            <Text style={st.btnText}>
              {t("■ หยุดอัดเสียง", "■ Stop recording")} · {fmtClock(capture.seconds)}
            </Text>
          </View>
        </LuxuryPressable>
      ) : (
        <LuxuryPressable
          style={[st.btn, st.btnStart]}
          sound="tap"
          disabled={disabled || capture.state === "transcribing"}
          onPress={() => {
            onChange("");
            void capture.start();
          }}
        >
          <Text style={[st.btnText, { color: C.yellow }]}>
            {capture.state === "transcribing"
              ? t("กำลังแปลงเสียงเป็นข้อความ…", "Turning speech into text…")
              : value.trim()
                ? t("🎙️ อัดเสียงใหม่", "🎙️ Record again")
                : t("🎙️ เริ่มพูด", "🎙️ Start speaking")}
          </Text>
        </LuxuryPressable>
      )}
      {err ? <Note tone="warn">{err}</Note> : null}
      <Text style={st.label}>
        {t("คำตอบของคุณ (แก้ได้ถ้าระบบได้ยินผิด)", "Your answer (fix anything misheard)")}
      </Text>
      <AnswerBox
        value={value}
        onChange={onChange}
        editable={!disabled && capture.state !== "recording"}
        minHeight={110}
        showWords={false}
        placeholder={t("ข้อความจากเสียงพูดจะแสดงตรงนี้", "Your spoken answer appears here")}
      />
      <Text style={[st.words, words < minWords ? { color: C.amber } : { color: C.green }]}>
        {t(`${words}/${minWords} คำขั้นต่ำ`, `${words}/${minWords} words minimum`)}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FCA5A5" },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", minHeight: 52, justifyContent: "center" },
  btnStart: { backgroundColor: C.blue },
  btnStop: { backgroundColor: C.red },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  label: { fontSize: 13, fontWeight: "800", color: C.ink, marginTop: 4 },
  words: { fontSize: 12, fontWeight: "800", textAlign: "right" },
});
