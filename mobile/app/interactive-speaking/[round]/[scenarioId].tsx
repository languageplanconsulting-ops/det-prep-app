import { Audio } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useScoreReveal } from "../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../components/LuxuryPressable";
import {
  ensureMicPermission,
  startTurnRecording,
  stopTurnRecording,
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [report, setReport] = useState<InteractiveSpeakingAttemptReport | null>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report" && !!report);

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
      setError(e instanceof Error ? e.message : "Could not load scenario");
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
      setError("Microphone permission required. You can type your answer on the review screen.");
      setPhase("record");
      return;
    }
    try {
      const rec = await startTurnRecording();
      setRecording(rec);
      setIsRecording(true);
      setPhase("record");
    } catch {
      setError("Could not start recording. Type your answer instead.");
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
      setError("Transcription failed. Edit your answer below.");
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
      setError(e instanceof Error ? e.message : "Could not start session");
    }
  };

  const submitTurn = async () => {
    const trimmed = transcript.trim();
    if (countWords(trimmed) < 3) {
      setError("Speak or type at least a few words.");
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
        setError(e instanceof Error ? e.message : "Grading failed");
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
      setError(e instanceof Error ? e.message : "Could not load next question");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error && !scenario) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!scenario) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Scenario unavailable</Text>
      </View>
    );
  }

  if (phase === "report" && report) {
    const criteria = [
      { label: "Task", r: report.taskRelevancy },
      { label: "Grammar", r: report.grammar },
      { label: "Coherence", r: report.coherence },
      { label: "Vocabulary", r: report.vocabulary },
    ];
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>Score: {Math.round(report.score160)}/160</Text>
        {criteria.map(({ label, r }) => (
          <View key={label} style={styles.criterion}>
            <Text style={styles.criterionTitle}>
              {label} — {Math.round(r.scorePercent)}%
            </Text>
            <Text style={styles.criterionEn}>{r.summary.en}</Text>
            <Text style={styles.criterionTh}>{r.summary.th}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  if (phase === "grading" && !report) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
        <Text style={styles.grading}>Working…</Text>
      </View>
    );
  }

  if (phase === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{scenario.titleEn}</Text>
        <Text style={styles.titleTh}>{scenario.titleTh}</Text>
        <Text style={styles.note}>
          Round {round} · 6 turns · Uses VIP AI credits when you submit for feedback.
        </Text>
        {error ? <Text style={styles.formError}>{error}</Text> : null}
        <LuxuryPressable style={styles.btn} onPress={() => void startExam()}>
          <Text style={styles.btnText}>Start scenario</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        Turn {turn}/{INTERACTIVE_SPEAKING_TURN_COUNT}
      </Text>
      <Text style={styles.question}>{currentQ.en}</Text>
      {currentQ.th ? <Text style={styles.questionTh}>{currentQ.th}</Text> : null}

      {phase === "prep" ? (
        <Text style={styles.countdown}>Get ready… {prepLeft}</Text>
      ) : null}

      {phase === "record" ? (
        <View style={styles.recordBox}>
          <Text style={styles.countdown}>
            {isRecording ? `Recording… ${recLeft}s` : "Tap stop when finished"}
          </Text>
          {isRecording ? (
            <LuxuryPressable style={styles.stopBtn} onPress={() => void stopRecording()}>
              <Text style={styles.stopBtnText}>Stop recording</Text>
            </LuxuryPressable>
          ) : (
            <LuxuryPressable style={styles.stopBtn} onPress={() => setPhase("review")}>
              <Text style={styles.stopBtnText}>Skip to type answer</Text>
            </LuxuryPressable>
          )}
          {transcribing ? <Text style={styles.hint}>Transcribing…</Text> : null}
        </View>
      ) : null}

      {(phase === "review" || phase === "record") && !isRecording ? (
        <>
          <Text style={styles.prompt}>Your answer (edit if needed)</Text>
          <TextInput
            style={styles.input}
            multiline
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Your spoken answer…"
            textAlignVertical="top"
          />
          {error ? <Text style={styles.formError}>{error}</Text> : null}
          <LuxuryPressable style={styles.btn} sound="submit" onPress={() => void submitTurn()}>
            <Text style={styles.btnText}>
              {turn < INTERACTIVE_SPEAKING_TURN_COUNT ? "Next turn →" : "Submit for grading"}
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
  title: { fontSize: 22, fontWeight: "900" },
  titleTh: { marginTop: 6, fontSize: 14, color: "#6B7280" },
  note: { marginTop: 12, fontSize: 13, color: "#6B7280", lineHeight: 20 },
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
