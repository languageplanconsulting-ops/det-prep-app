"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import type { MiniStudyWritePhotoSession } from "@/lib/mini-study/content";
import { savePhotoSpeakReport } from "@/lib/photo-speak-storage";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

type Props = { session: MiniStudyWritePhotoSession };

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function MiniStudyPhotoWritePhase({ session }: Props) {
  const router = useRouter();
  const { photo } = session;
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const wc = countWords(text);
  const canSubmit = wc >= 15 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    const attemptId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mini-w-${Date.now()}`;
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
          transcript: text,
          originHub: "write-about-photo",
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
      // Reuse the existing write-about-photo report viewer (notebook save included).
      await router.push(`/practice/production/write-about-photo/report/${report.attemptId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
      {submitting ? (
        <GradingProgressLoader eyebrow="Grading your response" variant="premium" />
      ) : null}

      <header className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Session {session.index} · Write about photo
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
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          Your description
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Write 3–5 sentences using one of the three patterns. Use present tense only…"
          className="mt-2 w-full rounded-xl bg-white p-3 ring-1 ring-slate-200 text-base leading-7"
          autoFocus
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
            {submitting ? "AI กำลังตรวจ…" : "ส่งให้ AI ตรวจ"}
          </button>
        </div>
      </div>
    </main>
  );
}
