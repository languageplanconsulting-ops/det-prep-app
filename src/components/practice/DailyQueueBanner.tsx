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

  useEffect(() => {
    setState(getActiveDailyQueue());
  }, [pathname]);

  if (justFinished) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-emerald-500 bg-emerald-50/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold text-emerald-800">
            เยี่ยมมาก! ฝึกครบตามแผนวันนี้แล้ว 🎉
          </p>
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
        clearActiveDailyQueue();
        setFinishing(false);
        setJustFinished(true);
        setTimeout(() => {
          router.push("/practice");
          // This component lives in the root layout and survives client-side navigation, so
          // the celebration state has to be cleared explicitly or it lingers on every page after.
          setTimeout(() => setJustFinished(false), 300);
        }, 1600);
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
