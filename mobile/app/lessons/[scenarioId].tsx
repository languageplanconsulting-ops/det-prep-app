import { Audio } from "expo-av";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { LuxuryPressable } from "../../components/LuxuryPressable";
import { MascotCoach } from "../../components/MascotCoach";
import { PrefixLetterInput } from "../../components/PrefixLetterInput";
import { useLuxuryRouter } from "../../hooks/useLuxuryRouter";
import { synthesizeSpeech } from "../../lib/api";
import { gradeFitbAnswer } from "../../lib/campus-fitb";
import { getCampusScenario } from "../../lib/campus-listening-lessons";
import type { CampusLessonPhase } from "../../lib/campus-listening-types";
import { markScenarioCompleted } from "../../lib/campus-lesson-progress";
import {
  sfxCorrect,
  sfxReveal,
  sfxSubmit,
  sfxWrong,
} from "../../lib/exam-sfx-mobile";
import { syncNotebookEntry } from "../../lib/notebook-sync";

const MAX_PLAYS = 3;

export default function CampusListeningLessonScreen() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const scenario = getCampusScenario(scenarioId ?? "");
  const { back } = useLuxuryRouter();

  const [phase, setPhase] = useState<CampusLessonPhase>("intro");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [hasListened, setHasListened] = useState(false);
  const [playsUsed, setPlaysUsed] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [notebookBusy, setNotebookBusy] = useState(false);
  const [notebookDone, setNotebookDone] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const audioUriRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, []);

  const playScenario = useCallback(async () => {
    if (!scenario || playing || loadingAudio || playsUsed >= MAX_PLAYS) return;
    setLoadingAudio(true);
    setAudioError(null);
    try {
      if (!audioUriRef.current) {
        audioUriRef.current = await synthesizeSpeech(scenario.scenarioEn);
      }
      await unloadSound();
      const { sound } = await Audio.Sound.createAsync({ uri: audioUriRef.current });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) setPlaying(false);
      });
      setPlaysUsed((n) => n + 1);
      setHasListened(true);
      setPlaying(true);
      await sound.playAsync();
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : "Could not play audio");
      setPlaying(false);
    } finally {
      setLoadingAudio(false);
    }
  }, [scenario, playing, loadingAudio, playsUsed, unloadSound]);

  const goToCoach = useCallback(
    (qIdx: number) => {
      setQuestionIdx(qIdx);
      setLastCorrect(null);
      setNotebookDone(false);
      sfxReveal();
      setPhase("coach");
    },
    [],
  );

  const checkAnswer = () => {
    if (!scenario) return;
    const q = scenario.questions[questionIdx];
    const typed = answers[questionIdx] ?? "";
    const ok = gradeFitbAnswer(typed, q.correctWord, q.prefixLength);
    setLastCorrect(ok);
    if (ok) sfxCorrect();
    else sfxWrong();
    setPhase("feedback");
  };

  const addToNotebook = async () => {
    if (!scenario || notebookDone) return;
    const q = scenario.questions[questionIdx];
    setNotebookBusy(true);
    try {
      await syncNotebookEntry({
        id: `campus-lesson-${scenario.id}-q${questionIdx + 1}`,
        source: "mini-study-lesson",
        categoryIds: ["vocabulary"],
        titleEn: q.correctWord,
        titleTh: q.explanationTh.split("=")[0]?.trim() || q.correctWord,
        bodyEn: `${q.explanationEn}\n\nScenario: ${scenario.titleEn}`,
        bodyTh: `${q.explanationTh}\n\nสถานการณ์: ${scenario.titleTh}`,
        userNote: "",
        createdAt: new Date().toISOString(),
      });
      setNotebookDone(true);
      sfxCorrect();
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : "Notebook sync failed");
    } finally {
      setNotebookBusy(false);
    }
  };

  const continueAfterFeedback = () => {
    if (!scenario) return;
    if (questionIdx < 2) {
      goToCoach(questionIdx + 1);
      return;
    }
    void markScenarioCompleted(scenario.id);
    sfxReveal();
    setPhase("complete");
  };

  if (!scenario) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>ไม่พบบทเรียนนี้</Text>
        <LuxuryPressable style={styles.primaryBtn} onPress={() => back()}>
          <Text style={styles.primaryBtnText}>กลับ</Text>
        </LuxuryPressable>
      </View>
    );
  }

  const playsLeft = MAX_PLAYS - playsUsed;
  const currentQ = scenario.questions[questionIdx];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.stepper}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i < questionIdx || phase === "complete"
                ? styles.stepDone
                : i === questionIdx && phase !== "intro" && phase !== "listen"
                  ? styles.stepActive
                  : styles.stepIdle,
            ]}
          >
            <Text style={styles.stepDotText}>
              {i < questionIdx || phase === "complete" ? "✓" : `${i + 1}`}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.scenarioTitle}>{scenario.titleTh}</Text>
      <Text style={styles.scenarioSub}>{scenario.titleEn}</Text>

      {phase === "intro" ? (
        <View style={styles.block}>
          <MascotCoach
            size="lg"
            text="ฟังสถานการณ์ในวิทยาเขตก่อนนะ แล้วตอบคำถาม 3 ข้อจากความหมายที่ได้ยิน 🎧"
            sub="Listen to the campus scenario, then fill in 3 vocabulary words."
          />
          <LuxuryPressable
            style={styles.primaryBtn}
            onPress={() => {
              sfxReveal();
              setPhase("listen");
            }}
          >
            <Text style={styles.primaryBtnText}>เริ่มฟังสถานการณ์</Text>
          </LuxuryPressable>
        </View>
      ) : null}

      {phase === "listen" ? (
        <View style={styles.block}>
          <MascotCoach
            text="กดปุ่มฟังให้ครบอย่างน้อย 1 ครั้ง แล้วค่อยไปตอบคำถาม"
            sub={`You can replay up to ${MAX_PLAYS} times.`}
          />
          <View style={styles.playerCard}>
            <LuxuryPressable
              style={[styles.playBtn, playing && styles.playBtnActive]}
              disabled={loadingAudio || playing || playsLeft <= 0}
              onPress={() => void playScenario()}
            >
              {loadingAudio ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.playIcon}>{playing ? "♪" : "▶"}</Text>
              )}
            </LuxuryPressable>
            <View style={styles.playsRow}>
              {Array.from({ length: MAX_PLAYS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.playDot, i < playsLeft ? styles.playDotOn : styles.playDotOff]}
                />
              ))}
              <Text style={styles.playsText}>
                {playsLeft > 0 ? `ฟังได้อีก ${playsLeft} ครั้ง` : "ฟังครบแล้ว"}
              </Text>
            </View>
            {audioError ? <Text style={styles.warn}>{audioError}</Text> : null}
          </View>
          <LuxuryPressable
            style={[styles.primaryBtn, !hasListened && styles.btnDisabled]}
            disabled={!hasListened}
            onPress={() => goToCoach(0)}
          >
            <Text style={styles.primaryBtnText}>ไปตอบคำถาม →</Text>
          </LuxuryPressable>
        </View>
      ) : null}

      {phase === "coach" ? (
        <View style={styles.block}>
          <MascotCoach text={currentQ.coachTh} sub={currentQ.coachEn} />
          <LuxuryPressable style={styles.primaryBtn} onPress={() => setPhase("answer")}>
            <Text style={styles.primaryBtnText}>พร้อมตอบข้อ {questionIdx + 1}</Text>
          </LuxuryPressable>
        </View>
      ) : null}

      {phase === "answer" ? (
        <View style={styles.block}>
          <PrefixLetterInput
            index={questionIdx}
            promptEn={currentQ.promptEn}
            correctWord={currentQ.correctWord}
            prefixLength={currentQ.prefixLength}
            value={answers[questionIdx] ?? ""}
            onChange={(v) => {
              const next = [...answers];
              next[questionIdx] = v;
              setAnswers(next);
            }}
          />
          <LuxuryPressable
            style={[
              styles.primaryBtn,
              !(answers[questionIdx] ?? "").trim() && styles.btnDisabled,
            ]}
            disabled={!(answers[questionIdx] ?? "").trim()}
            onPress={() => {
              sfxSubmit();
              checkAnswer();
            }}
          >
            <Text style={styles.primaryBtnText}>ตรวจคำตอบ</Text>
          </LuxuryPressable>
        </View>
      ) : null}

      {phase === "feedback" ? (
        <View style={styles.block}>
          {lastCorrect ? (
            <>
              <View style={styles.okCard}>
                <Text style={styles.okTitle}>ถูกต้อง! 🎉</Text>
                <Text style={styles.okWord}>{currentQ.correctWord}</Text>
              </View>
              <LuxuryPressable style={styles.primaryBtn} onPress={continueAfterFeedback}>
                <Text style={styles.primaryBtnText}>
                  {questionIdx < 2 ? "ข้อถัดไป →" : "จบบทเรียน"}
                </Text>
              </LuxuryPressable>
            </>
          ) : (
            <>
              <MascotCoach
                text={`คำที่ถูกคือ "${currentQ.correctWord}"`}
                sub={currentQ.explanationTh}
              />
              <View style={styles.teachCard}>
                <Text style={styles.teachEn}>{currentQ.explanationEn}</Text>
              </View>
              <LuxuryPressable
                style={[styles.secondaryBtn, notebookDone && styles.notebookDone]}
                disabled={notebookBusy || notebookDone}
                onPress={() => void addToNotebook()}
              >
                <Text style={styles.secondaryBtnText}>
                  {notebookDone ? "บันทึกในสมุดแล้ว ✓" : "เพิ่มลงสมุดจด"}
                </Text>
              </LuxuryPressable>
              <LuxuryPressable style={styles.primaryBtn} onPress={continueAfterFeedback}>
                <Text style={styles.primaryBtnText}>เข้าใจแล้ว — ต่อไป</Text>
              </LuxuryPressable>
            </>
          )}
        </View>
      ) : null}

      {phase === "complete" ? (
        <View style={styles.block}>
          <MascotCoach
            size="lg"
            text="เก่งมาก! จบสถานการณ์นี้แล้ว พร้อมไปข้อต่อไปได้เลย"
            sub="Great job finishing this campus listening lesson."
          />
          <LuxuryPressable style={styles.primaryBtn} onPress={() => back()}>
            <Text style={styles.primaryBtnText}>กลับรายการบทเรียน</Text>
          </LuxuryPressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FB" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontSize: 16, fontWeight: "700", color: "#DC2626", marginBottom: 16 },
  stepper: { flexDirection: "row", gap: 8, marginBottom: 16 },
  stepDot: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIdle: { backgroundColor: "#E2E8F0" },
  stepActive: { backgroundColor: "#004AAD" },
  stepDone: { backgroundColor: "#D1FAE5" },
  stepDotText: { fontSize: 12, fontWeight: "800", color: "#334155" },
  scenarioTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  scenarioSub: { fontSize: 13, color: "#64748B", marginBottom: 16 },
  block: { gap: 14 },
  playerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#004AAD",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnActive: { backgroundColor: "#059669" },
  playIcon: { color: "#fff", fontSize: 28, fontWeight: "700" },
  playsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  playDot: { width: 8, height: 8, borderRadius: 4 },
  playDotOn: { backgroundColor: "#004AAD" },
  playDotOff: { backgroundColor: "#CBD5E1" },
  playsText: { fontSize: 12, color: "#64748B", marginLeft: 4 },
  warn: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#004AAD",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnDisabled: { opacity: 0.45 },
  secondaryBtn: {
    backgroundColor: "#FFCC00",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#1E293B", fontSize: 15, fontWeight: "800" },
  notebookDone: { backgroundColor: "#D1FAE5" },
  okCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  okTitle: { fontSize: 16, fontWeight: "800", color: "#047857" },
  okWord: { fontSize: 22, fontWeight: "900", color: "#065F46", marginTop: 6 },
  teachCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  teachEn: { fontSize: 14, color: "#334155", lineHeight: 20 },
});
