import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../LuxuryPressable";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { useTaskAudio } from "../../../hooks/useTaskAudio";
import { useI18n } from "../../../lib/i18n";
import { AnswerBox, C, Note, SubmitButton, TaskInstruction, taskStyles } from "../TaskUi";
import { str, type TaskProps } from "./types";

const MAX_PLAYS = 3;

/** Listen (max 3 plays) and type the sentence. The step clock starts after the first listen. */
export function DictationTask({ content, submitting, timeUp, onSubmit, onReady, variant }: TaskProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const notified = useRef(false);
  const [clockStarted, setClockStarted] = useState(false);
  const notifyReady = () => {
    if (notified.current) return;
    notified.current = true;
    setClockStarted(true);
    onReady?.();
  };
  const reference = str(content.reference_sentence).trim();
  const audio = useTaskAudio({
    url: str(content.audio_url).trim() || undefined,
    text: reference || undefined,
    maxPlays: MAX_PLAYS,
    onFinished: notifyReady,
  });

  useTimeUp(timeUp, () => onSubmit(text));

  // No audio at all → don't hold the clock.
  useEffect(() => {
    if (audio.state === "error") notifyReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.state]);

  if (!reference && !str(content.audio_url).trim()) {
    return <Note tone="error">{t("ข้อนี้ไม่มีเสียง", "This dictation has no audio.")}</Note>;
  }

  const exhausted = audio.playsLeft <= 0;

  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.instruction_th) || "ฟังประโยค แล้วพิมพ์ตามที่ได้ยินให้ครบ"}
        en={str(content.instruction) || "Type the statement that you hear."}
      />
      <LuxuryPressable
        style={[st.play, exhausted || audio.state !== "ready" ? st.playOff : null]}
        sound="none"
        disabled={submitting || exhausted || audio.state !== "ready" || audio.playing}
        onPress={() => void audio.play()}
      >
        {audio.state === "loading" ? (
          <View style={taskStyles.row}>
            <ActivityIndicator color={C.yellow} />
            <Text style={st.playText}>{t("กำลังเตรียมเสียง…", "Preparing audio…")}</Text>
          </View>
        ) : (
          <Text style={st.playText}>
            {audio.playing
              ? t("🔊 กำลังเล่น…", "🔊 Playing…")
              : exhausted
                ? t(`🔒 ฟังครบ ${MAX_PLAYS} ครั้งแล้ว`, `🔒 All ${MAX_PLAYS} plays used`)
                : t(`🔊 เล่นเสียง (เหลือ ${audio.playsLeft} ครั้ง)`, `🔊 Play audio (${audio.playsLeft} left)`)}
          </Text>
        )}
      </LuxuryPressable>
      {audio.state === "error" ? (
        <Note tone="warn">{t("เล่นเสียงไม่ได้ในตอนนี้ — ลองพิมพ์เท่าที่ทำได้", "Audio is unavailable right now — type what you can.")}</Note>
      ) : null}
      {!clockStarted && audio.state === "ready" && audio.plays > 0 && !audio.playing ? (
        <LuxuryPressable style={st.link} sound="tap" onPress={notifyReady}>
          <Text style={st.linkText}>{t("ฟังจบแล้ว เริ่มจับเวลา", "I've finished listening — start the timer")}</Text>
        </LuxuryPressable>
      ) : null}
      <AnswerBox value={text} onChange={setText} editable={!submitting} minHeight={110} />
      <SubmitButton
        busy={submitting}
        disabled={variant === "mini" && !text.trim()}
        onPress={() => onSubmit(text)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  play: {
    backgroundColor: C.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  playOff: { backgroundColor: "#6B7280" },
  playText: { color: C.yellow, fontWeight: "900", fontSize: 16 },
  link: { alignSelf: "center", paddingVertical: 4 },
  linkText: { color: C.blue, fontWeight: "800", fontSize: 13, textDecorationLine: "underline" },
});
