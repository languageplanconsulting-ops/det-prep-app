"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminWritingStarters } from "@/components/practice/AdminWritingStarters";
import { EssayHintPanel } from "@/components/writing/EssayHintPanel";
import { EssayPatternPicker } from "@/components/writing/EssayPatternPicker";
import { StickyExamCTA } from "@/components/practice/StickyExamCTA";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { PersistentWeaknessModal } from "@/components/practice/PersistentWeaknessModal";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { stashReportForNavigation } from "@/lib/grading-report-handoff";
import {
  GRADING_PENDING_TH,
  readGradingSubmitResponse,
  waitForGradingJob,
} from "@/lib/grading-wait";
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
import {
  IW_FOLLOW_SECONDS,
  IW_LAUNCH_TH,
  IW_MAIN_SECONDS,
  IW_MIN_TOTAL_WORDS,
  IW_PREP_SECONDS,
  type WritingPracticeMode,
} from "@/lib/interactive-writing";
import type { WritingAttemptReport, WritingFollowUpPrompt, WritingTopic } from "@/types/writing";

const MAX_SCORE = 160;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ReadWriteSession({
  topicId,
  startWithRedeem = false,
  onComplete,
  embedded = false,
  forceUnlockHints = false,
  attemptSource,
}: {
  topicId: string;
  startWithRedeem?: boolean;
  /** Course context is already a paid enrollment, so the pattern + vocabulary panel is never VIP-gated there. */
  forceUnlockHints?: boolean;
  /** When set, the report is handed back instead of navigating to the report page — used by the course journey so the learner never leaves the session. */
  onComplete?: (report: WritingAttemptReport) => void;
  /** Drop the page-level back link and outer chrome when hosted inside another shell (the course session modal). */
  embedded?: boolean;
  /** "placement" tells the report route to skip the AI-credit charge — the one-time skill test shouldn't cost the learner's monthly quota. */
  attemptSource?: "placement";
}) {
  const router = useRouter();
  const { effectiveTier } = useEffectiveTier();
  const soft = true;
  const vipGate = useVipAiFeedbackGate();
  const [mounted, setMounted] = useState(false);
  const [hydratingTopic, setHydratingTopic] = useState(true);
  const [topic, setTopic] = useState<WritingTopic | null>(null);
  const [progress, setProgress] = useState<ReturnType<typeof getReadWriteTopicProgress> | null>(null);
  const [prepChoice, setPrepChoice] = useState(3);
  // Course and placement flows keep the classic essay; the practice page offers both formats.
  const offerModes = !embedded && !attemptSource;
  const [mode, setMode] = useState<WritingPracticeMode>("standard");
  const [phase, setPhase] = useState<
    "mode-pick" | "prep-pick" | "prep-run" | "write" | "iw-prep" | "iw-write" | "iw-loading" | "iw-follow"
  >(offerModes ? "mode-pick" : "prep-pick");
  const [iwFollowUp, setIwFollowUp] = useState<WritingFollowUpPrompt | null>(null);
  const [iwAnswer, setIwAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [essay, setEssay] = useState("");
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [waitingForGrade, setWaitingForGrade] = useState(false);

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

  const ticking = phase === "prep-run" || phase === "iw-prep" || phase === "iw-write" || (phase === "iw-follow" && !submitting);
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (phase === "prep-run" && secondsLeft === 0) setPhase("write");
  }, [phase, secondsLeft]);

  const wc = countWords(essay);
  const iwTotalWords = wc + countWords(iwAnswer);
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
        {!embedded ? (
          <Link
            href="/practice/production/read-and-write"
            className="mt-4 inline-block text-ep-blue"
          >
            Back
          </Link>
        ) : null}
      </div>
    );
  }

  const startPrep = () => {
    setSecondsLeft(prepChoice * 60);
    setPhase("prep-run");
  };

  const goToReport = async (
    report: WritingAttemptReport,
    interactive?: { followUp: WritingFollowUpPrompt; answer: string },
  ) => {
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
          followUpAnswers: interactive ? [interactive.answer] : followUpAnswers,
          ...(interactive ? { format: "interactive", followUpPromptEn: interactive.followUp.promptEn } : {}),
        },
        reportPayload: report,
      });
    } catch (e) {
      console.warn("[ReadWriteSession] finalize study session failed", e);
    }
    stashReportForNavigation(report.attemptId, report);
    saveWritingReport(report);
    recordReadWriteTopicProgress(report.topicId, report.score160, report.attemptId);
    if (onComplete) {
      onComplete(report);
    } else {
      await router.push(`/practice/production/read-and-write/report/${report.attemptId}`);
    }
  };

  const submitWithGemini = async (interactive?: { followUp: WritingFollowUpPrompt; answer: string }) => {
    if (!topic) return;
    if (!interactive && !canSubmit) return;
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
          // Interactive Writing grades the generated follow-up as the topic's single follow-up.
          topic: interactive ? { ...topic, followUps: [interactive.followUp] } : topic,
          essay,
          followUpAnswers: interactive ? [interactive.answer] : followUpAnswers,
          prepMinutes: interactive ? IW_PREP_SECONDS / 60 : prepChoice,
          ...(interactive ? { format: "interactive" } : {}),
          redeemed: startWithRedeem && Boolean(progress),
          previousScore160: startWithRedeem ? progress?.latestScore160 ?? null : null,
          source: attemptSource,
        }),
      });
      const outcome = await readGradingSubmitResponse<WritingAttemptReport>(res);
      let report: WritingAttemptReport;
      if (outcome.kind === "pending") {
        // The essay is saved server-side. Waiting IS the retry — every poll
        // runs another grading pass — so this is reassurance, not an error.
        setWaitingForGrade(true);
        const waited = await waitForGradingJob<WritingAttemptReport>(outcome.attemptId);
        setWaitingForGrade(false);
        if (waited.kind === "abandoned") {
          throw new Error(waited.message);
        }
        if (waited.kind === "still-working") {
          setSubmitError(
            "ยังตรวจไม่เสร็จ แต่งานของคุณถูกเก็บไว้แล้ว — กลับมาดูผลได้ในอีกสักครู่",
          );
          return;
        }
        report = waited.report;
      } else {
        report = outcome.report;
      }
      if (!report.attemptId || report.score160 === undefined) {
        throw new Error("Invalid response from grading service");
      }
      vipGate.recordSuccessfulAiSubmit();
      await goToReport(report, interactive);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const startInteractive = () => {
    setMode("interactive");
    setEssay("");
    setIwAnswer("");
    setIwFollowUp(null);
    setSubmitError(null);
    setSecondsLeft(IW_PREP_SECONDS);
    setPhase("iw-prep");
  };

  const startStandard = () => {
    setMode("standard");
    setPhase("prep-pick");
  };

  /** Step 1 → 2: the follow-up is only revealed once the main response is in (as on the real test). */
  const requestFollowUp = async () => {
    setPhase("iw-loading");
    let next: WritingFollowUpPrompt;
    try {
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/writing-followup", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({ topic, essay }),
      });
      const j = (await res.json()) as Partial<WritingFollowUpPrompt>;
      if (!res.ok || !j.promptEn) throw new Error("no follow-up");
      next = { promptEn: j.promptEn, promptTh: j.promptTh ?? "" };
    } catch {
      next = topic.followUps?.[0] ?? {
        promptEn:
          "What is the strongest argument against your opinion on this topic, and how would you respond to it? Explain your thoughts.",
        promptTh: "ลองมองจากมุมตรงข้าม ข้อโต้แย้งที่หนักแน่นที่สุดต่อความเห็นของคุณคืออะไร และคุณจะตอบกลับอย่างไร",
      };
    }
    setIwFollowUp(next);
    setSecondsLeft(IW_FOLLOW_SECONDS);
    setPhase("iw-follow");
  };

  const submitInteractive = () => {
    if (!iwFollowUp) return;
    if (iwTotalWords < IW_MIN_TOTAL_WORDS) {
      setSubmitError(`ต้องมีอย่างน้อย ${IW_MIN_TOTAL_WORDS} คำรวมทั้งสองส่วนจึงจะตรวจได้ (ตอนนี้ ${iwTotalWords} คำ)`);
      return;
    }
    void submitWithGemini({ followUp: iwFollowUp, answer: iwAnswer });
  };

  const fmtClock = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  return (
    <StudySessionBoundary skill="production" exerciseType="read_then_write" setId={topicId}>
    <InteractiveWritingClock
      phase={phase}
      secondsLeft={secondsLeft}
      onPrepDone={() => {
        setSecondsLeft(IW_MAIN_SECONDS);
        setPhase("iw-write");
      }}
      onMainDone={() => void requestFollowUp()}
      onFollowDone={submitInteractive}
    />
    {!embedded ? <PersistentWeaknessModal skill="writing" /> : null}
    <div className={embedded ? "relative space-y-6" : "relative mx-auto max-w-3xl space-y-6 px-4 py-8"}>
      {submitting ? (
        <GradingProgressLoader
          eyebrow={waitingForGrade ? GRADING_PENDING_TH : "Grading your essay"}
        />
      ) : null}
      {!embedded ? (
        <Link
          href={`/practice/production/read-and-write/round/${topic.round ?? 1}`}
          className="text-sm font-bold text-ep-blue hover:underline"
        >
          ← Topics
        </Link>
      ) : null}
      {soft && mode === "standard" && phase !== "mode-pick" ? (
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

      {phase === "mode-pick" ? (
        <BrutalPanel title="เลือกรูปแบบการฝึก">
          <p className="mb-4 text-sm text-neutral-700">{topic.promptEn}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={startInteractive}
              className="relative rounded-xl border-2 border-black bg-[#FFF8D6] p-4 text-left shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_#000]"
            >
              <span className="absolute right-3 top-3 rounded-full bg-[#004AAD] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">
                รูปแบบใหม่
              </span>
              <p className="text-base font-black text-[#004AAD]">Interactive Writing</p>
              <p className="mt-1 text-xs font-bold text-neutral-800">
                รูปแบบที่ใช้ในข้อสอบ DET จริงตั้งแต่ {IW_LAUNCH_TH} (แทน Read, Then Write แบบเดิม)
              </p>
              <ul className="mt-3 space-y-1 text-xs text-neutral-700">
                <li>⏱ อ่านโจทย์ 30 วินาที → เขียน 5 นาที</li>
                <li>➕ ส่งแล้วจะได้ “คำถามต่อ” 1 ข้อ เขียนต่ออีก 3 นาที</li>
                <li>📊 ตรวจรวมทั้งสองส่วน เหมือนสอบจริง</li>
              </ul>
            </button>
            <button
              type="button"
              onClick={startStandard}
              className="rounded-xl border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_0_#000]"
            >
              <p className="text-base font-black text-neutral-900">เขียนเรียงความปกติ</p>
              <p className="mt-1 text-xs font-bold text-neutral-600">แบบเดิม เหมาะกับฝึกโครงเรียงความ</p>
              <ul className="mt-3 space-y-1 text-xs text-neutral-700">
                <li>🧠 เลือกเวลาวางแผน 1–5 นาที</li>
                <li>✍️ เขียนเรียงความเดียว อย่างน้อย 50 คำ ไม่จับเวลาเขียน</li>
              </ul>
            </button>
          </div>
        </BrutalPanel>
      ) : null}


      {phase === "iw-prep" ? (
        <BrutalPanel title="Interactive Writing · อ่านโจทย์" variant="accent">
          <p className="text-sm text-neutral-600">คุณจะได้เขียน 5 นาที แล้วตามด้วยคำถามต่ออีก 3 นาที</p>
          <p className="mt-4 rounded-lg border-2 border-black bg-white p-4 text-base font-medium text-neutral-900">
            {topic.promptEn}
          </p>
          {topic.promptTh ? <p className="mt-2 text-sm text-neutral-600">{topic.promptTh}</p> : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="ep-stat text-3xl font-black text-ep-blue">{fmtClock(secondsLeft)}</p>
            <button
              type="button"
              onClick={() => {
                setSecondsLeft(IW_MAIN_SECONDS);
                setPhase("iw-write");
              }}
              className="border-2 border-black bg-ep-blue px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_#000]"
            >
              เริ่มเขียนเลย →
            </button>
          </div>
        </BrutalPanel>
      ) : null}

      {phase === "iw-write" || phase === "iw-loading" || phase === "iw-follow" ? (
        <BrutalPanel title={phase === "iw-follow" ? "ขั้นที่ 2 · คำถามต่อ (3 นาที)" : "ขั้นที่ 1 · เขียนตอบโจทย์ (5 นาที)"}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex gap-2 text-[11px] font-black uppercase tracking-wide">
              <span className={`rounded-full px-2.5 py-1 ${phase === "iw-follow" ? "bg-emerald-100 text-emerald-800" : "bg-[#004AAD] text-[#FFCC00]"}`}>
                {phase === "iw-follow" ? "✓ " : "1 · "}เขียน 5 นาที
              </span>
              <span className={`rounded-full px-2.5 py-1 ${phase === "iw-follow" ? "bg-[#004AAD] text-[#FFCC00]" : "bg-neutral-200 text-neutral-500"}`}>
                2 · คำถามต่อ 3 นาที
              </span>
            </div>
            {phase !== "iw-loading" ? (
              <p className={`ep-stat text-2xl font-black ${secondsLeft <= 30 ? "text-red-600" : "text-ep-blue"}`}>
                {fmtClock(secondsLeft)}
              </p>
            ) : null}
          </div>
          <div className={phase === "iw-follow" ? "grid gap-4 md:grid-cols-2" : ""}>
            <div>
              <p className="text-sm font-bold text-neutral-900">{topic.promptEn}</p>
              <textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                readOnly={phase !== "iw-write"}
                rows={phase === "iw-follow" ? 10 : 14}
                autoFocus
                className={`mt-2 w-full border-2 border-black p-3 text-sm outline-none focus:ring-2 focus:ring-ep-blue ${phase === "iw-write" ? "bg-white" : "bg-neutral-100 text-neutral-600"}`}
                placeholder="Type here…"
              />
              <p className="ep-stat mt-1 text-xs text-neutral-500">{wc} words</p>
            </div>
            {phase === "iw-follow" && iwFollowUp ? (
              <div>
                <p className="text-sm font-bold text-[#004AAD]">{iwFollowUp.promptEn}</p>
                {iwFollowUp.promptTh ? <p className="mt-1 text-xs text-neutral-600">{iwFollowUp.promptTh}</p> : null}
                <textarea
                  value={iwAnswer}
                  onChange={(e) => setIwAnswer(e.target.value)}
                  rows={10}
                  autoFocus
                  className="mt-2 w-full border-2 border-black bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ep-blue"
                  placeholder="Write your follow-up response here…"
                />
                <p className="ep-stat mt-1 text-xs text-neutral-500">
                  {countWords(iwAnswer)} words · รวม {iwTotalWords} คำ
                </p>
              </div>
            ) : null}
          </div>
          {phase === "iw-loading" ? (
            <p className="mt-4 text-sm font-bold text-neutral-700">กำลังเตรียมคำถามต่อ…</p>
          ) : null}
          <div className="mt-4 space-y-3">
            <VipAiFeedbackQuotaBanner />
          </div>
          <StickyExamCTA>
            {phase === "iw-write" ? (
              <button
                type="button"
                onClick={() => void requestFollowUp()}
                className="w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90"
              >
                ส่งส่วนที่ 1 → ไปคำถามต่อ
              </button>
            ) : (
              <button
                type="button"
                disabled={phase !== "iw-follow" || submitting}
                onClick={submitInteractive}
                className="w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "กำลังตรวจ…" : "ส่งตรวจทั้งสองส่วน →"}
              </button>
            )}
          </StickyExamCTA>
          {submitError ? (
            <div className="mt-4 rounded-sm border-2 border-red-600 bg-red-50 p-3 text-sm">
              <p className="font-bold text-red-900">{submitError}</p>
            </div>
          ) : null}
        </BrutalPanel>
      ) : null}

      <EssayHintPanel unlocked={forceUnlockHints || effectiveTier === "vip"} />

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
              {!embedded && showRedeemOnSession ? (
                <Link
                  href={`/practice/production/read-and-write/report/${progress.latestAttemptId}`}
                  className="border-2 border-black bg-ep-yellow px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Redeem
                </Link>
              ) : !embedded && isPerfect ? (
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
              ) : isPerfect ? (
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Complete
                </p>
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
          <p className="ep-stat text-4xl sm:text-6xl font-black text-ep-blue">{secondsLeft}</p>
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
          <EssayPatternPicker />
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
                onClick={() => void submitWithGemini()}
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
                onClick={() => void submitWithGemini()}
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

/** Fires the Interactive Writing phase changes when a clock reaches zero (kept out of the render body). */
function InteractiveWritingClock({
  phase,
  secondsLeft,
  onPrepDone,
  onMainDone,
  onFollowDone,
}: {
  phase: string;
  secondsLeft: number;
  onPrepDone: () => void;
  onMainDone: () => void;
  onFollowDone: () => void;
}) {
  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (phase === "iw-prep") onPrepDone();
    else if (phase === "iw-write") onMainDone();
    else if (phase === "iw-follow") onFollowDone();
    // only the zero crossing matters; the callbacks change every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);
  return null;
}
