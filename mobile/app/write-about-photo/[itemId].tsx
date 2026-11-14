import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExamTimer } from "../../components/ExamTimer";
import { LuxuryPressable } from "../../components/LuxuryPressable";
import { MascotCoach } from "../../components/MascotCoach";
import { MascotLoader, ScreenLoader } from "../../components/MascotLoader";
import { FadeInItem } from "../../components/Motion";
import { RuleList, StarterChips, TimeUpNotice, WordCountLine } from "../../components/ProductionBits";
import { ProductionReportView } from "../../components/ProductionReportView";
import { useCountdown } from "../../hooks/useCountdown";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
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
  WRITE_PHOTO_SECONDS,
  countWords,
  randomAttemptId,
} from "../../lib/production-constants";
import type { PhotoAttemptReport, PhotoItem } from "../../lib/production-types";

type Phase = "intro" | "write" | "grading" | "report";

const STARTERS = ["In this photo, I can see…", "There are…", "It looks like…", "In the background,…", "The person is …ing…"];

export default function WriteAboutPhotoScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { t } = useI18n();
  const { back } = useLuxuryRouter();

  const [item, setItem] = useState<PhotoItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [text, setText] = useState("");
  const [timed, setTimed] = useState(true);
  const [timeUp, setTimeUp] = useState(false);
  // Sent for grading — keeps the answer frozen if grading fails and is retried.
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<PhotoAttemptReport | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const attemptIdRef = useRef(randomAttemptId("wap"));

  const timer = useCountdown(WRITE_PHOTO_SECONDS, phase === "write" && timed && !timeUp && !sent, () =>
    setTimeUp(true),
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await fetchPhotoItem("write_about_photo", itemId);
      setItem(next);
      sessionIdRef.current = await startProductionSession("write_about_photo", next.id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const words = countWords(text);
  const locked = timed && (timeUp || sent);

  const start = () => {
    attemptIdRef.current = randomAttemptId("wap");
    startedAtRef.current = Date.now();
    setText("");
    setTimed(true);
    setTimeUp(false);
    setSent(false);
    setSubmitError(null);
    setReport(null);
    timer.reset(WRITE_PHOTO_SECONDS);
    setPhase("write");
  };

  const submit = async () => {
    if (!item) return;
    if (words < PHOTO_MIN_WORDS) {
      setSubmitError(t(`เขียนอย่างน้อย ${PHOTO_MIN_WORDS} คำก่อนส่งตรวจ`, `Write at least ${PHOTO_MIN_WORDS} words before submitting.`));
      return;
    }
    // Submitting early ends the timed part, like pressing Next in the real test.
    setSent(true);
    setSubmitError(null);
    setPending(false);
    setPhase("grading");
    try {
      const transcript = text.trim();
      const outcome = await submitPhotoReport(
        { mode: "write", attemptId: attemptIdRef.current, item, transcript },
        () => setPending(true),
      );
      if (outcome.kind === "still-working") {
        setPhase("write");
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
      invalidatePhotoItems("write_about_photo");
      void recordProductionResult({
        sessionId: sessionIdRef.current,
        exerciseType: "write_about_photo",
        taskType: PRODUCTION_TASK_TYPE.writePhoto,
        setId: item.id,
        attemptId: r.attemptId,
        score160: r.score160,
        startedAt: startedAtRef.current,
        idField: "itemId",
        submissionPayload: {
          kind: "write_about_photo",
          itemId: item.id,
          titleEn: item.title_en,
          titleTh: item.title_th,
          promptEn: item.prompt_en,
          promptTh: item.prompt_th,
          transcript,
        },
        reportPayload: r,
      });
      // A new study session for the next try on this photo.
      sessionIdRef.current = null;
      void startProductionSession("write_about_photo", item.id).then((id) => {
        sessionIdRef.current = id;
      });
    } catch (e) {
      setPhase("write");
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
    return <ProductionReportView report={report} mode="write-photo" onRetry={() => setPhase("intro")} onDone={back} />;
  }

  if (phase === "grading") {
    return (
      <View style={styles.center}>
        <MascotLoader
          grading
          label={
            pending
              ? t("กำลังตรวจอยู่ โปรดรอสักครู่ — คำตอบถูกบันทึกแล้ว", "Still grading — your answer is saved")
              : t("กำลังตรวจคำตอบของคุณ", "Grading your answer")
          }
        />
      </View>
    );
  }

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0}>
          <Image source={{ uri: item.image_url }} style={styles.photo} resizeMode="cover" />
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
              { icon: "⏱", text: t("มีเวลา 1 นาที เวลาเริ่มนับเมื่อกดเริ่ม", "You have 1 minute — the clock starts when you tap Start") },
              { icon: "✍️", text: t(`อย่างน้อย ${PHOTO_MIN_WORDS} คำ (แนะนำ 25–40 คำ)`, `At least ${PHOTO_MIN_WORDS} words (25–40 is ideal)`) },
              { icon: "🎯", text: t("บรรยายเฉพาะสิ่งที่เห็นในภาพ", "Describe only what you can see") },
            ]}
          />
          <StarterChips title={t("💬 เริ่มเขียนยังไงดี", "💬 Sentence starters")} starters={STARTERS} />
        </FadeInItem>
        <FadeInItem index={3} style={styles.coach}>
          <MascotCoach
            text={t("เขียนให้ครบ ใคร ทำอะไร ที่ไหน แล้วเพิ่มรายละเอียด", "Cover who, what and where, then add details")}
            sub={t("สี จำนวน อารมณ์ — ก็ครบ 15 คำง่ายๆ", "Colours, numbers, mood — 15 words comes easily")}
          />
        </FadeInItem>
        {item.progress ? (
          <Text style={styles.last}>
            {t("คะแนนล่าสุด", "Last score")} {Math.round(item.progress.latest_score160)}/{PRODUCTION_MAX_SCORE}
            {item.progress.best_score160 > item.progress.latest_score160
              ? t(` · ดีที่สุด ${Math.round(item.progress.best_score160)}`, ` · best ${Math.round(item.progress.best_score160)}`)
              : ""}
          </Text>
        ) : null}
        <LuxuryPressable style={[styles.btn]} sound="submit" onPress={start}>
          <Text style={styles.btnText}>{t("เริ่มจับเวลา", "Start the timer")}</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {timed ? (
        <ExamTimer left={timer.left} total={WRITE_PHOTO_SECONDS} label={t("เวลาเขียน", "Time to write")} />
      ) : (
        <Text style={styles.untimed}>{t("โหมดฝึก: ไม่จับเวลา", "Practice mode: untimed")}</Text>
      )}
      <Image source={{ uri: item.image_url }} style={styles.photoSmall} resizeMode="cover" />
      <Text style={styles.promptSmall}>{item.prompt_en}</Text>

      <TextInput
        style={[styles.input, locked ? styles.inputLocked : null]}
        multiline
        autoFocus
        editable={!locked}
        value={text}
        onChangeText={setText}
        placeholder={t("พิมพ์คำบรรยายภาพเป็นภาษาอังกฤษ…", "Describe the photo in English…")}
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
      />
      <WordCountLine count={words} min={PHOTO_MIN_WORDS} />

      {timed && timeUp ? <TimeUpNotice count={words} min={PHOTO_MIN_WORDS} onKeepWriting={() => setTimed(false)} /> : null}
      {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}

      <LuxuryPressable
        style={[styles.btn]}
        sound="submit"
        disabled={words < PHOTO_MIN_WORDS}
        onPress={() => void submit()}
      >
        <Text style={styles.btnText}>{t("ส่งตรวจ", "Submit for feedback")}</Text>
      </LuxuryPressable>
      <LuxuryPressable style={[styles.btnGhost]} onPress={start}>
        <Text style={styles.btnGhostText}>{t("เริ่มใหม่", "Start over")}</Text>
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
    maxHeight: 220,
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
  untimed: { fontSize: 13, fontWeight: "800", color: "#6B7280", textAlign: "center" },
  input: {
    marginTop: 12,
    minHeight: 150,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 24,
  },
  inputLocked: { backgroundColor: "#F3F4F6", color: "#4B5563" },
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
});
