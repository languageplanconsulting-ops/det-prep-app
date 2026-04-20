"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import { savePhotoSpeakReport } from "@/lib/photo-speak-storage";
import { recordSpeakAboutPhotoProgress } from "@/lib/speak-about-photo-progress";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";
import {
  findWriteAboutPhotoItem,
  getWriteAboutPhotoRoundNumberForItem,
} from "@/lib/write-about-photo-data";
import { recordWriteAboutPhotoProgress } from "@/lib/write-about-photo-storage";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

type Mode = "write" | "speak";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function loadingLabel(percent: number): string {
  if (percent < 25) return "EN: Gathering your response data... | TH: กำลังรวบรวมข้อมูลคำตอบของคุณ...";
  if (percent < 50)
    return "EN: Using English Plan's 4-year database... | TH: กำลังใช้ฐานข้อมูล 4 ปีของ English Plan...";
  if (percent < 75)
    return "EN: Identifying strengths and weaknesses... | TH: กำลังวิเคราะห์จุดแข็งและจุดที่ควรพัฒนา...";
  if (percent < 90)
    return "EN: Building personalized teacher-like feedback... | TH: กำลังสร้าง feedback เฉพาะบุคคลเสมือนครูผู้สอน...";
  if (percent < 100)
    return "EN: Your report is almost ready... | TH: รายงานของคุณใกล้พร้อมแล้ว กำลังจัดรูปแบบคำแนะนำ...";
  return "EN: Report ready. | TH: รายงานพร้อมแล้ว";
}

export function PhotoAssessmentSession({
  mode,
  itemId,
}: {
  mode: Mode;
  itemId: string;
}) {
  const router = useRouter();
  const item = useMemo(() => findWriteAboutPhotoItem(itemId), [itemId]);
  const round = item ? getWriteAboutPhotoRoundNumberForItem(item.id) : undefined;
  const vipGate = useVipAiFeedbackGate();

  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);
  const loadingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    recRef.current = null;
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Speech recognition is not available in this browser. Try Chrome or Edge on desktop.",
      );
      return;
    }
    setSpeechError(null);
    finalTranscriptRef.current = transcript;
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
  }, [transcript]);

  const resetAnswer = () => {
    stopRecognition();
    setTranscript("");
    finalTranscriptRef.current = "";
    setSubmitError(null);
    setSpeechError(null);
  };

  const startLoading = () => {
    setLoadingPercent(1);
    if (loadingTimerRef.current) window.clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = window.setInterval(() => {
      setLoadingPercent((p) => (p >= 95 ? p : p + 1));
    }, 120);
  };

  const stopLoading = () => {
    if (loadingTimerRef.current) {
      window.clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const submit = async () => {
    if (!item) return;
    if (countWords(transcript) < 15) {
      setSubmitError("Please provide at least 15 words before submitting.");
      return;
    }
    if (!vipGate.confirmBeforeAiSubmit()) return;

    const attemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `photo-${Date.now()}`;

    setSubmitting(true);
    setSubmitError(null);
    startLoading();
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/photo-speak-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId,
          itemId: item.id,
          titleEn: item.titleEn,
          titleTh: item.titleTh,
          promptEn: item.promptEn,
          promptTh: item.promptTh,
          imageUrl: item.imageUrl,
          keywords: item.keywords,
          prepMinutes: mode === "speak" ? 1 : 0,
          transcript,
          originHub: mode === "speak" ? "speak-about-photo" : "write-about-photo",
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<PhotoSpeakAttemptReport>;
      if (!res.ok) throw new Error(data.error || `Grading failed (${res.status})`);
      if (!data.attemptId || data.score160 === undefined || data.kind !== "photo-speak") {
        throw new Error("Invalid response from grading service");
      }

      setLoadingPercent(100);
      vipGate.recordSuccessfulAiSubmit();
      const report = data as PhotoSpeakAttemptReport;
      try {
        await finalizeLatestStudySession({
          exerciseType: mode === "speak" ? "speak_about_photo" : "write_about_photo",
          setId: item.id,
          score: report.score160,
          completed: true,
          submissionPayload: {
            kind: mode === "speak" ? "speak_about_photo" : "write_about_photo",
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
        console.warn("[PhotoAssessmentSession] finalize study session failed", e);
      }
      stashReportForNavigation(report.attemptId, report);
      savePhotoSpeakReport(report);
      if (mode === "speak") {
        recordSpeakAboutPhotoProgress(report.topicId, report.score160, report.attemptId);
      } else {
        recordWriteAboutPhotoProgress(report.topicId, report.score160, report.attemptId);
      }

      await router.push(
        mode === "speak"
          ? `/practice/production/speak-about-photo/report/${report.attemptId}`
          : `/practice/production/write-about-photo/report/${report.attemptId}`,
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      stopLoading();
      setSubmitting(false);
    }
  };

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Photo task not found.</p>
        <Link
          href={
            mode === "speak"
              ? "/practice/production/speak-about-photo"
              : "/practice/production/write-about-photo"
          }
          className="mt-4 inline-block text-ep-blue"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="production"
      exerciseType={mode === "speak" ? "speak_about_photo" : "write_about_photo"}
      setId={item.id}
    >
      <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href={
            mode === "speak"
              ? "/practice/production/speak-about-photo"
              : "/practice/production/write-about-photo"
          }
          className="text-sm font-bold text-ep-blue hover:underline"
        >
          {mode === "speak" ? "← Speak about photo" : "← Write about photo"}
        </Link>

        <header className="ep-brutal rounded-sm border-black bg-white p-6">
          <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
            {mode === "speak" ? "Speak about photo" : "Write about photo"} {round ? `· Round ${round}` : ""}
          </p>
          <h1 className="mt-2 text-2xl font-black">{item.titleEn}</h1>
          <p className="text-sm text-neutral-600">{item.titleTh}</p>
        </header>

        <BrutalPanel title="Task">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            className="mb-4 max-h-72 w-full rounded-sm border object-cover"
            referrerPolicy="no-referrer"
          />
          <p className="text-sm font-bold text-neutral-900">{item.promptEn}</p>
          <p className="mt-1 text-sm text-neutral-700">{item.promptTh}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {!listening ? (
              <button
                type="button"
                onClick={startListening}
                className="border-2 border-black bg-ep-yellow px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                Start live transcription
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecognition}
                className="border-2 border-black bg-red-600 px-3 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0_0_#000]"
              >
                Stop recording
              </button>
            )}
          </div>
          {speechError ? <p className="mt-2 text-xs font-bold text-red-700">{speechError}</p> : null}

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            placeholder="Write or record your answer here..."
            className="mt-4 w-full border-2 border-black bg-white px-3 py-2 text-sm"
          />
          <p className="ep-stat mt-2 text-xs text-neutral-500">Word count: {countWords(transcript)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="border-2 border-black bg-ep-blue px-4 py-2 text-sm font-black text-white shadow-[2px_2px_0_0_#000] disabled:opacity-60"
            >
              I'm happy with it now — Submit
            </button>
            <button
              type="button"
              onClick={resetAnswer}
              disabled={submitting}
              className="border-2 border-black bg-white px-4 py-2 text-sm font-black"
            >
              I want to try again
            </button>
          </div>

          {submitError ? <p className="mt-3 text-sm font-bold text-red-700">{submitError}</p> : null}
        </BrutalPanel>

        {submitting ? <GradingProgressLoader eyebrow="Grading your response" variant="premium" /> : null}
      </div>
    </StudySessionBoundary>
  );
}
