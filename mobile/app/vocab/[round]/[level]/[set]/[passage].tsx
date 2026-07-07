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
import { shuffleMcOptions } from "../../../../../lib/reading-utils";
import { VOCAB_SESSION_MAX } from "../../../../../lib/vocab-constants";
import type { VocabExamResultRow, VocabPassageUnit, VocabSessionLevel } from "../../../../../lib/types";

export default function VocabSessionScreen() {
  const { round, level, set, passage } = useLocalSearchParams<{
    round: string;
    level: string;
    set: string;
    passage: string;
  }>();
  const roundNum = Number(round);
  const sessionLevel = level as VocabSessionLevel;
  const setNumber = Number(set);
  const passageNumber = Number(passage);
  const setId = `vocab-r${roundNum}-${sessionLevel}-s${setNumber}-p${passageNumber}`;
  const maxScore = VOCAB_SESSION_MAX[sessionLevel];

  const [passageUnit, setPassageUnit] = useState<VocabPassageUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [filledCorrect, setFilledCorrect] = useState<string[]>([]);
  const [userPicks, setUserPicks] = useState<string[]>([]);
  const [rows, setRows] = useState<VocabExamResultRow[]>([]);
  const [score, setScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const parts = useMemo(
    () => (passageUnit ? passageUnit.passageText.split("[BLANK]") : []),
    [passageUnit],
  );
  const shuffledPerBlank = useMemo(() => {
    if (!passageUnit) return [];
    return passageUnit.blanks.map((b) => shuffleMcOptions(b.options, b.correctAnswer));
  }, [passageUnit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<VocabPassageUnit>({
        skill: "vocab",
        round: roundNum,
        set: setNumber,
        passage: passageNumber,
      });
      setPassageUnit(data);
      const sid = await startStudySession({
        exerciseType: "vocabulary",
        skill: "comprehension",
        difficulty: sessionLevel,
        setId,
      });
      sessionIdRef.current = sid;
      startedAt.current = Date.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load passage");
    } finally {
      setLoading(false);
    }
  }, [roundNum, setNumber, passageNumber, sessionLevel, setId]);

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

  if (error || !passageUnit) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Passage unavailable"}</Text>
      </View>
    );
  }

  const blankCount = passageUnit.blanks.length;
  if (parts.length !== blankCount + 1) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Invalid passage: expected {blankCount} [BLANK] markers.
        </Text>
      </View>
    );
  }

  const currentBlank = passageUnit.blanks[questionIndex]!;
  const { shuffled } = shuffledPerBlank[questionIndex] ?? { shuffled: currentBlank.options };

  const selectOption = async (option: string) => {
    const correct = currentBlank.correctAnswer;
    const nextPicks = [...userPicks, option];
    const nextFilled = [...filledCorrect, correct];

    if (questionIndex < blankCount - 1) {
      setUserPicks(nextPicks);
      setFilledCorrect(nextFilled);
      setQuestionIndex((i) => i + 1);
      return;
    }

    const resultRows: VocabExamResultRow[] = passageUnit.blanks.map((b, i) => ({
      blankIndex: i + 1,
      question: b.question,
      userAnswer: nextPicks[i] ?? "",
      correctAnswer: b.correctAnswer,
      isCorrect: nextPicks[i] === b.correctAnswer,
      explanationThai: b.explanationThai,
    }));
    const correctCount = resultRows.filter((r) => r.isCorrect).length;
    const attained = Math.round((correctCount / 6) * maxScore);

    setUserPicks(nextPicks);
    setFilledCorrect(nextFilled);
    setRows(resultRows);
    setScore(attained);
    setPhase("report");

    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "vocabulary",
        setId,
        score: attained,
        completed: correctCount === 6,
        duration_seconds: duration,
        submission_payload: { picks: nextPicks },
        report_payload: { score: attained, maxScore, correctCount },
      });
    } catch {
      /* best-effort */
    }
  };

  if (phase === "report") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {score}/{maxScore}
        </Text>
        {rows.map((row) => (
          <View key={row.blankIndex} style={styles.reportRow}>
            <Text style={[styles.reportLabel, row.isCorrect ? styles.ok : styles.bad]}>
              Blank {row.blankIndex} — {row.isCorrect ? "Correct" : "Wrong"}
            </Text>
            <Text style={styles.reportA}>You: {row.userAnswer}</Text>
            <Text style={styles.reportC}>Answer: {row.correctAnswer}</Text>
            {row.explanationThai ? (
              <Text style={styles.reportTh}>{row.explanationThai}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        Set {setNumber} · Passage {passageNumber} · Blank {questionIndex + 1}/{blankCount}
      </Text>

      <View style={styles.passageBox}>
        <Text style={styles.passageText}>
          {parts.map((segment, i) => (
            <Text key={i}>
              {segment}
              {i < blankCount ? (
                <Text style={styles.blank}>
                  {filledCorrect[i] !== undefined ? filledCorrect[i] : "______"}
                </Text>
              ) : null}
            </Text>
          ))}
        </Text>
      </View>

      <Text style={styles.question}>{currentBlank.question}</Text>

      {shuffled.map((option) => (
        <LuxuryPressable
          key={option}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => void selectOption(option)}
        >
          <Text style={styles.optionText}>{option}</Text>
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
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD", marginBottom: 12 },
  passageBox: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
    marginBottom: 16,
  },
  passageText: { fontSize: 15, lineHeight: 24 },
  blank: { fontWeight: "900", color: "#004AAD", textDecorationLine: "underline" },
  question: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
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
  reportA: { marginTop: 4, fontSize: 13 },
  reportC: { marginTop: 2, fontSize: 13, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
