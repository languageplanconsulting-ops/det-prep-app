"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import type { MiniStudySpeakPhotoSession } from "@/lib/mini-study/content";
import { savePhotoSpeakReport } from "@/lib/photo-speak-storage";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

type Props = { session: MiniStudySpeakPhotoSession };

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const TIMER_SECS = 60;

export function MiniStudyPhotoSpeakPhase({ session }: Props) {
  const router = useRouter();
  const { photo } = session;
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    setSecondsLeft(0);
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
    if (!listening) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => stopRecognition(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [listening, stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Live speech-to-text may be limited in this browser. You can still type your answer below and submit for AI scoring.",
      );
      return;
    }
    setSpeechError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;
    setSecondsLeft(TIMER_SECS);

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
        onFatal: () => setSecondsLeft(0),
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
          setSecondsLeft(0);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone. You can type below instead.");
      setListening(false);
      setSecondsLeft(0);
    }
  }, []);

  const wc = countWords(transcript);
  const canSubmit = wc >= 15 && !submitting && !listening;

  const submit = async () => {
    if (!canSubmit) return;
    const attemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mini-s-${Date.now()}`;
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
          attemptId,
          itemId: photo.id,
          titleEn: photo.titleEn,
          titleTh: photo.titleTh,
          promptEn: photo.promptEn,
          promptTh: photo.promptTh,
          imageUrl: photo.imageUrl,
          keywords: photo.keywords,
          prepMinutes: 0,
          transcript,
          originHub: "speak-about-photo",
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<PhotoSpeakAttemptReport>;
      if (!res.ok) throw new Error(data.error || `Grading failed (${res.status})`);
      if (!data.attemptId || data.score160 === undefined || data.kind !== "photo-speak") {
        throw new Error("Invalid response from grading service");
      }
      const report = data as PhotoSpeakAttemptReport;
      stashReportForNavigation(report.attemptId, report);
      savePhotoSpeakReport(report);
      await router.push(`/practice/production/speak-about-photo/report/${report.attemptId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 px-4 py-8">
      {submitting ? (
        <GradingProgressLoader eyebrow="Grading your response" variant="premium" />
      ) : null}

      <header className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Session {session.index} · Speak about photo
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{photo.titleEn}</h1>
        <p className="text-sm text-neutral-600">{photo.titleTh}</p>
      </header>

      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.imageUrl} alt={photo.titleEn} className="block w-full" />
      </div>

      <div className="rounded-xl bg-[#fffbe6] p-3 ring-1 ring-[#FFCC00]/40 text-sm leading-6 text-neutral-800">
        <strong>Prompt:</strong> {photo.promptEn}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          {!listening ? (
            <button
              type="button"
              onClick={startListening}
              className="rounded-lg bg-[#004AAD] px-5 py-3 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
            >
              🎙 Start speaking
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecognition}
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md transition"
            >
              ■ Stop ({secondsLeft}s)
            </button>
          )}
          <span className="text-xs text-neutral-500">
            Aim for 6 sentences using is/are + V-ing. No -ed forms.
          </span>
        </div>
        {speechError ? (
          <p className="mt-2 text-sm text-amber-800">{speechError}</p>
        ) : null}

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-neutral-500">
          Transcript (you can edit before submitting)
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          placeholder="Your spoken transcript will appear here. You can also type directly."
          className="mt-2 w-full rounded-xl bg-white p-3 ring-1 ring-slate-200 text-base leading-7"
        />
        <p className="mt-2 text-xs text-neutral-500">
          {wc} words · need at least 15 to submit
        </p>
        {submitError ? (
          <p className="mt-2 text-sm font-bold text-red-700">{submitError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/practice/mini-study"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
          >
            ← Sessions
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            {submitting ? "กำลังประเมิน…" : "ส่งให้ประเมิน"}
          </button>
        </div>
      </div>
    </main>
  );
}
