import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useSpeechCapture } from "../../../hooks/useSpeechCapture";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { useI18n } from "../../../lib/i18n";
import { SPEAK_MIN_WORDS, SpeechCaptureBox } from "../SpeakRecorder";
import { AnswerBox, C, SubmitButton, TaskInstruction, TaskPhoto, countWords, taskStyles } from "../TaskUi";
import { firstStr, str, type TaskProps } from "./types";

const photoUrl = (c: Record<string, unknown>) =>
  firstStr(c.image_url, c.imageUrl, c.photo_url, c.photoUrl, c.img_url, c.imgUrl);

/** Write about the photo — free text, sent as { text }. */
export function WritePhotoTask({ content, submitting, timeUp, onSubmit, variant }: TaskProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  useTimeUp(timeUp, () => onSubmit({ text }));
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={str(content.instruction_th) || "เขียนบรรยายภาพนี้อย่างน้อย 1 ประโยค"}
        en={str(content.instruction) || "Write one or more sentences that describe the image."}
      />
      <TaskPhoto uri={photoUrl(content)} />
      <AnswerBox
        value={text}
        onChange={setText}
        editable={!submitting}
        minHeight={150}
        minWords={variant === "mini" ? 20 : undefined}
      />
      <SubmitButton
        busy={submitting}
        disabled={variant === "mini" && !text.trim()}
        onPress={() => onSubmit({ text })}
      />
    </View>
  );
}

/** Speak about the photo — record, transcribe, at least 15 words. Clock starts once the photo shows. */
export function SpeakPhotoTask({ content, submitting, timeUp, onSubmit, onReady }: TaskProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const capture = useSpeechCapture();
  const readyFired = useRef(false);
  useTimeUp(timeUp, () => {
    capture.cancel();
    onSubmit({ text: text.trim() });
  });
  const photoType = firstStr(content.photo_type, content.photoType);
  const ok = countWords(text) >= SPEAK_MIN_WORDS && capture.state === "idle";
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={firstStr(content.prompt_th, content.instruction_th) || "พูดบรรยายภาพนี้เป็นภาษาอังกฤษ"}
        en={firstStr(content.prompt_en, content.instruction) || "Speak about the photo for up to the time limit."}
      />
      {photoType ? (
        <View style={taskStyles.pill}>
          <Text style={taskStyles.pillText}>{photoType}</Text>
        </View>
      ) : null}
      <TaskPhoto
        uri={photoUrl(content)}
        onReady={() => {
          if (readyFired.current) return;
          readyFired.current = true;
          onReady?.();
        }}
      />
      <SpeechCaptureBox value={text} onChange={setText} disabled={submitting} capture={capture} />
      <SubmitButton
        busy={submitting}
        disabled={!ok}
        label={ok ? undefined : t(`พูดอย่างน้อย ${SPEAK_MIN_WORDS} คำก่อนส่ง`, `Say at least ${SPEAK_MIN_WORDS} words to submit`)}
        onPress={() => {
          capture.cancel();
          onSubmit({ text: text.trim() });
        }}
      />
    </View>
  );
}

/** Read, then speak — passage or cue card, then a recorded answer (15+ words). */
export function ReadThenSpeakTask({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const capture = useSpeechCapture();
  useTimeUp(timeUp, () => {
    capture.cancel();
    onSubmit({ text: text.trim() });
  });
  const passage = str(content.passage).trim();
  const cue = firstStr(content.topic, content.topic_en, content.cue_card);
  const guiding = (Array.isArray(content.guiding_questions) ? content.guiding_questions : [])
    .map((q) => str(q).trim())
    .filter(Boolean);
  const ok = countWords(text) >= SPEAK_MIN_WORDS && capture.state === "idle";
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction
        th={firstStr(content.prompt_th, content.instruction_th) || "อ่านโจทย์ แล้วพูดตอบด้วยคำของตัวเอง"}
        en={firstStr(content.prompt_en, content.instruction) || "Read the prompt, then speak about it in your own words."}
      />
      {passage ? (
        <View style={taskStyles.passage}>
          <Text style={taskStyles.passageText}>{passage}</Text>
        </View>
      ) : cue ? (
        <View style={[taskStyles.passage, st.cue]}>
          <Text style={st.cueTitle}>{cue}</Text>
          {guiding.map((q, i) => (
            <Text key={i} style={st.cueItem}>
              • {q}
            </Text>
          ))}
        </View>
      ) : null}
      <SpeechCaptureBox value={text} onChange={setText} disabled={submitting} capture={capture} />
      <SubmitButton
        busy={submitting}
        disabled={!ok}
        label={ok ? undefined : t(`พูดอย่างน้อย ${SPEAK_MIN_WORDS} คำก่อนส่ง`, `Say at least ${SPEAK_MIN_WORDS} words to submit`)}
        onPress={() => {
          capture.cancel();
          onSubmit({ text: text.trim() });
        }}
      />
    </View>
  );
}

/** Read, then write — prompt and a longer written answer. */
export function ReadWriteTask({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const [text, setText] = useState("");
  useTimeUp(timeUp, () => onSubmit({ text }));
  const th = firstStr(content.prompt_th, content.instruction_th);
  const en = firstStr(content.prompt, content.instruction);
  return (
    <View style={taskStyles.gap}>
      <TaskInstruction th={th || en} en={en || th} />
      <AnswerBox value={text} onChange={setText} editable={!submitting} minHeight={240} minWords={50} />
      <SubmitButton busy={submitting} onPress={() => onSubmit({ text })} />
    </View>
  );
}

const st = StyleSheet.create({
  cue: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", gap: 6 },
  cueTitle: { fontSize: 16, fontWeight: "900", color: C.ink },
  cueItem: { fontSize: 14, color: C.ink, lineHeight: 21 },
});
