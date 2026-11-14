import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ExamTimer } from "../../components/ExamTimer";
import { LuxuryPressable } from "../../components/LuxuryPressable";
import { MascotCoach } from "../../components/MascotCoach";
import { MascotLoader, ScreenLoader } from "../../components/MascotLoader";
import { FadeInItem } from "../../components/Motion";
import { RuleList, StarterChips, WordCountLine } from "../../components/ProductionBits";
import { ProductionReportView } from "../../components/ProductionReportView";
import { useCountdown } from "../../hooks/useCountdown";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { transcribeAudio } from "../../lib/api";
import {
  ensureMicPermission,
  startTurnRecording,
  stopTurnRecording,
  useTurnRecorder,
} from "../../lib/audio-record";
import { LOAD_FAILED, errorText, useI18n } from "../../lib/i18n";
import {
  fetchPhotoItem,
  gradingErrorText,
  invalidatePhotoItems,
  recordProductionResult,
  startProductionSession,
  submitPhotoReport,
} from "../../lib/production-api";
import {
  PHOTO_MIN_WORDS,
  PRODUCTION_MAX_SCORE,
  PRODUCTION_TASK_TYPE,
  SPEAK_PHOTO_MAX_SECONDS,
  SPEAK_PHOTO_MIN_SECONDS,
  SPEAK_PHOTO_PREP_SECONDS,
  countWords,
  randomAttemptId,
} from "../../lib/production-constants";
import type { PhotoAttemptReport, PhotoItem } from "../../lib/production-types";

type Phase = "intro" | "prep" | "record" | "transcribing" | "review" | "grading" | "report";

const STARTERS = ["In this photo, I can see…", "In the foreground,…", "In the background,…", "It looks like…", "I think they are…"];

function RecDot() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.25, { duration: 600 }), -1, true);
    return () => cancelAnimation(o);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.recDot, style]} />;
}

export default function SpeakAboutPhotoScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { t } = useI18n();
  const { back } = useLuxuryRouter();
  const recorder = useTurnRecorder();

  const [item, setItem] = useState<PhotoItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<PhotoAttemptReport | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const attemptIdRef = useRef(randomAttemptId("sap"));
  const recordingRef = useRef(false);
  // The prep timer and "I'm ready" can both fire beginRecording.
  const startingRef = useRef(false);

  const prep = useCountdown(SPEAK_PHOTO_PREP_SECONDS, phase === "prep", () => void beginRecording());
  const rec = useCountdown(SPEAK_PHOTO_MAX_SECONDS, phase === "record", () => void stopRecording());
  const spoken = SPEAK_PHOTO_MAX_SECONDS - rec.left;
  const canStop = spoken >= SPEAK_PHOTO_MIN_SECONDS;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await fetchPhotoItem("speak_about_photo", itemId);
      setItem(next);
      sessionIdRef.current = await startProductionSession("speak_about_photo", next.id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Leaving mid-recording: stop the mic (the recorder may already be released).
  useEffect(
    () => () => {
      if (!recordingRef.current) return;
      try {
        void recorder.stop().catch(() => undefined);
      } catch {
        /* already released */
      }
    },
    [recorder],
  );

  const startPrep = () => {
    attemptIdRef.current = randomAttemptId("sap");
    startedAtRef.current = Date.now();
    setTranscript("");
    setNotice(null);
    setSubmitError(null);
    setReport(null);
    prep.reset(SPEAK_PHOTO_PREP_SECONDS);
    rec.reset(SPEAK_PHOTO_MAX_SECONDS);
    setPhase("prep");
  };

  async function beginRecording() {
    if (recordingRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      await openMic();
    } finally {
      startingRef.current = false;
    }
  }

  async function openMic() {
    rec.reset(SPEAK_PHOTO_MAX_SECONDS);
    const ok = await ensureMicPermission().catch(() => false);
    if (!ok) {
      setNotice(
        t(
          "ใช้ไมโครโฟนไม่ได้ — พิมพ์สิ่งที่คุณจะพูดลงในช่องด้านล่างแทนได้",
          "The microphone isn't available — type what you would say below instead.",
        ),
      );
      setPhase("review");
      return;
    }
    try {
      await startTurnRecording(recorder);
      recordingRef.current = true;
      setPhase("record");
    } catch {
      setNotice(t("เริ่มอัดเสียงไม่ได้ — พิมพ์คำตอบแทนได้", "Could not start recording — type your answer instead."));
      setPhase("review");
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setPhase("transcribing");
    try {
      const audio = await stopTurnRecording(recorder);
      if (audio) {
        const text = await transcribeAudio({ audioBase64: audio.base64, mimeType: audio.mimeType });
        setTranscript(text.trim());
        if (!text.trim()) {
          setNotice(t("ไม่ได้ยินเสียงพูด — ลองอัดใหม่ หรือพิมพ์คำตอบแทน", "No speech detected — record again or type your answer."));
        }
      }
    } catch {
      setNotice(
        t("แปลงเสียงเป็นข้อความไม่สำเร็จ — พิมพ์สิ่งที่คุณพูดแทนได้", "Transcription failed — type what you said instead."),
      );
    } finally {
      setPhase("review");
    }
  }

  const words = countWords(transcript);

  const submit = async () => {
    if (!item) return;
    if (words < PHOTO_MIN_WORDS) {
      setSubmitError(t(`ต้องมีอย่างน้อย ${PHOTO_MIN_WORDS} คำก่อนส่งตรวจ`, `Need at least ${PHOTO_MIN_WORDS} words before submitting.`));
      return;
    }
    setSubmitError(null);
    setPending(false);
    setPhase("grading");
    try {
      const text = transcript.trim();
      const outcome = await submitPhotoReport(
        { mode: "speak", attemptId: attemptIdRef.current, item, transcript: text },
        () => setPending(true),
      );
      if (outcome.kind === "still-working") {
        setPhase("review");
        setSubmitError(
          t(
            "ยังตรวจไม่เสร็จ แต่คำตอบของคุณถูกเก็บไว้แล้ว — ลองกดส่งอีกครั้งในอีกสักครู่ จะได้ผลเดิมโดยไม่เสียเครดิตซ้ำ",
            "Still grading, but your answer is saved — send again in a little while to get the same result without using another credit.",
          ),
        );
        return;
      }
      const r = outcome.report;
      setReport(r);
      setPhase("report");
      invalidatePhotoItems("speak_about_photo");
      void recordProductionResult({
        sessionId: sessionIdRef.current,
        exerciseType: "speak_about_photo",
        taskType: PRODUCTION_TASK_TYPE.speakPhoto,
        setId: item.id,
        attemptId: r.attemptId,
        score160: r.score160,
        startedAt: startedAtRef.current,
        idField: "itemId",
        submissionPayload: {
          kind: "speak_about_photo",
          itemId: item.id,
          titleEn: item.title_en,
          titleTh: item.title_th,
          promptEn: item.prompt_en,
          promptTh: item.prompt_th,
          transcript: text,
        },
        reportPayload: r,
      });
      sessionIdRef.current = null;
      void startProductionSession("speak_about_photo", item.id).then((id) => {
        sessionIdRef.current = id;
      });
    } catch (e) {
      setPhase("review");
      setSubmitError(gradingErrorText(t, e));
    }
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, loadError)}</Text>
        <LuxuryPressable style={[styles.btn, styles.btnSmall]} onPress={() => void load()}>
          <Text style={styles.btnText}>{t("ลองใหม่", "Retry")}</Text>
        </LuxuryPressable>
      </View>
    );
  }
  if (!item) return <ScreenLoader />;

  if (phase === "report" && report) {
    return <ProductionReportView report={report} mode="speak-photo" onRetry={() => setPhase("intro")} onDone={back} />;
  }

  if (phase === "grading" || phase === "transcribing") {
    return (
      <View style={styles.center}>
        {phase === "grading" ? (
          <MascotLoader
            grading
            label={
              pending
                ? t("กำลังตรวจอยู่ โปรดรอสักครู่ — คำตอบถูกบันทึกแล้ว", "Still grading — your answer is saved")
                : t("กำลังตรวจการพูดของคุณ", "Grading your answer")
            }
          />
        ) : (
          <MascotLoader label={t("กำลังแปลงเสียงเป็นข้อความ", "Transcribing your answer")} />
        )}
      </View>
    );
  }

  const photo = (
    <Image
      source={{ uri: item.image_url }}
      style={phase === "intro" ? styles.photo : styles.photoSmall}
      resizeMode="cover"
    />
  );

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0}>
          {photo}
          {item.creator ? (
            <Text style={styles.credit} numberOfLines={1}>
              📷 {item.creator}
              {item.provider ? ` · ${item.provider}` : ""}
            </Text>
          ) : null}
        </FadeInItem>
        <FadeInItem index={1}>
          <Text style={styles.title}>{item.title_en}</Text>
          {item.title_th ? <Text style={styles.titleTh}>{item.title_th}</Text> : null}
          <Text style={styles.prompt}>{item.prompt_en}</Text>
          {item.prompt_th ? <Text style={styles.promptTh}>{item.prompt_th}</Text> : null}
        </FadeInItem>
        <FadeInItem index={2}>
          <RuleList
            rules={[
              { icon: "🧠", text: t(`เตรียมตัว ${SPEAK_PHOTO_PREP_SECONDS} วินาที แล้วเริ่มอัดเสียงอัตโนมัติ`, `${SPEAK_PHOTO_PREP_SECONDS} s to prepare, then recording starts by itself`) },
              {
                icon: "🎙️",
                text: t(
                  `พูด ${SPEAK_PHOTO_MIN_SECONDS}–${SPEAK_PHOTO_MAX_SECONDS} วินาที (กดหยุดได้หลัง ${SPEAK_PHOTO_MIN_SECONDS} วินาที)`,
                  `Speak for ${SPEAK_PHOTO_MIN_SECONDS}–${SPEAK_PHOTO_MAX_SECONDS} s (you can stop after ${SPEAK_PHOTO_MIN_SECONDS} s)`,
                ),
              },
              { icon: "📝", text: t(`ต้องได้อย่างน้อย ${PHOTO_MIN_WORDS} คำจึงส่งตรวจได้`, `At least ${PHOTO_MIN_WORDS} words to be graded`) },
            ]}
          />
          <StarterChips title={t("💬 เริ่มพูดยังไงดี", "💬 Sentence starters")} starters={STARTERS} />
        </FadeInItem>
        <FadeInItem index={3} style={styles.coach}>
          <MascotCoach
            text={t("เตรียมประโยคในหัวก่อนเริ่มอัด จะพูดลื่นกว่ามาก", "Plan your first sentences before recording — you'll sound smoother")}
            sub={t("เล่าจากสิ่งที่เด่นที่สุด → รายละเอียด → ความรู้สึกของภาพ", "Main thing → details → the mood of the photo")}
          />
        </FadeInItem>
        {item.progress ? (
          <Text style={styles.last}>
            {t("คะแนนล่าสุด", "Last score")} {Math.round(item.progress.latest_score160)}/{PRODUCTION_MAX_SCORE}
          </Text>
        ) : null}
        <LuxuryPressable style={[styles.btn]} sound="submit" onPress={startPrep}>
          <Text style={styles.btnText}>{t("เริ่มเตรียมตัว", "Start preparing")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  if (phase === "prep") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ExamTimer left={prep.left} total={SPEAK_PHOTO_PREP_SECONDS} label={t("เตรียมตัว", "Prepare")} urgentAt={5} />
        {photo}
        <Text style={styles.promptSmall}>{item.prompt_en}</Text>
        <Text style={styles.hint}>{t("เมื่อหมดเวลา ระบบจะเริ่มอัดเสียงทันที", "Recording starts automatically when time runs out")}</Text>
        <LuxuryPressable style={[styles.btn]} sound="submit" onPress={() => void beginRecording()}>
          <Text style={styles.btnText}>{t("พร้อมแล้ว — เริ่มพูดเลย", "I'm ready — start speaking")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  if (phase === "record") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ExamTimer left={rec.left} total={SPEAK_PHOTO_MAX_SECONDS} label={t("เวลาพูดที่เหลือ", "Speaking time left")} />
        {photo}
        <Text style={styles.promptSmall}>{item.prompt_en}</Text>
        <View style={styles.recRow}>
          <RecDot />
          <Text style={styles.recText}>{t(`กำลังอัดเสียง · ${spoken} วินาที`, `Recording · ${spoken}s`)}</Text>
        </View>
        <Text style={styles.hint}>
          {canStop
            ? t("พูดจบแล้วกดหยุดได้เลย", "Tap stop when you're finished")
            : t(
                `พูดต่ออีก ${SPEAK_PHOTO_MIN_SECONDS - spoken} วินาที แล้วจึงกดหยุดได้`,
                `Keep going — you can stop in ${SPEAK_PHOTO_MIN_SECONDS - spoken}s`,
              )}
        </Text>
        <LuxuryPressable
          style={[styles.stopBtn]}
          disabled={!canStop}
          sound="submit"
          onPress={() => void stopRecording()}
        >
          <Text style={styles.stopBtnText}>{t("■ หยุดอัดเสียง", "■ Stop recording")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  // review
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {photo}
      <Text style={styles.promptSmall}>{item.prompt_en}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.label}>{t("สิ่งที่คุณพูด", "What you said")}</Text>
      <Text style={styles.subLabel}>
        {t(
          "แก้ได้เฉพาะคำที่ระบบถอดเสียงผิด — ไม่ต้องเรียบเรียงใหม่ จะได้คะแนนที่ตรงกับการพูดจริง",
          "Only fix words that were transcribed wrongly — don't rewrite, so the score reflects how you spoke.",
        )}
      </Text>
      <TextInput
        style={styles.input}
        multiline
        value={transcript}
        onChangeText={setTranscript}
        placeholder={t("สิ่งที่คุณพูด…", "Your spoken answer…")}
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
      />
      <WordCountLine count={words} min={PHOTO_MIN_WORDS} />
      {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}
      <LuxuryPressable style={[styles.btn]} sound="submit" disabled={words < PHOTO_MIN_WORDS} onPress={() => void submit()}>
        <Text style={styles.btnText}>{t("ส่งตรวจ", "Submit for feedback")}</Text>
      </LuxuryPressable>
      <LuxuryPressable style={[styles.btnGhost]} onPress={startPrep}>
        <Text style={styles.btnGhostText}>{t("🎙️ อัดเสียงใหม่", "🎙️ Record again")}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F4F6FB" },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#E5E7EB",
  },
  photoSmall: {
    marginTop: 12,
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 240,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#E5E7EB",
  },
  credit: { marginTop: 6, fontSize: 11, color: "#9CA3AF" },
  title: { marginTop: 14, fontSize: 20, fontWeight: "900", color: "#111" },
  titleTh: { marginTop: 2, fontSize: 14, color: "#6B7280" },
  prompt: { marginTop: 10, fontSize: 15, fontWeight: "700", color: "#111", lineHeight: 22 },
  promptTh: { marginTop: 4, fontSize: 13, color: "#6B7280", lineHeight: 20 },
  promptSmall: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  coach: { marginTop: 16 },
  last: { marginTop: 14, fontSize: 13, fontWeight: "800", color: "#004AAD", textAlign: "center" },
  hint: { marginTop: 12, fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },
  recRow: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#DC2626" },
  recText: { fontSize: 16, fontWeight: "900", color: "#B91C1C", fontVariant: ["tabular-nums"] },
  notice: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
  },
  label: { marginTop: 16, fontSize: 15, fontWeight: "900", color: "#111" },
  subLabel: { marginTop: 4, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  input: {
    marginTop: 10,
    minHeight: 140,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 24,
  },
  formError: { marginTop: 10, color: "#b91c1c", fontWeight: "700", lineHeight: 20 },
  btn: {
    marginTop: 16,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnSmall: { paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  btnGhost: {
    marginTop: 10,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#111",
    alignItems: "center",
  },
  btnGhostText: { color: "#111", fontWeight: "800", fontSize: 15 },
  stopBtn: {
    marginTop: 18,
    backgroundColor: "#B91C1C",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  stopBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
