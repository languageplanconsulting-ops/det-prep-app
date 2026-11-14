import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LuxuryPressable } from "../../LuxuryPressable";
import { MascotLoader } from "../../MascotLoader";
import { useSpeechCapture } from "../../../hooks/useSpeechCapture";
import { useTimeUp } from "../../../hooks/useStepTimer";
import { Sound } from "../../../lib/audio-player";
import { useI18n } from "../../../lib/i18n";
import { fetchNextInteractiveQuestion, synthesizeWithProviders } from "../../../lib/mock-api";
import { captureErrorText } from "../SpeakRecorder";
import { AnswerBox, C, Note, PhaseClock, PrimaryButton, SectionLabel, TaskInstruction, taskStyles } from "../TaskUi";
import { firstStr, type TaskProps } from "./types";

const TURN_COUNT = 4;
const PREP_SECONDS = 8;
const MAX_SPEAK_SECONDS = 35;
const TTS_PROVIDERS = ["deepgram", "inworld", "gemini", "elevenlabs"];

type Turn = { questionEn: string; questionTh: string; transcript: string };
type Phase = "intro" | "playing" | "prep" | "record" | "transcribing" | "loading-q" | "review" | "next-failed";

/** Play a clip once and resolve when it ends (or fails / stalls). */
async function playOnce(uri: string): Promise<void> {
  const { sound } = await Sound.createAsync({ uri });
  await new Promise<void>((resolve) => {
    const guard = setTimeout(resolve, 45000);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) {
        clearTimeout(guard);
        resolve();
      }
    });
    sound.playAsync().catch(() => {
      clearTimeout(guard);
      resolve();
    });
  });
  await sound.unloadAsync();
}

/**
 * Interactive speaking (mock step 19): 4 spoken questions. Each question is
 * read aloud, then 8s to think and up to 35s to answer; the next question is
 * generated from the previous answers (website's interactive-speaking-next).
 */
export function InteractiveSpeakingTask({ content, submitting, timeUp, onSubmit }: TaskProps) {
  const { t } = useI18n();
  const starterEn = firstStr(content.prompt_en, content.instruction) || "Tell me about yourself and your daily routine.";
  const starterTh = firstStr(content.prompt_th, content.instruction_th);
  const scenarioTitleEn = firstStr(content.scenario_title_en, content.title_en) || "Mock Interactive Speaking";
  const scenarioTitleTh = firstStr(content.scenario_title_th);

  const capture = useSpeechCapture();
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState({ en: starterEn, th: starterTh });
  const [completed, setCompleted] = useState<Turn[]>([]);
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [draft, setDraft] = useState("");
  const [showText, setShowText] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const alive = useRef(true);
  const sent = useRef(false);
  const completedRef = useRef<Turn[]>([]);
  completedRef.current = completed;

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const ask = useCallback(async (qEn: string) => {
    setPhase("playing");
    setAudioFailed(false);
    const uri = await synthesizeWithProviders(qEn, TTS_PROVIDERS);
    if (!alive.current) return;
    if (uri) {
      try {
        await playOnce(uri);
      } catch {
        setAudioFailed(true);
      }
    } else {
      setAudioFailed(true);
    }
    if (!alive.current) return;
    setPrepLeft(PREP_SECONDS);
    setPhase("prep");
  }, []);

  const commitTurn = useCallback(
    async (transcript: string) => {
      if (sent.current) return;
      const next = [...completedRef.current, { questionEn: current.en, questionTh: current.th, transcript: transcript.trim() }];
      setCompleted(next);
      setDraft("");
      if (next.length >= TURN_COUNT) {
        sent.current = true;
        onSubmit({ turns: next });
        return;
      }
      setPhase("loading-q");
      try {
        const q = await fetchNextInteractiveQuestion({
          scenarioTitleEn,
          scenarioTitleTh,
          starterQuestionEn: starterEn,
          starterQuestionTh: starterTh,
          nextTurnNumber: next.length + 1,
          history: next.map((c) => ({ questionEn: c.questionEn, answerTranscript: c.transcript })),
        });
        if (!alive.current) return;
        setCurrent({ en: q.questionEn, th: q.questionTh });
        setShowText(false);
        void ask(q.questionEn);
      } catch {
        if (alive.current) setPhase("next-failed");
      }
    },
    [ask, current, onSubmit, scenarioTitleEn, scenarioTitleTh, starterEn, starterTh],
  );

  const retryNext = () => {
    // Re-run the fetch for the turn after the last committed one.
    const done = completedRef.current;
    setPhase("loading-q");
    void (async () => {
      try {
        const q = await fetchNextInteractiveQuestion({
          scenarioTitleEn,
          scenarioTitleTh,
          starterQuestionEn: starterEn,
          starterQuestionTh: starterTh,
          nextTurnNumber: done.length + 1,
          history: done.map((c) => ({ questionEn: c.questionEn, answerTranscript: c.transcript })),
        });
        if (!alive.current) return;
        setCurrent({ en: q.questionEn, th: q.questionTh });
        void ask(q.questionEn);
      } catch {
        if (alive.current) setPhase("next-failed");
      }
    })();
  };

  const stopAndCommit = useCallback(async () => {
    setPhase("transcribing");
    const text = await capture.stop();
    if (!alive.current) return;
    const merged = [draft.trim(), text].filter(Boolean).join(" ").trim();
    void commitTurn(merged);
  }, [capture, commitTurn, draft]);

  // Prep countdown → open the mic.
  useEffect(() => {
    if (phase !== "prep") return;
    const id = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          void (async () => {
            const ok = await capture.start();
            if (!alive.current) return;
            setPhase(ok ? "record" : "review");
            if (!ok) setShowText(true);
          })();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, capture]);

  // Speaking limit.
  useEffect(() => {
    if (phase === "record" && capture.state === "recording" && capture.seconds >= MAX_SPEAK_SECONDS) {
      void stopAndCommit();
    }
  }, [phase, capture.state, capture.seconds, stopAndCommit]);

  useTimeUp(timeUp, () => {
    if (sent.current) return;
    sent.current = true;
    capture.cancel();
    const turns = [...completedRef.current];
    const trimmed = draft.trim();
    if (trimmed || turns.length === 0) turns.push({ questionEn: current.en, questionTh: current.th, transcript: trimmed });
    onSubmit({ turns });
  });

  const turnNo = Math.min(TURN_COUNT, completed.length + 1);
  const err = captureErrorText(t, capture.error);

  if (phase === "intro") {
    return (
      <View style={taskStyles.gap}>
        <TaskInstruction
          th="คุณจะได้ยินคำถาม 4 ข้อ แต่ละข้อมีเวลาคิด 8 วินาที และพูดตอบได้สูงสุด 35 วินาที"
          en="You'll hear 4 questions. Each gives you 8 seconds to think and up to 35 seconds to answer."
        />
        <Note>
          {t(
            "ฟังคำถามให้ดี ตอบให้ยาวและเป็นธรรมชาติ ยกตัวอย่างประกอบ ไมโครโฟนจะเปิดเองเมื่อหมดเวลาเตรียมตัว",
            "Listen carefully and give full, natural answers with examples. The mic opens by itself after the thinking time.",
          )}
        </Note>
        <PrimaryButton label={t("เริ่มพูดโต้ตอบ", "Start interactive speaking")} onPress={() => void ask(current.en)} disabled={submitting} />
      </View>
    );
  }

  if (submitting || (sent.current && completed.length >= TURN_COUNT)) {
    return <MascotLoader label={t("กำลังส่งคำตอบ…", "Sending your answers…")} />;
  }

  return (
    <View style={taskStyles.gap}>
      <SectionLabel>{t(`คำถามที่ ${turnNo}/${TURN_COUNT}`, `QUESTION ${turnNo}/${TURN_COUNT}`)}</SectionLabel>

      {phase === "playing" ? <MascotLoader label={t("กำลังอ่านคำถาม… ตั้งใจฟัง", "Reading the question… listen")} /> : null}
      {phase === "loading-q" ? <MascotLoader label={t("กำลังเตรียมคำถามถัดไป…", "Preparing the next question…")} /> : null}
      {phase === "transcribing" ? <MascotLoader label={t("กำลังบันทึกคำตอบ…", "Saving your answer…")} /> : null}

      {phase === "prep" || phase === "record" || phase === "review" ? (
        <>
          {audioFailed ? (
            <Note tone="warn">{t("เล่นเสียงคำถามไม่ได้ — อ่านคำถามด้านล่างแทน", "The question audio didn't play — read it below instead.")}</Note>
          ) : null}
          {showText || audioFailed ? (
            <View style={st.qBox}>
              <Text style={st.qText}>{current.en}</Text>
              {current.th ? <Text style={taskStyles.muted}>{current.th}</Text> : null}
            </View>
          ) : (
            <LuxuryPressable style={st.reveal} sound="tap" onPress={() => setShowText(true)}>
              <Text style={st.revealText}>{t("แสดงข้อความคำถาม", "Show the question text")}</Text>
            </LuxuryPressable>
          )}
        </>
      ) : null}

      {phase === "prep" ? <PhaseClock label={t("เวลาคิด", "Think")} seconds={prepLeft} /> : null}

      {phase === "record" ? (
        <>
          <PhaseClock label={t("กำลังอัดเสียง", "Recording")} seconds={Math.max(0, MAX_SPEAK_SECONDS - capture.seconds)} tone="red" />
          <PrimaryButton label={t("พูดจบแล้ว", "I'm done speaking")} onPress={() => void stopAndCommit()} />
        </>
      ) : null}

      {phase === "review" ? (
        <>
          {err ? <Note tone="warn">{err}</Note> : null}
          <AnswerBox value={draft} onChange={setDraft} minHeight={110} />
          <PrimaryButton
            label={
              completed.length + 1 >= TURN_COUNT
                ? t("ส่งคำตอบ · จบการพูดโต้ตอบ", "Submit — end of interactive speaking")
                : t(`ไปคำถามที่ ${completed.length + 2}`, `Continue to question ${completed.length + 2}`)
            }
            onPress={() => void commitTurn(draft)}
          />
        </>
      ) : null}

      {phase === "next-failed" ? (
        <>
          <Note tone="error">{t("โหลดคำถามถัดไปไม่สำเร็จ", "Could not load the next question.")}</Note>
          <PrimaryButton label={t("ลองอีกครั้ง", "Try again")} onPress={retryNext} />
        </>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  qBox: { backgroundColor: "#F1F5FF", borderRadius: 14, padding: 14, gap: 6 },
  qText: { fontSize: 16, fontWeight: "800", color: C.ink, lineHeight: 23 },
  reveal: { alignSelf: "flex-start", paddingVertical: 4 },
  revealText: { color: C.blue, fontWeight: "800", textDecorationLine: "underline", fontSize: 13 },
});
