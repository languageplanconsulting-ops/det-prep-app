"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuestionThumbnailDisplay } from "@/components/speaking/QuestionThumbnailDisplay";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";
import {
  getSpeakingQuestionLatestScore,
  getSpeakingVisibleTopicById,
  saveSpeakingReport,
} from "@/lib/speaking-storage";
import type { SpeakingAttemptReport, SpeakingQuestion, SpeakingRoundNum } from "@/types/speaking";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ReadSpeakSession({
  topicId,
  round,
}: {
  topicId: string;
  round: SpeakingRoundNum;
}) {
  const router = useRouter();
  const vipGate = useVipAiFeedbackGate();
  const topic = useMemo(() => getSpeakingVisibleTopicById(topicId, round), [topicId, round]);
  const roundBase = `/practice/production/read-and-speak/round/${round}`;
  const [prepChoice, setPrepChoice] = useState(3);
  const [phase, setPhase] = useState<
    "prep-pick" | "prep-run" | "pick-question" | "record"
  >("prep-pick");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<SpeakingQuestion | null>(
    null,
  );
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionScoreTick, setQuestionScoreTick] = useState(0);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    if (phase !== "prep-run") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "prep-run" && secondsLeft === 0) setPhase("pick-question");
  }, [phase, secondsLeft]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    const bump = () => setQuestionScoreTick((n) => n + 1);
    window.addEventListener("ep-speaking-storage", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("ep-speaking-storage", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const stopRecognition = useCallback(() => {
    setListening(false);
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

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Live speech-to-text is not available in this browser. Try Chrome or Edge on desktop, or type your answer in the transcript box.",
      );
      return;
    }
    setSpeechError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;

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
      setTranscript(`${fin}${interim ? (fin ? " " : "") + interim : ""}`.trim());
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef,
        setSpeechError,
        setListening,
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
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone.");
      setListening(false);
    }
  }, []);

  if (!topic) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Topic not found.</p>
        <Link href="/practice/production/read-and-speak" className="mt-4 inline-block text-ep-blue">
          Back to rounds
        </Link>
      </div>
    );
  }

  const wc = countWords(transcript);
  const canSubmit = wc >= 15;

  const startPrep = () => {
    setSecondsLeft(prepChoice * 60);
    setPhase("prep-run");
  };

  const selectQuestion = (q: SpeakingQuestion) => {
    setSelectedQuestion(q);
    setPhase("record");
    setTranscript("");
    finalTranscriptRef.current = "";
    stopRecognition();
  };

  const goToReport = async (report: SpeakingAttemptReport) => {
    try {
      await finalizeLatestStudySession({
        exerciseType: "read_then_speak",
        setId: `r${round}-${topicId}`,
        score: report.score160,
        completed: true,
        submissionPayload: {
          kind: "read_then_speak",
          topicId: topic.id,
          questionId: selectedQuestion?.id ?? null,
          titleEn: topic.titleEn,
          titleTh: topic.titleTh,
          promptEn: selectedQuestion?.promptEn ?? "",
          promptTh: selectedQuestion?.promptTh ?? "",
          transcript,
        },
        reportPayload: report,
      });
    } catch (e) {
      console.warn("[ReadSpeakSession] finalize study session failed", e);
    }
    stashReportForNavigation(report.attemptId, report);
    saveSpeakingReport(report);
    await router.push(`/practice/production/read-and-speak/report/${report.attemptId}`);
  };

  const submitWithGemini = async () => {
    if (!canSubmit || !topic || !selectedQuestion) return;
    if (!vipGate.confirmBeforeAiSubmit()) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sp-${Date.now()}`;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/speaking-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId: id,
          topicId: topic.id,
          questionId: selectedQuestion.id,
          topicTitleEn: topic.titleEn,
          topicTitleTh: topic.titleTh,
          questionPromptEn: selectedQuestion.promptEn,
          questionPromptTh: selectedQuestion.promptTh,
          prepMinutes: prepChoice,
          transcript,
          speakingRound: round,
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<SpeakingAttemptReport>;
      if (!res.ok) {
        throw new Error(data.error || `Grading failed (${res.status})`);
      }
      if (!data.attemptId || data.score160 === undefined) {
        throw new Error("Invalid response from grading service");
      }
      vipGate.recordSuccessfulAiSubmit();
      await goToReport(data as SpeakingAttemptReport);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudySessionBoundary
      skill="production"
      exerciseType="read_then_speak"
      setId={`r${round}-${topicId}`}
    >
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
      {submitting ? <GradingProgressLoader eyebrow="Grading your speaking" /> : null}
      <Link href={roundBase} className="text-sm font-bold text-ep-blue hover:underline">
        ← Round {round} topics
      </Link>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-2xl font-black">{topic.titleEn}</h1>
        <p className="text-sm text-neutral-600">{topic.titleTh}</p>
      </header>

      {phase === "prep-pick" ? (
        <BrutalPanel title="Preparation time (read the intro)">
          <p className="mb-3 text-sm text-neutral-700">{topic.promptEn}</p>
          <p className="mb-4 text-sm text-neutral-600">{topic.promptTh}</p>
          <label className="block text-sm font-bold">
            Minutes to prepare (1–5)
            <select
              value={prepChoice}
              onChange={(e) => setPrepChoice(Number(e.target.value))}
              className="mt-2 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={startPrep}
            className="mt-4 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
          >
            Start timer
          </button>
        </BrutalPanel>
      ) : null}

      {phase === "prep-run" ? (
        <BrutalPanel title="Preparing">
          <p className="text-sm text-neutral-700">{topic.promptEn}</p>
          <p className="ep-stat mt-6 text-center text-6xl font-black text-ep-blue">
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={() => setPhase("pick-question")}
            className="mt-4 w-full border-2 border-black bg-white py-2 text-sm font-bold"
          >
            Skip to question cards
          </button>
        </BrutalPanel>
      ) : null}

      {phase === "pick-question" ? (
        <BrutalPanel title="Tap a question card">
          <p className="mb-4 text-sm text-neutral-600">
            Read the card, take a breath, then on the next screen press{" "}
            <strong>Start speaking</strong> when you are ready.
          </p>
          <div
            key={questionScoreTick}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {topic.questions.map((q) => {
              const latest = getSpeakingQuestionLatestScore(topic.id, q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => selectQuestion(q)}
                  className="relative flex min-h-[7rem] flex-col items-center justify-center gap-2 border-2 border-black bg-ep-yellow/40 p-3 pb-7 shadow-[3px_3px_0_0_#000] transition hover:bg-ep-yellow"
                >
                  <QuestionThumbnailDisplay thumbnail={q.thumbnail} />
                  <span className="ep-stat text-center text-[10px] font-bold uppercase text-neutral-700">
                    Open
                  </span>
                  {latest ? (
                    <span
                      className="absolute bottom-1.5 right-1.5 rounded-sm border-2 border-black bg-white px-1.5 py-0.5 ep-stat text-[10px] font-black leading-none text-ep-blue shadow-[1px_1px_0_0_#000]"
                      title={`Latest score · report ${latest.attemptId.slice(0, 8)}…`}
                    >
                      {latest.score160}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </BrutalPanel>
      ) : null}

      {phase === "record" && selectedQuestion ? (
        <BrutalPanel title="Speak your answer">
          <div className="mb-4 rounded-sm border-2 border-black bg-white p-3 text-sm">
            <p className="font-bold text-neutral-900">{selectedQuestion.promptEn}</p>
            <p className="mt-2 text-neutral-600">{selectedQuestion.promptTh}</p>
          </div>

          {speechError ? (
            <p className="mb-2 text-sm font-bold text-red-700">{speechError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!listening ? (
              <button
                type="button"
                onClick={startListening}
                className="border-2 border-black bg-ep-blue px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000]"
              >
                Start speaking (live caption)
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecognition}
                className="border-2 border-black bg-red-700 px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000]"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopRecognition();
                setPhase("pick-question");
                setSelectedQuestion(null);
              }}
              className="border-2 border-black bg-white px-4 py-3 text-sm font-bold"
            >
              Choose another card
            </button>
            <Link
              href={roundBase}
              className="inline-flex items-center border-2 border-black bg-neutral-100 px-4 py-3 text-sm font-bold"
            >
              All topics in round
            </Link>
          </div>

          <label className="mt-4 block text-sm font-bold">
            Live transcript (you can edit before submit)
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="mt-2 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-sm"
              placeholder="Text updates while you speak (browser live caption), or type / paste here…"
            />
          </label>
          <p className="ep-stat mt-2 text-xs text-neutral-500">
            {wc} words · need at least 15 to submit
          </p>

          {submitError ? (
            <p className="mt-2 text-sm font-bold text-red-700">{submitError}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            <VipAiFeedbackQuotaBanner />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitWithGemini}
              className="border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-black disabled:opacity-40"
            >
              {submitting ? "Grading…" : "Submit"}
            </button>
          </div>
        </BrutalPanel>
      ) : null}
    </div>
    </StudySessionBoundary>
  );
}
