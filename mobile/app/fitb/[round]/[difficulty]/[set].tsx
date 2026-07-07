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
import { fetchPracticeSet, finishStudySession, startStudySession } from "../../../../lib/api";
import { splitFitbPassage } from "../../../../lib/fitb-passage";
import { fitbMaxScore } from "../../../../lib/fitb-constants";
import {
  assembleFitbAttempt,
  calculateFitbDetScore,
  fitbExpectedPrefix,
  fitbRemainderLength,
  gradeFitbBlank,
} from "../../../../lib/fitb-scoring";
import type { FitbBlankGrade, FitbDifficulty, FitbSet } from "../../../../lib/types";

export default function FitbSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as FitbDifficulty;
  const setNumber = Number(set);
  const setId = `fitb-r${roundNum}-${diff}-s${setNumber}`;

  const [fitbSet, setFitbSet] = useState<FitbSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "report">("quiz");
  const [inputs, setInputs] = useState<string[]>([]);
  const [clueUsed, setClueUsed] = useState<boolean[]>([]);
  const [clueVisible, setClueVisible] = useState<boolean[]>([]);
  const [grades, setGrades] = useState<FitbBlankGrade[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [detScore, setDetScore] = useState(0);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const n = fitbSet?.missingWords.length ?? 0;
  const maxScore = fitbMaxScore(diff);
  const segments = useMemo(
    () => (fitbSet ? splitFitbPassage(fitbSet.passage) : []),
    [fitbSet],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<FitbSet>({
        skill: "fitb",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setFitbSet(data);
      const blanks = data.missingWords.length;
      setInputs(new Array(blanks).fill(""));
      setClueUsed(new Array(blanks).fill(false));
      setClueVisible(new Array(blanks).fill(false));
      const sid = await startStudySession({
        exerciseType: "fill-in-blank",
        skill: "literacy",
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

  const canSubmit = useMemo(() => {
    if (!fitbSet) return false;
    for (let i = 0; i < n; i++) {
      const rem = fitbRemainderLength(fitbSet.missingWords[i]!);
      if (rem === 0) continue;
      if (inputs[i]!.trim().length !== rem) return false;
    }
    return n > 0;
  }, [fitbSet, inputs, n]);

  const toggleClue = (i: number) => {
    setClueVisible((v) => {
      const nv = [...v];
      nv[i] = !nv[i];
      return nv;
    });
    setClueUsed((u) => {
      if (u[i]) return u;
      const nu = [...u];
      nu[i] = true;
      return nu;
    });
  };

  const submit = async () => {
    if (!fitbSet) return;
    const g: FitbBlankGrade[] = [];
    const ua: string[] = [];
    for (let i = 0; i < n; i++) {
      const mw = fitbSet.missingWords[i]!;
      g.push(gradeFitbBlank(mw, inputs[i] ?? ""));
      ua.push(assembleFitbAttempt(mw, inputs[i] ?? ""));
    }
    const score = calculateFitbDetScore({ grades: g, clueUsed, difficulty: diff });
    setGrades(g);
    setUserAnswers(ua);
    setDetScore(score);
    setPhase("report");

    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "fill-in-blank",
        setId,
        score,
        completed: score >= maxScore,
        duration_seconds: duration,
        submission_payload: { inputs, clueUsed, grades: g },
        report_payload: { score, maxScore, userAnswers: ua },
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

  if (error || !fitbSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Set unavailable"}</Text>
      </View>
    );
  }

  if (phase === "report") {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {detScore}/{maxScore}
        </Text>
        {fitbSet.missingWords.map((mw, i) => (
          <View key={i} style={styles.reportRow}>
            <Text style={styles.reportGrade}>
              Blank {i + 1}: {grades[i]} {clueUsed[i] ? "(clue used)" : ""}
            </Text>
            <Text style={styles.reportAnswer}>You: {userAnswers[i]}</Text>
            <Text style={styles.reportCorrect}>Answer: {mw.correctWord}</Text>
            {mw.explanationThai ? (
              <Text style={styles.reportTh}>{mw.explanationThai}</Text>
            ) : null}
          </View>
        ))}
        <LuxuryPressable style={styles.btn} onPress={() => setPhase("quiz")}>
          <Text style={styles.btnText}>Try again</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  let blankCursor = 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        Round {roundNum} · {difficulty} · Set {setNumber}
      </Text>

      <View style={styles.passage}>
        <Text style={styles.passageText}>
          {segments.map((seg, idx) => {
            if (seg.type === "text") {
              return <Text key={idx}>{seg.value}</Text>;
            }
            const bi = seg.blankIndex >= 0 ? seg.blankIndex : blankCursor++;
            const mw = fitbSet.missingWords[bi];
            if (!mw) return <Text key={idx}>[?]</Text>;
            const prefix = fitbExpectedPrefix(mw);
            const rem = fitbRemainderLength(mw);
            return (
              <Text key={idx}>
                <Text style={styles.prefix}>{prefix}</Text>
                <TextInput
                  style={styles.blankInput}
                  value={inputs[bi] ?? ""}
                  onChangeText={(t) => {
                    const next = t.slice(0, rem);
                    setInputs((prev) => {
                      const cp = [...prev];
                      cp[bi] = next;
                      return cp;
                    });
                  }}
                  maxLength={rem}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <LuxuryPressable onPress={() => toggleClue(bi)} style={styles.clueBtn}>
                  <Text style={styles.clueBtnText}>{clueVisible[bi] ? "Hide" : "Clue"}</Text>
                </LuxuryPressable>
                {clueVisible[bi] ? (
                  <Text style={styles.clueText}> {mw.clue}</Text>
                ) : null}
              </Text>
            );
          })}
        </Text>
      </View>

      <LuxuryPressable
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        disabled={!canSubmit}
        sound="submit" onPress={() => void submit()}
      >
        <Text style={styles.btnText}>Check answer</Text>
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
  passage: {
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  passageText: { fontSize: 16, lineHeight: 26 },
  prefix: { fontWeight: "800", color: "#004AAD" },
  blankInput: {
    borderBottomWidth: 2,
    borderBottomColor: "#004AAD",
    minWidth: 48,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: "700",
  },
  clueBtn: {
    marginLeft: 4,
    backgroundColor: "#FFCC00",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clueBtnText: { fontSize: 10, fontWeight: "800", color: "#004AAD" },
  clueText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  btn: {
    marginTop: 20,
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
  reportGrade: { fontWeight: "800", textTransform: "capitalize" },
  reportAnswer: { marginTop: 4, fontSize: 14 },
  reportCorrect: { marginTop: 2, fontSize: 14, color: "#15803d", fontWeight: "700" },
  reportTh: { marginTop: 6, fontSize: 13, color: "#6B7280" },
});
