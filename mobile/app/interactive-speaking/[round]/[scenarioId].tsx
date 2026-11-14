import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useScoreReveal } from "../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../components/LuxuryPressable";
import { Sound } from "../../../lib/audio-player";
import {
  ensureMicPermission,
  startTurnRecording,
  stopRecordingToUri,
  stopTurnRecording,
  useTurnRecorder,
  type TurnRecorder,
} from "../../../lib/audio-record";
import {
  fetchInteractiveSpeakingScenario,
  finishStudySession,
  interactiveSpeakingNext,
  interactiveSpeakingStart,
  startStudySession,
  submitInteractiveSpeakingReport,
  transcribeAudio,
} from "../../../lib/api";
import {
  INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS,
  INTERACTIVE_SPEAKING_PREP_SECONDS,
  INTERACTIVE_SPEAKING_TURN_COUNT,
} from "../../../lib/interactive-speaking-constants";
import type {
  InteractiveSpeakingAttemptReport,
  InteractiveSpeakingScenario,
  InteractiveSpeakingTurnRecord,
} from "../../../lib/types";
import { errorText, LOAD_FAILED, scoreLine, useI18n } from "../../../lib/i18n";
import { ScreenLoader } from "../../../components/MascotLoader";
import { MascotLoader } from "../../../components/MascotLoader";
import { AnimatedScore, FadeInItem, ResultMascot } from "../../../components/Motion";

type Phase = "intro" | "prep" | "record" | "review" | "grading" | "report";

type CompletedTurn = {
  questionEn: string;
  questionTh: string;
  transcript: string;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function randomAttemptId(): string {
  return `is_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function InteractiveSpeakingSessionScreen() {
  const { round, scenarioId } = useLocalSearchParams<{ round: string; scenarioId: string }>();
  const { t } = useI18n();
  const attemptId = useMemo(() => randomAttemptId(), []);

  const [scenario, setScenario] = useState<InteractiveSpeakingScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [turn, setTurn] = useState(1);
  const [currentQ, setCurrentQ] = useState({ en: "", th: "" });
  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [transcript, setTranscript] = useState("");
  const [prepLeft, setPrepLeft] = useState(INTERACTIVE_SPEAKING_PREP_SECONDS);
  const [recLeft, setRecLeft] = useState(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
  const recorder = useTurnRecorder();
  const [recording, setRecording] = useState<TurnRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [report, setReport] = useState<InteractiveSpeakingAttemptReport | null>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);
  const [micTest, setMicTest] = useState<"idle" | "recording" | "playing" | "ok" | "denied" | "failed">("idle");
  const micSound = useRef<Sound | null>(null);

  useScoreReveal(phase === "report" && !!report);

  useEffect(
    () => () => {
      void micSound.current?.unloadAsync();
    },
    [],
  );

  /** Records 3 seconds and plays it straight back, so the learner knows the mic works before the clock starts. */
  const testMic = async () => {
    if (micTest === "recording" || micTest === "playing") return;
    if (!(await ensureMicPermission())) {
      setMicTest("denied");
      return;
    }
    try {
      setMicTest("recording");
      await startTurnRecording(recorder);
      await new Promise((r) => setTimeout(r, 3000));
      const uri = await stopRecordingToUri(recorder);
      if (!uri) throw new Error("no audio");
      setMicTest("playing");
      await micSound.current?.unloadAsync();
      const { sound } = await Sound.createAsync({ uri });
      micSound.current = sound;
      await sound.waitUntilLoaded(3000);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) setMicTest("ok");
      });
      await sound.playAsync();
      setTimeout(() => setMicTest((m) => (m === "playing" ? "ok" : m)), 4500);
    } catch {
      setMicTest("failed");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInteractiveSpeakingScenario(scenarioId);
      setScenario(data);
      const sid = await startStudySession({
        exerciseType: "interactive_speaking",
        skill: "production",
        setId: data.id,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (phase !== "prep") return;
    setPrepLeft(INTERACTIVE_SPEAKING_PREP_SECONDS);
    const id = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          void beginRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, turn]);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => {
      setRecLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          void stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const beginTurn = (qEn: string, qTh: string) => {
    setTranscript("");
    setCurrentQ({ en: qEn, th: qTh });
    setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
    setPhase("prep");
  };

  const beginRecording = async () => {
    const ok = await ensureMicPermission();
    if (!ok) {
      setError(
        t(
          "ต้องอนุญาตให้ใช้ไมโครโฟน — หรือพิมพ์คำตอบในหน้าถัดไปแทนได้",
          "Microphone permission required. You can type your answer on the review screen.",
        ),
      );
      setPhase("record");
      return;
    }
    try {
      const rec = await startTurnRecording(recorder);
      setRecording(rec);
      setIsRecording(true);
      setPhase("record");
    } catch {
      setError(t("เริ่มอัดเสียงไม่ได้ — พิมพ์คำตอบแทนได้", "Could not start recording. Type your answer instead."));
      setPhase("record");
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      setPhase("review");
      setIsRecording(false);
      return;
    }
    setIsRecording(false);
    setTranscribing(true);
    try {
      const audio = await stopTurnRecording(recording);
      setRecording(null);
      if (audio) {
        const text = await transcribeAudio({
          audioBase64: audio.base64,
          mimeType: audio.mimeType,
        });
        setTranscript((prev) => [prev.trim(), text.trim()].filter(Boolean).join(" ").trim());
      }
    } catch {
      setError(t("แปลงเสียงเป็นข้อความไม่สำเร็จ — แก้คำตอบด้านล่างได้", "Transcription failed. Edit your answer below."));
    } finally {
      setTranscribing(false);
      setPhase("review");
    }
  };

  const startExam = async () => {
    if (!scenario) return;
    setError(null);
    try {
      await interactiveSpeakingStart({ attemptId, scenarioId: scenario.id });
      setTurn(1);
      setCompleted([]);
      beginTurn(scenario.starterQuestionEn, scenario.starterQuestionTh);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("เริ่มทำไม่สำเร็จ", "Could not start session"));
    }
  };

  const submitTurn = async () => {
    const trimmed = transcript.trim();
    if (countWords(trimmed) < 3) {
      setError(t("พูดหรือพิมพ์อย่างน้อยสักสองสามคำ", "Speak or type at least a few words."));
      return;
    }
    setError(null);
    const nextCompleted: CompletedTurn[] = [
      ...completed,
      { questionEn: currentQ.en, questionTh: currentQ.th, transcript: trimmed },
    ];

    if (nextCompleted.length >= INTERACTIVE_SPEAKING_TURN_COUNT) {
      setCompleted(nextCompleted);
      setPhase("grading");
      try {
        const turns: InteractiveSpeakingTurnRecord[] = nextCompleted.map((c, i) => ({
          turnIndex: i + 1,
          questionEn: c.questionEn,
          questionTh: c.questionTh,
          transcript: c.transcript,
        }));
        const r = await submitInteractiveSpeakingReport({
          attemptId,
          scenarioId: scenario!.id,
          scenarioTitleEn: scenario!.titleEn,
          scenarioTitleTh: scenario!.titleTh,
          turns,
        });
        setReport(r);
        setPhase("report");

        const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
        try {
          await finishStudySession({
            sessionId: sessionIdRef.current ?? undefined,
            exerciseType: "interactive_speaking",
            setId: scenario!.id,
            score: r.score160,
            completed: true,
            duration_seconds: duration,
            submission_payload: { turns },
            report_payload: { score160: r.score160 },
          });
        } catch {
          /* best-effort */
        }
      } catch (e) {
        setPhase("review");
        setError(e instanceof Error ? e.message : t("ตรวจไม่สำเร็จ", "Grading failed"));
      }
      return;
    }

    setCompleted(nextCompleted);
    const nextTurn = nextCompleted.length + 1;
    setTurn(nextTurn);
    setPhase("grading");
    try {
      const { questionEn, questionTh } = await interactiveSpeakingNext({
        scenarioTitleEn: scenario!.titleEn,
        scenarioTitleTh: scenario!.titleTh,
        starterQuestionEn: scenario!.starterQuestionEn,
        starterQuestionTh: scenario!.starterQuestionTh,
        nextTurnNumber: nextTurn,
        history: nextCompleted.map((c) => ({
          questionEn: c.questionEn,
          answerTranscript: c.transcript,
        })),
      });
      beginTurn(questionEn, questionTh);
    } catch (e) {
      setPhase("review");
      setError(e instanceof Error ? e.message : t("โหลดคำถามถัดไปไม่สำเร็จ", "Could not load next question"));
    }
  };

  if (loading) return <ScreenLoader />;

  if (error && !scenario) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, error)}</Text>
      </View>
    );
  }

  if (!scenario) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorText(t, null)}</Text>
      </View>
    );
  }

  if (phase === "report" && report) {
    const criteria = [
      { label: t("ตอบตรงโจทย์", "Task"), r: report.taskRelevancy },
      { label: t("ไวยากรณ์", "Grammar"), r: report.grammar },
      { label: t("ความต่อเนื่อง", "Coherence"), r: report.coherence },
      { label: t("คำศัพท์", "Vocabulary"), r: report.vocabulary },
    ];
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ResultMascot ratio={160 > 0 ? Math.round(report.score160) / 160 : 0} message={160 > 0 && Math.round(report.score160) / 160 >= 0.75 ? t("เก่งมาก! ทำได้ดีเยี่ยมเลย 🎉", "Great job — excellent work! 🎉") : t("ใกล้แล้ว! ดูจุดที่พลาดด้านล่าง แล้วลองอีกครั้งนะ 💪", "Almost there! Review the misses below and try again 💪")} />
        <AnimatedScore
          value={Math.round(report.score160)}
          max={160}
          format={(n, m) => scoreLine(t, n, m)}
          style={styles.score}
        />
        {criteria.map(({ label, r }, i) => (
          <FadeInItem key={label} index={i + 1} style={styles.criterion}>
            <Text style={styles.criterionTitle}>
              {label} — {Math.round(r.scorePercent)}%
            </Text>
            <Text style={styles.criterionEn}>{r.summary.en}</Text>
            <Text style={styles.criterionTh}>{r.summary.th}</Text>
          </FadeInItem>
        ))}
      </ScrollView>
    );
  }

  if (phase === "grading" && !report) {
    return (
      <View style={styles.center}>
        {turn >= INTERACTIVE_SPEAKING_TURN_COUNT ? (
          <MascotLoader grading label={t("กำลังตรวจคำตอบของคุณ", "Grading your answers")} />
        ) : (
          <MascotLoader label={t("กำลังเตรียมคำถามถัดไป", "Preparing the next question")} />
        )}
      </View>
    );
  }

  if (phase === "intro") {
    const N = INTERACTIVE_SPEAKING_TURN_COUNT;
    const P = INTERACTIVE_SPEAKING_PREP_SECONDS;
    const M = INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS;
    const steps: [string, string, string][] = [
      ["👀", t("อ่านคำถาม", "Read the question"), t("ข้อแรกเกี่ยวกับสถานการณ์นี้ ข้อต่อไปจะถามต่อจากคำตอบของคุณ", "The first is about this scenario — the rest follow up on what you said")],
      ["⏱️", t(`เตรียมตัว ${P} วินาที`, `${P}s to get ready`), t("แล้วไมค์จะเริ่มอัดเสียงเองอัตโนมัติ", "then the mic starts recording by itself")],
      ["🎙️", t(`พูดได้สูงสุด ${M} วินาที`, `Speak for up to ${M}s`), t("พูดจบแล้วกด “หยุดอัดเสียง”", "tap “Stop recording” when you're done")],
      ["✍️", t("เช็กข้อความ", "Check the text"), t("เสียงจะถูกแปลงเป็นข้อความ แก้ได้ก่อนไปข้อถัดไป", "your speech becomes text — fix it before the next turn")],
      ["📊", t(`ครบ ${N} ข้อ → รับผลตรวจ`, `After ${N} turns → your report`), t("คะแนน + คำแนะนำภาษาไทยทีละด้าน", "score + feedback for each skill")],
    ];
    const micBusy = micTest === "recording" || micTest === "playing";
    const micStatus = {
      idle: t("กดทดสอบ แล้วพูดอะไรก็ได้ 3 วินาที — จะเล่นเสียงคุณกลับให้ฟัง", "Tap test and say anything for 3 seconds — we'll play it back"),
      recording: t("● กำลังอัด… พูดได้เลย", "● Recording… speak now"),
      playing: t("▶ กำลังเล่นเสียงของคุณ…", "▶ Playing your voice back…"),
      ok: t("✓ ได้ยินเสียงตัวเองชัดไหม? ถ้าชัดก็พร้อมแล้ว", "✓ Heard yourself clearly? Then you're ready"),
      denied: t("ยังไม่ได้อนุญาตไมค์ — เปิดในการตั้งค่า หรือพิมพ์คำตอบแทนได้", "Mic not allowed — enable it in Settings, or type your answers"),
      failed: t("ทดสอบไม่สำเร็จ — ลองอีกครั้ง หรือพิมพ์คำตอบแทนได้", "Test failed — try again, or type your answers"),
    }[micTest];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🗣️</Text>
          <Text style={styles.title}>{scenario.titleEn}</Text>
          {scenario.titleTh ? <Text style={styles.titleTh}>{scenario.titleTh}</Text> : null}
          <View style={styles.chips}>
            <Text style={styles.chip}>{t(`รอบ ${round}`, `Round ${round}`)}</Text>
            <Text style={styles.chip}>{t(`${N} คำถาม`, `${N} turns`)}</Text>
            <Text style={styles.chip}>{t(`พูด ≤ ${M} วิ/ข้อ`, `≤ ${M}s each`)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("ทำอย่างไร", "How it works")}</Text>
        <View style={styles.stepsCard}>
          {steps.map(([icon, head, body], i) => (
            <View key={i} style={[styles.stepRow, i < steps.length - 1 && styles.stepRowLine]}>
              <Text style={styles.stepIcon}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepHead}>{head}</Text>
                <Text style={styles.stepBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.micCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.micTitle}>{t("🎧 ทดสอบไมค์ก่อนเริ่ม", "🎧 Test your mic first")}</Text>
            <Text style={[styles.micText, micTest === "ok" && styles.micOk, (micTest === "denied" || micTest === "failed") && styles.micBad]}>
              {micStatus}
            </Text>
          </View>
          <LuxuryPressable
            sound="none"
            style={[styles.micBtn, micBusy && styles.micBtnBusy]}
            disabled={micBusy}
            onPress={() => void testMic()}
          >
            <Text style={styles.micBtnText}>
              {micTest === "recording" ? "●" : micTest === "playing" ? "▶" : micTest === "ok" ? t("อีกครั้ง", "Again") : t("ทดสอบ", "Test")}
            </Text>
          </LuxuryPressable>
        </View>

        <Text style={styles.tip}>
          {t(
            "💡 เคล็ดลับ: ตอบ 3–4 ประโยค — ตอบตรงคำถาม ให้เหตุผล แล้วยกตัวอย่าง",
            "💡 Tip: answer in 3–4 sentences — answer, give a reason, add an example",
          )}
        </Text>

        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <LuxuryPressable
          style={[styles.btn, micBusy && styles.btnDisabled]}
          disabled={micBusy}
          onPress={() => void startExam()}
        >
          <Text style={styles.btnText}>{t("เริ่มสถานการณ์ →", "Start scenario →")}</Text>
        </LuxuryPressable>
        <Text style={styles.note}>
          {t("ใช้เครดิตการตรวจของ VIP เมื่อส่งตรวจ", "Uses VIP grading credits when you submit for feedback.")}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        {t(
          `คำถามที่ ${turn}/${INTERACTIVE_SPEAKING_TURN_COUNT}`,
          `Turn ${turn}/${INTERACTIVE_SPEAKING_TURN_COUNT}`,
        )}
      </Text>
      <Text style={styles.question}>{currentQ.en}</Text>
      {currentQ.th ? <Text style={styles.questionTh}>{currentQ.th}</Text> : null}

      {phase === "prep" ? (
        <Text style={styles.countdown}>
          {t(`เตรียมตัว… ${prepLeft}`, `Get ready… ${prepLeft}`)}
        </Text>
      ) : null}

      {phase === "record" ? (
        <View style={styles.recordBox}>
          <Text style={styles.countdown}>
            {isRecording
              ? t(`กำลังอัดเสียง… ${recLeft} วินาที`, `Recording… ${recLeft}s`)
              : t("แตะหยุดเมื่อพูดจบ", "Tap stop when finished")}
          </Text>
          {isRecording ? (
            <LuxuryPressable style={styles.stopBtn} onPress={() => void stopRecording()}>
              <Text style={styles.stopBtnText}>{t("หยุดอัดเสียง", "Stop recording")}</Text>
            </LuxuryPressable>
          ) : (
            <LuxuryPressable style={styles.stopBtn} onPress={() => setPhase("review")}>
              <Text style={styles.stopBtnText}>{t("ข้ามไปพิมพ์คำตอบ", "Skip to type answer")}</Text>
            </LuxuryPressable>
          )}
          {transcribing ? (
            <Text style={styles.hint}>{t("กำลังแปลงเสียงเป็นข้อความ…", "Transcribing…")}</Text>
          ) : null}
        </View>
      ) : null}

      {(phase === "review" || phase === "record") && !isRecording ? (
        <>
          <Text style={styles.prompt}>
            {t("คำตอบของคุณ (แก้ไขได้)", "Your answer (edit if needed)")}
          </Text>
          <TextInput
            style={styles.input}
            multiline
            value={transcript}
            onChangeText={setTranscript}
            placeholder={t("คำตอบที่คุณพูด…", "Your spoken answer…")}
            textAlignVertical="top"
          />
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <LuxuryPressable style={styles.btn} sound="submit" onPress={() => void submitTurn()}>
            <Text style={styles.btnText}>
              {turn < INTERACTIVE_SPEAKING_TURN_COUNT
                ? t("คำถามถัดไป →", "Next turn →")
                : t("ส่งตรวจ", "Submit for grading")}
            </Text>
          </LuxuryPressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  grading: { marginTop: 12, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  titleTh: { marginTop: 6, fontSize: 14, color: "#6B7280", textAlign: "center" },
  note: { marginTop: 10, fontSize: 12, color: "#9CA3AF", lineHeight: 18, textAlign: "center" },
  hero: { alignItems: "center", borderRadius: 18, backgroundColor: "#EEF4FF", padding: 16, marginBottom: 16 },
  heroEmoji: { fontSize: 40, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 },
  chip: {
    fontSize: 12,
    fontWeight: "800",
    color: "#004AAD",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: 8 },
  stepsCard: { borderWidth: 2, borderColor: "#111", borderRadius: 16, paddingHorizontal: 12, backgroundColor: "#fff" },
  stepRow: { flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "flex-start" },
  stepRowLine: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  stepIcon: { fontSize: 20, width: 26, textAlign: "center" },
  stepHead: { fontSize: 14, fontWeight: "900", color: "#111" },
  stepBody: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginTop: 1 },
  micCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  micTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  micText: { fontSize: 12, color: "#6B7280", lineHeight: 18, marginTop: 2 },
  micOk: { color: "#047857", fontWeight: "700" },
  micBad: { color: "#B91C1C", fontWeight: "700" },
  micBtn: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
  },
  micBtnBusy: { backgroundColor: "#DC2626" },
  micBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  tip: { marginTop: 14, fontSize: 13, color: "#374151", lineHeight: 20 },
  btnDisabled: { opacity: 0.5 },
  meta: { fontWeight: "800", fontSize: 12, color: "#004AAD" },
  question: { marginTop: 12, fontSize: 17, fontWeight: "700", lineHeight: 24 },
  questionTh: { marginTop: 8, fontSize: 14, color: "#6B7280", lineHeight: 22 },
  countdown: { marginTop: 20, fontSize: 20, fontWeight: "900", textAlign: "center" },
  recordBox: { marginTop: 20, alignItems: "center" },
  stopBtn: {
    marginTop: 16,
    backgroundColor: "#b91c1c",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#111",
  },
  stopBtnText: { color: "#fff", fontWeight: "900" },
  hint: { marginTop: 10, color: "#6B7280" },
  prompt: { marginTop: 20, fontWeight: "700" },
  input: {
    marginTop: 10,
    minHeight: 120,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  formError: { marginTop: 10, color: "#b91c1c", fontWeight: "700" },
  btn: {
    marginTop: 16,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  score: { fontSize: 24, fontWeight: "900" },
  criterion: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  criterionTitle: { fontWeight: "800" },
  criterionEn: { marginTop: 6, fontSize: 14 },
  criterionTh: { marginTop: 4, fontSize: 13, color: "#6B7280" },
});
