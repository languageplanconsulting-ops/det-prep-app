"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import {
  getReadWriteTopicProgress,
  getTopicById,
  recordReadWriteTopicProgress,
  saveWritingReport,
  subscribeReadWriteTopicProgress,
} from "@/lib/writing-storage";
import type { WritingAttemptReport } from "@/types/writing";

const MAX_SCORE = 160;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ReadWriteSession({ topicId }: { topicId: string }) {
  const router = useRouter();
  const vipGate = useVipAiFeedbackGate();
  const topic = useMemo(() => getTopicById(topicId), [topicId]);
  const progress = useSyncExternalStore(
    subscribeReadWriteTopicProgress,
    () => getReadWriteTopicProgress(topicId),
    () => undefined as ReturnType<typeof getReadWriteTopicProgress>,
  );
  const [prepChoice, setPrepChoice] = useState(3);
  const [phase, setPhase] = useState<"prep-pick" | "prep-run" | "write">("prep-pick");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [essay, setEssay] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "prep-run") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "prep-run" && secondsLeft === 0) setPhase("write");
  }, [phase, secondsLeft]);

  if (!topic) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Topic not found.</p>
        <Link
          href="/practice/production/read-and-write"
          className="mt-4 inline-block text-ep-blue"
        >
          Back
        </Link>
      </div>
    );
  }

  const wc = countWords(essay);
  const followUps = topic.followUps ?? [];
  const canSubmit = wc >= 50;

  const latestScore = progress?.latestScore160 ?? null;
  const hasAttempt = Boolean(progress);
  const isPerfect = hasAttempt && (latestScore ?? 0) >= MAX_SCORE;
  const showRedeemOnSession = hasAttempt && !isPerfect;

  useEffect(() => {
    setFollowUpAnswers(followUps.map(() => ""));
  }, [topic.id]);

  const startPrep = () => {
    setSecondsLeft(prepChoice * 60);
    setPhase("prep-run");
  };

  const goToReport = async (report: WritingAttemptReport) => {
    try {
      await finalizeLatestStudySession({
        exerciseType: "read_then_write",
        setId: topicId,
        score: report.score160,
        completed: true,
        submissionPayload: {
          kind: "read_then_write",
          topicId: report.topicId,
          titleEn: topic.titleEn,
          titleTh: topic.titleTh,
          essay,
          followUpAnswers,
        },
        reportPayload: report,
      });
    } catch (e) {
      console.warn("[ReadWriteSession] finalize study session failed", e);
    }
    stashReportForNavigation(report.attemptId, report);
    saveWritingReport(report);
    recordReadWriteTopicProgress(report.topicId, report.score160, report.attemptId);
    await router.push(`/practice/production/read-and-write/report/${report.attemptId}`);
  };

  const submitWithGemini = async () => {
    if (!canSubmit || !topic) return;
    if (!vipGate.confirmBeforeAiSubmit()) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `att-${Date.now()}`;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/writing-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId: id,
          topic,
          essay,
          followUpAnswers,
          prepMinutes: prepChoice,
        }),
      });
      const data = (await res.json()) as { error?: string } & Partial<WritingAttemptReport>;
      if (!res.ok) {
        throw new Error(data.error || `Grading failed (${res.status})`);
      }
      if (!data.attemptId || data.score160 === undefined) {
        throw new Error("Invalid response from grading service");
      }
      vipGate.recordSuccessfulAiSubmit();
      await goToReport(data as WritingAttemptReport);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudySessionBoundary skill="production" exerciseType="read_then_write" setId={topicId}>
    <div className="relative mx-auto max-w-3xl space-y-6 px-4 py-8">
      {submitting ? <GradingProgressLoader eyebrow="Grading your essay" /> : null}
      <Link
        href={`/practice/production/read-and-write/round/${topic.round ?? 1}`}
        className="text-sm font-bold text-ep-blue hover:underline"
      >
        ← Topics
      </Link>
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-2xl font-black">{topic.titleEn}</h1>
        <p className="text-neutral-600">{topic.titleTh}</p>
      </header>

      {hasAttempt && progress ? (
        <BrutalPanel title="Latest score" variant="accent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-neutral-800">
              Latest:{" "}
              <span className="ep-stat text-2xl font-black text-ep-blue">
                {latestScore}/{MAX_SCORE}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {showRedeemOnSession ? (
                <Link
                  href={`/practice/production/read-and-write/report/${progress.latestAttemptId}`}
                  className="border-2 border-black bg-ep-yellow px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Redeem
                </Link>
              ) : isPerfect ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Complete
                  </p>
                  <Link
                    href={`/practice/production/read-and-write/report/${progress.latestAttemptId}`}
                    className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    View report
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          {isPerfect ? (
            <p className="mt-2 text-xs text-neutral-600">
              You can submit another attempt below for extra practice.
            </p>
          ) : (
            <p className="mt-2 text-xs text-neutral-600">
              Submit again below to improve — use <strong>Redeem</strong> to open your last graded
              report and fix mistakes.
            </p>
          )}
        </BrutalPanel>
      ) : null}

      {phase === "prep-pick" ? (
        <BrutalPanel title="Planning time (1–5 minutes)">
          <p className="mb-4 text-sm">{topic.promptEn}</p>
          <p className="mb-4 text-sm text-neutral-600">{topic.promptTh}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPrepChoice(m)}
                className={`border-2 border-black px-4 py-2 text-sm font-bold ${
                  prepChoice === m ? "bg-ep-yellow" : "bg-white"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startPrep}
              className="border-2 border-black bg-ep-blue px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
            >
              Start timer
            </button>
            <button
              type="button"
              onClick={() => setPhase("write")}
              className="border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[4px_4px_0_0_#000]"
            >
              Skip prep — write now
            </button>
          </div>
        </BrutalPanel>
      ) : null}

      {phase === "prep-run" ? (
        <BrutalPanel title="Planning…" variant="accent">
          <p className="ep-stat text-6xl font-black text-ep-blue">{secondsLeft}</p>
          <button
            type="button"
            onClick={() => setPhase("write")}
            className="mt-4 border-2 border-black bg-white px-3 py-2 text-sm font-bold"
          >
            Skip to writing
          </button>
        </BrutalPanel>
      ) : null}

      {phase === "write" ? (
        <BrutalPanel title="Your essay (min. 50 words)">
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={14}
            className="w-full border-2 border-black bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ep-blue"
            placeholder="Type here…"
          />
          {followUps.length > 0 ? (
            <div className="mt-4 space-y-4 border-t-2 border-neutral-200 pt-4">
              <p className="ep-stat text-xs font-bold uppercase text-neutral-600">
                Follow-up questions (answer all)
              </p>
              {followUps.map((fu, i) => (
                <div
                  key={`${topic.id}-fu-${i}`}
                  className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3"
                >
                  <p className="text-sm font-bold text-neutral-900">
                    Follow-up {i + 1}
                  </p>
                  <p className="mt-1 text-sm text-neutral-900">{fu.promptEn}</p>
                  <p className="mt-1 text-xs text-neutral-600">{fu.promptTh}</p>
                  <textarea
                    value={followUpAnswers[i] ?? ""}
                    onChange={(e) =>
                      setFollowUpAnswers((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    rows={4}
                    className="mt-2 w-full border-2 border-black bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ep-blue"
                    placeholder={`Answer follow-up ${i + 1} here…`}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            <VipAiFeedbackQuotaBanner />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="ep-stat text-sm">
              <span className={wc >= 50 ? "font-bold text-green-700" : "font-bold text-red-600"}>
                {wc} words
              </span>
              {wc < 50 ? <span className="text-neutral-500"> · need 50+</span> : null}
            </p>
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitWithGemini}
              className="border-2 border-black bg-ep-blue px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-40"
            >
              {submitting ? "Grading…" : "Submit"}
            </button>
          </div>
          {submitError ? (
            <div className="mt-4 rounded-sm border-2 border-red-600 bg-red-50 p-3 text-sm">
              <p className="font-bold text-red-900">{submitError}</p>
              <p className="mt-2 text-neutral-700">
                Check your API key and internet connection, then try again.
              </p>
            </div>
          ) : null}
        </BrutalPanel>
      ) : null}
    </div>
    </StudySessionBoundary>
  );
}
