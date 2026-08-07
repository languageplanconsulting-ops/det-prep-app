"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PlacementObjectiveProbe,
  type ObjectiveTaskType,
} from "@/components/course/PlacementObjectiveProbe";
import {
  PlacementProductionProbe,
  type AiGradedTaskType,
} from "@/components/course/PlacementProductionProbe";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { TASK_LABEL_TH } from "@/lib/course-plan/categories";
import {
  CORE_AI_PLACEMENT_TASKS,
  CORE_OBJECTIVE_PLACEMENT_TASKS,
  CORE_PLACEMENT_TASKS,
  CORE_PROBE_BLURB_TH,
  estimatedProbeMinutes,
  inferPlacements,
  PLACEMENT_INTRO_TH,
  PLACEMENT_SKIP_TH,
  type CorePlacementTask,
} from "@/lib/course-plan/placement";
import { RUNG_TH, type RungLevel } from "@/lib/course-plan/rungs";
import type { PlacementResult } from "@/lib/course-plan/weekly-scores";

const OBJECTIVE_SET = new Set<string>(CORE_OBJECTIVE_PLACEMENT_TASKS);

const LEVEL_COLOR: Record<RungLevel, { bg: string; ring: string; text: string }> = {
  easy: { bg: "bg-sky-50", ring: "ring-sky-200", text: "text-sky-700" },
  medium: { bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-700" },
  hard: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700" },
};

async function postPlacement(taskType: string, currentLevel: RungLevel, lastScore160: number | null) {
  try {
    await fetch("/api/course/skill-placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskType, currentLevel, lastScore160 }),
    });
  } catch {
    // Best-effort — a dropped save just means this skill gets asked again next visit.
  }
}

/**
 * The pre-course placement, cut from twelve probes to three.
 *
 * Three skills are measured; the other nine are inferred from them
 * (placement.ts INFERRED_FROM) and written in the same pass, so the learner
 * reaches their plan in about five minutes instead of twenty-two. The rung
 * ladder corrects any bad inference within a session or two of real work.
 */
export function PlacementRunner({ initialPlacements }: { initialPlacements: PlacementResult[] }) {
  const router = useRouter();
  const [measured, setMeasured] = useState<Map<string, RungLevel>>(
    () =>
      new Map(
        initialPlacements
          .filter((p) => (CORE_PLACEMENT_TASKS as readonly string[]).includes(p.taskType))
          .map((p) => [p.taskType, p.currentLevel]),
      ),
  );
  const [phase, setPhase] = useState<"intro" | "probe" | "recap" | "finishing">(
    measured.size >= CORE_PLACEMENT_TASKS.length ? "recap" : "intro",
  );
  const [busy, setBusy] = useState(false);

  const remaining = useMemo(
    () => CORE_PLACEMENT_TASKS.filter((t) => !measured.has(t)),
    [measured],
  );
  const current = remaining[0];

  const estimatedMinutes = useMemo(
    () => estimatedProbeMinutes(CORE_OBJECTIVE_PLACEMENT_TASKS, CORE_AI_PLACEMENT_TASKS),
    [],
  );

  /** Everything the learner will be placed at — measured three plus inferred nine. */
  const allPlacements = useMemo(() => inferPlacements(measured), [measured]);

  function handleSettled(taskType: string, level: RungLevel, lastScore160: number) {
    setMeasured((prev) => new Map(prev).set(taskType, level));
    void postPlacement(taskType, level, lastScore160);
  }

  /** Backing out of one probe — its family falls back to easy, which costs a few sessions. */
  function handleSkipOne(taskType: string) {
    setMeasured((prev) => new Map(prev).set(taskType, "easy"));
    void postPlacement(taskType, "easy", null);
  }

  /**
   * Write all twelve rows and leave.
   *
   * The nine inferred skills are persisted here rather than after each probe, so
   * a learner who quits halfway still lands on a complete, usable plan.
   */
  async function commitAndFinish(levels: Map<string, RungLevel>) {
    setBusy(true);
    setPhase("finishing");
    await Promise.all(
      inferPlacements(levels).map((p) =>
        postPlacement(p.taskType, p.level, null),
      ),
    );
    router.refresh();
  }

  // router.refresh() only unmounts this component once the server-side gate flips
  // (all 12 skills actually persisted). A dropped save — or migration 047 not yet
  // deployed — would otherwise leave the learner staring at this spinner forever.
  // Self-heal: fall back to the recap so the button is always retryable.
  useEffect(() => {
    if (phase !== "finishing") return;
    const timer = setTimeout(() => {
      setBusy(false);
      setPhase("recap");
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "finishing") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LuxuryLoader label="กำลังจัดแผนการเรียน…" />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-5 p-4 pb-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#004AAD]">
            ก่อนเริ่มเรียน
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            ตอบสั้น ๆ 3 อย่าง
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{PLACEMENT_INTRO_TH}</p>

          <ol className="mt-4 space-y-2">
            {CORE_PLACEMENT_TASKS.map((t, i) => (
              <li
                key={t}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[13px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-800">
                    {TASK_LABEL_TH[t] ?? t}
                  </span>
                  <span className="block text-[13px] text-slate-500">
                    {CORE_PROBE_BLURB_TH[t as CorePlacementTask]}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-[13px] text-slate-500">
            ประมาณ {estimatedMinutes} นาที · หยุดกลางคันได้ ระบบจำไว้ให้
          </p>

          <button
            type="button"
            onClick={() => setPhase("probe")}
            className="mt-5 w-full rounded-full bg-[#004AAD] py-4 text-base font-extrabold text-white transition hover:brightness-110"
          >
            เริ่มเลย
          </button>
          {/* A real alternative, styled like one. Nobody should have to hunt for
              the exit from a test they did not ask for. */}
          <button
            type="button"
            disabled={busy}
            onClick={() => void commitAndFinish(new Map())}
            className="mt-2 w-full rounded-full bg-slate-100 py-3 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
          >
            {PLACEMENT_SKIP_TH}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "recap" || !current) {
    const measuredRows = allPlacements.filter((p) => !p.inferred);
    const inferredRows = allPlacements.filter((p) => p.inferred);
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4 pb-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-4xl">🎯</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            จัดแผนให้แล้ว
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
            จากที่คุณตอบ เราจัดระดับเริ่มต้นให้ครบทั้ง 12 ทักษะ —{" "}
            <strong className="text-slate-800">ระดับนี้ไม่ตายตัว</strong>{" "}
            ระบบจะเลื่อนขึ้นให้เองทันทีที่คุณทำได้ดี และลดลงถ้ายังไม่ผ่าน
          </p>

          <p className="mt-5 text-[13px] font-semibold uppercase tracking-widest text-slate-400">
            จากที่คุณทำ
          </p>
          <div className="mt-2 space-y-1.5">
            {measuredRows.map((p) => (
              <LevelRow key={p.taskType} taskType={p.taskType} level={p.level} />
            ))}
          </div>

          <p className="mt-5 text-[13px] font-semibold uppercase tracking-widest text-slate-400">
            ประเมินต่อให้อีก {inferredRows.length} ทักษะ
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            คาดจากทักษะที่ใกล้กัน — จะแม่นขึ้นเองหลังเรียนไปสองสามวัน
          </p>
          <div className="mt-2 space-y-1.5">
            {inferredRows.map((p) => (
              <LevelRow key={p.taskType} taskType={p.taskType} level={p.level} muted />
            ))}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void commitAndFinish(measured)}
            className="mt-6 w-full rounded-full bg-emerald-600 py-4 text-base font-extrabold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            ไปที่แผนของฉัน →
          </button>
        </div>
      </div>
    );
  }

  const doneCount = CORE_PLACEMENT_TASKS.length - remaining.length;

  return (
    <div className="mx-auto max-w-xl pb-10">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-[13px] font-semibold text-slate-500">
          {doneCount + 1} / {CORE_PLACEMENT_TASKS.length} ·{" "}
          {TASK_LABEL_TH[current] ?? current}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void commitAndFinish(measured)}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
        >
          ข้ามไปเริ่มเรียน
        </button>
      </div>
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full bg-[#004AAD] transition-[width] duration-500"
          style={{ width: `${(doneCount / CORE_PLACEMENT_TASKS.length) * 100}%` }}
        />
      </div>

      <div className="p-4">
        {OBJECTIVE_SET.has(current) ? (
          <PlacementObjectiveProbe
            key={current}
            taskType={current as ObjectiveTaskType}
            onSettled={(level, score) => handleSettled(current, level, score)}
            onSkip={() => handleSkipOne(current)}
          />
        ) : (
          <PlacementProductionProbe
            key={current}
            taskType={current as AiGradedTaskType}
            onSettled={(level, score) => handleSettled(current, level, score)}
            onSkip={() => handleSkipOne(current)}
          />
        )}
      </div>
    </div>
  );
}

function LevelRow({
  taskType,
  level,
  muted = false,
}: {
  taskType: string;
  level: RungLevel;
  muted?: boolean;
}) {
  const c = LEVEL_COLOR[level];
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 ring-1 ${
        muted ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200"
      }`}
    >
      <span className={`text-[14px] ${muted ? "text-slate-500" : "font-semibold text-slate-800"}`}>
        {TASK_LABEL_TH[taskType] ?? taskType}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ring-1 ${c.bg} ${c.ring} ${c.text}`}
      >
        {RUNG_TH[level]}
      </span>
    </div>
  );
}
