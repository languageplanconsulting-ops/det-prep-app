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

import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import {
  fetchPracticeSet,
  finishStudySession,
  startStudySession,
  submitDialogueSummaryReport,
} from "../../../../lib/api";
import {
  DIALOGUE_SUMMARY_MAX_SCORE,
  DIALOGUE_SUMMARY_MIN_WORDS,
} from "../../../../lib/dialogue-summary-constants";
import type {
  DialogueSummaryAttemptReport,
  DialogueSummaryDifficulty,
  DialogueSummaryExam,
} from "../../../../lib/types";

function randomAttemptId(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function DialogueSummarySessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as DialogueSummaryDifficulty;
  const setNumber = Number(set);
  const setId = `ds-r${roundNum}-${diff}-s${setNumber}`;
  const attemptId = useMemo(() => randomAttemptId(), []);

  const [exam, setExam] = useState<DialogueSummaryExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [phase, setPhase] = useState<"write" | "grading" | "report">("write");
  const [report, setReport] = useState<DialogueSummaryAttemptReport | null>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report" && !!report);

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const meetsMin = wordCount >= DIALOGUE_SUMMARY_MIN_WORDS;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<DialogueSummaryExam>({
        skill: "dialogue_summary",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setExam(data);
      const sid = await startStudySession({
        exerciseType: "dialogue_summary",
        skill: "conversation",
        difficulty: diff,
        setId,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load set");
    } finally {
      setLoading(false);
    }
  }, [roundNum, diff, setNumber, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!exam || !meetsMin) {
      setError(`Write at least ${DIALOGUE_SUMMARY_MIN_WORDS} words.`);
      return;
    }
    setError(null);
    setPhase("grading");
    try {
      const r = await submitDialogueSummaryReport({
        attemptId,
        summary,
        exam,
      });
      setReport(r);
      setPhase("report");

      const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
      try {
        await finishStudySession({
          sessionId: sessionIdRef.current ?? undefined,
          exerciseType: "dialogue_summary",
          setId,
          score: r.score160,
          completed: r.score160 >= DIALOGUE_SUMMARY_MAX_SCORE,
          duration_seconds: duration,
          submission_payload: { summary, attemptId },
          report_payload: { score160: r.score160, gradingSource: r.gradingSource },
        });
      } catch {
        /* best-effort */
      }
    } catch (e) {
      setPhase("write");
      setError(e instanceof Error ? e.message : "Grading failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error && !exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Set unavailable</Text>
      </View>
    );
  }

  if (phase === "grading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
        <Text style={styles.grading}>Grading your summary…</Text>
        <Text style={styles.gradingSub}>Uses AI credits on your account.</Text>
      </View>
    );
  }

  if (phase === "report" && report) {
    const criteria = [
      { key: "Relevancy", r: report.relevancy },
      { key: "Grammar", r: report.grammar },
      { key: "Flow", r: report.flow },
      { key: "Vocabulary", r: report.vocabulary },
    ] as const;

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {Math.round(report.score160)}/{DIALOGUE_SUMMARY_MAX_SCORE}
        </Text>
        {report.gradingSource ? (
          <Text style={styles.source}>Graded via {report.gradingSource}</Text>
        ) : null}
        {criteria.map(({ key, r }) => (
          <View key={key} style={styles.criterion}>
            <Text style={styles.criterionTitle}>
              {key} — {Math.round(r.scorePercent)}% (~{r.pointsOn160} pts)
            </Text>
            <Text style={styles.criterionEn}>{r.summary.en}</Text>
            <Text style={styles.criterionTh}>{r.summary.th}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        {exam.titleEn} · Set {setNumber}
      </Text>
      {exam.titleTh ? <Text style={styles.titleTh}>{exam.titleTh}</Text> : null}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Scenario</Text>
        {exam.scenarioSentences.map((s, i) => (
          <Text key={i} style={styles.line}>
            {s}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Dialogue</Text>
        {exam.dialogue.map((t, i) => (
          <View key={i} style={styles.turn}>
            <Text style={styles.speaker}>{t.speaker}</Text>
            <Text style={styles.line}>{t.text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.prompt}>
        Write a summary in your own words (min {DIALOGUE_SUMMARY_MIN_WORDS} words).
      </Text>
      <Text style={styles.wordCount}>
        {wordCount} word{wordCount === 1 ? "" : "s"}
        {!meetsMin ? ` · need ${DIALOGUE_SUMMARY_MIN_WORDS - wordCount} more` : ""}
      </Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Your summary…"
        value={summary}
        onChangeText={setSummary}
        autoCapitalize="sentences"
        autoCorrect
        textAlignVertical="top"
      />

      {error ? <Text style={styles.formError}>{error}</Text> : null}

      <LuxuryPressable
        style={[styles.btn, !meetsMin && styles.btnDisabled]}
        disabled={!meetsMin}
        sound="submit" onPress={() => void submit()}
      >
        <Text style={styles.btnText}>Submit for grading</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },
  grading: { marginTop: 16, fontWeight: "800", fontSize: 16 },
  gradingSub: { marginTop: 8, color: "#6B7280", fontSize: 13 },
  meta: { fontWeight: "800", fontSize: 15, color: "#004AAD" },
  titleTh: { marginTop: 4, fontSize: 14, color: "#6B7280" },
  block: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  blockTitle: { fontWeight: "900", marginBottom: 8 },
  turn: { marginTop: 10 },
  speaker: { fontWeight: "800", fontSize: 12, color: "#004AAD" },
  line: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  prompt: { marginTop: 20, fontWeight: "700", fontSize: 14 },
  wordCount: { marginTop: 6, fontSize: 12, color: "#6B7280", fontWeight: "700" },
  input: {
    marginTop: 12,
    minHeight: 160,
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
  btnDisabled: { opacity: 0.45 },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  score: { fontSize: 24, fontWeight: "900" },
  source: { marginTop: 6, fontSize: 12, color: "#6B7280" },
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
