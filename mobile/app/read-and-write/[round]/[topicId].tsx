import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ExamTimer } from "../../../components/ExamTimer";
import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { MascotCoach } from "../../../components/MascotCoach";
import { MascotLoader, ScreenLoader } from "../../../components/MascotLoader";
import { FadeInItem } from "../../../components/Motion";
import { RuleList, StarterChips, TimeUpNotice, WordCountLine } from "../../../components/ProductionBits";
import { ProductionReportView } from "../../../components/ProductionReportView";
import { useCountdown } from "../../../hooks/useCountdown";
import { useLuxuryRouter } from "../../../hooks/useLuxuryRouter";
import { LOAD_FAILED, errorText, roundLabel, useI18n } from "../../../lib/i18n";
import {
  fetchWritingTopic,
  gradingErrorText,
  recordProductionResult,
  startProductionSession,
  submitWritingReport,
} from "../../../lib/production-api";
import {
  ESSAY_MIN_WORDS,
  ESSAY_WRITE_SECONDS,
  PRODUCTION_TASK_TYPE,
  countWords,
  randomAttemptId,
} from "../../../lib/production-constants";
import type { WritingAttemptReport, WritingTopic } from "../../../lib/production-types";

type Phase = "intro" | "write" | "grading" | "report";

const STARTERS = ["I believe that…", "There are two main reasons…", "Firstly,…", "For example,…", "In conclusion,…"];

/** Website's study-session exercise type for read-and-write. */
const EXERCISE_TYPE = "read_then_write";

export default function ReadAndWriteSessionScreen() {
  const { round, topicId } = useLocalSearchParams<{ round: string; topicId: string }>();
  const { t } = useI18n();
  const { back } = useLuxuryRouter();

  const [topic, setTopic] = useState<WritingTopic | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [essay, setEssay] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [timed, setTimed] = useState(true);
  const [timeUp, setTimeUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<WritingAttemptReport | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const attemptIdRef = useRef(randomAttemptId("rw"));

  const timer = useCountdown(ESSAY_WRITE_SECONDS, phase === "write" && timed && !timeUp && !sent, () =>
    setTimeUp(true),
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await fetchWritingTopic(topicId);
      setTopic(next);
      sessionIdRef.current = await startProductionSession(EXERCISE_TYPE, next.id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : LOAD_FAILED);
    }
  }, [topicId]);

  useEffect(() => {
    void load();
  }, [load]);

  const words = countWords(essay);
  const locked = timed && (timeUp || sent);
  const prompts = topic?.followUps ?? [];

  const start = () => {
    attemptIdRef.current = randomAttemptId("rw");
    startedAtRef.current = Date.now();
    setEssay("");
    setFollowUps(prompts.map(() => ""));
    setTimed(true);
    setTimeUp(false);
    setSent(false);
    setSubmitError(null);
    setReport(null);
    timer.reset(ESSAY_WRITE_SECONDS);
    setPhase("write");
  };

  const submit = async () => {
    if (!topic) return;
    if (words < ESSAY_MIN_WORDS) {
      setSubmitError(t(`เขียนอย่างน้อย ${ESSAY_MIN_WORDS} คำก่อนส่งตรวจ`, `Write at least ${ESSAY_MIN_WORDS} words before submitting.`));
      return;
    }
    setSent(true);
    setSubmitError(null);
    setPending(false);
    setPhase("grading");
    try {
      const text = essay.trim();
      const answers = prompts.map((_, i) => (followUps[i] ?? "").trim());
      const outcome = await submitWritingReport(
        { attemptId: attemptIdRef.current, topic, essay: text, followUpAnswers: answers },
        () => setPending(true),
      );
      if (outcome.kind === "still-working") {
        setPhase("write");
        setSubmitError(
          t(
            "ยังตรวจไม่เสร็จ แต่เรียงความของคุณถูกเก็บไว้แล้ว — ลองกดส่งอีกครั้งในอีกสักครู่ จะได้ผลเดิมโดยไม่เสียเครดิตซ้ำ",
            "Still grading, but your essay is saved — send again in a little while to get the same result without using another credit.",
          ),
        );
        return;
      }
      const r = outcome.report;
      setReport(r);
      setPhase("report");
      void recordProductionResult({
        sessionId: sessionIdRef.current,
        exerciseType: EXERCISE_TYPE,
        taskType: PRODUCTION_TASK_TYPE.essay,
        setId: topic.id,
        attemptId: r.attemptId,
        score160: r.score160,
        startedAt: startedAtRef.current,
        idField: "topicId",
        submissionPayload: {
          kind: EXERCISE_TYPE,
          topicId: topic.id,
          titleEn: topic.titleEn,
          titleTh: topic.titleTh,
          essay: text,
          followUpAnswers: answers,
        },
        reportPayload: r,
      });
      sessionIdRef.current = null;
      void startProductionSession(EXERCISE_TYPE, topic.id).then((id) => {
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
  if (!topic) return <ScreenLoader />;

  if (phase === "report" && report) {
    return <ProductionReportView report={report} mode="essay" onRetry={() => setPhase("intro")} onDone={back} />;
  }

  if (phase === "grading") {
    return (
      <View style={styles.center}>
        <MascotLoader
          grading
          label={
            pending
              ? t("กำลังตรวจอยู่ โปรดรอสักครู่ — เรียงความถูกบันทึกแล้ว", "Still grading — your essay is saved")
              : t("กำลังตรวจเรียงความของคุณ", "Grading your essay")
          }
        />
      </View>
    );
  }

  const promptCard = (
    <View style={styles.promptCard}>
      <Text style={styles.promptLabel}>{t("โจทย์", "Prompt")}</Text>
      <Text style={styles.prompt}>{topic.promptEn}</Text>
      {topic.promptTh ? <Text style={styles.promptTh}>{topic.promptTh}</Text> : null}
    </View>
  );

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <FadeInItem index={0}>
          <Text style={styles.meta}>{roundLabel(t, round)}</Text>
          <Text style={styles.title}>{topic.titleEn}</Text>
          {topic.titleTh ? <Text style={styles.titleTh}>{topic.titleTh}</Text> : null}
          {promptCard}
        </FadeInItem>
        <FadeInItem index={1}>
          <RuleList
            rules={[
              { icon: "⏱", text: t("มีเวลา 5 นาที เวลาเริ่มนับเมื่อกดเริ่ม", "You have 5 minutes — the clock starts when you tap Start") },
              { icon: "✍️", text: t(`อย่างน้อย ${ESSAY_MIN_WORDS} คำ (แนะนำ 100 คำขึ้นไป)`, `At least ${ESSAY_MIN_WORDS} words (100+ is better)`) },
              { icon: "🧱", text: t("โครง: เลือกข้าง → เหตุผล + ตัวอย่าง → สรุป", "Structure: take a side → reasons + examples → conclusion") },
              ...(prompts.length > 0
                ? [{ icon: "➕", text: t(`มีคำถามต่ออีก ${prompts.length} ข้อ ตอบสั้นๆ ในเวลาเดียวกัน`, `${prompts.length} follow-up question(s) to answer briefly in the same time`) }]
                : []),
            ]}
          />
          <StarterChips title={t("🧱 วลีเริ่มประโยค", "🧱 Useful starters")} starters={STARTERS} />
        </FadeInItem>
        <FadeInItem index={2} style={styles.coach}>
          <MascotCoach
            text={t("ใช้ 30 วินาทีแรกวางแผน 2 เหตุผลในหัว แล้วค่อยเขียน", "Spend the first 30 seconds picking two reasons, then write")}
            sub={t("ยกตัวอย่างจากชีวิตตัวเองได้คะแนนตอบตรงโจทย์เพิ่ม", "A personal example boosts your task score")}
          />
        </FadeInItem>
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
        <ExamTimer left={timer.left} total={ESSAY_WRITE_SECONDS} label={t("เวลาเขียน", "Time to write")} urgentAt={30} />
      ) : (
        <Text style={styles.untimed}>{t("โหมดฝึก: ไม่จับเวลา", "Practice mode: untimed")}</Text>
      )}
      {promptCard}

      <TextInput
        style={[styles.input, locked ? styles.inputLocked : null]}
        multiline
        autoFocus
        editable={!locked}
        value={essay}
        onChangeText={setEssay}
        placeholder={t("เขียนเรียงความภาษาอังกฤษที่นี่…", "Write your essay here…")}
        autoCapitalize="sentences"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
      />
      <WordCountLine count={words} min={ESSAY_MIN_WORDS} />

      {prompts.map((fu, i) => (
        <View key={`fu-${i}`} style={styles.followUp}>
          <Text style={styles.followUpLabel}>{t(`คำถามต่อ ${i + 1}`, `Follow-up ${i + 1}`)}</Text>
          <Text style={styles.followUpPrompt}>{fu.promptEn}</Text>
          {fu.promptTh ? <Text style={styles.followUpTh}>{fu.promptTh}</Text> : null}
          <TextInput
            style={[styles.inputSmall, locked ? styles.inputLocked : null]}
            multiline
            editable={!locked}
            value={followUps[i] ?? ""}
            onChangeText={(v) =>
              setFollowUps((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              })
            }
            placeholder={t("คำตอบสั้นๆ…", "Short answer…")}
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
          />
        </View>
      ))}

      {timed && timeUp ? <TimeUpNotice count={words} min={ESSAY_MIN_WORDS} onKeepWriting={() => setTimed(false)} /> : null}
      {submitError ? <Text style={styles.formError}>{submitError}</Text> : null}

      <LuxuryPressable style={[styles.btn]} sound="submit" disabled={words < ESSAY_MIN_WORDS} onPress={() => void submit()}>
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
  meta: { fontSize: 12, fontWeight: "800", color: "#004AAD" },
  title: { marginTop: 4, fontSize: 21, fontWeight: "900", color: "#111" },
  titleTh: { marginTop: 2, fontSize: 14, color: "#6B7280" },
  promptCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111",
    padding: 14,
  },
  promptLabel: { fontSize: 11, fontWeight: "900", color: "#004AAD", letterSpacing: 0.5 },
  prompt: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#111", lineHeight: 22 },
  promptTh: { marginTop: 6, fontSize: 13, color: "#6B7280", lineHeight: 20 },
  coach: { marginTop: 16 },
  untimed: { fontSize: 13, fontWeight: "800", color: "#6B7280", textAlign: "center" },
  input: {
    marginTop: 12,
    minHeight: 220,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 24,
  },
  inputSmall: {
    marginTop: 8,
    minHeight: 80,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  inputLocked: { backgroundColor: "#F3F4F6", color: "#4B5563" },
  followUp: {
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  followUpLabel: { fontSize: 12, fontWeight: "900", color: "#004AAD" },
  followUpPrompt: { marginTop: 4, fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 20 },
  followUpTh: { marginTop: 2, fontSize: 12, color: "#6B7280", lineHeight: 18 },
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
