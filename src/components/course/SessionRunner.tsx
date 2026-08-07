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

import { dayDoneCopy, fillBlankWarmup } from "@/lib/course-plan/curriculum";
import {
  dedupeById,
  splitDayByTime,
  type CarryOver,
  type ItemScore,
  type StudyItem,
} from "@/lib/course-plan/block-planner";

type Phase = "running" | "timeup" | "bonus" | "done";

/** Bunny lesson metadata keyed by course_lessons id. */
export type LessonVideoInfo = {
  bunnyVideoGuid: string;
  title: string;
  watchedSeconds?: number;
  downloads?: Array<{ id: string; label: string; fileSize: number | null }>;
};

/**
 * What finishing an extra item would do to the finish date.
 * `null` when the plan cannot be projected (no start date, no study days).
 */
export type BonusProjection = { date: string; daysSaved: number } | null;

/** The warm-up rides in the queue as a normal item rather than a gate screen. */
const WARMUP_ID = "__warmup__";

function isRealItem(it: StudyItem): boolean {
  return it.id !== WARMUP_ID;
}

function warmupItem(): StudyItem {
  return {
    id: WARMUP_ID,
    kind: "exercise",
    titleTh: "อุ่นเครื่อง · เติมคำ 2 ข้อ",
    minutes: 2,
    blockKey: "warmup",
    blockTitleTh: "อุ่นเครื่อง",
    blockOrder: -1,
    taskType: "fill_in_blanks",
    exerciseKey: WARMUP_ID,
  };
}

/** Can this item run in place, inside the session, instead of a plain checkbox? */
function canRunInPlace(it: StudyItem): boolean {
  if (it.id === WARMUP_ID) return true;
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

function thaiFullDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * One study session.
 *
 * Opening it opens the first item — there is exactly one "start", and it is on
 * the page behind this modal. The old flow asked for a warm-up decision, then a
 * backlog decision, then showed a checklist with a second start button: four
 * taps and three chances to bounce before any learning happened. Now the warm-up
 * is simply the first item in the queue and the backlog is simply at the front
 * of it, both skippable in place.
 *
 * The countdown is advisory, not a lock — it raises the "finish or save for next
 * time" question rather than closing anything mid-answer, because cutting
 * someone off halfway through a speaking response loses their work.
 */
export function SessionRunner({
  todaysItems,
  carryOver,
  minutes,
  onClose,
  onFinish,
  track = "basic",
  lessonVideos = {},
  upcomingItems = [],
  projectWith,
}: {
  todaysItems: StudyItem[];
  carryOver: CarryOver;
  minutes: number;
  /** Drives the warm-up difficulty mix. */
  track?: "basic" | "medium" | "advanced";
  /** lessonId → Bunny guid, so session videos can play inline. */
  lessonVideos?: Record<string, LessonVideoInfo>;
  /**
   * The next scheduled items AFTER today, in plan order. These are what the
   * "one more?" offer draws from once today is clear.
   */
  upcomingItems?: StudyItem[];
  /** What the calendar looks like if these extra ids were also finished. */
  projectWith?: (extraCompletedIds: string[]) => BonusProjection;
  onClose: () => void;
  /** Items the learner did NOT finish — they become the new backlog. */
  onFinish: (
    unfinished: StudyItem[],
    completed: StudyItem[],
    scores: Record<string, ItemScore>,
  ) => void;
}) {
  const warmup = useRef(fillBlankWarmup(track)).current;

  /**
   * Today, in the order it will actually be worked: warm-up, then anything left
   * over from previous days, then today's own plan — trimmed to the time budget.
   * The backlog is no longer a question; it is just the oldest outstanding work,
   * which is what "I'm behind" means.
   */
  const [queue, setQueue] = useState<StudyItem[]>(() => {
    const backlog = carryOver.entries.map((e) => e.item);
    const planned = splitDayByTime(dedupeById([...backlog, ...todaysItems]), minutes).fits;
    return [warmupItem(), ...planned];
  });

  /** Where each backlog item came from, for the "ค้างจาก 1 ส.ค." tag. */
  const backlogFrom = useRef(
    new Map(carryOver.entries.map((e) => [e.item.id, e.fromDate])),
  ).current;

  const [phase, setPhase] = useState<Phase>("running");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, ItemScore>>({});
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [overtime, setOvertime] = useState(false);
  /** The item currently open as an inline exercise, if any. */
  const [activeExercise, setActiveExercise] = useState<StudyItem | null>(null);
  /** Lecture video open in the session modal (Bunny iframe). */
  const [activeVideo, setActiveVideo] = useState<StudyItem | null>(null);
  const [videoJustFinished, setVideoJustFinished] = useState(false);
  /** Play-through: after each item finishes, open the next unfinished one. */
  const [sequenceMode, setSequenceMode] = useState(true);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeupAskedRef = useRef(false);

  /** Extra items pulled forward from later days, and the resulting new finish date. */
  const [bonusOffer, setBonusOffer] = useState<StudyItem | null>(null);
  const [bonusTaken, setBonusTaken] = useState<string[]>([]);
  const [bonusProjection, setBonusProjection] = useState<BonusProjection>(null);

  function clearSequenceTimer() {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }
  useEffect(() => () => clearSequenceTimer(), []);

  /** Only real plan items are reported upward — the warm-up is not in the stream. */
  function emitFinish(unfinished: StudyItem[], completed: StudyItem[]) {
    const realScores: Record<string, ItemScore> = {};
    for (const [id, s] of Object.entries(scores)) {
      if (id !== WARMUP_ID) realScores[id] = s;
    }
    onFinish(unfinished.filter(isRealItem), completed.filter(isRealItem), realScores);
  }

  /** The next scheduled item we could offer as a bonus, if any. */
  function nextBonus(exclude: Set<string>): StudyItem | null {
    for (const it of upcomingItems) {
      if (!exclude.has(it.id) && canRunInPlace(it)) return it;
      if (!exclude.has(it.id) && it.kind === "video") return it;
    }
    return null;
  }

  /**
   * Everything in the queue is finished.
   *
   * Rather than closing the day, offer one more item from tomorrow — the learner
   * is warmed up, in flow, and has just proved they have the time. Accepting
   * pulls the whole plan forward, which the offer says out loud.
   */
  function handleQueueCleared(nextDone: Set<string>) {
    clearSequenceTimer();
    setSequenceMode(false);
    setActiveExercise(null);
    setActiveVideo(null);
    const completed = queue.filter((i) => nextDone.has(i.id));
    emitFinish([], completed);

    const inQueue = new Set(queue.map((i) => i.id));
    const offer = nextBonus(inQueue);
    if (offer) {
      setBonusOffer(offer);
      setBonusProjection(projectWith?.([...bonusTaken, offer.id]) ?? null);
      setPhase("bonus");
      return;
    }
    setPhase("done");
  }

  function markItemDone(id: string) {
    const next = new Set(done);
    next.add(id);
    setDone(next);
    if (queue.every((i) => next.has(i.id))) handleQueueCleared(next);
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
    if (canRunInPlace(it)) setActiveExercise(it);
  }

  function isPlayable(it: StudyItem): boolean {
    return it.kind === "video" || canRunInPlace(it);
  }

  /** Next unfinished playable item at/after `currentId` (exclusive). */
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

  /**
   * One start button, and it is not in here.
   *
   * The learner already pressed "เริ่มเรียนวันนี้" to open this modal, so open
   * the first item straight away. Backing out lands on the checklist, which is
   * where a second start button belongs — as a resume, not as a gate.
   */
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const first = firstPlayable();
    if (first) openItem(first);
    else setSequenceMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on open
  }, []);

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
    // Exercises swap immediately; videos get a short "ดูจบแล้ว" beat.
    if (following.kind === "video") {
      sequenceTimerRef.current = setTimeout(() => openItem(following), 700);
    } else {
      openItem(following);
    }
    return true;
  }

  /** Next unfinished item after `currentId` in the queue (any kind). */
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
    setDone(nextDone);
    if (queue.every((i) => nextDone.has(i.id))) {
      handleQueueCleared(nextDone);
      return;
    }
    continueSequence(id, nextDone);
  }

  // Tick only while actually studying.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Ask once. If they continue, the timer stays at zero rather than
          // firing the prompt again every second.
          if (!timeupAskedRef.current) {
            timeupAskedRef.current = true;
            setPhase("timeup");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (queue.every((i) => next.has(i.id))) {
        // Deferred so this does not set state during another component's render.
        queueMicrotask(() => handleQueueCleared(next));
      }
      return next;
    });
  }

  function finish() {
    const completed = queue.filter((i) => done.has(i.id));
    const unfinished = queue.filter((i) => !done.has(i.id));
    emitFinish(unfinished, completed);
    setPhase("done");
  }

  function acceptBonus(it: StudyItem) {
    setQueue((q) => [...q, it]);
    setBonusTaken((b) => [...b, it.id]);
    setBonusOffer(null);
    setBonusProjection(null);
    setPhase("running");
    setSequenceMode(false);
    setOvertime(true);
    openItem(it);
  }

  function declineBonus() {
    setBonusOffer(null);
    setPhase("done");
  }

  // ---- derived ------------------------------------------------------------
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const doneMinutes = queue.filter((i) => done.has(i.id)).reduce((s, i) => s + i.minutes, 0);
  const totalMinutes = queue.reduce((s, i) => s + i.minutes, 0);
  const percentDone = queue.length === 0 ? 0 : Math.round((done.size / queue.length) * 100);

  /**
   * The number that actually matters. Completion says they showed up; this says
   * whether anything stuck.
   */
  const graded = Object.values(scores).filter((s) => s.total > 0);
  const gradedCorrect = graded.reduce((s, x) => s + x.correct, 0);
  const gradedTotal = graded.reduce((s, x) => s + x.total, 0);
  const accuracyPercent =
    gradedTotal === 0 ? null : Math.round((gradedCorrect / gradedTotal) * 100);

  const videos = queue.filter((i) => i.kind === "video");
  const drills = queue.filter((i) => i.kind !== "video");
  const videoDone = videos.filter((i) => done.has(i.id)).length;
  const drillDone = drills.filter((i) => done.has(i.id)).length;

  const wideModal = Boolean(activeExercise) || Boolean(activeVideo);
  const finalProjection = projectWith?.(bonusTaken) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wideModal ? "max-w-2xl" : "max-w-lg"
        }`}
      >
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
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600"
                  >
                    ← รายการวันนี้
                  </button>
                  <p className="min-w-0 flex-1 truncate text-center text-[14px] font-bold text-slate-800">
                    🎬 {activeVideo.titleTh}
                  </p>
                  <span className="w-12 text-right text-[13px] font-semibold text-slate-400">
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
                    <p className="text-[15px] font-bold text-amber-900">คลิปนี้กำลังจัดทำอยู่</p>
                    <p className="mt-1 text-[13px] text-amber-800">
                      บทนี้อยู่ในแผนแล้ว แต่คลิปยังไม่พร้อม — ข้ามไปทำข้อถัดไปได้เลย
                      เดี๋ยวกลับมาดูทีหลัง
                    </p>
                  </div>
                )}

                {meta && meta.downloads && meta.downloads.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-500">
                      เอกสารประกอบ ({meta.downloads.length})
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {meta.downloads.map((d) => (
                        <li key={d.id}>
                          <a
                            href={`/api/course/download/${d.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#FFCC00] px-3.5 py-2.5 text-[14px] font-bold text-slate-900 ring-1 ring-amber-300 transition hover:brightness-105"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0">PDF</span>
                              <span className="truncate">{d.label}</span>
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold text-slate-700">
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
                      // Include the current video so "next" skips it even before
                      // React re-renders `done`.
                      const doneForNext = new Set(done);
                      doneForNext.add(activeVideo.id);
                      const next = nextAfter(activeVideo.id, doneForNext);
                      return (
                        <>
                          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-[15px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                            ✓ ดูจบแล้ว — ติ๊กให้อัตโนมัติ
                          </p>
                          {next && (
                            <button
                              type="button"
                              onClick={() => openItem(next)}
                              className="w-full rounded-full bg-[#004AAD] px-4 py-3.5 text-[15px] font-extrabold text-white"
                            >
                              <span className="block truncate">
                                {next.kind === "video" || next.kind === "lesson"
                                  ? "บทเรียนถัดไป"
                                  : "แบบฝึกถัดไป"}{" "}
                                → {next.titleTh}
                              </span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  <button
                    type="button"
                    onClick={closeVideo}
                    className="w-full rounded-full bg-slate-100 py-3 text-[15px] font-semibold text-slate-600"
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
        {!activeVideo && activeExercise && phase !== "done" && (() => {
          const hasNext = queue.some((i) => i.id !== activeExercise.id && !done.has(i.id));
          const exitExerciseToList = () => {
            clearSequenceTimer();
            setSequenceMode(false);
            setActiveExercise(null);
          };
          const onExerciseDone = (correct: number, total: number) => {
            const id = activeExercise.id;
            setScores((s) => ({ ...s, [id]: { correct, total } }));
            const next = new Set(done);
            next.add(id);
            setDone(next);
            if (queue.every((i) => next.has(i.id))) {
              handleQueueCleared(next);
              return;
            }
            if (sequenceMode) {
              const following = nextPlayableAfter(id, next);
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

          if (activeExercise.id === WARMUP_ID) {
            return (
              <WarmupFitbRunner
                levels={warmup.map((w) => w.level)}
                onDone={() => onExerciseDone(0, 0)}
                onSkip={() => {
                  // Skipping the warm-up ticks it without a score, so it never
                  // drags the day's accuracy down.
                  onExerciseDone(0, 0);
                }}
              />
            );
          }

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

        {/* ---------------- the checklist (resume view) ---------------- */}
        {!activeExercise && !activeVideo && (phase === "running" || phase === "timeup") && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
                  {overtime ? "ต่อเวลา" : "เวลาที่เหลือ"}
                </p>
                {/* Deliberately not the loudest thing on screen — the work is. */}
                <p
                  className={`font-mono text-2xl font-bold tabular-nums ${
                    secondsLeft === 0 ? "text-rose-600" : "text-slate-500"
                  }`}
                >
                  {mm}:{ss}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-600"
              >
                ปิด
              </button>
            </div>

            <div className="mt-4 flex items-end justify-between gap-2">
              <p className="text-[15px] font-bold text-slate-800">ความคืบหน้าวันนี้</p>
              <p className="text-2xl font-extrabold leading-none text-emerald-600">
                {percentDone}
                <span className="text-[15px]">%</span>
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${percentDone}%` }}
              />
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-slate-500">
              <span>
                เสร็จแล้ว {done.size} / {queue.length}
              </span>
              {videos.length > 0 && (
                <span>
                  🎬 {videoDone}/{videos.length}
                </span>
              )}
              {drills.length > 0 && (
                <span>
                  🏋️ {drillDone}/{drills.length}
                </span>
              )}
              {accuracyPercent !== null && (
                <span className="font-semibold text-slate-700">
                  แม่นยำ {accuracyPercent}%
                </span>
              )}
              <span>
                {doneMinutes}/{totalMinutes} นาที
              </span>
            </p>

            {firstPlayable() && (
              <button
                type="button"
                onClick={startSequence}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#004AAD] py-4 text-[15px] font-extrabold text-white transition hover:brightness-110"
              >
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-base leading-none"
                >
                  ▶
                </span>
                <span className="min-w-0 truncate">
                  {done.size === 0 ? "เริ่มเลย" : "ทำต่อจากที่ค้างไว้"}
                </span>
              </button>
            )}

            <ul className="mt-4 space-y-1.5">
              {queue.map((it) => {
                const isDone = done.has(it.id);
                const from = backlogFrom.get(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (it.kind === "video") {
                          openVideo(it);
                          return;
                        }
                        if (!isDone && canRunInPlace(it)) {
                          setActiveExercise(it);
                          return;
                        }
                        toggle(it.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3.5 text-left ring-1 transition ${
                        isDone
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                          : "bg-slate-50 text-slate-800 ring-slate-200 hover:ring-slate-400"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[13px] font-bold ${
                          isDone ? "bg-emerald-500 text-white" : "bg-white ring-1 ring-slate-300"
                        }`}
                      >
                        {isDone ? "✓" : it.kind === "video" ? "▶" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[14px] font-semibold ${
                            isDone ? "line-through opacity-60" : ""
                          }`}
                        >
                          {it.id === WARMUP_ID
                            ? "⚡"
                            : it.kind === "video"
                              ? "🎬"
                              : it.kind === "lesson"
                                ? "📘"
                                : "🏋️"}{" "}
                          {it.titleTh}
                        </span>
                        {scores[it.id] && scores[it.id].total > 0 ? (
                          <span className="mt-0.5 block text-[13px] font-bold text-emerald-600">
                            {scores[it.id].correct}/{scores[it.id].total} ·{" "}
                            {Math.round((scores[it.id].correct / scores[it.id].total) * 100)}% แม่นยำ
                          </span>
                        ) : from ? (
                          <span className="mt-0.5 block text-[13px] text-amber-700">
                            ค้างจาก {thaiDay(from)}
                          </span>
                        ) : (
                          it.gateTh && (
                            <span className="mt-0.5 block text-[13px] text-slate-500">
                              {it.gateTh}
                            </span>
                          )
                        )}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-slate-400">
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
              className="mt-5 w-full rounded-full bg-slate-100 py-3 text-[15px] font-semibold text-slate-600"
            >
              จบการเรียนวันนี้
            </button>
          </div>
        )}

        {/* ---------------- time is up ---------------- */}
        {phase === "timeup" && !activeExercise && !activeVideo && (
          <div className="border-t-4 border-amber-400 bg-amber-50 p-6">
            <p className="text-[17px] font-extrabold text-amber-900">
              ครบ {minutes} นาทีแล้ว
            </p>
            <p className="mt-1 text-[15px] text-amber-800">
              ยังเหลืออีก {queue.length - done.size} รายการ — จะทำต่อให้จบ หรือเก็บไว้ครั้งหน้า?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setOvertime(true);
                  setPhase("running");
                }}
                className="flex-1 rounded-full bg-[#004AAD] px-4 py-3 text-[15px] font-extrabold text-white"
              >
                ทำต่อให้จบ
              </button>
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-full bg-white px-4 py-3 text-[15px] font-semibold text-amber-900 ring-1 ring-amber-300"
              >
                เก็บไว้ครั้งหน้า
              </button>
            </div>
          </div>
        )}

        {/* ---------------- one more? ---------------- */}
        {phase === "bonus" && bonusOffer && (
          <div className="p-6">
            <p className="text-4xl">⚡</p>
            <p className="mt-2 text-[13px] font-semibold uppercase tracking-widest text-emerald-600">
              ครบ {minutes} นาทีของวันนี้แล้ว
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              ยังไหวอยู่ไหม? ทำต่ออีกข้อ
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
              ถ้าทำเพิ่มตอนนี้ งานของวันถัดไปจะถูกดึงมาให้ — แผนทั้งหมดขยับเร็วขึ้น
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
                ข้อถัดไปในแผน
              </p>
              <p className="mt-1 text-[16px] font-bold text-slate-800">
                {bonusOffer.kind === "video" ? "🎬" : bonusOffer.kind === "lesson" ? "📘" : "🏋️"}{" "}
                {bonusOffer.titleTh}
              </p>
              <p className="mt-0.5 text-[13px] text-slate-500">
                ประมาณ {bonusOffer.minutes} นาที
                {bonusOffer.gateTh ? ` · ${bonusOffer.gateTh}` : ""}
              </p>
            </div>

            {bonusProjection && bonusProjection.daysSaved > 0 && (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3.5 text-[14px] text-emerald-900 ring-1 ring-emerald-200">
                ทำข้อนี้แล้วจะเรียนจบเร็วขึ้น{" "}
                <strong>{bonusProjection.daysSaved} วัน</strong> — เป็นวันที่{" "}
                <strong>{thaiFullDay(bonusProjection.date)}</strong>
              </p>
            )}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => acceptBonus(bonusOffer)}
                className="w-full rounded-full bg-emerald-600 py-4 text-[15px] font-extrabold text-white transition hover:brightness-110"
              >
                เอา ทำต่ออีกข้อ
              </button>
              <button
                type="button"
                onClick={declineBonus}
                className="w-full rounded-full bg-slate-100 py-3.5 text-[15px] font-semibold text-slate-600"
              >
                พอแค่นี้ก่อน
              </button>
            </div>
            <p className="mt-2 text-center text-[13px] text-slate-400">
              ทำครบตามแผนแล้ว — ส่วนนี้เป็นของแถม ไม่ทำก็ไม่ถือว่าตามไม่ทัน
            </p>
          </div>
        )}

        {/* ---------------- summary ---------------- */}
        {phase === "done" && (
          <div className="p-6 text-center">
            <p className="text-5xl">{accuracyPercent !== null && accuracyPercent < 50 ? "📘" : "🎉"}</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
              {dayDoneCopy(percentDone, accuracyPercent).titleTh}
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
              {dayDoneCopy(percentDone, accuracyPercent).bodyTh}
            </p>

            {/* Two numbers, side by side, because they mean different things. */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                  ทำได้
                </p>
                <p className="text-2xl font-extrabold text-slate-800">
                  {done.size}
                  <span className="text-[15px] font-bold text-slate-400">/{queue.length}</span>
                </p>
                <p className="text-[13px] text-slate-500">{doneMinutes} นาที</p>
              </div>
              <div
                className={`rounded-2xl p-3.5 ring-1 ${
                  accuracyPercent === null
                    ? "bg-slate-50 ring-slate-200"
                    : accuracyPercent >= 70
                      ? "bg-emerald-50 ring-emerald-200"
                      : "bg-amber-50 ring-amber-200"
                }`}
              >
                <p
                  className={`text-[13px] font-semibold uppercase tracking-wide ${
                    accuracyPercent === null
                      ? "text-slate-400"
                      : accuracyPercent >= 70
                        ? "text-emerald-600"
                        : "text-amber-600"
                  }`}
                >
                  ความแม่นยำ
                </p>
                <p
                  className={`text-2xl font-extrabold ${
                    accuracyPercent === null
                      ? "text-slate-400"
                      : accuracyPercent >= 70
                        ? "text-emerald-800"
                        : "text-amber-800"
                  }`}
                >
                  {accuracyPercent === null ? "—" : `${accuracyPercent}%`}
                </p>
                <p className="text-[13px] text-slate-500">
                  {accuracyPercent === null
                    ? "วันนี้ไม่มีข้อที่ให้คะแนน"
                    : `ถูก ${gradedCorrect} จาก ${gradedTotal} ข้อ`}
                </p>
              </div>
            </div>

            {bonusTaken.length > 0 && (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3.5 text-[14px] text-emerald-900 ring-1 ring-emerald-200">
                ⚡ ทำเกินแผน {bonusTaken.length} รายการ
                {finalProjection && finalProjection.daysSaved > 0 ? (
                  <>
                    {" "}
                    — เรียนจบเร็วขึ้น <strong>{finalProjection.daysSaved} วัน</strong> เป็นวันที่{" "}
                    <strong>{thaiFullDay(finalProjection.date)}</strong>
                  </>
                ) : (
                  " — แผนถูกดึงให้เร็วขึ้นแล้ว"
                )}
              </p>
            )}

            {queue.length - done.size > 0 && (
              <p className="mt-3 rounded-2xl bg-amber-50 p-3.5 text-[14px] text-amber-800 ring-1 ring-amber-200">
                เก็บงานค้างไว้ {queue.length - done.size} รายการ — จะขึ้นให้ก่อนในครั้งถัดไป
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-[#004AAD] py-4 text-[15px] font-extrabold text-white"
            >
              เสร็จสิ้น
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
