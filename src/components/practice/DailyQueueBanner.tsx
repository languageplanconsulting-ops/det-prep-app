"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearActiveDailyQueue,
  getActiveDailyQueue,
  isOnCurrentQueueStep,
  setActiveDailyQueue,
  type DailyQueueState,
} from "@/lib/daily-queue-session";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCelebrate } from "@/lib/exam-sfx";

type LessonFinishSummary = { lessons: number; minutes: number; items: { emoji: string; label: string }[] };

/**
 * Globally-mounted (see src/app/layout.tsx), renders nothing unless the current page is a step
 * in an active study-plan daily queue (started from StudyPlanCalendarCard). Lets the learner
 * hand-advance through the queue without any of the individual skill runner pages knowing this
 * exists — finishing is "the learner says so", same as the corrected mobile behavior of crediting
 * completion at the real end of a run rather than trying to auto-detect it from inside each skill.
 */
export function DailyQueueBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<DailyQueueState | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [summary, setSummary] = useState<LessonFinishSummary | null>(null);

  useEffect(() => {
    setState(getActiveDailyQueue());
  }, [pathname]);

  // While the queue bar is on screen, mark <body> so the global "รายงานปัญหา" FAB
  // (BugReportWidget, fixed bottom-right) hides instead of overlapping the bar's buttons.
  const bannerVisible =
    justFinished || (!!state && isOnCurrentQueueStep(state, pathname));
  useEffect(() => {
    if (bannerVisible) document.body.dataset.dailyQueueActive = "1";
    else delete document.body.dataset.dailyQueueActive;
    return () => {
      delete document.body.dataset.dailyQueueActive;
    };
  }, [bannerVisible]);

  if (justFinished) {
    // Collapse per-round items into unique topics (each topic has a distinct emoji).
    const topicMap = new Map<string, { emoji: string; label: string; count: number }>();
    for (const it of summary?.items ?? []) {
      const base = it.label.split(" · ")[0] ?? it.label;
      const key = it.emoji + base;
      const e = topicMap.get(key) ?? { emoji: it.emoji, label: base, count: 0 };
      e.count += 1;
      topicMap.set(key, e);
    }
    const topics = [...topicMap.values()];

    const dismiss = (href: string) => {
      setJustFinished(false);
      setSummary(null);
      // This component lives in the root layout and survives navigation, so clear state first.
      router.push(href);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="ep-step-slide-in w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
          <CelebrateMascot title="เยี่ยมมาก! ฝึกครบแล้ว 🎉" />
          <CoachBubble>
            สุดยอดไปเลยครับ! วันนี้คุณเรียนครบทุกบทเรียนตามแผนแล้ว เก่งมากที่ตั้งใจทำจนจบ —
            ความสม่ำเสมอแบบนี้แหละที่พาคะแนนขึ้น เจอกันใหม่พรุ่งนี้นะ! 🌟
          </CoachBubble>

          {summary && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
                  <p className="text-xl">📘</p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{summary.lessons}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">บทเรียนที่ทำ</p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
                  <p className="text-xl">⏱️</p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                    {summary.minutes > 0 ? summary.minutes : "—"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">นาที</p>
                </div>
              </div>

              {topics.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-neutral-200">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    หมวดที่ฝึกวันนี้
                  </p>
                  {topics.map((t) => (
                    <div key={t.emoji + t.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-bold text-slate-700">
                        {t.emoji} {t.label}
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600">
                        ✓ {t.count} รอบ
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => dismiss("/study-plan")}
              className="rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98]"
            >
              ดูปฏิทินของฉัน →
            </button>
            <button
              type="button"
              onClick={() => dismiss("/practice")}
              className="text-xs font-bold text-neutral-400 transition-colors hover:text-ep-blue"
            >
              ไปหน้าฝึกซ้อมเพิ่มเติม
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state || !isOnCurrentQueueStep(state, pathname)) return null;

  const total = state.hrefs.length;
  const stepNum = state.index + 1;
  const isLast = state.index >= total - 1;

  async function handleNext() {
    if (!state) return;
    if (isLast) {
      setFinishing(true);
      try {
        await fetch("/api/study-plan/completions", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completionDate: state.dateIso,
            tierCompleted: state.tierMinutes,
          }),
        });
      } finally {
        const minutes = state.startedAt
          ? Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
          : 0;
        setSummary({
          lessons: state.hrefs.length,
          minutes,
          items: state.items ?? [],
        });
        clearActiveDailyQueue();
        setFinishing(false);
        setJustFinished(true);
        sfxCelebrate("lg");
      }
      return;
    }
    const nextIndex = state.index + 1;
    const nextState = { ...state, index: nextIndex };
    setActiveDailyQueue(nextState);
    router.push(nextState.hrefs[nextIndex]);
  }

  function handleExit() {
    clearActiveDailyQueue();
    setState(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#004AAD] bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#004AAD]">
            ชุดฝึกวันนี้ · ข้อที่ {stepNum}/{total}
          </p>
          <p className="truncate text-xs text-slate-500">ทำเสร็จข้อนี้แล้วกด &quot;ต่อไป&quot; ได้เลย</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleExit}
            className="text-xs font-bold text-slate-400 transition-colors hover:text-slate-600"
          >
            ออก
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={finishing}
            className="rounded-xl bg-[#004AAD] px-4 py-2 text-xs font-bold text-[#FFCC00] shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {finishing ? "กำลังบันทึก…" : isLast ? "เสร็จแล้ว! ✓" : "ทำข้อนี้เสร็จแล้ว →"}
          </button>
        </div>
      </div>
    </div>
  );
}
