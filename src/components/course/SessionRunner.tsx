"use client";

import { useEffect, useRef, useState } from "react";

import {
  carryOverMinutes,
  splitDayByTime,
  type CarryOver,
  type StudyItem,
} from "@/lib/course-plan/block-planner";

type Phase = "choose" | "running" | "timeup" | "done";

/**
 * One study session: a countdown over today's items, with the backlog offered
 * first and whatever is left over rolled forward.
 *
 * The countdown is deliberately advisory, not a lock — it fires the "finish or
 * save for next time" question rather than closing anything mid-answer. A timer
 * that cuts someone off halfway through a speaking response would lose their
 * work, which is worse than running a few minutes long.
 */
export function SessionRunner({
  todaysItems,
  carryOver,
  minutes,
  onClose,
  onFinish,
}: {
  todaysItems: StudyItem[];
  carryOver: CarryOver;
  minutes: number;
  onClose: () => void;
  /** Items the learner did NOT finish — they become the new backlog. */
  onFinish: (unfinished: StudyItem[], completed: StudyItem[]) => void;
}) {
  const hasBacklog = carryOver.entries.length > 0;
  const [phase, setPhase] = useState<Phase>(hasBacklog ? "choose" : "running");
  const [queue, setQueue] = useState<StudyItem[]>(todaysItems);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [overtime, setOvertime] = useState(false);
  const startedRef = useRef(false);

  // Tick only while actually studying, so the choice screen does not burn time.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Ask once. If they choose to continue, the timer keeps counting up
          // as overtime rather than firing the prompt again every second.
          if (!startedRef.current) {
            startedRef.current = true;
            setPhase("timeup");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  function choose(which: "carry_over" | "today") {
    if (which === "carry_over") {
      const backlog = carryOver.entries.map((e) => e.item);
      // Backlog first, then as much of today as still fits.
      setQueue(splitDayByTime([...backlog, ...todaysItems], minutes).fits);
    } else {
      setQueue(todaysItems);
    }
    setPhase("running");
  }

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function finish() {
    const completed = queue.filter((i) => done.has(i.id));
    const unfinished = queue.filter((i) => !done.has(i.id));
    onFinish(unfinished, completed);
    setPhase("done");
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const doneMinutes = queue.filter((i) => done.has(i.id)).reduce((s, i) => s + i.minutes, 0);
  const totalMinutes = queue.reduce((s, i) => s + i.minutes, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* ---------------- backlog choice ---------------- */}
        {phase === "choose" && (
          <div className="p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">
              มีงานค้างจากครั้งก่อน
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">จะเริ่มจากตรงไหนดี?</h2>
            <p className="mt-1 text-sm text-slate-600">
              ค้างอยู่ {carryOver.entries.length} รายการ · ประมาณ {carryOverMinutes(carryOver)} นาที
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => choose("carry_over")}
                className="w-full rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200 transition hover:ring-amber-400"
              >
                <p className="text-sm font-black text-amber-900">📌 ทำงานค้างก่อน</p>
                <p className="mt-0.5 text-[11px] text-amber-700">
                  เคลียร์ของเก่าให้หมด แล้วค่อยต่อของวันนี้เท่าที่เวลาเหลือ
                </p>
              </button>
              <button
                type="button"
                onClick={() => choose("today")}
                className="w-full rounded-2xl bg-sky-50 p-4 text-left ring-1 ring-sky-200 transition hover:ring-sky-400"
              >
                <p className="text-sm font-black text-sky-900">▶︎ เริ่มของวันนี้เลย</p>
                <p className="mt-0.5 text-[11px] text-sky-700">
                  งานค้างจะถูกเก็บไว้ และถามใหม่ทุกครั้งที่เริ่มวันใหม่ (จะสะสมขึ้นเรื่อย ๆ)
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-full py-2 text-xs font-bold text-slate-400"
            >
              ปิด
            </button>
          </div>
        )}

        {/* ---------------- the session ---------------- */}
        {(phase === "running" || phase === "timeup") && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  {overtime ? "ต่อเวลา" : "เวลาที่เหลือ"}
                </p>
                <p
                  className={`font-mono text-4xl font-black tabular-nums ${
                    secondsLeft === 0 ? "text-rose-600" : "text-slate-900"
                  }`}
                >
                  {mm}:{ss}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-400"
              >
                ปิด
              </button>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${totalMinutes ? (doneMinutes / totalMinutes) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-400">
              เสร็จแล้ว {done.size} / {queue.length} รายการ
            </p>

            <ul className="mt-4 space-y-1.5">
              {queue.map((it) => {
                const isDone = done.has(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => toggle(it.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition ${
                        isDone
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                          : "bg-slate-50 text-slate-800 ring-slate-200 hover:ring-slate-400"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-black ${
                          isDone ? "bg-emerald-500 text-white" : "bg-white ring-1 ring-slate-300"
                        }`}
                      >
                        {isDone ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold ${isDone ? "line-through opacity-60" : ""}`}>
                          {it.kind === "video" ? "🎬" : it.kind === "lesson" ? "📘" : "🏋️"}{" "}
                          {it.titleTh}
                        </span>
                        {it.gateTh && (
                          <span className="mt-0.5 block text-[10px] text-slate-500">{it.gateTh}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">
                        {it.minutes}′
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={finish}
              className="mt-5 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white"
            >
              จบการเรียนวันนี้
            </button>
          </div>
        )}

        {/* ---------------- time is up ---------------- */}
        {phase === "timeup" && (
          <div className="border-t-4 border-rose-500 bg-rose-50 p-6">
            <p className="text-lg font-black text-rose-900">⏰ หมดเวลาแล้ว</p>
            <p className="mt-1 text-sm text-rose-700">
              ยังเหลืออีก {queue.length - done.size} รายการ — จะทำต่อให้จบวันนี้ หรือเก็บไว้ครั้งหน้า?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setOvertime(true);
                  setPhase("running");
                }}
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-black text-rose-700 ring-1 ring-rose-300"
              >
                ทำต่อให้จบ
              </button>
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-black text-white"
              >
                เก็บไว้ครั้งหน้า
              </button>
            </div>
          </div>
        )}

        {/* ---------------- summary ---------------- */}
        {phase === "done" && (
          <div className="p-6 text-center">
            <p className="text-5xl">🎉</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">เก่งมาก!</h2>
            <p className="mt-1 text-sm text-slate-600">
              วันนี้ทำไป {done.size} รายการ · {doneMinutes} นาที
            </p>
            {queue.length - done.size > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] text-amber-800 ring-1 ring-amber-200">
                เก็บงานค้างไว้ {queue.length - done.size} รายการ — จะถามอีกครั้งตอนเริ่มวันถัดไป
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white"
            >
              เสร็จสิ้น
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
