"use client";

/**
 * The BIG randomize button that lives on every rounds hub. Tapping it opens a
 * "how much time do you have today?" sheet; confirming launches the timed-random
 * session route (/practice/timed-random/[skill]) which plays random sets across
 * every level with a live countdown.
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { sfxTap, sfxTransition } from "@/lib/exam-sfx";
import {
  TIMED_DIFFICULTIES,
  TIMED_DURATIONS,
  TIMED_SKILL_META,
  type TimedDifficulty,
} from "@/lib/practice-timed-random";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";

export function TimedRandomLauncher({ skill }: { skill: DailyPlanSkill }) {
  const router = useRouter();
  const meta = TIMED_SKILL_META[skill];
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [difficulty, setDifficulty] = useState<TimedDifficulty>("any");
  // iOS Safari fires a synthesized "ghost" click ~immediately after a tap. When
  // the tap opens this sheet, that ghost click lands on the freshly-mounted
  // backdrop and instantly dismisses it — the sheet opens and closes in one tap,
  // so on iPad it looks like the button does nothing. Ignore backdrop dismissals
  // that arrive right after opening. (Desktop never synthesizes this second click.)
  const openedAtRef = useRef(0);

  const openSheet = () => {
    sfxTap();
    openedAtRef.current = Date.now();
    setOpen(true);
  };

  const requestClose = () => {
    if (Date.now() - openedAtRef.current < 400) return;
    setOpen(false);
  };

  const start = () => {
    sfxTransition();
    router.push(`/practice/timed-random/${skill}?d=${minutes}&diff=${difficulty}`);
  };

  return (
    <>
      {/* BIG button */}
      <button
        type="button"
        onClick={openSheet}
        className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#004AAD] to-[#0066E0] px-6 py-7 text-left shadow-[0_10px_30px_-8px_rgba(0,74,173,0.55)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(0,74,173,0.6)] active:translate-y-0 active:scale-[0.99] sm:px-8 sm:py-8"
      >
        <span className="pointer-events-none absolute -right-6 -top-8 text-[120px] opacity-20 transition-transform duration-500 group-hover:rotate-12 sm:text-[150px]">
          🎲
        </span>
        <span className="relative z-10 block">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFCC00] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
            ✨ สุ่มให้อัตโนมัติ
          </span>
          <span className="mt-3 block font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            มีเวลาว่างแค่ไหน? กดสุ่มเลย!
          </span>
          <span className="mt-1.5 block max-w-md text-sm font-medium text-white/80">
            บอกเราว่าวันนี้มีเวลากี่นาที แล้วเราจะสุ่มข้อสอบ {meta.th} ทุกด่านมาให้ พร้อมจับเวลาถอยหลัง
          </span>
        </span>
      </button>

      {/* Time-picker sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={requestClose}
        >
          <div
            className="ep-step-slide-in w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">{meta.emoji}</span>
              <h2 className="font-display text-lg font-black text-slate-900">
                วันนี้มีเวลาฝึกกี่นาที?
              </h2>
            </div>
            <p className="mb-4 text-xs text-neutral-500">
              เราจะสุ่มข้อสอบ {meta.th} ({meta.en}) ให้ทุกด่าน แล้วจับเวลาถอยหลัง — หมดเวลาแล้วทำข้อที่ค้างให้จบก่อนได้เลย
            </p>

            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">เวลาที่มี</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {TIMED_DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setMinutes(d.minutes);
                  }}
                  className={`rounded-2xl px-3 py-3 text-center text-sm font-bold transition-all duration-150 ${
                    minutes === d.minutes
                      ? "bg-[#004AAD] text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span className="block text-lg">{d.emoji}</span>
                  {d.th}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">ระดับความยาก</p>
            <div className="mb-6 flex flex-wrap gap-1.5">
              {TIMED_DIFFICULTIES.map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setDifficulty(diff.id);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors duration-150 ${
                    difficulty === diff.id
                      ? "bg-[#FFCC00] text-[#004AAD]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {diff.th}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={start}
              className="w-full rounded-2xl bg-[#004AAD] py-3.5 text-center text-base font-black text-[#FFCC00] shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            >
              🎲 เริ่มเลย · {minutes} นาที
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full py-2 text-center text-xs font-bold text-neutral-400 hover:text-neutral-600"
            >
              ไว้ก่อน
            </button>
          </div>
        </div>
      )}
    </>
  );
}
