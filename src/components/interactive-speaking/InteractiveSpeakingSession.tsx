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
import { saveInteractiveSpeakingReport } from "@/lib/interactive-speaking-storage";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";
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
  provider: "elevenlabs" | "gemini",
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

/** Prefer ElevenLabs for question audio; fall back to Gemini if unavailable. */
async function playQuestionTts(text: string): Promise<void> {
  const ok =
    (await playQuestionAudioFromApi(text, "elevenlabs")) ||
    (await playQuestionAudioFromApi(text, "gemini"));
  if (!ok) {
    /* optional: no audio */
  }
}

export function InteractiveSpeakingSession({ scenario }: { scenario: InteractiveSpeakingScenario }) {
  const router = useRouter();
  const vipGate = useVipAiFeedbackGate();
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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const transcriptRef = useRef("");
  const completedRef = useRef<CompletedTurn[]>([]);
  const currentQRef = useRef({ en: "", th: "" });
  const recordFinalizeStartedRef = useRef(false);
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    setRecLeft(0);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  useEffect(() => {
    if (phase !== "prep") return;
    const id = window.setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => {
            setPhase("record");
            setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);
            startListeningRef.current?.();
          }, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const startListeningRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Speech recognition is not available in this browser. Try Chrome or Edge on desktop, or type your answer in the box.",
      );
      return;
    }
    recordFinalizeStartedRef.current = false;
    setSpeechError(null);
    networkRetriesRef.current = 0;
    setRecLeft(INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS);

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      networkRetriesRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      const fin = finalTranscriptRef.current;
      const combined = `${fin}${interim ? (fin ? " " : "") + interim : ""}`.trim();
      transcriptRef.current = combined;
      setTranscript(combined);
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef,
        setSpeechError,
        setListening,
        onFatal: () => setRecLeft(0),
      });
    };

    rec.onend = () => {
      if (!listeningRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          setListening(false);
          setRecLeft(0);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone.");
      setListening(false);
      setRecLeft(0);
    }
  }, []);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    if (phase !== "record" || !listening) return;
    const id = window.setInterval(() => {
      setRecLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => stopRecognition(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, listening, stopRecognition]);

  const beginTurn = useCallback(async (_turnNumber: number, qEn: string, qTh: string) => {
    setTranscript("");
    finalTranscriptRef.current = "";
    transcriptRef.current = "";
    setSubmitError(null);
    setCurrentQ({ en: qEn, th: qTh });
    setPhase("playing");
    await playQuestionTts(qEn);
    setPrepLeft(INTERACTIVE_SPEAKING_PREP_SECONDS);
    setPhase("prep");
  }, []);

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
      stopRecognition();
      setTranscript("");
      finalTranscriptRef.current = "";
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

    stopRecognition();
    setTranscript("");
    finalTranscriptRef.current = "";
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
    stopRecognition,
  ]);

  /** After recording stops (timer or Stop), advance automatically when the answer is long enough. */
  useEffect(() => {
    if (phase !== "record") return;
    if (listening) return;
    if (recLeft > 0) return;
    if (recordFinalizeStartedRef.current) return;
    recordFinalizeStartedRef.current = true;
    void runTurnSubmission();
  }, [phase, listening, recLeft, runTurnSubmission]);

  const finishRecordingEarly = () => {
    stopRecognition();
  };

  const onAnswerTranscriptChange = useCallback((value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
    finalTranscriptRef.current = value;
  }, []);

  const answerPlaceholder = useMemo(() => {
    if (phase === "playing") {
      return "Listen to the question above. When prep starts, you can type here; live captions appear when recording starts.";
    }
    if (phase === "prep") {
      return "Optional: start typing your answer. Live transcription fills this box when recording starts.";
    }
    if (phase === "record") {
      return "Live transcription appears here while you speak — edit if needed.";
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
                <p className="text-sm text-neutral-700">
                  You will hear each question once (English audio). Then you have{" "}
                  {INTERACTIVE_SPEAKING_PREP_SECONDS} seconds to think before recording starts. When you finish
                  speaking (or time runs out), the next question loads automatically — no button between turns. If
                  your answer is too short, you can add more and tap Continue.
                </p>
                <button
                  type="button"
                  onClick={() => void startExam()}
                  className="mt-4 border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
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
                      {listening ? "Recording…" : "Mic stopped"}
                    </p>
                    <p className="text-center text-2xl font-black tabular-nums text-ep-blue">{recLeft}s</p>
                  </div>
                ) : null}

                <div className="mt-4 border-t-2 border-dashed border-neutral-200 pt-4">
                  <label className="block text-sm font-bold text-neutral-900">
                    Your answer (live transcription — edit if needed)
                    <textarea
                      value={transcript}
                      onChange={(e) => onAnswerTranscriptChange(e.target.value)}
                      readOnly={phase === "playing"}
                      rows={8}
                      placeholder={answerPlaceholder}
                      className="mt-2 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-sm text-neutral-900 placeholder:text-neutral-400 read-only:opacity-80"
                    />
                  </label>
                  <p className="ep-stat mt-2 text-xs text-neutral-500">
                    Live captions need Chrome or Edge (network). If they fail, type here — your answer is
                    still saved.
                  </p>
                </div>

                {phase === "record" && listening ? (
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
