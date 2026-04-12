"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
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

async function playQuestionAudioFromApi(
  text: string,
  provider: "polly" | "gemini" | "elevenlabs",
): Promise<boolean> {
  try {
    const res = await fetch("/api/speech-synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { audioBase64?: string; mimeType?: string; error?: string };
    if (!data.audioBase64 || !data.mimeType) return false;
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

/** Prefer Amazon Polly (low cost); fall back to Gemini. Optional ElevenLabs if wired. */
async function playQuestionTts(text: string): Promise<void> {
  const ok =
    (await playQuestionAudioFromApi(text, "polly")) ||
    (await playQuestionAudioFromApi(text, "gemini")) ||
    (await playQuestionAudioFromApi(text, "elevenlabs"));
  if (!ok) {
    /* optional: no audio */
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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const transcriptRef = useRef("");
  const completedRef = useRef<CompletedTurn[]>([]);
  const currentQRef = useRef({ en: "", th: "" });
  const recordGenRef = useRef(0);
  const typedBeforeMicRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
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

  const forceStopMedia = useCallback(() => {
    recordGenRef.current += 1;
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
  }, []);

  useEffect(() => {
    return () => forceStopMedia();
  }, [forceStopMedia]);

  const stopRecordingAfterAnswer = useCallback(() => {
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

      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setSpeechError(
          "Recording is not supported in this browser. Type your answer in the box below.",
        );
        setRecLeft(0);
        return;
      }

      setSpeechError(null);
      setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
      mediaChunksRef.current = [];

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
    setTurn(1);
    setCompleted([]);
    completedRef.current = [];
    await beginTurn(1, scenario.starterQuestionEn, scenario.starterQuestionTh);
  }, [beginTurn, scenario.starterQuestionEn, scenario.starterQuestionTh]);

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
      if (!vipGate.confirmBeforeAiSubmit()) {
        setPhase("review");
        return;
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
      const q = await fetchNextQuestion(nextTurnNum, nextCompleted);
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
      return "Listen to the question above. You can type notes during prep.";
    }
    if (phase === "prep") {
      return "Optional: type notes or an outline. After recording, your speech is typed verbatim (mistakes kept).";
    }
    if (phase === "record") {
      return "Your words appear here after recording — edit on the next step if needed.";
    }
    return "Add more if needed, then tap Continue.";
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
                  You will hear each question once (English audio). Then you have{" "}
                  {INTERACTIVE_SPEAKING_PREP_SECONDS} seconds to think before recording starts. When you finish
                  speaking (or time runs out), the next question loads automatically — no button between turns. If
                  your answer is too short, you can add more and tap Continue.
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
              <BrutalPanel variant="elevated" title="Next question">
                <GradingProgressLoader eyebrow="Preparing your next question" />
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
                title="Question"
              >
                <p className="text-base font-bold text-neutral-900">{currentQ.en}</p>
                <p className="mt-2 text-sm text-neutral-600">{currentQ.th}</p>

                {phase === "playing" ? (
                  <p className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4 text-center text-sm font-bold text-ep-blue">
                    Playing question audio…
                  </p>
                ) : null}
                {phase === "prep" ? (
                  <p className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4 text-center text-lg font-black text-ep-blue">
                    Prepare your answer — {prepLeft}s
                  </p>
                ) : null}
                {phase === "record" ? (
                  <div className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4">
                    <p className="text-center text-sm font-bold text-neutral-800">
                      {listening
                        ? "Recording…"
                        : transcribing
                          ? "Turning your speech into text (keeps your wording, including mistakes)…"
                          : "Mic stopped"}
                    </p>
                    <p className="text-center text-2xl font-black tabular-nums text-ep-blue">{recLeft}s</p>
                  </div>
                ) : null}

                <div className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4">
                  <label className="block text-sm font-bold text-neutral-900">
                    Your answer
                    <textarea
                      value={transcript}
                      onChange={(e) => onAnswerTranscriptChange(e.target.value)}
                      readOnly={
                        phase === "playing" || (phase === "record" && (listening || transcribing))
                      }
                      rows={8}
                      placeholder={answerPlaceholder}
                      className="mt-2 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-sm text-neutral-900 placeholder:text-neutral-400 read-only:opacity-80"
                    />
                  </label>
                  <p className="ep-stat mt-2 text-xs text-neutral-500">
                    We record your voice and transcribe it on the server so grammar isn’t auto-corrected. If
                    something looks wrong, you can fix it when you review a short answer.
                  </p>
                </div>

                {phase === "record" && listening && !transcribing ? (
                  <button
                    type="button"
                    onClick={finishRecordingEarly}
                    className="mt-4 w-full border-2 border-black bg-white py-2 text-sm font-bold"
                  >
                    Stop (go to next question)
                  </button>
                ) : null}

                {phase === "review" ? (
                  <div className="mt-4">
                    {submitError ? (
                      <p className="mb-2 text-xs font-bold text-red-700">{submitError}</p>
                    ) : (
                      <p className="mb-2 text-xs text-neutral-600">
                        Continue when you are ready (e.g. after adding words, or if you cancelled AI feedback).
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
