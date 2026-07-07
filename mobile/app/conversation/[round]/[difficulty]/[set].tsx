import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import { fetchPracticeSet, finishStudySession, startStudySession } from "../../../../lib/api";
import {
  CONVERSATION_FULL_SCORE,
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
} from "../../../../lib/conversation-constants";
import { computeItemOk, conversationScore } from "../../../../lib/conversation-scoring";
import type { ConversationDifficulty, ConversationExam } from "../../../../lib/types";

type Stage = "intro" | "scenario" | "main" | "report";

export default function ConversationSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as ConversationDifficulty;
  const setNumber = Number(set);
  const setId = `ic-r${roundNum}-${diff}-s${setNumber}`;
  const maxScore = CONVERSATION_FULL_SCORE;

  const [exam, setExam] = useState<ConversationExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [scenarioStep, setScenarioStep] = useState(0);
  const [mainStep, setMainStep] = useState(0);
  const [scenarioPicks, setScenarioPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: CONVERSATION_SCENARIO_Q_COUNT }, () => null),
  );
  const [mainPicks, setMainPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: CONVERSATION_MAIN_Q_COUNT }, () => null),
  );
  const [itemOk, setItemOk] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(stage === "report");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<ConversationExam>({
        skill: "conversation",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setExam(data);
      const sid = await startStudySession({
        exerciseType: "interactive_conversation",
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

  const finish = async (sp: (number | null)[], mp: (number | null)[]) => {
    if (!exam) return;
    const correctScenario = exam.scenarioQuestions.map((q) => q.correctIndex);
    const correctMain = exam.mainQuestions.map((q) => q.correctIndex);
    const ok = computeItemOk(sp, mp, {
      correctScenarioIndex: correctScenario,
      correctMainIndex: correctMain,
    });
    const correctCount = ok.filter(Boolean).length;
    const attained = conversationScore(correctCount, maxScore);
    setItemOk(ok);
    setScore(attained);
    setStage("report");

    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "interactive_conversation",
        setId,
        score: attained,
        completed: correctCount === ok.length,
        duration_seconds: duration,
        submission_payload: { scenarioPicks: sp, mainPicks: mp },
        report_payload: { score: attained, maxScore, itemOk: ok },
      });
    } catch {
      /* best-effort */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error || !exam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Set unavailable"}</Text>
      </View>
    );
  }

  if (stage === "report") {
    const labels = [
      ...exam.scenarioQuestions.map((_, i) => `Scenario Q${i + 1}`),
      ...exam.mainQuestions.map((_, i) => `Main Q${i + 1}`),
    ];
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {score}/{maxScore}
        </Text>
        <Text style={styles.hint}>
          {itemOk.filter(Boolean).length}/{itemOk.length} correct
        </Text>
        {labels.map((label, i) => (
          <View key={label} style={styles.reportRow}>
            <Text style={[styles.reportLabel, itemOk[i] ? styles.ok : styles.bad]}>
              {label} — {itemOk[i] ? "Correct" : "Wrong"}
            </Text>
            <Text style={styles.reportExp}>
              {i < CONVERSATION_SCENARIO_Q_COUNT
                ? exam.scenarioQuestions[i]!.explanation
                : exam.mainQuestions[i - CONVERSATION_SCENARIO_Q_COUNT]!.explanation}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  if (stage === "intro") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>{exam.title}</Text>
        <Text style={styles.note}>
          Read the scenario below. On the website you would listen first — audio is not bundled in
          the mobile API yet.
        </Text>
        <View style={styles.passageBox}>
          <Text style={styles.scenario}>{exam.scenario}</Text>
        </View>
        {exam.highlightedWords.length > 0 ? (
          <View style={styles.vocabBox}>
            <Text style={styles.vocabTitle}>Key vocabulary</Text>
            {exam.highlightedWords.map((h) => (
              <Text key={h.word} style={styles.vocabLine}>
                <Text style={styles.vocabWord}>{h.word}</Text> — {h.translation}
              </Text>
            ))}
          </View>
        ) : null}
        <LuxuryPressable style={styles.btn} onPress={() => setStage("scenario")}>
          <Text style={styles.btnText}>Answer scenario questions →</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  if (stage === "scenario") {
    const q = exam.scenarioQuestions[scenarioStep]!;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.step}>
          Scenario question {scenarioStep + 1}/{CONVERSATION_SCENARIO_Q_COUNT}
        </Text>
        <Text style={styles.question}>{q.question}</Text>
        {q.options.map((opt, j) => (
          <LuxuryPressable
            key={opt}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => {
              const next = [...scenarioPicks];
              next[scenarioStep] = j;
              setScenarioPicks(next);
              if (scenarioStep < CONVERSATION_SCENARIO_Q_COUNT - 1) {
                setScenarioStep((s) => s + 1);
              } else {
                setStage("main");
                setMainStep(0);
              }
            }}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </LuxuryPressable>
        ))}
      </ScrollView>
    );
  }

  const mq = exam.mainQuestions[mainStep]!;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.step}>
        Main question {mainStep + 1}/{CONVERSATION_MAIN_Q_COUNT}
      </Text>
      <View style={styles.passageBox}>
        <Text style={styles.transcriptLabel}>Dialogue</Text>
        <Text style={styles.transcript}>{mq.transcript}</Text>
      </View>
      <Text style={styles.question}>{mq.question}</Text>
      {mq.options.map((opt, j) => (
        <LuxuryPressable
          key={opt}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => {
            const next = [...mainPicks];
            next[mainStep] = j;
            setMainPicks(next);
            if (mainStep < CONVERSATION_MAIN_Q_COUNT - 1) {
              setMainStep((s) => s + 1);
            } else {
              void finish(scenarioPicks, next);
            }
          }}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </LuxuryPressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 16, color: "#004AAD" },
  note: { marginTop: 8, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  passageBox: {
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  scenario: { fontSize: 15, lineHeight: 24 },
  vocabBox: { marginTop: 16, padding: 12, backgroundColor: "#FFF7D1", borderRadius: 8 },
  vocabTitle: { fontWeight: "800", marginBottom: 8 },
  vocabLine: { fontSize: 14, marginTop: 4 },
  vocabWord: { fontWeight: "900", color: "#004AAD" },
  btn: {
    marginTop: 20,
    backgroundColor: "#004AAD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#111",
    alignItems: "center",
  },
  btnText: { color: "#FFCC00", fontWeight: "900", fontSize: 16 },
  step: { fontWeight: "800", fontSize: 12, color: "#6B7280" },
  question: { fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 12 },
  transcriptLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 6 },
  transcript: { fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  option: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPressed: { backgroundColor: "#FFF7D1" },
  optionText: { fontSize: 15 },
  score: { fontSize: 24, fontWeight: "900" },
  hint: { marginTop: 8, color: "#6B7280" },
  reportRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reportLabel: { fontWeight: "800" },
  ok: { color: "#15803d" },
  bad: { color: "#b91c1c" },
  reportExp: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
