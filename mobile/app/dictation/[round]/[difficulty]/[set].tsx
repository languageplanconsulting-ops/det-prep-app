import { Audio } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { LuxuryPressable } from "../../../../components/LuxuryPressable";
import { useScoreReveal } from "../../../../hooks/useScoreReveal";
import { API_BASE_URL } from "../../../../lib/config";
import { fetchDictationItem, finishStudySession, startStudySession } from "../../../../lib/api";
import {
  diffDictationChars,
  dictationScoreFromDiff,
  type CharDisplaySegment,
} from "../../../../lib/dictation-diff";
import { DICTATION_MAX_SCORE } from "../../../../lib/dictation-constants";
import type { DictationDifficulty, DictationItem } from "../../../../lib/types";

export default function DictationSessionScreen() {
  const { round, difficulty, set } = useLocalSearchParams<{
    round: string;
    difficulty: string;
    set: string;
  }>();
  const roundNum = Number(round);
  const diff = difficulty as DictationDifficulty;
  const setNumber = Number(set);

  const [item, setItem] = useState<DictationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userText, setUserText] = useState("");
  const [phase, setPhase] = useState<"practice" | "report">("practice");
  const [segments, setSegments] = useState<CharDisplaySegment[]>([]);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const startedAt = useRef(Date.now());
  const sessionIdRef = useRef<string | null>(null);

  useScoreReveal(phase === "report");

  const setId = `dict-r${roundNum}-${diff}-s${setNumber}`;
  const maxScore = DICTATION_MAX_SCORE[diff];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDictationItem(roundNum, diff, setNumber);
      setItem(data);
      const sid = await startStudySession({
        exerciseType: "dictation",
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
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, [load]);

  const audioUri = item?.audioUrl
    ? item.audioUrl
    : item?.audioPath
      ? `${API_BASE_URL}${item.audioPath}`
      : null;

  const togglePlay = async () => {
    if (!audioUri) return;
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setPlaying(false);
          return;
        }
      }
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
        soundRef.current = sound;
      }
      await soundRef.current!.playAsync();
      setPlaying(true);
      soundRef.current!.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) setPlaying(false);
      });
    } catch {
      setPlaying(false);
    }
  };

  const submit = async () => {
    if (!item) return;
    const d = diffDictationChars(item.transcript, userText);
    const attained = dictationScoreFromDiff(d.correctChars, d.totalChars, maxScore);
    setSegments(d.segments);
    setScore(attained);
    setPhase("report");

    const duration = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    try {
      await finishStudySession({
        sessionId: sessionIdRef.current ?? undefined,
        exerciseType: "dictation",
        setId,
        score: attained,
        completed: attained >= maxScore,
        duration_seconds: duration,
        submission_payload: { userText, transcript: item.transcript },
        report_payload: { segments: d.segments, score: attained, maxScore },
      });
    } catch {
      /* progress save is best-effort on mobile v1 */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004AAD" />
      </View>
    );
  }

  if (error || !item) {
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
          Score: {Math.round(score)}/{maxScore}
        </Text>
        <Text style={styles.hint}>Same grading as the website (character diff).</Text>
        <View style={styles.reportBox}>
          {segments.map((seg, i) => (
            <Text
              key={i}
              style={[
                styles.char,
                seg.kind === "match" && styles.charMatch,
                seg.kind === "wrong" && styles.charWrong,
                seg.kind === "missing" && styles.charMissing,
              ]}
            >
              {seg.kind === "missing" ? seg.expectedCh : seg.ch}
            </Text>
          ))}
        </View>
        <Text style={styles.answerLabel}>Answer</Text>
        <Text style={styles.transcript}>{item.transcript}</Text>
        <LuxuryPressable style={styles.btn} onPress={() => setPhase("practice")}>
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
      <Text style={styles.hintText}>{item.hintText}</Text>

      <LuxuryPressable style={styles.playBtn} onPress={() => void togglePlay()}>
        <Text style={styles.playBtnText}>{playing ? "Pause" : "Play audio"}</Text>
      </LuxuryPressable>
      {!audioUri ? (
        <Text style={styles.warn}>No audio URL — use the website or check admin upload.</Text>
      ) : null}

      <TextInput
        style={styles.input}
        multiline
        placeholder="Type what you hear…"
        value={userText}
        onChangeText={setUserText}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <LuxuryPressable style={styles.btn} sound="submit" onPress={() => void submit()}>
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
  meta: { fontWeight: "800", fontSize: 13, color: "#004AAD" },
  hintText: { marginTop: 8, color: "#6B7280", fontSize: 14 },
  playBtn: {
    marginTop: 16,
    backgroundColor: "#06b6d4",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#111",
    alignItems: "center",
  },
  playBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  warn: { marginTop: 8, color: "#b45309", fontSize: 12 },
  input: {
    marginTop: 20,
    minHeight: 140,
    borderWidth: 2,
    borderColor: "#111",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    textAlignVertical: "top",
  },
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
  hint: { marginTop: 8, color: "#6B7280" },
  reportBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  char: { fontSize: 16, fontFamily: "Menlo" },
  charMatch: { color: "#15803d" },
  charWrong: { color: "#b91c1c", textDecorationLine: "line-through" },
  charMissing: {
    color: "#b45309",
    backgroundColor: "#fef3c7",
  },
  answerLabel: { marginTop: 20, fontWeight: "800", fontSize: 12, color: "#6B7280" },
  transcript: { marginTop: 6, fontSize: 15, lineHeight: 22 },
});
