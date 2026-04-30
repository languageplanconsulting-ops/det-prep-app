"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { findWriteAboutPhotoItem } from "@/lib/write-about-photo-data";
import { getWriteAboutPhotoRoundForItemId } from "@/lib/write-about-photo-storage";
import { recordSpeakAboutPhotoProgress } from "@/lib/speak-about-photo-progress";
import { savePhotoSpeakReport } from "@/lib/photo-speak-storage";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function PhotoSpeakSession({ itemId }: { itemId: string }) {
  const router = useRouter();
  const vipGate = useVipAiFeedbackGate();
  const item = useMemo(() => findWriteAboutPhotoItem(itemId), [itemId]);
  const round = item ? getWriteAboutPhotoRoundForItemId(item.id) : undefined;
  const [prepChoice, setPrepChoice] = useState(3);
  const [phase, setPhase] = useState<"prep-pick" | "prep-run" | "record">("prep-pick");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [speakTimerChoice, setSpeakTimerChoice] = useState(0);
  const [speakSecondsLeft, setSpeakSecondsLeft] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    if (phase !== "prep-run") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "prep-run" && secondsLeft === 0) setPhase("record");
  }, [phase, secondsLeft]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    setSpeakSecondsLeft(0);
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
    if (!listening || speakTimerChoice <= 0) return;
    const id = window.setInterval(() => {
      setSpeakSecondsLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => stopRecognition(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [listening, speakTimerChoice, stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Live speech-to-text may be limited in this browser or on iPad Safari. You can still type your answer and use AI scoring normally.",
      );
      return;
    }
    setSpeechError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;
    if (speakTimerChoice > 0) setSpeakSecondsLeft(speakTimerChoice);
    else setSpeakSecondsLeft(0);

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
        onFatal: () => setSpeakSecondsLeft(0),
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
          setSpeakSecondsLeft(0);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone. On iPad/Safari, you can type your answer instead and still submit for AI scoring.");
      setListening(false);
      setSpeakSecondsLeft(0);
    }
  }, [speakTimerChoice]);

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Photo task not found.</p>
        <Link href="/practice/production/speak-about-photo" className="mt-4 inline-block text-ep-blue">
          Back
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

  const tryAgain = () => {
    stopRecognition();
    setTranscript("");
    finalTranscriptRef.current = "";
    setSubmitError(null);
    setSpeechError(null);
    setSpeakSecondsLeft(0);
  };

  const goToReport = async (report: PhotoSpeakAttemptReport) => {
    try {
      await finalizeLatestStudySession({
        exerciseType: "speak_about_photo",
        setId: itemId,
        score: report.score160,
        completed: true,
        submissionPayload: {
          kind: "speak_about_photo",
          itemId: item.id,
          titleEn: item.titleEn,
          titleTh: item.titleTh,
          promptEn: item.promptEn,
          promptTh: item.promptTh,
          transcript,
        },
        reportPayload: report,
      });
    } catch (e) {
      console.warn("[PhotoSpeakSession] finalize study session failed", e);
    }
    stashReportForNavigation(report.attemptId, report);
    savePhotoSpeakReport(report);
    recordSpeakAboutPhotoProgress(report.topicId, report.score160, report.attemptId);
    await router.push(`/practice/production/speak-about-photo/report/${report.attemptId}`);
  };

  const submitWithGemini = async () => {
    if (!canSubmit) return;
    if (!vipGate.confirmBeforeAiSubmit()) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `ph-${Date.now()}`;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/photo-speak-report", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId: id,
          itemId: item.id,
          titleEn: item.titleEn,
          titleTh: item.titleTh,
          promptEn: item.promptEn,
          promptTh: item.promptTh,
          imageUrl: item.imageUrl,
          keywords: item.keywords,
          prepMinutes: prepChoice,
          transcript,
          originHub: "speak-about-photo",
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<PhotoSpeakAttemptReport>;
      if (!res.ok) throw new Error(data.error || `Grading failed (${res.status})`);
      if (!data.attemptId || data.score160 === undefined || data.kind !== "photo-speak") {
        throw new Error("Invalid response from grading service");
      }
      vipGate.recordSuccessfulAiSubmit();
      await goToReport(data as PhotoSpeakAttemptReport);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudySessionBoundary
      skill="production"
      exerciseType="speak_about_photo"
      setId={itemId}
    >
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
      {submitting ? <GradingProgressLoader eyebrow="Grading your response" variant="premium" /> : null}
      <Link
        href={
          round !== undefined
            ? `/practice/production/speak-about-photo/round/${round}`
            : "/practice/production/speak-about-photo"
        }
        className="text-sm font-bold text-ep-blue hover:underline"
      >
        {round !== undefined ? "← Round & photos" : "← All rounds"}
      </Link>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-2xl font-black">{item.titleEn}</h1>
        <p className="text-sm text-neutral-600">{item.titleTh}</p>
      </header>

      {phase === "prep-pick" ? (
        <BrutalPanel title="Preparation (read the prompt)">
          <div className="mb-4 overflow-hidden rounded-sm border-2 border-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt=""
              className="max-h-64 w-full object-cover"
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-sm font-medium text-neutral-900">{item.promptEn}</p>
          <p className="mt-2 text-sm text-neutral-600">{item.promptTh}</p>
          {item.keywords.length > 0 ? (
            <p className="ep-stat mt-3 text-xs text-neutral-500">
              Hint tags: {item.keywords.join(", ")}
            </p>
          ) : null}
          <label className="mt-4 block text-sm font-bold">
            Prep time (minutes, 1–5)
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
            Start prep timer
          </button>
        </BrutalPanel>
      ) : null}

      {phase === "prep-run" ? (
        <BrutalPanel title="Preparing">
          <div className="mb-4 max-h-40 overflow-hidden rounded-sm border-2 border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt=""
              className="h-40 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="ep-stat mt-4 text-center text-6xl font-black text-ep-blue">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </p>
          <button
            type="button"
            onClick={() => setPhase("record")}
            className="mt-4 w-full border-2 border-black bg-white py-2 text-sm font-bold"
          >
            Skip to speaking
          </button>
        </BrutalPanel>
      ) : null}

      {phase === "record" ? (
        <BrutalPanel title="Speak about the photo">
          <div className="mb-4 overflow-hidden rounded-sm border-2 border-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt=""
              className="max-h-72 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-sm font-bold text-neutral-900">{item.promptEn}</p>
          <p className="mt-2 text-sm text-neutral-600">{item.promptTh}</p>

          <label className="mt-4 block text-sm font-bold">
            Optional speaking timer (auto-stops mic)
            <select
              value={speakTimerChoice}
              onChange={(e) => setSpeakTimerChoice(Number(e.target.value))}
              disabled={listening}
              className="mt-2 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm disabled:opacity-50"
            >
              <option value={0}>No limit</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds</option>
              <option value={120}>120 seconds</option>
              <option value={150}>150 seconds</option>
            </select>
          </label>
          {listening && speakTimerChoice > 0 ? (
            <p className="ep-stat mt-2 text-center text-2xl font-black text-red-700">
              {speakSecondsLeft}s left
            </p>
          ) : null}

          <p className="mt-3 ep-stat text-xs font-bold text-ep-blue">
            Speech recognition: English (US) only. Chrome/Edge use the internet for live captions — if
            that fails, use the text box below (no network needed for typing).
          </p>

          {speechError ? (
            <p className="mt-2 text-sm font-bold text-red-700">{speechError}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {!listening ? (
              <button
                type="button"
                onClick={startListening}
                className="border-2 border-black bg-ep-blue px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000]"
              >
                Start speaking (mic)
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
          </div>

          <label className="mt-4 block text-sm font-bold">
            Transcript (edit if needed)
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="mt-2 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-sm"
              placeholder="Your English speech appears here…"
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
          <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-neutral-200 pt-4">
            <button
              type="button"
              onClick={tryAgain}
              className="border-2 border-black bg-white px-4 py-2 text-sm font-bold"
            >
              Try again
            </button>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitWithGemini}
              className="border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-black disabled:opacity-40"
            >
              {submitting ? "Grading…" : "Submit"}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            <strong>Try again</strong> clears the transcript so you can re-record. AI grading needs{" "}
            <code className="ep-stat">GEMINI_API_KEY</code> in <code className="ep-stat">.env.local</code> (or your
            host&apos;s environment).
          </p>
        </BrutalPanel>
      ) : null}
    </div>
    </StudySessionBoundary>
  );
}
