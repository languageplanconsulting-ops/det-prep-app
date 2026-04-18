"use client";

/**
 * MockInteractiveSpeakingSession
 * Phase-9 mock-test interactive speaking: TTS question → prep countdown → live speech
 * recognition answer → Gemini-generated follow-ups. 4 turns total.
 * On completion calls onSubmit({ turns }) once for later batch grading.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBrowserSpeechRecognition,
  isBrowserSpeechRecognitionAvailable,
  type WebSpeechRecognitionInstance,
} from "@/lib/browser-speech-recognition";
import {
  pickMediaRecorderMimeType,
  transcribeAudioBlobClient,
} from "@/lib/client-audio-transcribe";

// ─── constants ────────────────────────────────────────────────────────────────
export const MOCK_IS_TURN_COUNT = 4;
const PREP_SECONDS = 8;
const MAX_SPEAK_SECONDS = 35;

// ─── TTS helper ───────────────────────────────────────────────────────────────
async function playTtsQuestion(text: string): Promise<void> {
  const providers = [
    "deepgram",
    "inworld",
    "gemini",
    "elevenlabs",
  ] as const;
  for (const provider of providers) {
    try {
      const res = await fetch("/api/speech-synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, provider }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!data.audioBase64 || !data.mimeType) continue;
      await new Promise<void>((resolve) => {
        const audio = new Audio(
          `data:${data.mimeType};base64,${data.audioBase64}`,
        );
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
      return;
    } catch {
      /* try next provider */
    }
  }
}

// ─── types ────────────────────────────────────────────────────────────────────
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
  | "review";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: { turns: CompletedTurn[] }) => void;
};

// ─── component ────────────────────────────────────────────────────────────────
export function MockInteractiveSpeakingSession({
  content,
  submitting = false,
  onSubmit,
}: Props) {
  const starterEn = String(
    content.prompt_en ??
      content.instruction ??
      "Tell me about yourself and your daily routine.",
  );
  const starterTh = String(
    content.prompt_th ?? content.instruction_th ?? "",
  );
  const scenarioTitleEn = String(
    content.scenario_title_en ?? content.title_en ?? "Mock Interactive Speaking",
  );
  const scenarioTitleTh = String(content.scenario_title_th ?? "");

  // ── state ──
  const [phase, setPhase] = useState<Phase>("intro");
  const [turn, setTurn] = useState(1);
  const [completed, setCompleted] = useState<CompletedTurn[]>([]);
  const [currentQ, setCurrentQ] = useState({ en: starterEn, th: starterTh });
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [recLeft, setRecLeft] = useState(MAX_SPEAK_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [browserSttActive, setBrowserSttActive] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── refs ──
  const transcriptRef = useRef("");
  const completedRef = useRef<CompletedTurn[]>([]);
  const currentQRef = useRef({ en: starterEn, th: starterTh });
  const recordGenRef = useRef(0);
  const typedBeforeMicRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
  const speechRecognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const browserSttUserStopRef = useRef(false);
  const browserSttDiscardRef = useRef(false);
  const browserSpeechFinalRef = useRef("");
  const runSubmitRef = useRef<(() => void) | null>(null);
  const startRecordingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);
  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);

  // ── media cleanup ──
  const forceStopMedia = useCallback(() => {
    recordGenRef.current += 1;
    const sr = speechRecognitionRef.current;
    if (sr) {
      browserSttDiscardRef.current = true;
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

  useEffect(() => () => forceStopMedia(), [forceStopMedia]);

  const stopRecording = useCallback(() => {
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
    if (mr && mr.state === "recording") mr.stop();
  }, []);

  // ── prep countdown ──
  useEffect(() => {
    if (phase !== "prep") return;
    const id = window.setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => {
            setPhase("record");
            setRecLeft(MAX_SPEAK_SECONDS);
            startRecordingRef.current?.();
          }, 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── rec countdown ──
  useEffect(() => {
    if (phase !== "record" || !listening) return;
    const id = window.setInterval(() => {
      setRecLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => stopRecording(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, listening, stopRecording]);

  // ── recording ──
  const startRecording = useCallback(() => {
    void (async () => {
      const myGen = recordGenRef.current + 1;
      recordGenRef.current = myGen;
      typedBeforeMicRef.current = transcriptRef.current;

      const canBrowserStt = isBrowserSpeechRecognitionAvailable();
      const canUpload =
        typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia;

      if (!canBrowserStt && !canUpload) {
        setError(
          "Recording not supported in this browser. Type your answer below.",
        );
        setRecLeft(0);
        return;
      }

      setError(null);
      mediaChunksRef.current = [];

      // ── try browser STT first ──
      if (canBrowserStt) {
        const recognition = createBrowserSpeechRecognition();
        if (recognition) {
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
              if (r.isFinal)
                browserSpeechFinalRef.current += r[0].transcript;
              else interim += r[0].transcript;
            }
            const speech = (
              browserSpeechFinalRef.current + interim
            ).trim();
            const merged = [typedBeforeMicRef.current.trim(), speech]
              .filter(Boolean)
              .join(" ")
              .trim();
            transcriptRef.current = merged;
            setTranscript(merged);
          };

          recognition.onerror = (event) => {
            if (event.error === "aborted" || myGen !== recordGenRef.current)
              return;
            if (event.error === "not-allowed") {
              setError(
                "Microphone blocked. Allow mic access or type your answer.",
              );
              setListening(false);
              setBrowserSttActive(false);
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
              void runSubmitRef.current?.();
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
            speechRecognitionRef.current = recognition;
            setBrowserSttActive(true);
            setListening(true);
            return;
          } catch {
            /* fall through to MediaRecorder */
          }
        }
      }

      // ── fallback: MediaRecorder → server transcribe ──
      if (!canUpload) {
        setError("Speech recognition failed. Type your answer below.");
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
          const blob = new Blob(mediaChunksRef.current, {
            type: mime || "audio/webm",
          });
          mediaChunksRef.current = [];
          setListening(false);
          setTranscribing(true);
          try {
            const text = await transcribeAudioBlobClient(blob);
            if (myGen !== recordGenRef.current) return;
            const merged = [typedBeforeMicRef.current.trim(), text]
              .filter(Boolean)
              .join(" ")
              .trim();
            transcriptRef.current = merged;
            setTranscript(merged);
          } catch (e) {
            if (myGen !== recordGenRef.current) return;
            setError(
              e instanceof Error
                ? e.message
                : "Could not transcribe audio. Edit below.",
            );
          } finally {
            if (myGen !== recordGenRef.current) return;
            setTranscribing(false);
            void runSubmitRef.current?.();
          }
        };
        mediaRecorderRef.current = mr;
        mr.start(250);
        setListening(true);
      } catch {
        if (myGen !== recordGenRef.current) return;
        setError(
          "Microphone unavailable. Type your answer in the box below.",
        );
        setRecLeft(0);
      }
    })();
  }, []);

  useEffect(() => {
    startRecordingRef.current = () => startRecording();
  }, [startRecording]);

  // ── begin a turn (TTS → prep) ──
  const beginTurn = useCallback(
    async (qEn: string, qTh: string) => {
      forceStopMedia();
      setTranscript("");
      transcriptRef.current = "";
      setError(null);
      setShowQuestion(false);
      setCurrentQ({ en: qEn, th: qTh });
      setPhase("playing");
      await playTtsQuestion(qEn);
      setPrepLeft(PREP_SECONDS);
      setRecLeft(MAX_SPEAK_SECONDS);
      setPhase("prep");
    },
    [forceStopMedia],
  );

  // ── submit current turn transcript, advance ──
  const runSubmit = useCallback(async () => {
    const trimmed = transcriptRef.current.trim();
    // Auto-advance behavior: even very short/empty answers move to next turn when time ends.
    setError(null);

    const cur = currentQRef.current;
    const nextCompleted: CompletedTurn[] = [
      ...completedRef.current,
      { questionEn: cur.en, questionTh: cur.th, transcript: trimmed },
    ];

    // ── last turn → submit all ──
    if (nextCompleted.length >= MOCK_IS_TURN_COUNT) {
      setCompleted(nextCompleted);
      completedRef.current = nextCompleted;
      forceStopMedia();
      setTranscript("");
      transcriptRef.current = "";
      onSubmit({ turns: nextCompleted });
      return;
    }

    // ── more turns → fetch next question ──
    forceStopMedia();
    setTranscript("");
    transcriptRef.current = "";
    setCompleted(nextCompleted);
    completedRef.current = nextCompleted;

    const nextTurnNum = nextCompleted.length + 1;
    setTurn(nextTurnNum);
    setPhase("loading-q");

    try {
      const res = await fetch("/api/interactive-speaking-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioTitleEn,
          scenarioTitleTh,
          starterQuestionEn: starterEn,
          starterQuestionTh: starterTh,
          nextTurnNumber: nextTurnNum,
          history: nextCompleted.map((c) => ({
            questionEn: c.questionEn,
            answerTranscript: c.transcript,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        questionEn?: string;
        questionTh?: string;
        error?: string;
      };
      if (!res.ok || !data.questionEn) {
        throw new Error(data.error ?? "Could not load next question.");
      }
      await beginTurn(data.questionEn, String(data.questionTh ?? ""));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load next question.",
      );
      setPhase("review");
    }
  }, [beginTurn, forceStopMedia, onSubmit, scenarioTitleEn, scenarioTitleTh, starterEn, starterTh]);

  useEffect(() => {
    runSubmitRef.current = () => {
      void runSubmit();
    };
  }, [runSubmit]);

  const startExam = useCallback(async () => {
    setTurn(1);
    setCompleted([]);
    completedRef.current = [];
    await beginTurn(starterEn, starterTh);
  }, [beginTurn, starterEn, starterTh]);

  // ─────────────────────────── render ────────────────────────────────────────
  const isLastTurn = completed.length + 1 >= MOCK_IS_TURN_COUNT;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-[#004AAD]">
          Interactive Speaking
        </p>
        {phase !== "intro" && (
          <span className="rounded-[4px] border-2 border-black bg-[#004AAD] px-2 py-0.5 text-xs font-black text-[#FFCC00]">
            Turn {turn}/{MOCK_IS_TURN_COUNT}
          </span>
        )}
      </div>

      {/* Turn progress dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: MOCK_IS_TURN_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 border-2 border-black transition-colors duration-300 ${
              i < completed.length
                ? "bg-[#004AAD]"
                : i === completed.length && phase !== "intro"
                  ? "bg-[#FFCC00]"
                  : "bg-neutral-200"
            }`}
          />
        ))}
      </div>

      {/* ── INTRO ── */}
      {phase === "intro" && (
        <div className="rounded-[4px] border-4 border-black bg-neutral-50 p-5 space-y-3">
          <h3 className="text-base font-black text-neutral-900">
            Interactive Speaking
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            You'll have <strong>{MOCK_IS_TURN_COUNT} turns</strong>. Each turn the AI will
            read the question aloud → you get {PREP_SECONDS}s to think → then speak
            (up to {MAX_SPEAK_SECONDS}s). Your live transcript is shown below the mic.
          </p>
          {starterTh && (
            <p className="text-xs text-neutral-500">{starterTh}</p>
          )}
          <div className="rounded-[4px] border-2 border-black bg-white p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#004AAD] mb-1">
              Opening question
            </p>
            <p className="text-sm text-neutral-800">{starterEn}</p>
          </div>
          <button
            type="button"
            onClick={() => void startExam()}
            disabled={submitting}
            className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50 hover:shadow-[2px_2px_0_0_#000] transition-shadow"
          >
            Start Interactive Speaking
          </button>
        </div>
      )}

      {/* ── LOADING NEXT Q ── */}
      {phase === "loading-q" && (
        <div className="rounded-[4px] border-4 border-black bg-neutral-50 p-6 space-y-3 text-center">
          <div className="flex justify-center gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="block h-2.5 w-2.5 rounded-full bg-[#004AAD] animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-sm font-bold text-neutral-700">
            Generating next question based on your answer…
          </p>
        </div>
      )}

      {/* ── PLAYING TTS ── */}
      {phase === "playing" && (
        <div className="rounded-[4px] border-4 border-[#004AAD] bg-[#004AAD] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFCC00] animate-pulse" />
            <p className="text-sm font-black text-[#FFCC00]">
              AI is reading the question aloud…
            </p>
          </div>
          <p className="text-xs text-white/70">
            Listen carefully. Tap "Show question" after for the text.
          </p>
        </div>
      )}

      {/* ── PREP COUNTDOWN ── */}
      {phase === "prep" && (
        <div className="rounded-[4px] border-4 border-[#FFCC00] bg-neutral-50 p-5 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
            Think time
          </p>
          <p className="text-6xl font-black tabular-nums text-[#004AAD]">
            {prepLeft}
            <span className="text-2xl">s</span>
          </p>
          <p className="text-xs text-neutral-600">
            Microphone starts automatically when this reaches 0.
          </p>
        </div>
      )}

      {/* ── RECORDING / REVIEW hint strip ── */}
      {(phase === "record" ||
        phase === "review" ||
        phase === "playing" ||
        phase === "prep") && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowQuestion((v) => !v)}
            className="rounded-sm border-2 border-black bg-[#FFCC00] px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#000] hover:shadow-none transition-shadow"
          >
            {showQuestion ? "Hide question" : "Hint — show question"}
          </button>

          {phase === "record" && (
            <span className="text-xs font-black tabular-nums text-[#004AAD]">
              {listening
                ? browserSttActive
                  ? "🔴 Live captions"
                  : "⏺ Recording"
                : transcribing
                  ? "Processing…"
                  : `${recLeft}s left`}
            </span>
          )}
        </div>
      )}

      {/* question reveal */}
      {showQuestion && (
        <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-3">
          <p className="text-sm font-bold text-neutral-900">{currentQ.en}</p>
          {currentQ.th && (
            <p className="mt-1 text-xs text-neutral-600">{currentQ.th}</p>
          )}
        </div>
      )}

      {/* ── TRANSCRIPT TEXTAREA ── */}
      {(phase === "record" || phase === "review") && (
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-neutral-600 mb-1.5">
            Your reply {phase === "record" && listening ? "— live" : ""}
          </label>
          <textarea
            value={transcript}
            onChange={(e) => {
              transcriptRef.current = e.target.value;
              setTranscript(e.target.value);
            }}
            readOnly={
              phase === "record" && (listening || transcribing)
            }
            rows={5}
            placeholder={
              phase === "record" && listening
                ? browserSttActive
                  ? "Your words appear here as you speak…"
                  : "Recording in progress…"
                : transcribing
                  ? "Transcribing your audio…"
                  : "Your reply (edit if needed)…"
            }
            className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm read-only:bg-neutral-50 read-only:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#004AAD]"
          />
        </div>
      )}

      {/* stop early button */}
      {phase === "record" && listening && !transcribing && (
        <button
          type="button"
          onClick={() => {
            setRecLeft(0);
            stopRecording();
          }}
          className="w-full rounded-[4px] border-4 border-black bg-red-600 py-2.5 text-sm font-black text-white shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] transition-shadow"
        >
          I'm done speaking — stop recording
        </button>
      )}

      {/* error */}
      {error && (
        <div className="rounded-[4px] border-2 border-red-400 bg-red-50 px-3 py-2">
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* ── CONTINUE / SUBMIT ── */}
      {phase === "review" && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void runSubmit()}
          className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-60 hover:shadow-[2px_2px_0_0_#000] transition-shadow"
        >
          {submitting
            ? "Saving… / กำลังบันทึก"
            : isLastTurn
              ? `Submit — end of interactive speaking`
              : `Continue to turn ${completed.length + 2} →`}
        </button>
      )}

      {/* word count hint */}
      {(phase === "record" || phase === "review") && transcript && (
        <p className="text-xs font-mono text-neutral-500">
          {transcript.trim().split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  );
}
