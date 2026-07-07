import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useScoreReveal } from "../../../../../hooks/useScoreReveal";
import { LuxuryPressable } from "../../../../../components/LuxuryPressable";
import { fetchPracticeSet, finishStudySession, startStudySession } from "../../../../../lib/api";
import { READING_DIFFICULTY_MAX } from "../../../../../lib/reading-constants";
import { answersMatch, shuffleMcOptions } from "../../../../../lib/reading-utils";
import type {
  ReadingDifficulty,
  ReadingExamResultRow,
  ReadingExamUnit,
  ReadingQuestionKey,
} from "../../../../../lib/types";

const ORDER: {
  key: ReadingQuestionKey;
  label: string;
  pick: (s: ReadingExamUnit) => ReadingExamUnit["missingSentence"];
}[] = [
  { key: "missingSentence", label: "Q1 — Missing paragraph", pick: (s) => s.missingSentence },
  {
    key: "informationLocation",
    label: "Q2 — Information location",
    pick: (s) => s.informationLocation,
  },
  { key: "bestTitle", label: "Q3 — Best title", pick: (s) => s.bestTitle },
  { key: "mainIdea", label: "Q4 — Main idea", pick: (s) => s.mainIdea },
];

export default function ReadingSessionScreen() {
  const { round, difficulty, set, exam } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
    exam: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as ReadingDifficulty;
  const setNumber = Number(set);
  const examNumber = Number(exam);
  const setId = `read-r${roundNum}-${diff}-s${setNumber}-e${examNumber}`;
  const maxScore = READING_DIFFICULTY_MAX[diff];

  const [readingExam, setReadingExam] = useState<ReadingExamUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [step, setStep] = useState(0);
  const [q1Revealed, setQ1Revealed] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<ReadingQuestionKey, string>>>({});
  const [rows, setRows] = useState<ReadingExamResultRow[]>([]);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const shuffledPerStep = useMemo(() => {
    if (!readingExam) return [];
    return ORDER.map(({ pick }) => {
      const block = pick(readingExam);
      return shuffleMcOptions(block.options, block.correctAnswer);
    });
  }, [readingExam]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<ReadingExamUnit>({
        skill: "reading",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
        exam: examNumber,
      });
      setReadingExam(data);
      const sid = await startStudySession({
        exerciseType: "reading",
        skill: "comprehension",
        difficulty: diff,
        setId,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load exam");
    } finally {
      setLoading(false);
    }
  }, [roundNum, diff, setNumber, examNumber, setId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error || !readingExam) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Exam unavailable"}</Text>
      </View>
    );
  }

  const current = ORDER[step]!;
  const block = current.pick(readingExam);
  const { shuffled } = shuffledPerStep[step] ?? { shuffled: block.options };
  const canAdvance =
    step === 0 ? q1Revealed : Boolean(answers[current.key] && answers[current.key]!.length > 0);

  const finish = async (resultRows: ReadingExamResultRow[]) => {
    const correctCount = resultRows.filter((r) => r.isCorrect).length;
    const attained = Math.round((correctCount / 4) * maxScore);
    setRows(resultRows);
    setScore(attained);
    setPhase("report");

    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "reading",
        setId,
        score: attained,
        completed: correctCount === 4,
        duration_seconds: duration,
        submission_payload: { answers: resultRows },
        report_payload: { score: attained, maxScore, correctCount },
      });
    } catch {
      /* best-effort */
    }
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (step < ORDER.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const resultRows: ReadingExamResultRow[] = ORDER.map(({ key, label, pick }) => {
      const b = pick(readingExam);
      const userAnswer = answers[key] ?? "";
      return {
        key,
        label,
        question: b.question,
        userAnswer,
        correctAnswer: b.correctAnswer,
        isCorrect: answersMatch(userAnswer, b.correctAnswer),
        explanationThai: b.explanationThai,
      };
    });
    void finish(resultRows);
  };

  if (phase === "report") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {score}/{maxScore}
        </Text>
        {rows.map((row) => (
          <View key={row.key} style={styles.reportRow}>
            <Text style={[styles.reportLabel, row.isCorrect ? styles.ok : styles.bad]}>
              {row.label} — {row.isCorrect ? "Correct" : "Wrong"}
            </Text>
            <Text style={styles.reportQ}>{row.question}</Text>
            <Text style={styles.reportA}>You: {row.userAnswer || "—"}</Text>
            <Text style={styles.reportC}>Answer: {row.correctAnswer}</Text>
            {row.explanationThai ? (
              <Text style={styles.reportTh}>{row.explanationThai}</Text>
            ) : null}
          </View>
        ))}
        <LuxuryPressable style={styles.btn} onPress={() => setPhase("quiz")}>
          <Text style={styles.btnText}>Review passage</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  const { passage } = readingExam;
  const correctP2 = readingExam.missingSentence.correctAnswer;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        Set {setNumber} · Exam {examNumber} · Step {step + 1}/4
      </Text>

      <View style={styles.passageBox}>
        <Text style={styles.para}>{passage.p1}</Text>
        {step === 0 && !q1Revealed ? (
          <Text style={styles.paraHidden}>[Paragraph 2 hidden until Q1 answered]</Text>
        ) : (
          <Text style={styles.para}>{passage.p2}</Text>
        )}
        <Text style={styles.para}>{passage.p3}</Text>
      </View>

      <Text style={styles.qLabel}>{current.label}</Text>
      <Text style={styles.question}>{block.question}</Text>

      {shuffled.map((option) => (
        <LuxuryPressable
          key={option}
          style={({ pressed }) => [
            styles.option,
            pressed && styles.optionPressed,
            step === 0 && answers.missingSentence === option && styles.optionSelected,
            step > 0 && answers[current.key] === option && styles.optionSelected,
          ]}
          onPress={() => {
            if (step === 0) {
              setAnswers((a) => ({ ...a, missingSentence: option }));
              setQ1Revealed(true);
            } else {
              setAnswers((a) => ({ ...a, [current.key]: option }));
            }
          }}
        >
          <Text style={styles.optionText}>{option}</Text>
        </LuxuryPressable>
      ))}

      {step === 0 && q1Revealed ? (
        <Text style={styles.revealNote}>
          Correct paragraph 2: {answers.missingSentence === correctP2 ? "✓" : "✗"} (revealed above)
        </Text>
      ) : null}

      <LuxuryPressable
        style={[styles.btn, !canAdvance && styles.btnDisabled]}
        disabled={!canAdvance}
        onPress={goNext}
      >
        <Text style={styles.btnText}>{step < 3 ? "Next" : "Finish"}</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD", marginBottom: 12 },
  passageBox: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },
  para: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  paraHidden: { fontSize: 14, fontStyle: "italic", color: "#9ca3af", marginBottom: 12 },
  qLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  question: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 12 },
  option: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPressed: { backgroundColor: "#FFF7D1" },
  optionSelected: { backgroundColor: "#cde0ff", borderColor: "#004AAD" },
  optionText: { fontSize: 15 },
  revealNote: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  btn: {
    marginTop: 12,
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
  reportQ: { marginTop: 4, fontSize: 14 },
  reportA: { marginTop: 4, fontSize: 13 },
  reportC: { marginTop: 2, fontSize: 13, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
