"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  blockForChapter,
  DEFAULT_TASK_PRIORITY,
  isRetiredChapter,
  STUDY_BLOCKS,
  studyBlock,
  TASK_BLOCK,
  levelForLessonTitle,
  taskForChapter,
  taskLabel,
  type StudyBlockKey,
} from "@/lib/course-plan/categories";
import {
  DEFAULT_PLAN_SETTINGS,
  MINUTE_OPTIONS,
  OVERRIDES_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  WEEKDAY_FULL_TH,
  WEEKDAY_TH,
  type PlanSettings,
} from "@/lib/course-plan/planner";
import { SessionRunner } from "@/components/course/SessionRunner";
import type { StudentCourse } from "@/lib/course-student-data";
import {
  fullRungPlan,
  RUNG_TH,
  skillTargetsFor,
  type RungLevel,
} from "@/lib/course-plan/rungs";
import {
  addToCarryOver,
  buildItemStream,
  carryOverMinutes,
  CARRY_OVER_STORAGE_KEY,
  clearFromCarryOver,
  EMPTY_CARRY_OVER,
  pourIntoDays,
  splitDayByTime,
  applyOverrides,
  blockFeasibility,
  blockTotals,
  moveBlockDay,
  moveBlockItem,
  type BlockDay,
  type BlockOverrides,
  type CarryOver,
  type StudyItem,
} from "@/lib/course-plan/block-planner";
import type { WeeklyScore } from "@/lib/course-plan/weekly-scores";
import type { TaskWeakness } from "@/lib/study-plan/weakness-vector";

const TONE: Record<string, { bg: string; ring: string; text: string; solid: string }> = {
  rose: { bg: "bg-rose-50", ring: "ring-rose-200", text: "text-rose-700", solid: "bg-rose-500" },
  violet: { bg: "bg-violet-50", ring: "ring-violet-200", text: "text-violet-700", solid: "bg-violet-500" },
  sky: { bg: "bg-sky-50", ring: "ring-sky-200", text: "text-sky-700", solid: "bg-sky-500" },
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", solid: "bg-emerald-500" },
  slate: { bg: "bg-slate-50", ring: "ring-slate-200", text: "text-slate-600", solid: "bg-slate-400" },
};

const SOURCE_TH: Record<TaskWeakness["source"], string> = {
  mock: "จาก Mock Test",
  mini: "จาก Mini Diagnosis",
  attempts: "จากการฝึกล่าสุด",
};

function thaiDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function CoursePlanClient({
  course,
  weakness,
  weekly,
  hasUser,
  todayIso,
}: {
  course: StudentCourse | null;
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
  todayIso: string;
}) {
  const [settings, setSettings] = useState<PlanSettings>({
    ...DEFAULT_PLAN_SETTINGS,
    startDate: todayIso,
  });
  const [overrides, setOverrides] = useState<BlockOverrides>({});
  const [loaded, setLoaded] = useState(false);
  const [openBlock, setOpenBlock] = useState<StudyBlockKey | null>("production");
  const [plannerView, setPlannerView] = useState<"week" | "month">("week");
  const [weekIndex, setWeekIndex] = useState(0);
  const [dragFrom, setDragFrom] = useState<{ date: string; itemId?: string } | null>(null);
  const [goalScore, setGoalScore] = useState(120);
  const [carryOver, setCarryOver] = useState<CarryOver>(EMPTY_CARRY_OVER);
  const [sessionOpen, setSessionOpen] = useState(false);

  // ---- persistence -------------------------------------------------------
  // localStorage first (instant, works logged-out), then the DB if migration
  // 042 is deployed. The server copy wins on load so the plan follows the user
  // across devices; a 503 means the table isn't there yet and we stay local.
  const [syncState, setSyncState] = useState<"local" | "synced" | "offline">("local");

  useEffect(() => {
    let cancelled = false;

    try {
      const s = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (s) setSettings({ ...DEFAULT_PLAN_SETTINGS, startDate: todayIso, ...JSON.parse(s) });
      const o = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (o) setOverrides(JSON.parse(o));
      const c = window.localStorage.getItem(CARRY_OVER_STORAGE_KEY);
      if (c) setCarryOver(JSON.parse(c));
    } catch {
      /* corrupt or unavailable storage — fall back to defaults */
    }

    if (!hasUser) {
      setLoaded(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/course/plan");
        if (cancelled) return;
        if (res.status === 503) {
          setSyncState("offline");
        } else if (res.ok) {
          const json = (await res.json()) as {
            settings: Partial<PlanSettings> | null;
            overrides: BlockOverrides | null;
            carryOver: CarryOver | null;
          };
          if (json.settings && Object.keys(json.settings).length > 0) {
            setSettings({ ...DEFAULT_PLAN_SETTINGS, startDate: todayIso, ...json.settings });
          }
          if (json.overrides) setOverrides(json.overrides);
          if (json.carryOver) setCarryOver(json.carryOver);
          setSyncState("synced");
        }
      } catch {
        setSyncState("offline");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayIso, hasUser]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(settings));
      window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
      window.localStorage.setItem(CARRY_OVER_STORAGE_KEY, JSON.stringify(carryOver));
    } catch {
      /* ignore */
    }

    if (!hasUser || syncState === "offline") return;
    // Debounced so dragging a dozen items is one write, not a dozen.
    const t = setTimeout(() => {
      void fetch("/api/course/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, overrides, carryOver }),
      })
        .then((r) => setSyncState(r.ok ? "synced" : "offline"))
        .catch(() => setSyncState("offline"));
    }, 800);
    return () => clearTimeout(t);
  }, [settings, overrides, carryOver, loaded, hasUser, syncState]);

  const weakestFirst = useMemo(() => weakness.map((w) => w.taskType), [weakness]);

  /**
   * The real course lessons, ordered for teaching: study blocks in weakness
   * order (or the default task order), then chapter and lesson position.
   * Retired chapters are dropped — they teach questions Duolingo removed.
   */
  const courseVideos = useMemo(() => {
    if (!course) return [];
    const blockOrder: StudyBlockKey[] = [];
    for (const t of [...weakestFirst, ...DEFAULT_TASK_PRIORITY]) {
      const b = TASK_BLOCK[t];
      if (b && !blockOrder.includes(b)) blockOrder.push(b);
    }
    for (const b of STUDY_BLOCKS) if (!blockOrder.includes(b.key)) blockOrder.push(b.key);

    return [...course.chapters]
      .filter((c) => !isRetiredChapter(c.title, c.studyBlock))
      .sort((a, b) => {
        const ia = blockOrder.indexOf(blockForChapter(a.title, a.studyBlock));
        const ib = blockOrder.indexOf(blockForChapter(b.title, b.studyBlock));
        return ia !== ib ? ia - ib : a.position - b.position;
      })
      .flatMap((c) => {
        // The drill that reinforces this chapter, so the day's exercise
        // practises what the day's video just taught.
        const chapterTask = taskForChapter(c.title);
        return [...c.lessons]
          .sort((x, y) => x.position - y.position)
          .map((l) => ({
            key: l.id,
            titleTh: l.title,
            lessonId: l.id,
            status: "live" as const,
            taskType: l.taskType ?? chapterTask,
            level: (l.level as RungLevel | null) ?? levelForLessonTitle(l.title),
            minutes: l.durationSeconds ? Math.max(3, Math.round(l.durationSeconds / 60)) : 7,
          }));
      });
  }, [course, weakestFirst]);

  /**
   * The rungs this learner must climb. Generated from their score vector — no
   * plan is authored per student. Empty until they have been assessed, which
   * makes the planner fall back to teaching the whole course in order.
   */
  const rungSteps = useMemo(() => {
    const scores = weekly.length > 0
      ? weekly.map((w) => ({ taskType: w.taskType, score160: w.score160 }))
      : weakness.map((w) => ({ taskType: w.taskType, score160: w.score160 }));
    if (scores.length === 0) return [];
    return fullRungPlan(skillTargetsFor(scores, goalScore));
  }, [weekly, weakness, goalScore]);

  /**
   * Block-by-block schedule. The curriculum is one ordered stream (block's
   * videos → that block's exercises), poured into days by time budget — so a
   * drill never appears before the lesson that teaches it, and anything that
   * does not fit simply leads the next day.
   */
  const stream = useMemo(() => buildItemStream(courseVideos), [courseVideos]);
  const pourSettings = useMemo(
    () => ({
      startDate: settings.startDate,
      minutesPerDay: settings.minutesPerDay,
      studyDays: settings.studyDays,
      weeks: settings.weeks,
    }),
    [settings],
  );
  const days = useMemo(
    // pourIntoDays mutates its input when it pulls a spread item forward, so
    // hand it a copy — the memoised stream must stay intact for feasibility.
    () => applyOverrides(pourIntoDays([...stream], pourSettings), overrides),
    [stream, pourSettings, overrides],
  );
  const totals = useMemo(() => blockTotals(days), [days]);
  const feasibility = useMemo(
    () => blockFeasibility(days, pourSettings, stream),
    [days, pourSettings, stream],
  );
  const weeks = useMemo(() => {
    const map = new Map<number, BlockDay[]>();
    for (const d of days) {
      const list = map.get(d.weekIndex) ?? [];
      list.push(d);
      map.set(d.weekIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [days]);

  function toggleDay(n: number) {
    setSettings((s) => ({
      ...s,
      studyDays: s.studyDays.includes(n)
        ? s.studyDays.filter((d) => d !== n)
        : [...s.studyDays, n].sort(),
    }));
  }

  function handleDrop(toDate: string) {
    if (!dragFrom) return;
    setOverrides((o) =>
      dragFrom.itemId
        ? moveBlockItem(days, o, dragFrom.itemId, dragFrom.date, toDate)
        : moveBlockDay(days, o, dragFrom.date, toDate),
    );
    setDragFrom(null);
  }

  return (
    <main className="ep-page-shell min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="ep-stagger-in rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">
            Admin only · ยังไม่เปิดให้นักเรียน
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">คอร์สของฉัน</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-600">
              ตั้งแผนเอง · ดูบทเรียนตามหมวด · ปฏิทินลากวางได้
            </p>
            {hasUser && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black transition-colors duration-300 ${
                  syncState === "synced"
                    ? "bg-emerald-50 text-emerald-600"
                    : syncState === "offline"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-400"
                }`}
                title={
                  syncState === "offline"
                    ? "ยังไม่ได้ deploy migration 042 — แผนถูกเก็บในเครื่องนี้เท่านั้น"
                    : undefined
                }
              >
                {syncState === "synced"
                  ? "☁︎ ซิงก์แล้ว"
                  : syncState === "offline"
                    ? "⚠︎ เก็บในเครื่องนี้เท่านั้น"
                    : "…"}
              </span>
            )}
          </div>
        </header>

        {/* ============ TODAY ============ */}
        {(() => {
          const today = days.find((d) => d.date === todayIso) ?? days.find((d) => d.items.length > 0);
          if (!today) return null;
          return (
            <section className="ep-stagger-in overflow-hidden rounded-3xl bg-[#004AAD] text-white shadow-sm">
              <div className="p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                  วันนี้ · {thaiDate(today.date)}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {today.blocks.length > 0 ? today.blocks.map((b) => b.titleTh).join(" → ") : "วันพัก"}
                </h2>
                <p className="mt-0.5 text-sm text-white/80">
                  {today.items.length} รายการ · {today.totalMinutes} นาที
                  {carryOver.entries.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
                      ค้างอยู่ {carryOver.entries.length}
                    </span>
                  )}
                </p>
                {today.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSessionOpen(true)}
                    className="mt-4 w-full rounded-full bg-white py-3 text-sm font-black text-[#004AAD] transition hover:bg-white/90"
                  >
                    ▶︎ เริ่มเรียนวันนี้ ({settings.minutesPerDay} นาที)
                  </button>
                )}
              </div>
            </section>
          );
        })()}

        {/* ============ SCORE BREAKDOWN ============ */}
        <ScoreBreakdown weakness={weakness} weekly={weekly} hasUser={hasUser} />

        {/* ============ THE RUNG LADDER ============ */}
        {rungSteps.length > 0 && (
          <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-900">เส้นทางของคุณ</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              สร้างจากคะแนนของคุณเอง — ไต่ทีละระดับจนถึงเป้า {goalScore}
            </p>
            <ol className="mt-3 space-y-1.5">
              {rungSteps.slice(0, 10).map((step, i) => (
                <li
                  key={`${step.taskType}-${step.level}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-black text-slate-800">
                      {taskLabel(step.taskType)}{" "}
                      <span className="text-slate-400">· ระดับ{RUNG_TH[step.level]}</span>
                    </span>
                    {step.check && (
                      <span className="mt-0.5 block text-[10px] font-bold text-amber-700">
                        ⚡ {step.check.reasonTh}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-500">
                    {step.fromScore} → {step.goalScore}
                  </span>
                </li>
              ))}
            </ol>
            {rungSteps.length > 10 && (
              <p className="mt-2 text-[11px] text-slate-400">
                และอีก {rungSteps.length - 10} ขั้น
              </p>
            )}
            <p className="mt-3 rounded-xl bg-sky-50 p-3 text-[11px] text-sky-800 ring-1 ring-sky-200">
              ระดับที่คุณผ่านแล้วจะไม่ถูกใส่ในตาราง แต่{" "}
              <strong>ยังเปิดดูได้ทุกคลิปตลอดเวลา</strong> — จ่ายเท่ากัน เข้าถึงเท่ากัน
              แต่แผนจะเลือกเฉพาะอันที่ทำให้คะแนนขึ้นจริง
            </p>
          </section>
        )}

        {/* ============ 1. CUSTOMIZE MY PLAN ============ */}
        <Section n={1} title="ตั้งแผนของฉัน" subtitle="เลือกเวลาและวันที่จะเรียน">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                วันละกี่นาที
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MINUTE_OPTIONS.map((m) => (
                  <Pill
                    key={m}
                    on={settings.minutesPerDay === m}
                    onClick={() => setSettings((s) => ({ ...s, minutesPerDay: m }))}
                  >
                    {m} นาที
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                เรียนวันไหนบ้าง ({settings.studyDays.length} วัน/สัปดาห์)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_FULL_TH.map((th, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleDay(n)}
                    className={`rounded-full px-3 py-2 text-xs font-black transition ${
                      settings.studyDays.includes(n)
                        ? "bg-[#004AAD] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                เป้าคะแนน
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[100, 110, 120, 130, 140].map((g) => (
                  <Pill key={g} on={goalScore === g} onClick={() => setGoalScore(g)}>
                    {g}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                แผนกี่สัปดาห์
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[4, 8, 12, 26].map((w) => (
                  <Pill key={w} on={settings.weeks === w} onClick={() => setSettings((s) => ({ ...s, weeks: w }))}>
                    {w} สัปดาห์
                  </Pill>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat n={totals.studyDays} label="วันที่ต้องเรียน" />
              <Stat n={totals.videos} label={`คลิป (จาก ${courseVideos.length})`} />
              <Stat n={totals.exercises} label="ชุดฝึก" />
              <Stat n={totals.hours} label="ชั่วโมงรวม" />
            </div>

            {!settings.practiceOnly && courseVideos.length > 0 && (
              <p
                className={`rounded-xl p-3 text-xs ring-1 ${
                  feasibility.coversWholeTrack
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                {feasibility.coversWholeTrack ? (
                  <>
                    ✓ แผนนี้ครบทั้งหลักสูตร <strong>{feasibility.totalItems}</strong> รายการ
                    (คลิป + แบบฝึก) · วันที่หนักที่สุด ~{feasibility.busiestDayMinutes} นาที
                  </>
                ) : (
                  <>
                    แผนนี้จะทำได้ <strong>{feasibility.scheduledItems}</strong> จาก{" "}
                    <strong>{feasibility.totalItems}</strong> รายการ — ยังไม่ครบหลักสูตร
                    <br />
                    ถ้าเรียนวันละ {settings.minutesPerDay} นาที {settings.studyDays.length} วัน/สัปดาห์
                    ต้องใช้ประมาณ <strong>{feasibility.recommendedWeeks} สัปดาห์</strong> จึงจะครบ
                  </>
                )}
              </p>
            )}

            {/* practice mode */}
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">ไม่อยากดูคลิป?</p>
                  <p className="text-[11px] text-slate-500">
                    โหมดฝึกล้วน — ข้ามวิดีโอ ใช้ปฏิทินฝึกข้อสอบ/บทเรียนแบบเดิม
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, practiceOnly: !s.practiceOnly }))}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      settings.practiceOnly ? "bg-emerald-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
                    }`}
                  >
                    {settings.practiceOnly ? "✓ โหมดฝึกล้วน" : "เปิดโหมดฝึกล้วน"}
                  </button>
                  <Link
                    href="/study-plan"
                    className="rounded-full bg-[#004AAD] px-4 py-2 text-xs font-black text-white"
                  >
                    ไปปฏิทินฝึกข้อสอบ →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ============ 2. STUDY BLOCKS ============ */}
        <Section n={2} title="บทเรียนตามหมวด" subtitle="แตะหมวดเพื่อดูคลิปและเอกสารข้างใน">
          {!course ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              ยังโหลดข้อมูลคอร์สไม่ได้ — ตรวจว่า migration 038 ถูก deploy แล้ว และมีคอร์ส slug{" "}
              <code>duolingo-fast-track</code>
            </p>
          ) : (
            <div className="space-y-2">
              {STUDY_BLOCKS.map((block) => {
                const chapters = course.chapters.filter(
                  (c) => blockForChapter(c.title, c.studyBlock) === block.key,
                );
                if (chapters.length === 0) return null;
                const lessons = chapters.flatMap((c) => c.lessons);
                const done = lessons.filter((l) => l.completed).length;
                const t = TONE[block.tone];
                const open = openBlock === block.key;

                return (
                  <div key={block.key} className={`overflow-hidden rounded-2xl ring-1 transition-shadow ${t.ring}`}>
                    <button
                      type="button"
                      onClick={() => setOpenBlock(open ? null : block.key)}
                      className={`flex w-full items-center gap-3 p-4 text-left transition-colors ${t.bg}`}
                    >
                      <span className="text-2xl">{block.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-base font-black ${t.text}`}>{block.th}</span>
                        <span className="block text-[11px] text-slate-500">{block.subtitleTh}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`block text-sm font-black ${t.text}`}>
                          {done}/{lessons.length}
                        </span>
                        <span className="block text-[10px] text-slate-400">บทเรียน</span>
                      </span>
                      <span className="shrink-0 text-slate-400">{open ? "▲" : "▼"}</span>
                    </button>

                    {open && (
                      <div className="space-y-3 bg-white p-4">
                        {chapters.map((c) => (
                          <div key={c.id}>
                            <p className="mb-1 flex items-center gap-2 text-xs font-black text-slate-700">
                              {c.title}
                              {isRetiredChapter(c.title, c.studyBlock) && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-red-700">
                                  ข้อสอบตัดออกแล้ว
                                </span>
                              )}
                            </p>
                            <ul className="space-y-1">
                              {c.lessons.map((l) => (
                                <li
                                  key={l.id}
                                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"
                                >
                                  <span className={l.completed ? "text-emerald-500" : "text-slate-300"}>
                                    {l.completed ? "✓" : "○"}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700">
                                    {l.title}
                                  </span>
                                  {l.downloads.length > 0 && (
                                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                                      📄 {l.downloads.length}
                                    </span>
                                  )}
                                  {l.bunnyVideoGuid ? (
                                    <Link
                                      href={`/course/duolingo-fast-track?lesson=${l.id}`}
                                      className="shrink-0 rounded-full bg-[#004AAD] px-2.5 py-1 text-[10px] font-black text-white"
                                    >
                                      ดู
                                    </Link>
                                  ) : (
                                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500">
                                      ยังไม่มีวิดีโอ
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ============ 3. PLANNER ============ */}
        <Section
          n={3}
          title="ปฏิทินการเรียน"
          subtitle="ลากวันหรือรายการไปวางวันอื่นได้ ถ้าอยากสลับ"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill on={plannerView === "week"} onClick={() => setPlannerView("week")}>
              รายสัปดาห์
            </Pill>
            <Pill on={plannerView === "month"} onClick={() => setPlannerView("month")}>
              รายเดือน
            </Pill>
            {Object.keys(overrides).length > 0 && (
              <button
                type="button"
                onClick={() => setOverrides({})}
                className="ml-auto rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700"
              >
                ↺ ล้างการลากวาง
              </button>
            )}
          </div>

          {plannerView === "week" ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={weekIndex === 0}
                  onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
                >
                  ← ก่อนหน้า
                </button>
                <p className="text-sm font-black text-slate-700">
                  สัปดาห์ที่ {weekIndex + 1} / {weeks.length}
                </p>
                <button
                  type="button"
                  disabled={weekIndex >= weeks.length - 1}
                  onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
                >
                  ถัดไป →
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(weeks[weekIndex] ?? []).map((d) => (
                  <DayCard
                    key={d.date}
                    day={d}
                    onDragStart={(itemId) => setDragFrom({ date: d.date, itemId })}
                    onDrop={() => handleDrop(d.date)}
                    dragging={dragFrom?.date === d.date}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {weeks.map((w, i) => (
                <div key={i} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <p className="mb-1.5 text-xs font-black text-slate-600">สัปดาห์ {i + 1}</p>
                  <div className="flex gap-1">
                    {w.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          setWeekIndex(i);
                          setPlannerView("week");
                        }}
                        title={`${thaiDate(d.date)} · ${d.totalMinutes} นาที`}
                        className={`h-9 flex-1 rounded-md text-[10px] font-black ${
                          d.items.length === 0
                            ? "bg-slate-100 text-slate-300"
                            : d.items.some((it: StudyItem) => it.kind === "video")
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {WEEKDAY_TH[d.weekday]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {sessionOpen && (() => {
        const today = days.find((d) => d.date === todayIso) ?? days.find((d) => d.items.length > 0);
        if (!today) return null;
        return (
          <SessionRunner
            todaysItems={today.items}
            carryOver={carryOver}
            minutes={settings.minutesPerDay}
            onClose={() => setSessionOpen(false)}
            onFinish={(unfinished, completed) => {
              // Finished items leave the backlog; unfinished ones join it and
              // are offered again at the start of the next session.
              setCarryOver((prev) =>
                addToCarryOver(
                  clearFromCarryOver(prev, completed.map((i) => i.id)),
                  today.date,
                  unfinished,
                ),
              );
            }}
          />
        );
      })()}
    </main>
  );
}

/* ------------------------------------------------------------------ pieces */

const BASIS_TH: Record<WeeklyScore["basis"], string> = {
  this_week: "สัปดาห์นี้",
  last_week: "สัปดาห์ที่แล้ว",
  latest: "ล่าสุด",
};

function ScoreBreakdown({
  weakness,
  weekly,
  hasUser,
}: {
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
}) {
  const rows = useMemo(() => {
    const byWeek = new Map(weekly.map((w) => [w.taskType, w]));
    const byTask = new Map(weakness.map((w) => [w.taskType, w]));
    return Object.keys(TASK_BLOCK)
      .map((taskType) => ({
        taskType,
        week: byWeek.get(taskType) ?? null,
        w: byTask.get(taskType) ?? null,
      }))
      .sort(
        (a, b) =>
          (a.week?.score160 ?? a.w?.score160 ?? 999) - (b.week?.score160 ?? b.w?.score160 ?? 999),
      );
  }, [weakness, weekly]);

  const scored = rows.filter((r) => r.week || r.w);

  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">คะแนนแยกตามโจทย์</h2>
        <p className="text-[11px] text-slate-400">
          อัปเดตทุกสัปดาห์ · ถ้าสัปดาห์นี้ยังไม่มีข้อมูล จะแสดงคะแนนล่าสุดแทน
        </p>
      </div>

      {!hasUser ? (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
          กำลังดูด้วยรหัสแอดมิน (ไม่มีบัญชีผู้ใช้) — จึงยังไม่มีคะแนนให้แสดง
          ล็อกอินด้วยบัญชีจริงเพื่อดูคะแนนของบัญชีนั้น
        </p>
      ) : scored.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          ยังไม่มีคะแนน — ทำ Mock Test หรือ Mini Diagnosis หนึ่งครั้ง
          แล้วแผนจะเรียงลำดับจุดอ่อนให้อัตโนมัติ ตอนนี้ใช้ลำดับมาตรฐานไปก่อน
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {rows.map(({ taskType, week, w }) => {
            const block = studyBlock(TASK_BLOCK[taskType]);
            const t = TONE[block.tone];
            const score = week?.score160 ?? w?.score160 ?? null;
            const isWeak = score !== null && score < 128;
            const pct = score === null ? 0 : Math.round((score / 160) * 100);
            const delta = week?.deltaVsPrevWeek ?? null;

            return (
              <div key={taskType} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[12px] font-black text-slate-700">
                    {taskLabel(taskType)}
                  </p>
                  {score !== null ? (
                    <p className="shrink-0 text-sm font-black">
                      <span className={isWeak ? "text-rose-600" : t.text}>{score}</span>
                      <span className="text-[10px] font-bold text-slate-400">/160</span>
                      {delta !== null && delta !== 0 && (
                        <span
                          className={`ml-1 text-[10px] font-black ${
                            delta > 0 ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {delta > 0 ? "▲" : "▼"}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="shrink-0 text-[10px] font-bold text-slate-300">ยังไม่มีข้อมูล</p>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-[width] duration-500 ease-out ${isWeak ? "bg-rose-400" : t.solid}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {score !== null && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {week
                      ? `${BASIS_TH[week.basis]}${week.attempts > 0 ? ` · ${week.attempts} ครั้ง` : ""}`
                      : w
                        ? SOURCE_TH[w.source]
                        : ""}
                    {isWeak ? " · จุดอ่อน" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DayCard({
  day,
  onDragStart,
  onDrop,
  dragging,
}: {
  day: BlockDay;
  onDragStart: (itemId?: string) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  const [over, setOver] = useState(false);
  const empty = day.items.length === 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      className={`rounded-2xl p-3 ring-1 transition ${
        over ? "bg-sky-50 ring-sky-400" : empty ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <div
        draggable={!empty}
        onDragStart={() => onDragStart(undefined)}
        className={`mb-2 flex items-baseline justify-between gap-2 ${!empty ? "cursor-grab" : ""}`}
      >
        <p className="text-xs font-black text-slate-700">
          {WEEKDAY_FULL_TH[day.weekday]} · {thaiDate(day.date)}
        </p>
        {!empty && <p className="text-[10px] font-bold text-slate-400">{day.totalMinutes} นาที</p>}
      </div>

      {/* Which block(s) today belongs to — the whole point of block-by-block. */}
      {day.blocks.length > 0 && (
        <p className="mb-1.5 truncate text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
          {day.blocks.map((b) => b.titleTh).join(" → ")}
        </p>
      )}

      {empty ? (
        <p className="py-3 text-center text-[11px] font-bold text-slate-300">วันพัก</p>
      ) : (
        <ul className="space-y-1">
          {day.items.map((it: StudyItem) => (
            <li
              key={it.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                onDragStart(it.id);
              }}
              className={`cursor-grab rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                it.kind === "video"
                  ? "bg-amber-50 text-amber-800"
                  : it.kind === "lesson"
                    ? "bg-violet-50 text-violet-800"
                    : it.kind === "review"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-sky-50 text-sky-800"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {it.kind === "video"
                    ? "🎬"
                    : it.kind === "lesson"
                      ? "📘"
                      : it.kind === "review"
                        ? "🔁"
                        : "🏋️"}{" "}
                  {it.titleTh}
                </span>
                <span className="shrink-0 opacity-60">{it.minutes}′</span>
              </span>
              {/* The gate: how the learner proves this one is done. */}
              {it.gateTh && (
                <span className="mt-0.5 block text-[9px] font-bold opacity-70">{it.gateTh}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    // Each section rises in slightly after the one above it — the app's
    // StaggerIn cascade, so the page reveals softly instead of snapping in.
    <section
      className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      style={{ animationDelay: `${n * 90}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#004AAD] text-sm font-black text-white">
          {n}
        </span>
        <div>
          <h2 className="text-lg font-black leading-tight text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
        on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-xl font-black text-slate-800">{n}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
