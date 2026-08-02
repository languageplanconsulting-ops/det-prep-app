"use client";

import { useEffect, useRef, useState } from "react";

import {
  canRunInline,
  isComprehensionExamExercise,
  isInteractiveCourseExercise,
  isProductionExercise,
  lessonRunnerRefFor,
  listenSpeakItemFor,
  speakPhotoDrillFor,
  writeTopicItemFor,
} from "@/lib/course-plan/exercise-content";
import { ComprehensionExamRunner } from "@/components/course/ComprehensionExamRunner";
import { InlineExercise } from "@/components/course/InlineExercise";
import { InteractiveCourseRunner } from "@/components/course/InteractiveCourseRunner";
import { LessonRunnerInline } from "@/components/course/LessonRunnerInline";
import { ListenSpeakBuilder } from "@/components/course/ListenSpeakBuilder";
import { toSpeakDrill } from "@/lib/course-plan/listen-speak-bank";
import { WriteTopicBuilder } from "@/components/course/WriteTopicBuilder";
import { ProductionExerciseRunner } from "@/components/course/ProductionExerciseRunner";
import { WarmupFitbRunner } from "@/components/course/WarmupFitbRunner";
import { BunnyVideoEmbed } from "@/components/course/BunnyVideoEmbed";

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

type Phase = "warmup" | "warmup_running" | "choose" | "running" | "timeup" | "done";

/** Bunny lesson metadata keyed by course_lessons id. */
export type LessonVideoInfo = {
  bunnyVideoGuid: string;
  title: string;
  watchedSeconds?: number;
  downloads?: Array<{ id: string; label: string; fileSize: number | null }>;
};

/** Can this item run in place, inside the session, instead of a plain checkbox? */
function canRunInPlace(it: StudyItem): boolean {
  if (!it.exerciseKey) return false;
  if (lessonRunnerRefFor(it.exerciseKey)) return true;
  if (listenSpeakItemFor(it.exerciseKey)) return true;
  if (speakPhotoDrillFor(it.exerciseKey)) return true;
  if (writeTopicItemFor(it.exerciseKey)) return true;
  if (isProductionExercise(it.taskType, it.gateKind)) return true;
  if (isComprehensionExamExercise(it.taskType)) return true;
  if (isInteractiveCourseExercise(it.taskType) && !it.exerciseKey.match(/^[mh]?is-l\d$/)) {
    // Practice slots (is-real / ic-set / ds-set) — not the checkbox-only video lessons.
    return true;
  }
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
  lessonVideos = {},
}: {
  todaysItems: StudyItem[];
  carryOver: CarryOver;
  minutes: number;
  /** Drives the warm-up difficulty mix. */
  track?: "basic" | "medium" | "advanced";
  /** lessonId → Bunny guid, so session videos can play inline. */
  lessonVideos?: Record<string, LessonVideoInfo>;
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

  function startWarmup() {
    setPhase("warmup_running");
  }
  const [queue, setQueue] = useState<StudyItem[]>(() => dedupeById(todaysItems));
  const [done, setDone] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [overtime, setOvertime] = useState(false);
  /** The item currently open as an inline exercise, if any. */
  const [activeExercise, setActiveExercise] = useState<StudyItem | null>(null);
  /** Lecture video open in the session modal (Bunny iframe). */
  const [activeVideo, setActiveVideo] = useState<StudyItem | null>(null);
  const [videoJustFinished, setVideoJustFinished] = useState(false);
  /** Play-through: after each item finishes, open the next unfinished one. */
  const [sequenceMode, setSequenceMode] = useState(false);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scores, setScores] = useState<Record<string, { correct: number; total: number }>>({});
  const startedRef = useRef(false);

  function clearSequenceTimer() {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }

  function markItemDone(id: string) {
    const next = new Set(done);
    next.add(id);
    setDone(next);
    if (queue.every((i) => next.has(i.id))) {
      clearSequenceTimer();
      setSequenceMode(false);
      const completed = queue.filter((i) => next.has(i.id));
      onFinish([], completed);
      setPhase("done");
    }
  }

  function openVideo(it: StudyItem) {
    setActiveExercise(null);
    setVideoJustFinished(false);
    setActiveVideo(it);
  }

  function closeVideo() {
    clearSequenceTimer();
    setSequenceMode(false);
    setActiveVideo(null);
    setVideoJustFinished(false);
  }

  function openItem(it: StudyItem) {
    if (it.kind === "video") {
      openVideo(it);
      return;
    }
    setActiveVideo(null);
    setVideoJustFinished(false);
    if (canRunInPlace(it)) {
      setActiveExercise(it);
      return;
    }
  }

  function isPlayable(it: StudyItem): boolean {
    return it.kind === "video" || canRunInPlace(it);
  }

  /** Next unfinished playable item at/after `fromId` (exclusive). */
  function nextPlayableAfter(currentId: string, doneSet: Set<string> = done): StudyItem | null {
    const idx = queue.findIndex((i) => i.id === currentId);
    const start = idx < 0 ? 0 : idx + 1;
    for (let i = start; i < queue.length; i++) {
      const it = queue[i];
      if (it && !doneSet.has(it.id) && isPlayable(it)) return it;
    }
    return null;
  }

  function firstPlayable(doneSet: Set<string> = done): StudyItem | null {
    for (const it of queue) {
      if (!doneSet.has(it.id) && isPlayable(it)) return it;
    }
    return null;
  }

  function startSequence() {
    const next = firstPlayable();
    if (!next) return;
    setSequenceMode(true);
    openItem(next);
  }

  /** After finishing an item in sequence mode, open the next (or leave sequence). */
  function continueSequence(finishedId: string, doneSet: Set<string>): boolean {
    if (!sequenceMode) return false;
    if (queue.every((i) => doneSet.has(i.id))) {
      setSequenceMode(false);
      return false;
    }
    const following = nextPlayableAfter(finishedId, doneSet);
    if (!following) {
      setSequenceMode(false);
      return false;
    }
    clearSequenceTimer();
    // Exercises swap immediately; videos get a short “ดูจบแล้ว” beat.
    if (following.kind === "video") {
      sequenceTimerRef.current = setTimeout(() => openItem(following), 700);
    } else {
      openItem(following);
    }
    return true;
  }

  /** Next unfinished item after `currentId` in today's queue (any kind). */
  function nextAfter(currentId: string, doneSet: Set<string> = done): StudyItem | null {
    const idx = queue.findIndex((i) => i.id === currentId);
    if (idx < 0) return null;
    for (let i = idx + 1; i < queue.length; i++) {
      const it = queue[i];
      if (it && !doneSet.has(it.id)) return it;
    }
    return null;
  }

  function onVideoEnded() {
    if (!activeVideo) return;
    const id = activeVideo.id;
    setVideoJustFinished(true);
    const nextDone = new Set(done);
    nextDone.add(id);
    markItemDone(id);
    if (continueSequence(id, nextDone)) return;
  }

  useEffect(() => {
    return () => clearSequenceTimer();
  }, []);

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

  const wideModal = phase === "warmup_running" || Boolean(activeExercise) || Boolean(activeVideo);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wideModal ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        {/* ---------------- fill-in-the-blank warm-up offer ---------------- */}
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
                onClick={startWarmup}
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

        {/* ---------------- warm-up: real FITB from the practice bank ---------------- */}
        {phase === "warmup_running" && (
          <WarmupFitbRunner
            levels={warmup.map((w) => w.level)}
            onDone={() => afterWarmup(true)}
            onSkip={() => afterWarmup(false)}
          />
        )}

        {/* ---------------- backlog choice ---------------- */}
        {phase === "choose" && (
          <div className="p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">
              มีบทเรียนและแบบฝึกค้างจากครั้งก่อน
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">จะเริ่มจากตรงไหนดี?</h2>
            <p className="mt-1 text-sm text-slate-600">
              ค้างอยู่ {carryOver.entries.length} บทเรียน/แบบฝึก · ประมาณ{" "}
              {carryOverMinutes(carryOver)} นาที
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => choose("carry_over")}
                className="w-full rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200 transition hover:ring-amber-400"
              >
                <p className="text-sm font-black text-amber-900">
                  📌 ทำแบบฝึก / เรียนบทที่ค้างไว้
                </p>
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
                      และอีก {carryOver.entries.length - 6} บทเรียน/แบบฝึก
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

        {/* ---------------- lecture video, playing in place ---------------- */}
        {activeVideo &&
          phase !== "done" &&
          (() => {
            const meta = activeVideo.lessonId ? lessonVideos[activeVideo.lessonId] : undefined;
            const guid = meta?.bunnyVideoGuid ?? null;
            const alreadyDone = done.has(activeVideo.id);
            return (
              <div className="p-5 sm:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeVideo}
                    className="rounded-full px-2 py-1 text-xs font-bold text-slate-400"
                  >
                    ← กลับ
                  </button>
                  <p className="min-w-0 flex-1 truncate text-center text-[13px] font-black text-slate-800">
                    🎬 {activeVideo.titleTh}
                  </p>
                  <span className="w-14 text-right text-[11px] font-black text-slate-400">
                    {activeVideo.minutes}′
                  </span>
                </div>

                {guid && activeVideo.lessonId ? (
                  <BunnyVideoEmbed
                    guid={guid}
                    title={activeVideo.titleTh}
                    autoplay
                    lessonId={activeVideo.lessonId}
                    startSeconds={meta?.watchedSeconds ?? 0}
                    onEnded={onVideoEnded}
                  />
                ) : guid ? (
                  <BunnyVideoEmbed
                    guid={guid}
                    title={activeVideo.titleTh}
                    autoplay
                    onEnded={onVideoEnded}
                  />
                ) : (
                  <div className="rounded-2xl bg-amber-50 p-5 text-center ring-1 ring-amber-200">
                    <p className="text-sm font-black text-amber-900">ยังไม่มีวิดีโอบนเซิร์ฟเวอร์</p>
                    <p className="mt-1 text-[12px] text-amber-800">
                      บทนี้อยู่ในแผนแล้ว แต่ยังอัปโหลดคลิปไม่ครบ — ปิดแล้วกลับมาใหม่ได้เมื่อมีคลิป
                    </p>
                  </div>
                )}

                {meta && meta.downloads && meta.downloads.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-amber-50/80 p-3 ring-1 ring-amber-200">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                      เอกสารประกอบ ({meta.downloads.length})
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {meta.downloads.map((d) => (
                        <li key={d.id}>
                          <a
                            href={`/api/course/download/${d.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#FFCC00] px-3.5 py-2.5 text-[13px] font-black text-slate-900 ring-1 ring-amber-300 transition hover:brightness-105"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0">PDF</span>
                              <span className="truncate">{d.label}</span>
                            </span>
                            <span className="shrink-0 text-[11px] font-bold text-slate-700">
                              {d.fileSize && d.fileSize > 0
                                ? d.fileSize >= 1024 * 1024
                                  ? `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB ↓`
                                  : `${Math.round(d.fileSize / 1024)} KB ↓`
                                : "ดาวน์โหลด ↓"}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {(alreadyDone || videoJustFinished) &&
                    (() => {
                      // Include current as done so "next" skips the video we just finished
                      // even before React re-renders `done`.
                      const doneForNext = new Set(done);
                      doneForNext.add(activeVideo.id);
                      const next = nextAfter(activeVideo.id, doneForNext);
                      const nextIsLesson =
                        next != null && (next.kind === "video" || next.kind === "lesson");
                      const nextIsExercise =
                        next != null && (next.kind === "exercise" || next.kind === "review");
                      return (
                        <>
                          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-800 ring-1 ring-emerald-200">
                            ✓ ดูจบแล้ว — ระบบติ๊กให้อัตโนมัติ
                          </p>
                          {next && (nextIsLesson || nextIsExercise) && (
                            <button
                              type="button"
                              onClick={() => openItem(next)}
                              className="w-full rounded-full bg-[#004AAD] px-4 py-3 text-sm font-black text-white"
                            >
                              <span className="block truncate">
                                {nextIsLesson ? "บทเรียนถัดไป" : "แบบฝึกถัดไป"} → {next.titleTh}
                              </span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  <button
                    type="button"
                    onClick={closeVideo}
                    className="w-full rounded-full bg-slate-100 py-2.5 text-sm font-black text-slate-600"
                  >
                    {alreadyDone || videoJustFinished
                      ? "กลับรายการวันนี้"
                      : "ปิด — จำตำแหน่งไว้ให้"}
                  </button>
                </div>
              </div>
            );
          })()}

        {/* ---------------- an exercise, running in place ---------------- */}
        {!activeVideo && activeExercise && (() => {
          const hasNext = queue.some((i) => i.id !== activeExercise.id && !done.has(i.id));
          const exitExerciseToList = () => {
            clearSequenceTimer();
            setSequenceMode(false);
            setActiveExercise(null);
          };
          const onExerciseDone = (correct: number, total: number) => {
            setScores((s) => ({ ...s, [activeExercise.id]: { correct, total } }));
            const next = new Set(done);
            next.add(activeExercise.id);
            setDone(next);
            // Last outstanding item — go straight to the day summary rather
            // than dropping back onto a fully-ticked checklist.
            if (queue.every((i) => next.has(i.id))) {
              clearSequenceTimer();
              setSequenceMode(false);
              setActiveExercise(null);
              const completed = queue.filter((i) => next.has(i.id));
              onFinish([], completed);
              setPhase("done");
              return;
            }
            if (sequenceMode) {
              const following = nextPlayableAfter(activeExercise.id, next);
              if (following) {
                if (following.kind === "video") {
                  setActiveExercise(null);
                  clearSequenceTimer();
                  sequenceTimerRef.current = setTimeout(() => openVideo(following), 700);
                } else {
                  setActiveExercise(following);
                }
                return;
              }
              setSequenceMode(false);
            }
            setActiveExercise(null);
          };

          const lessonRef = activeExercise.exerciseKey
            ? lessonRunnerRefFor(activeExercise.exerciseKey)
            : null;
          const lsItem = activeExercise.exerciseKey
            ? listenSpeakItemFor(activeExercise.exerciseKey)
            : null;
          const photoDrill = activeExercise.exerciseKey
            ? speakPhotoDrillFor(activeExercise.exerciseKey)
            : null;
          const listenSpeak = lsItem ? toSpeakDrill(lsItem) : photoDrill;
          const writeTopic = activeExercise.exerciseKey
            ? writeTopicItemFor(activeExercise.exerciseKey)
            : null;
          const isProduction = isProductionExercise(activeExercise.taskType, activeExercise.gateKind);
          const isInteractive = isInteractiveCourseExercise(activeExercise.taskType);
          const isComprehension = isComprehensionExamExercise(activeExercise.taskType);

          return (
            <div className={isProduction || isInteractive || isComprehension ? "" : "p-6"}>
              {lessonRef ? (
                <div className="p-6">
                  <LessonRunnerInline
                    lessonRef={lessonRef}
                    titleTh={activeExercise.titleTh}
                    onCancel={exitExerciseToList}
                    onDone={onExerciseDone}
                  />
                </div>
              ) : listenSpeak ? (
                <div className="p-6">
                  <ListenSpeakBuilder
                    item={listenSpeak}
                    titleTh={activeExercise.titleTh}
                    hasNext={hasNext}
                    onCancel={exitExerciseToList}
                    onDone={onExerciseDone}
                  />
                </div>
              ) : writeTopic ? (
                <div className="p-6">
                  <WriteTopicBuilder
                    item={writeTopic}
                    titleTh={activeExercise.titleTh}
                    hasNext={hasNext}
                    onCancel={exitExerciseToList}
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
                  onCancel={exitExerciseToList}
                  onDone={onExerciseDone}
                />
              ) : isInteractive ? (
                <InteractiveCourseRunner
                  exerciseKey={activeExercise.exerciseKey ?? ""}
                  taskType={
                    activeExercise.taskType === "conversation_summary"
                      ? "dialogue_summary"
                      : (activeExercise.taskType as
                          | "interactive_speaking"
                          | "interactive_conversation_mcq"
                          | "dialogue_summary")
                  }
                  titleTh={activeExercise.titleTh}
                  hasNext={hasNext}
                  onCancel={exitExerciseToList}
                  onDone={onExerciseDone}
                />
              ) : isComprehension ? (
                <ComprehensionExamRunner
                  exerciseKey={activeExercise.exerciseKey ?? ""}
                  taskType={activeExercise.taskType as "reading_comprehension" | "vocabulary_reading"}
                  titleTh={activeExercise.titleTh}
                  hasNext={hasNext}
                  onCancel={exitExerciseToList}
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
                    onCancel={exitExerciseToList}
                    onDone={onExerciseDone}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* ---------------- the session ---------------- */}
        {!activeExercise && !activeVideo && (phase === "running" || phase === "timeup") && (
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
              const playable = firstPlayable();
              if (!copy && !playable) return null;
              return (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                  {copy && (
                    <>
                      <p className="text-[13px] font-black text-slate-800">{copy.titleTh}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{copy.bodyTh}</p>
                    </>
                  )}
                  {playable && (
                    <button
                      type="button"
                      onClick={startSequence}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#004AAD] py-3 text-sm font-black text-white transition hover:brightness-110"
                    >
                      <span
                        aria-hidden
                        className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-base leading-none"
                      >
                        ▶
                      </span>
                      <span className="min-w-0 truncate">
                        {done.size === 0 ? "เริ่มการเรียนวันนี้เลย" : "ทำต่อเนื่องจากการเรียนวันนี้"}
                      </span>
                    </button>
                  )}
                  {playable && (
                    <p className="mt-1.5 text-center text-[10px] font-bold text-slate-400">
                      เปิดบทเรียนและแบบฝึกทีละข้อให้อัตโนมัติ — ไม่ต้องกดทีละอัน
                    </p>
                  )}
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
                        if (it.kind === "video") {
                          openVideo(it);
                          return;
                        }
                        // Runnable exercises open here rather than sending the
                        // learner off to a separate practice page.
                        if (!isDone && canRunInPlace(it)) {
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
                        {isDone ? "✓" : it.kind === "video" ? "▶" : ""}
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
                        {it.kind === "video" && (
                          <span className="mt-0.5 block text-[10px] font-bold text-[#004AAD]">
                            {isDone ? "กดเพื่อดูซ้ำ" : "กดเพื่อเปิดวิดีโอ"}
                          </span>
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
        {phase === "timeup" && !activeExercise && !activeVideo && (
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
