"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import {
  addVipAiFeedbackUses,
  emitVipApiCreditNotice,
  getVipWeeklyAiFeedbackRemaining,
  thExhaustedQuotaMessage,
  thInteractiveSpeakingInsufficientCredits,
  thInteractiveSpeakingStartConfirm,
  VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION,
} from "@/lib/vip-ai-feedback-quota";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import {
  INTERACTIVE_SPEAKING_FOLLOWUP_COUNT,
  INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS,
  INTERACTIVE_SPEAKING_PREP_SECONDS,
  INTERACTIVE_SPEAKING_TURN_COUNT,
} from "@/lib/interactive-speaking-constants";
import {
  getLatestInteractiveSpeakingReportForScenario,
  saveInteractiveSpeakingReport,
} from "@/lib/interactive-speaking-storage";
import {
  createBrowserSpeechRecognition,
  isBrowserSpeechRecognitionAvailable,
  type WebSpeechRecognitionInstance,
} from "@/lib/browser-speech-recognition";
import { pickMediaRecorderMimeType, transcribeAudioBlobClient } from "@/lib/client-audio-transcribe";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";
import type { InteractiveSpeakingScenario } from "@/types/interactive-speaking";

type CompletedTurn = {
  questionEn: string;
  questionTh: string;
  transcript: string;
};

type Phase =
  | "intro"
  | "loading-q"
  | "playing"
  | "prep"
  | "record"
  | "review"
  | "grading";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Short click when the answer window opens (prep → record). */
function playAnswerCueSound(): void {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1400, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.07);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* ignore */
  }
}

const DEFAULT_INTERACTIVE_TTS_ORDER = [
  "deepgram",
  "inworld",
  "gemini",
  "elevenlabs",
] as const satisfies readonly ("deepgram" | "inworld" | "gemini" | "elevenlabs")[];

function interactiveSpeakingTtsTryOrder(): ("deepgram" | "inworld" | "gemini" | "elevenlabs")[] {
  const raw = process.env.NEXT_PUBLIC_INTERACTIVE_SPEAKING_TTS_ORDER?.trim();
  if (!raw) return [...DEFAULT_INTERACTIVE_TTS_ORDER];
  const allowed = new Set<string>(["deepgram", "inworld", "gemini", "elevenlabs"]);
  const parsed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => allowed.has(s)) as ("deepgram" | "inworld" | "gemini" | "elevenlabs")[];
  return parsed.length > 0 ? parsed : [...DEFAULT_INTERACTIVE_TTS_ORDER];
}

async function playQuestionAudioFromApi(
  text: string,
  provider: "deepgram" | "inworld" | "gemini" | "elevenlabs",
): Promise<boolean> {
  try {
    const res = await fetch("/api/speech-synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      audioBase64?: string;
      mimeType?: string;
      error?: string;
      providerUsed?: string;
      ttsFallbackReason?: string;
    };
    if (!data.audioBase64 || !data.mimeType) return false;
    if (process.env.NODE_ENV === "development") {
      const extra =
        data.ttsFallbackReason === "inworld_text_limit"
          ? " (prompt too long for Inworld)"
          : data.ttsFallbackReason === "deepgram_text_limit"
            ? " (prompt too long for Deepgram)"
            : "";
      console.info(
        `[interactive-speaking TTS] requested ${provider} → server used ${data.providerUsed ?? "?"}${extra}`,
      );
    }
    await new Promise<void>((resolve) => {
      const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tries providers in order (default: Deepgram → Inworld → Gemini → ElevenLabs).
 * Override with `NEXT_PUBLIC_INTERACTIVE_SPEAKING_TTS_ORDER` (comma-separated: deepgram, inworld, gemini, elevenlabs).
 */
async function playQuestionTts(text: string): Promise<void> {
  for (const provider of interactiveSpeakingTtsTryOrder()) {
    if (await playQuestionAudioFromApi(text, provider)) return;
  }
}

export function InteractiveSpeakingSession({
  scenario,
  startWithRedeem = false,
}: {
  scenario: InteractiveSpeakingScenario;
  /** When URL has `?redeem=1`, show last score and pulse the start button. */
  startWithRedeem?: boolean;
}) {
  const router = useRouter();
  const vipGate = useVipAiFeedbackGate();
  const lastAttempt = useMemo(
    () => getLatestInteractiveSpeakingReportForScenario(scenario.id),
    [scenario.id],
  );
  const attemptId = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `is_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const [phase, setPhase] = useState<Phase>("intro");
  const [turn, setTurn] = useState(1);
  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [currentQ, setCurrentQ] = useState({ en: "", th: "" });
  const [prepLeft, setPrepLeft] = useState(INTERACTIVE_SPEAKING_PREP_SECONDS);
  const [recLeft, setRecLeft] = useState(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  /** True while the Web Speech API is capturing (no server transcribe). */
  const [browserSttActive, setBrowserSttActive] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showQuestionHint, setShowQuestionHint] = useState(false);

  const transcriptRef = useRef("");
  const answerCueTurnRef = useRef(0);
  const completedRef = useRef<CompletedTurn[]>([]);
  const currentQRef = useRef({ en: "", th: "" });
  const recordGenRef = useRef(0);
  const typedBeforeMicRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
  /** Browser Web Speech API — no Gemini upload when active. */
  const speechRecognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const browserSttUserStopRef = useRef(false);
  const browserSttDiscardRef = useRef(false);
  const browserSpeechFinalRef = useRef("");
  const runTurnSubmissionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);

  useEffect(() => {
    setShowQuestionHint(false);
  }, [currentQ.en, turn]);

  useEffect(() => {
    if (phase !== "record") return;
    if (answerCueTurnRef.current === turn) return;
    answerCueTurnRef.current = turn;
    playAnswerCueSound();
  }, [phase, turn]);

  const forceStopMedia = useCallback(() => {
    recordGenRef.current += 1;
    const sr = speechRecognitionRef.current;
    if (sr) {
      browserSttDiscardRef.current = true;
      browserSttUserStopRef.current = false;
      try {
        sr.abort();
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (mr && (mr.state === "recording" || mr.state === "paused")) {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    mediaChunksRef.current = [];
    setListening(false);
    setTranscribing(false);
    setBrowserSttActive(false);
  }, []);

  useEffect(() => {
    return () => forceStopMedia();
  }, [forceStopMedia]);

  const stopRecordingAfterAnswer = useCallback(() => {
    const sr = speechRecognitionRef.current;
    if (sr) {
      browserSttUserStopRef.current = true;
      try {
        sr.stop();
      } catch {
        /* ignore */
      }
      return;
    }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === "recording") {
      mr.stop();
    }
  }, []);

  useEffect(() => {
    if (phase !== "prep") return;
    const id = window.setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => {
            setPhase("record");
            setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
            startRecordingRef.current?.();
          }, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const startRecordingRef = useRef<(() => void) | null>(null);

  const startRecording = useCallback(() => {
    void (async () => {
      const myGen = recordGenRef.current + 1;
      recordGenRef.current = myGen;
      typedBeforeMicRef.current = transcriptRef.current;

      const canUploadTranscribe =
        typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
      const canBrowserStt = isBrowserSpeechRecognitionAvailable();

      if (!canBrowserStt && !canUploadTranscribe) {
        setSpeechError(
          "Recording is not supported in this browser. Type your answer in the box below.",
        );
        setRecLeft(0);
        return;
      }

      setSpeechError(null);
      setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
      mediaChunksRef.current = [];

      const tryStartBrowserSpeech = (): boolean => {
        if (!canBrowserStt) return false;
        const recognition = createBrowserSpeechRecognition();
        if (!recognition) return false;

        browserSttDiscardRef.current = false;
        browserSttUserStopRef.current = false;
        browserSpeechFinalRef.current = "";

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          if (myGen !== recordGenRef.current) return;
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const r = event.results[i]!;
            if (r.isFinal) {
              browserSpeechFinalRef.current += r[0].transcript;
            } else {
              interim += r[0].transcript;
            }
          }
          const speech = (browserSpeechFinalRef.current + interim).trim();
          const merged = [typedBeforeMicRef.current.trim(), speech].filter(Boolean).join(" ").trim();
          transcriptRef.current = merged;
          setTranscript(merged);
        };

        recognition.onerror = (event) => {
          if (event.error === "aborted") return;
          if (myGen !== recordGenRef.current) return;
          if (event.error === "not-allowed") {
            setSpeechError(
              "Speech recognition was blocked. Allow the microphone or type your answer below.",
            );
            setRecLeft(0);
            setListening(false);
            setBrowserSttActive(false);
            speechRecognitionRef.current = null;
          }
        };

        recognition.onend = () => {
          if (myGen !== recordGenRef.current) return;
          if (browserSttDiscardRef.current) {
            speechRecognitionRef.current = null;
            setListening(false);
            setBrowserSttActive(false);
            return;
          }
          if (browserSttUserStopRef.current) {
            speechRecognitionRef.current = null;
            setListening(false);
            setBrowserSttActive(false);
            setSpeechError(null);
            void runTurnSubmissionRef.current?.();
            return;
          }
          const r = speechRecognitionRef.current;
          if (r) {
            try {
              r.start();
            } catch {
              /* already running */
            }
          }
        };

        try {
          recognition.start();
        } catch {
          return false;
        }

        speechRecognitionRef.current = recognition;
        setBrowserSttActive(true);
        setListening(true);
        return true;
      };

      if (tryStartBrowserSpeech()) {
        return;
      }

      if (!canUploadTranscribe) {
        setSpeechError(
          "Speech recognition did not start. Type your answer in the box below.",
        );
        setRecLeft(0);
        return;
      }

      setBrowserSttActive(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (myGen !== recordGenRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        const mime = pickMediaRecorderMimeType();
        const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {});

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) mediaChunksRef.current.push(e.data);
        };

        mr.onstop = async () => {
          if (myGen !== recordGenRef.current) return;
          stream.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;

          const chunks = mediaChunksRef.current;
          mediaChunksRef.current = [];
          const blob = new Blob(chunks, { type: mime || "audio/webm" });

          setListening(false);
          setTranscribing(true);
          try {
            const text = await transcribeAudioBlobClient(blob);
            if (myGen !== recordGenRef.current) return;
            const merged = [typedBeforeMicRef.current.trim(), text].filter(Boolean).join(" ").trim();
            transcriptRef.current = merged;
            setTranscript(merged);
            setSpeechError(null);
          } catch (e) {
            if (myGen !== recordGenRef.current) return;
            setSpeechError(
              e instanceof Error
                ? e.message
                : "Could not transcribe audio. Edit your text below or try again.",
            );
          } finally {
            if (myGen !== recordGenRef.current) return;
            setTranscribing(false);
            void runTurnSubmissionRef.current?.();
          }
        };

        mediaRecorderRef.current = mr;
        mr.start(250);
        setListening(true);
      } catch {
        if (myGen !== recordGenRef.current) return;
        setSpeechError("Microphone permission denied or unavailable. You can type your answer.");
        setRecLeft(0);
        setListening(false);
      }
    })();
  }, []);

  useEffect(() => {
    startRecordingRef.current = () => {
      startRecording();
    };
  }, [startRecording]);

  useEffect(() => {
    if (phase !== "record" || !listening) return;
    const id = window.setInterval(() => {
      setRecLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => stopRecordingAfterAnswer(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, listening, stopRecordingAfterAnswer]);

  const beginTurn = useCallback(async (_turnNumber: number, qEn: string, qTh: string) => {
    forceStopMedia();
    setTranscript("");
    transcriptRef.current = "";
    setSubmitError(null);
    setCurrentQ({ en: qEn, th: qTh });
    setPhase("playing");
    await playQuestionTts(qEn);
    setPrepLeft(INTERACTIVE_SPEAKING_PREP_SECONDS);
    setPhase("prep");
  }, [forceStopMedia]);

  const startExam = useCallback(async () => {
    setSubmitError(null);
    if (vipGate.isVip) {
      if (vipGate.loading) {
        window.alert(
          "กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองอีกครั้ง",
        );
        return;
      }
      const uid = vipGate.userId;
      if (!uid) {
        window.alert("กรุณาเข้าสู่ระบบเพื่อใช้โควต้า VIP");
        return;
      }
      const rem = getVipWeeklyAiFeedbackRemaining(uid);
      emitVipApiCreditNotice(rem);
      const cost = VIP_INTERACTIVE_SPEAKING_API_CALLS_PER_SESSION;
      if (rem < cost) {
        window.alert(thInteractiveSpeakingInsufficientCredits(cost, rem));
        return;
      }
      if (!window.confirm(thInteractiveSpeakingStartConfirm(cost, rem))) {
        return;
      }
    }
    setTurn(1);
    setCompleted([]);
    completedRef.current = [];
    await beginTurn(1, scenario.starterQuestionEn, scenario.starterQuestionTh);
  }, [
    beginTurn,
    scenario.starterQuestionEn,
    scenario.starterQuestionTh,
    vipGate.isVip,
    vipGate.loading,
    vipGate.userId,
  ]);

  const fetchNextQuestion = useCallback(
    async (nextTurn: number, history: CompletedTurn[]) => {
      const key = getStoredGeminiKey();
      const res = await fetch("/api/interactive-speaking-next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { "x-gemini-api-key": key } : {}),
        },
        body: JSON.stringify({
          scenarioTitleEn: scenario.titleEn,
          scenarioTitleTh: scenario.titleTh,
          starterQuestionEn: scenario.starterQuestionEn,
          starterQuestionTh: scenario.starterQuestionTh,
          nextTurnNumber: nextTurn,
          history: history.map((c) => ({
            questionEn: c.questionEn,
            answerTranscript: c.transcript,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load next question.");
      }
      return data as { questionEn: string; questionTh: string };
    },
    [scenario],
  );

  const runTurnSubmission = useCallback(async () => {
    const trimmed = transcriptRef.current.trim();
    const wc = countWords(trimmed);
    if (wc < 3) {
      setSubmitError("Speak or type at least a few words before continuing.");
      setPhase("review");
      return;
    }
    setSubmitError(null);

    const cur = currentQRef.current;
    const prevDone = completedRef.current;
    const nextCompleted: CompletedTurn[] = [
      ...prevDone,
      { questionEn: cur.en, questionTh: cur.th, transcript: trimmed },
    ];

    if (nextCompleted.length >= INTERACTIVE_SPEAKING_TURN_COUNT) {
      if (vipGate.isVip && vipGate.userId) {
        const rem = getVipWeeklyAiFeedbackRemaining(vipGate.userId);
        emitVipApiCreditNotice(rem);
        if (rem <= 0) {
          window.alert(thExhaustedQuotaMessage());
          setPhase("review");
          return;
        }
      }
      setCompleted(nextCompleted);
      completedRef.current = nextCompleted;
      forceStopMedia();
      setTranscript("");
      transcriptRef.current = "";
      setPhase("grading");
      const key = getStoredGeminiKey();
      try {
        const res = await fetch("/api/interactive-speaking-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(key ? { "x-gemini-api-key": key } : {}),
          },
          body: JSON.stringify({
            attemptId,
            scenarioId: scenario.id,
            scenarioTitleEn: scenario.titleEn,
            scenarioTitleTh: scenario.titleTh,
            prepMinutes: 0,
            turns: nextCompleted.map((c, i) => ({
              turnIndex: i + 1,
              questionEn: c.questionEn,
              questionTh: c.questionTh,
              transcript: c.transcript,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Grading failed.");
        }
        const report = data as InteractiveSpeakingAttemptReport;
        if (vipGate.isVip && vipGate.userId) {
          addVipAiFeedbackUses(vipGate.userId, 1);
          emitVipApiCreditNotice(getVipWeeklyAiFeedbackRemaining(vipGate.userId));
        }
        try {
          await finalizeLatestStudySession({
            exerciseType: "interactive_speaking",
            setId: scenario.id,
            score: report.score160,
            completed: true,
            submissionPayload: {
              kind: "interactive_speaking",
              scenarioId: scenario.id,
              titleEn: scenario.titleEn,
              titleTh: scenario.titleTh,
              turns: nextCompleted,
            },
            reportPayload: report,
          });
        } catch (e) {
          console.warn("[InteractiveSpeakingSession] finalize study session failed", e);
        }
        stashReportForNavigation(report.attemptId, report);
        saveInteractiveSpeakingReport(report);
        await router.push(`/practice/production/interactive-speaking/report/${report.attemptId}`);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Grading failed.");
        setPhase("review");
      }
      return;
    }

    forceStopMedia();
    setTranscript("");
    transcriptRef.current = "";
    setCompleted(nextCompleted);
    completedRef.current = nextCompleted;

    const nextTurnNum = nextCompleted.length + 1;
    setTurn(nextTurnNum);
    setPhase("loading-q");
    try {
      if (vipGate.isVip && vipGate.userId) {
        const rem = getVipWeeklyAiFeedbackRemaining(vipGate.userId);
        emitVipApiCreditNotice(rem);
        if (rem <= 0) {
          window.alert(thExhaustedQuotaMessage());
          setSubmitError("Weekly AI limit reached. This resets every Monday (local time).");
          setPhase("review");
          return;
        }
      }
      const q = await fetchNextQuestion(nextTurnNum, nextCompleted);
      if (vipGate.isVip && vipGate.userId) {
        addVipAiFeedbackUses(vipGate.userId, 1);
        emitVipApiCreditNotice(getVipWeeklyAiFeedbackRemaining(vipGate.userId));
      }
      await beginTurn(nextTurnNum, q.questionEn, q.questionTh);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Next question failed.");
      setPhase("intro");
    }
  }, [
    attemptId,
    beginTurn,
    fetchNextQuestion,
    router,
    scenario.id,
    scenario.titleEn,
    scenario.titleTh,
    vipGate,
    forceStopMedia,
  ]);

  useEffect(() => {
    runTurnSubmissionRef.current = () => {
      void runTurnSubmission();
    };
  }, [runTurnSubmission]);

  const finishRecordingEarly = () => {
    setRecLeft(0);
    stopRecordingAfterAnswer();
  };

  const onAnswerTranscriptChange = useCallback((value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  }, []);

  const answerPlaceholder = useMemo(() => {
    if (phase === "playing") {
      return "Notes (optional) — you’ll speak in a moment.";
    }
    if (phase === "prep") {
      return "Optional notes before you speak…";
    }
    if (phase === "record") {
      return "Your reply will show here after this turn.";
    }
    return "Add more if you need to, then continue.";
  }, [phase]);

  return (
    <StudySessionBoundary
      skill="production"
      exerciseType="interactive_speaking"
      setId={scenario.id}
    >
      <div className={`min-h-screen ${LANDING_PAGE_GRID_BG}`}>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
          <VipAiFeedbackQuotaBanner />
          <Link
            href="/practice/production/interactive-speaking"
            className="mb-6 inline-flex text-sm font-bold text-ep-blue underline-offset-4 hover:underline"
          >
            ← Scenarios
          </Link>

          <div className="border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
            <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
              Interactive speaking
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
              {scenario.titleEn}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{scenario.titleTh}</p>
            <p className="mt-4 text-xs font-bold text-neutral-500">
              {INTERACTIVE_SPEAKING_TURN_COUNT} turns (1 opening + {INTERACTIVE_SPEAKING_FOLLOWUP_COUNT}{" "}
              follow-ups) · {INTERACTIVE_SPEAKING_PREP_SECONDS}s prep · max {INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS}s
              speaking · next question loads automatically
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {phase === "intro" ? (
              <BrutalPanel variant="elevated" title="Ready">
                {startWithRedeem && lastAttempt ? (
                  <div className="mb-4 rounded-sm border-2 border-black bg-ep-yellow/35 px-3 py-3 text-sm text-neutral-900 shadow-[3px_3px_0_0_#000]">
                    <p className="font-black uppercase tracking-wide text-neutral-800">Redeem / try again</p>
                    <p className="mt-1 text-neutral-800">
                      Last attempt: <strong>{lastAttempt.score160}</strong>/160 ·{" "}
                      {new Date(lastAttempt.submittedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ) : null}
                <p className="text-sm text-neutral-700">
                  Listen to each prompt, take a short breath to think, then answer out loud. Follow-ups are shaped by
                  what you say. If a turn is too short, you can add more on the next step.
                </p>
                <button
                  type="button"
                  onClick={() => void startExam()}
                  className={`mt-4 border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] ${
                    startWithRedeem && lastAttempt ? "ep-redeem-pulse" : ""
                  }`}
                >
                  Start scenario
                </button>
              </BrutalPanel>
            ) : null}

            {phase === "loading-q" ? (
              <BrutalPanel variant="elevated" title="Next turn">
                <GradingProgressLoader eyebrow="We are creating questions according to your answer" />
              </BrutalPanel>
            ) : null}

            {(phase === "playing" ||
              phase === "prep" ||
              phase === "record" ||
              phase === "review") &&
            currentQ.en ? (
              <BrutalPanel
                variant="elevated"
                eyebrow={`Turn ${turn} / ${INTERACTIVE_SPEAKING_TURN_COUNT}`}
                title="Conversation"
              >
                <div className="flex gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-ep-blue text-xs font-black text-white shadow-[3px_3px_0_0_#000]"
                    aria-hidden
                  >
                    AI
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    {phase === "playing" ? (
                      <div
                        className="ep-is-chat-bubble-typing rounded-2xl border-2 border-black bg-white px-4 py-4 shadow-[5px_5px_0_0_#000]"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="ep-typing-dot" />
                          <span className="ep-typing-dot" />
                          <span className="ep-typing-dot" />
                        </div>
                        <p className="mt-3 text-xs font-bold text-neutral-500">
                          Listen — the question is playing.
                        </p>
                      </div>
                    ) : null}

                    {phase === "prep" ? (
                      <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
                        <p className="text-sm font-bold text-neutral-800">Your turn soon</p>
                        <p className="mt-1 text-2xl font-black tabular-nums text-ep-blue">{prepLeft}s</p>
                        <p className="mt-1 text-xs text-neutral-500">Think through your answer.</p>
                      </div>
                    ) : null}

                    {(phase === "record" || phase === "review") && !showQuestionHint ? (
                      <p className="text-xs text-neutral-500">
                        The prompt was audio-only. Use <span className="font-bold">Hint</span> if you want to read it.
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setShowQuestionHint((v) => !v)}
                      className="rounded-sm border-2 border-black bg-ep-yellow px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/90"
                    >
                      {showQuestionHint ? "Hide question text" : "Hint — show question text"}
                    </button>

                    {showQuestionHint ? (
                      <div className="rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
                        <p className="text-sm font-bold text-neutral-900">{currentQ.en}</p>
                        {currentQ.th.trim() ? (
                          <p className="mt-2 text-xs text-neutral-600">{currentQ.th}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {phase === "record" ? (
                  <div className="mt-6 border-t-2 border-dashed border-neutral-200 pt-4">
                    <div className="mb-3 flex items-start justify-end gap-2">
                      <div className="max-w-[85%] rounded-2xl border-2 border-black bg-ep-yellow/40 px-3 py-2 shadow-[3px_3px_0_0_#000]">
                        <p className="text-center text-xs font-black uppercase tracking-wide text-neutral-800">
                          You
                        </p>
                        <p className="text-center text-sm font-bold text-neutral-900">
                          {listening
                            ? browserSttActive
                              ? "Listening (live captions)…"
                              : "Recording…"
                            : transcribing
                              ? "Finishing up…"
                              : `${recLeft}s left`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {phase === "record" && listening && browserSttActive ? (
                  <p className="mt-2 text-xs text-neutral-600">
                    Using your browser’s speech-to-text (no upload for transcription). Text fills in as you speak; you
                    can edit it on the next step.
                  </p>
                ) : null}

                <div className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4">
                  <label className="block text-sm font-bold text-neutral-900">
                    Your reply
                    <textarea
                      value={transcript}
                      onChange={(e) => onAnswerTranscriptChange(e.target.value)}
                      readOnly={
                        phase === "playing" || (phase === "record" && (listening || transcribing))
                      }
                      rows={6}
                      placeholder={answerPlaceholder}
                      className="mt-2 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-sm text-neutral-900 placeholder:text-neutral-400 read-only:opacity-80"
                    />
                  </label>
                </div>

                {phase === "record" && listening && !transcribing ? (
                  <button
                    type="button"
                    onClick={finishRecordingEarly}
                    className="mt-4 w-full border-2 border-black bg-white py-2 text-sm font-bold shadow-[2px_2px_0_0_#000]"
                  >
                    I’m done speaking
                  </button>
                ) : null}

                {phase === "review" ? (
                  <div className="mt-4">
                    {submitError ? (
                      <p className="mb-2 text-xs font-bold text-red-700">{submitError}</p>
                    ) : (
                      <p className="mb-2 text-xs text-neutral-600">
                        Ready when you are — add to your reply if needed, then continue.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void runTurnSubmission()}
                      className="w-full border-2 border-black bg-ep-blue py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_#000]"
                    >
                      {completed.length + 1 >= INTERACTIVE_SPEAKING_TURN_COUNT
                        ? "Get feedback"
                        : "Continue to next question"}
                    </button>
                  </div>
                ) : null}
              </BrutalPanel>
            ) : null}

            {phase === "grading" ? (
              <BrutalPanel variant="elevated" title="Feedback">
                <GradingProgressLoader
                  eyebrow={`Scoring your ${INTERACTIVE_SPEAKING_TURN_COUNT} answers`}
                  variant="premium"
                />
              </BrutalPanel>
            ) : null}

            {speechError ? <p className="text-sm font-bold text-red-700">{speechError}</p> : null}
          </div>
        </div>
      </div>
    </StudySessionBoundary>
  );
}
