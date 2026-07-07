import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { REALWORD_MAX_SCORE } from "../../../../lib/realword-constants";
import { realWordCounts, realWordRunScore } from "../../../../lib/realword-scoring";
import type { RealWordDifficulty, RealWordSet } from "../../../../lib/types";

function shuffleWordSet(wordSet: RealWordSet): RealWordSet {
  const words = [...wordSet.words];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  return { ...wordSet, words };
}

export default function RealWordSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as RealWordDifficulty;
  const setNumber = Number(set);
  const setId = `rw-r${roundNum}-${diff}-s${setNumber}`;
  const maxScore = REALWORD_MAX_SCORE[diff];

  const [wordSet, setWordSet] = useState<RealWordSet | null>(null);
  const [sessionSet, setSessionSet] = useState<RealWordSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"game" | "report">("game");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeSet<RealWordSet>({
        skill: "realword",
        round: roundNum,
        difficulty: diff,
        set: setNumber,
      });
      setWordSet(data);
      setSessionSet(shuffleWordSet(data));
      const sid = await startStudySession({
        exerciseType: "real_word",
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

  const report = useMemo(() => {
    if (!sessionSet) return null;
    const { R, UR, M } = realWordCounts({ words: sessionSet.words, selectedIndices: selected });
    const score = realWordRunScore(UR, M, R, maxScore);
    return { R, UR, M, score };
  }, [sessionSet, selected, maxScore]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = async () => {
    if (!sessionSet || !report) return;
    setPhase("report");
    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "real_word",
        setId,
        score: report.score,
        completed: report.score >= maxScore,
        duration_seconds: duration,
        submission_payload: { selected: [...selected] },
        report_payload: report,
      });
    } catch {
      /* best-effort */
    }
  };

  const retry = () => {
    if (wordSet) {
      setSessionSet(shuffleWordSet(wordSet));
      setSelected(new Set());
      setPhase("game");
      startedAt.current = Date.now();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error || !sessionSet) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Set unavailable"}</Text>
      </View>
    );
  }

  if (phase === "report" && report) {
    const missed = sessionSet.words.filter((w, i) => w.is_real && !selected.has(i));
    const traps = sessionSet.words.filter((w, i) => !w.is_real && selected.has(i));

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.score}>
          Score: {Math.round(report.score)}/{maxScore}
        </Text>
        <Text style={styles.stat}>
          Found {report.UR} of {report.R} real words · Trap clicks: {report.M}
        </Text>

        {missed.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Missed real words</Text>
            <Text style={styles.words}>{missed.map((w) => w.word).join(", ")}</Text>
          </View>
        ) : null}

        {traps.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Trap words clicked</Text>
            <Text style={styles.words}>{traps.map((w) => w.word).join(", ")}</Text>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Vocabulary review</Text>
          {sessionSet.words
            .filter((w) => w.is_real)
            .map((w) => (
              <View key={w.word} style={styles.vocabRow}>
                <Text style={styles.vocabWord}>{w.word}</Text>
                <Text style={styles.vocabTh}>{w.explanationThai}</Text>
              </View>
            ))}
        </View>

        <LuxuryPressable style={styles.btn} onPress={retry}>
          <Text style={styles.btnText}>Try again</Text>
        </LuxuryPressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.meta}>
        Round {roundNum} · {difficulty} · Set {setNumber}
      </Text>
      <Text style={styles.hint}>Tap every word you believe is real English. Avoid traps.</Text>
      <Text style={styles.count}>Selected: {selected.size}</Text>

      <View style={styles.grid}>
        {sessionSet.words.map((w, i) => {
          const on = selected.has(i);
          return (
            <LuxuryPressable
              key={`${w.word}-${i}`}
              style={[styles.tile, on && styles.tileOn]}
              onPress={() => toggle(i)}
            >
              <Text style={[styles.tileText, on && styles.tileTextOn]}>{w.word}</Text>
            </LuxuryPressable>
          );
        })}
      </View>

      <LuxuryPressable style={styles.btn} sound="submit" onPress={() => void submit()}>
        <Text style={styles.btnText}>Submit</Text>
      </LuxuryPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#b91c1c", fontWeight: "700", padding: 20, textAlign: "center" },
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD" },
  hint: { marginTop: 8, color: "#6B7280", fontSize: 14 },
  count: { marginTop: 8, fontWeight: "800", fontSize: 12, color: "#b45309" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  tile: {
    width: "47%",
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  tileOn: { backgroundColor: "#FFCC00", borderColor: "#004AAD" },
  tileText: { fontSize: 15, fontWeight: "700" },
  tileTextOn: { color: "#004AAD" },
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
  score: { fontSize: 24, fontWeight: "900" },
  stat: { marginTop: 8, color: "#6B7280", fontSize: 14 },
  block: { marginTop: 16, padding: 12, backgroundColor: "#f9fafb", borderRadius: 8 },
  blockTitle: { fontWeight: "800", marginBottom: 6 },
  words: { fontSize: 14, lineHeight: 22 },
  vocabRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
  vocabWord: { fontWeight: "900", fontSize: 16 },
  vocabTh: { fontSize: 13, color: "#6B7280", marginTop: 2 },
});
