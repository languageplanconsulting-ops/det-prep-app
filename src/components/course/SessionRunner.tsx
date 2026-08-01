"use client";

import { useEffect, useRef, useState } from "react";

import { InlineExercise } from "@/components/course/InlineExercise";
import { LessonRunnerInline } from "@/components/course/LessonRunnerInline";
import { ProductionExerciseRunner } from "@/components/course/ProductionExerciseRunner";
import { canRunInline, isProductionExercise, lessonRunnerRefFor } from "@/lib/course-plan/exercise-content";

import {
  dayDoneCopy,
  transitionCopy,
  fillBlankWarmup,
  RUNG_TH_SHORT,
  WARMUP_PROMPT_TH,
  WARMUP_WHY_TH,
} from "@/lib/course-plan/curriculum";
import {
  carryOverMinutes,
  dedupeById,
  splitDayByTime,
  type CarryOver,
  type StudyItem,
} from "@/lib/course-plan/block-planner";

type Phase = "warmup" | "choose" | "running" | "timeup" | "done";

/** Can this item run in place, inside the session, instead of a plain checkbox? */
function canRunInPlace(it: StudyItem): boolean {
  if (!it.exerciseKey) return false;
  if (lessonRunnerRefFor(it.exerciseKey)) return true;
  if (isProductionExercise(it.taskType, it.gateKind)) return true;
  return canRunInline(it.exerciseKey, it.taskType);
}

/** "1 ส.ค." — the day an unfinished item was originally scheduled for. */
function thaiDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

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
  track = "basic",
}: {
  todaysItems: StudyItem[];
  carryOver: CarryOver;
  minutes: number;
  /** Drives the warm-up difficulty mix. */
  track?: "basic" | "medium" | "advanced";
  onClose: () => void;
  /** Items the learner did NOT finish — they become the new backlog. */
  onFinish: (unfinished: StudyItem[], completed: StudyItem[]) => void;
}) {
  const hasBacklog = carryOver.entries.length > 0;
  // The warm-up is offered before anything else, every lecture day.
  const [phase, setPhase] = useState<Phase>("warmup");
  const [warmupTaken, setWarmupTaken] = useState(false);
  const warmup = fillBlankWarmup(track);

  function afterWarmup(taken: boolean) {
    setWarmupTaken(taken);
    setPhase(hasBacklog ? "choose" : "running");
  }
  const [queue, setQueue] = useState<StudyItem[]>(() => dedupeById(todaysItems));
  const [done, setDone] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [overtime, setOvertime] = useState(false);
  /** The item currently open as an inline exercise, if any. */
  const [activeExercise, setActiveExercise] = useState<StudyItem | null>(null);
  const [scores, setScores] = useState<Record<string, { correct: number; total: number }>>({});
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
      setQueue(splitDayByTime(dedupeById([...backlog, ...todaysItems]), minutes).fits);
    } else {
      setQueue(dedupeById(todaysItems));
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
  const percentDone = queue.length === 0 ? 0 : Math.round((done.size / queue.length) * 100);
  // Videos and drills counted separately, so "I watched everything but did no
  // exercises" is visible rather than hidden inside one number.
  const videos = queue.filter((i) => i.kind === "video");
  const drills = queue.filter((i) => i.kind !== "video");
  const videoTotal = videos.length;
  const videoDone = videos.filter((i) => done.has(i.id)).length;
  const drillTotal = drills.length;
  const drillDone = drills.filter((i) => done.has(i.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* ---------------- fill-in-the-blank warm-up ---------------- */}
        {phase === "warmup" && (
          <div className="p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-violet-600">
              อุ่นเครื่องก่อนเรียน
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{WARMUP_PROMPT_TH}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{WARMUP_WHY_TH}</p>

            <ul className="mt-4 space-y-1.5">
              {warmup.map((w, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2.5 text-[13px] font-bold text-violet-900 ring-1 ring-violet-200"
                >
                  <span>✏️ เติมคำในช่องว่าง ข้อ {i + 1}</span>
                  <span className="text-[11px] font-black opacity-70">
                    ระดับ{RUNG_TH_SHORT[w.level]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => afterWarmup(true)}
                className="w-full rounded-full bg-violet-600 py-3 text-sm font-black text-white"
              >
                เอาสิ ทำ 2 ข้อก่อน
              </button>
              <button
                type="button"
                onClick={() => afterWarmup(false)}
                className="w-full rounded-full bg-slate-100 py-3 text-sm font-black text-slate-600"
              >
                ข้ามไปเรียนเลย
              </button>
            </div>
          </div>
        )}

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
                <p className="text-sm font-black text-amber-900">📌 ทำแบบฝึกค้างก่อน</p>
                <p className="mt-0.5 text-[11px] text-amber-700">
                  เคลียร์ของเก่าให้หมด แล้วค่อยต่อของวันนี้เท่าที่เวลาเหลือ
                </p>

                {/* The actual backlog, so the choice is informed rather than blind. */}
                <ul className="mt-2.5 space-y-1 border-t border-amber-200 pt-2.5">
                  {carryOver.entries.slice(0, 6).map((e) => (
                    <li
                      key={e.item.id}
                      className="flex items-center justify-between gap-2 text-[11px] text-amber-900"
                    >
                      <span className="min-w-0 truncate">
                        {e.item.kind === "video" ? "🎬" : e.item.kind === "lesson" ? "📘" : "🏋️"}{" "}
                        {e.item.titleTh}
                      </span>
                      <span className="shrink-0 font-bold opacity-60">
                        {thaiDay(e.fromDate)} · {e.item.minutes}′
                      </span>
                    </li>
                  ))}
                  {carryOver.entries.length > 6 && (
                    <li className="text-[11px] font-bold text-amber-600">
                      และอีก {carryOver.entries.length - 6} รายการ
                    </li>
                  )}
                </ul>
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

        {/* ---------------- an exercise, running in place ---------------- */}
        {activeExercise && (() => {
          const hasNext = queue.some((i) => i.id !== activeExercise.id && !done.has(i.id));
          const onExerciseDone = (correct: number, total: number) => {
            setScores((s) => ({ ...s, [activeExercise.id]: { correct, total } }));
            const next = new Set(done);
            next.add(activeExercise.id);
            setDone(next);
            setActiveExercise(null);
            // Last outstanding item — go straight to the day summary rather
            // than dropping back onto a fully-ticked checklist.
            if (queue.every((i) => next.has(i.id))) {
              const completed = queue.filter((i) => next.has(i.id));
              onFinish([], completed);
              setPhase("done");
            }
          };

          const lessonRef = activeExercise.exerciseKey
            ? lessonRunnerRefFor(activeExercise.exerciseKey)
            : null;
          const isProduction = isProductionExercise(activeExercise.taskType, activeExercise.gateKind);

          return (
            <div className={isProduction ? "" : "p-6"}>
              {lessonRef ? (
                <div className="p-6">
                  <LessonRunnerInline
                    lessonRef={lessonRef}
                    titleTh={activeExercise.titleTh}
                    onCancel={() => setActiveExercise(null)}
                    onDone={onExerciseDone}
                  />
                </div>
              ) : isProduction ? (
                <ProductionExerciseRunner
                  exerciseKey={activeExercise.exerciseKey ?? ""}
                  taskType={
                    activeExercise.taskType as
                      | "write_about_photo"
                      | "speak_about_photo"
                      | "read_and_write"
                      | "read_then_speak"
                  }
                  titleTh={activeExercise.titleTh}
                  hasNext={hasNext}
                  onCancel={() => setActiveExercise(null)}
                  onDone={onExerciseDone}
                />
              ) : (
                <div className="p-6">
                  <InlineExercise
                    exerciseKey={activeExercise.exerciseKey ?? ""}
                    taskType={activeExercise.taskType}
                    titleTh={activeExercise.titleTh}
                    gateTh={activeExercise.gateTh}
                    hasNext={hasNext}
                    onCancel={() => setActiveExercise(null)}
                    onDone={onExerciseDone}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* ---------------- the session ---------------- */}
        {!activeExercise && (phase === "running" || phase === "timeup") && (
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

            {/* Percent by ITEMS, not minutes — the bar and the label used to
                disagree, one counting time and the other things done. */}
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                ความคืบหน้าวันนี้
              </p>
              <p className="text-2xl font-black leading-none text-emerald-600">
                {percentDone}
                <span className="text-sm">%</span>
              </p>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${percentDone}%` }}
              />
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-400">
              <span>
                เสร็จแล้ว {done.size} / {queue.length} รายการ
              </span>
              {videoTotal > 0 && (
                <span>
                  🎬 คลิป {videoDone}/{videoTotal}
                </span>
              )}
              {drillTotal > 0 && (
                <span>
                  🏋️ แบบฝึก {drillDone}/{drillTotal}
                </span>
              )}
              <span>
                {doneMinutes}/{totalMinutes} นาที
              </span>
            </p>

            {(() => {
              const nextItem = queue.find((i) => !done.has(i.id));
              const lastDone = [...queue].reverse().find((i) => done.has(i.id));
              const copy = transitionCopy(
                lastDone ? (lastDone.kind === "review" ? "exercise" : lastDone.kind) : null,
                nextItem ? (nextItem.kind === "review" ? "exercise" : nextItem.kind) : null,
              );
              if (!copy) return null;
              return (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                  <p className="text-[13px] font-black text-slate-800">{copy.titleTh}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{copy.bodyTh}</p>
                </div>
              );
            })()}

            <ul className="mt-3 space-y-1.5">
              {queue.map((it) => {
                const isDone = done.has(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => {
                        // Runnable exercises open here rather than sending the
                        // learner off to a separate practice page.
                        if (!isDone && it.kind !== "video" && canRunInPlace(it)) {
                          setActiveExercise(it);
                          return;
                        }
                        toggle(it.id);
                      }}
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
                        {scores[it.id] ? (
                          <span className="mt-0.5 block text-[10px] font-black text-emerald-600">
                            ได้ {scores[it.id].correct}/{scores[it.id].total} ·{" "}
                            {Math.round((scores[it.id].correct / scores[it.id].total) * 100)}%
                          </span>
                        ) : (
                          it.gateTh && (
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              {it.gateTh}
                            </span>
                          )
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
            <h2 className="mt-3 text-2xl font-black text-slate-900">
              {dayDoneCopy(percentDone).titleTh}
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">{dayDoneCopy(percentDone).bodyTh}</p>
            <p className="mt-1 text-sm text-slate-600">
              วันนี้ทำได้ <strong className="text-emerald-600">{percentDone}%</strong> ·{" "}
              {done.size}/{queue.length} รายการ · {doneMinutes} นาที
              {warmupTaken ? " · อุ่นเครื่องเติมคำ 2 ข้อ" : ""}
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
