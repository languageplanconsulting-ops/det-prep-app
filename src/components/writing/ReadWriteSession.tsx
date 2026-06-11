"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminWritingStarters } from "@/components/practice/AdminWritingStarters";
import { StickyExamCTA } from "@/components/practice/StickyExamCTA";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import {
  getReadWriteTopicProgress,
  getTopicById,
  recordReadWriteTopicProgress,
  saveWritingReport,
  subscribeWritingTopics,
  subscribeReadWriteTopicProgress,
} from "@/lib/writing-storage";
import type { WritingAttemptReport, WritingTopic } from "@/types/writing";

const MAX_SCORE = 160;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ReadWriteSession({
  topicId,
  startWithRedeem = false,
}: {
  topicId: string;
  startWithRedeem?: boolean;
}) {
  const router = useRouter();
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;
  const vipGate = useVipAiFeedbackGate();
  const [mounted, setMounted] = useState(false);
  const [hydratingTopic, setHydratingTopic] = useState(true);
  const [topic, setTopic] = useState<WritingTopic | null>(null);
  const [progress, setProgress] = useState<ReturnType<typeof getReadWriteTopicProgress> | null>(null);
  const [prepChoice, setPrepChoice] = useState(3);
  const [phase, setPhase] = useState<"prep-pick" | "prep-run" | "write">("prep-pick");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [essay, setEssay] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshTopic = () => {
      const nextTopic = getTopicById(topicId) ?? null;
      if (!cancelled) setTopic(nextTopic);
      return nextTopic;
    };

    const hydrateTopic = async () => {
      if (!mounted) return;
      const existing = refreshTopic();
      if (existing) {
        if (!cancelled) setHydratingTopic(false);
        return;
      }
      if (!cancelled) setHydratingTopic(true);
      try {
        await pullContentBankSnapshotFromSupabase();
        refreshTopic();
      } catch (e) {
        console.warn("[ReadWriteSession] topic hydration failed", e);
      } finally {
        if (!cancelled) setHydratingTopic(false);
      }
    };

    const unsubscribe = subscribeWritingTopics(refreshTopic);
    void hydrateTopic();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mounted, topicId]);

  useEffect(() => {
    if (!mounted) return;
    const refreshProgress = () => {
      setProgress(getReadWriteTopicProgress(topicId) ?? null);
    };
    refreshProgress();
    const unsubscribe = subscribeReadWriteTopicProgress(refreshProgress);
    return unsubscribe;
  }, [mounted, topicId]);

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

  const wc = countWords(essay);
  const followUps = topic?.followUps ?? [];
  const canSubmit = Boolean(topic) && wc >= 50;

  const latestScore = progress?.latestScore160 ?? null;
  const hasAttempt = Boolean(progress);
  const isPerfect = hasAttempt && (latestScore ?? 0) >= MAX_SCORE;
  const showRedeemOnSession = hasAttempt && !isPerfect;

  useEffect(() => {
    setFollowUpAnswers(followUps.map(() => ""));
  }, [topic?.id, followUps.length]);

  if (!mounted || (!topic && hydratingTopic)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Loading topic…</p>
        <p className="mt-2 text-sm text-neutral-600">
          Syncing the latest read-and-write content for this account.
        </p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Topic not found.</p>
        <p className="mt-2 text-sm text-neutral-600">
          This topic is missing from the shared content bank. Please ask admin to sync the
          read-and-write bank again.
        </p>
        <Link
          href="/practice/production/read-and-write"
          className="mt-4 inline-block text-ep-blue"
        >
          Back
        </Link>
      </div>
    );
  }

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
        credentials: "same-origin",
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
          redeemed: startWithRedeem && Boolean(progress),
          previousScore160: startWithRedeem ? progress?.latestScore160 ?? null : null,
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
      {soft ? (
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
            D
          </div>
          <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
              <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
            </span>
            <p className="text-[13px] leading-6 text-slate-800">
              วางแผน 1-5 นาที แล้ว <strong>เขียนอย่างน้อย 50 คำ</strong> · โครง: เลือกข้าง → เหตุผล + ตัวอย่าง → สรุป
            </p>
          </div>
        </div>
      ) : null}

      <AdminWritingStarters
        title="🧱 โครงเรียงความ + วลีเริ่ม"
        starters={[
          "I believe that…",
          "There are two main reasons…",
          "Firstly,…",
          "For example,…",
          "In conclusion,…",
        ]}
      />

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
            {!soft ? (
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={submitWithGemini}
                className="border-2 border-black bg-ep-blue px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-40"
              >
                {submitting ? "Grading…" : "Submit"}
              </button>
            ) : null}
          </div>
          {soft ? (
            <StickyExamCTA>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={submitWithGemini}
                className="w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "กำลังตรวจ…" : "ส่งคำตอบ →"}
              </button>
            </StickyExamCTA>
          ) : null}
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
