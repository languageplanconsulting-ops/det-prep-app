"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { FIXED_MOCK_ESTIMATED_DURATION_LABEL, FIXED_SEQUENCE_TEMPLATE } from "@/lib/mock-test/fixed-sequence";
import {
  buildSkillWeightRows,
  type FixedMockScoredRow,
  type FixedMockSkillId,
} from "@/lib/mock-test/fixed-mock-score-buckets";
import { formatMockAnswerSnippet } from "@/lib/mock-test/mock-fixed-answer-snippet";

const RING_R = 45;
const RING_C = 2 * Math.PI * RING_R;

const TASK_LABELS: Record<string, string> = {
  fill_in_blanks: "Fill in the Blanks",
  write_about_photo: "Write About Photo",
  dictation: "Dictation",
  vocabulary_reading: "Vocabulary Reading",
  speak_about_photo: "Speak About Photo",
  read_and_write: "Read and Write",
  read_then_speak: "Read Then Speak",
  interactive_conversation_mcq: "Interactive Conversation",
  conversation_summary: "Conversation Summary",
  summarize_conversation: "Conversation Summary",
  interactive_speaking: "Interactive Speaking",
  real_english_word: "Real English Word",
};

function taskLabel(taskType: string): string {
  return TASK_LABELS[taskType] ?? taskType.replace(/_/g, " ");
}

function skillsForStep(stepIndex: number, taskType: string): FixedMockSkillId[] {
  if (taskType === "fill_in_blanks" || taskType === "vocabulary_reading" || taskType === "real_english_word") {
    return ["reading"];
  }
  if (taskType === "write_about_photo" || taskType === "read_and_write") return ["writing"];
  if (taskType === "dictation") return ["listening", "writing"];
  if (taskType === "conversation_summary" || taskType === "summarize_conversation") {
    return ["listening", "writing"];
  }
  if (taskType === "interactive_conversation_mcq" || taskType === "interactive_speaking") {
    return ["speaking", "listening"];
  }
  if (taskType === "speak_about_photo" || taskType === "read_then_speak") return ["speaking"];
  return [];
}

function skillBadgeClass(id: FixedMockSkillId): string {
  if (id === "speaking") return "border-[#004aad] text-[#004aad] bg-[#004aad]/[0.06]";
  if (id === "listening") return "border-violet-600 text-violet-700 bg-violet-600/[0.06]";
  if (id === "reading") return "border-teal-600 text-teal-700 bg-teal-600/[0.06]";
  return "border-orange-600 text-orange-700 bg-orange-600/[0.06]";
}

function skillShort(id: FixedMockSkillId): string {
  if (id === "speaking") return "SPK";
  if (id === "listening") return "LSN";
  if (id === "reading") return "RDG";
  return "WRT";
}

function stepStatus(score: number): "correct" | "partial" | "wrong" {
  if (score >= 85) return "correct";
  if (score >= 55) return "partial";
  return "wrong";
}

function scoreTone(score: number): "high" | "mid" | "low" {
  if (score >= 85) return "high";
  if (score >= 65) return "mid";
  return "low";
}

const SKILL_ORDER: FixedMockSkillId[] = ["speaking", "listening", "reading", "writing"];

export function MockFixedReportBrandedView({
  sessionId,
  total,
  listening,
  speaking,
  reading,
  writing,
  targets,
  responses,
  completedAt,
  recommendations,
}: {
  sessionId: string;
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  targets: { total: number; listening: number; speaking: number; reading: number; writing: number };
  responses: FixedMockScoredRow[];
  completedAt: string | null;
  recommendations: string[];
}) {
  const ringRef = useRef<SVGCircleElement | null>(null);
  const [openSkills, setOpenSkills] = useState<Record<FixedMockSkillId, boolean>>({
    speaking: true,
    listening: false,
    reading: false,
    writing: false,
  });
  const [openSteps, setOpenSteps] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const skillMeta = useMemo(
    () =>
      ({
        speaking: { name: "Speaking", icon: "🗣️", bar: "bg-[#004aad]", text: "text-[#004aad]", fill: "bg-[#004aad]" },
        listening: {
          name: "Listening",
          icon: "👂",
          bar: "bg-violet-600",
          text: "text-violet-700",
          fill: "bg-violet-600",
        },
        reading: { name: "Reading", icon: "📖", bar: "bg-teal-600", text: "text-teal-700", fill: "bg-teal-600" },
        writing: { name: "Writing", icon: "✍️", bar: "bg-orange-600", text: "text-orange-700", fill: "bg-orange-600" },
      }) as const,
    [],
  );

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.style.strokeDashoffset = String(RING_C * (1 - total / 160));
    }, 100);
    return () => window.clearTimeout(t);
  }, [total]);

  const rowsByStep = useMemo(() => {
    const m = new Map<number, FixedMockScoredRow>();
    for (const r of responses) m.set(r.step_index, r);
    return m;
  }, [responses]);

  const completedLabel = completedAt
    ? new Date(completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const scrollToSkill = (id: FixedMockSkillId) => {
    setOpenSkills((prev) => ({ ...prev, [id]: true }));
    window.setTimeout(() => {
      document.getElementById(`mock-skill-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const skillScore = (id: FixedMockSkillId) =>
    id === "speaking" ? speaking : id === "listening" ? listening : id === "reading" ? reading : writing;

  return (
    <div
      className="text-[#111827]"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui",
        backgroundImage: "radial-gradient(circle, rgba(0,74,173,.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto max-w-[720px] px-4 pb-12 pt-2">
        <div className="pt-3">
          <Link
            href="/mock-test/start"
            className="inline-flex items-center gap-1 font-mono text-[0.58rem] font-bold uppercase tracking-wide text-neutral-500 hover:text-[#004aad]"
          >
            ← Mock test hub
          </Link>
        </div>

        {/* Hero */}
        <div className="mt-3 overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_0_#111827]">
          <div
            className="h-[5px]"
            style={{
              background: "linear-gradient(90deg,#004aad,#ffcc00,#16a34a,#7c3aed)",
            }}
          />
          <div className="flex flex-col items-center gap-6 px-5 py-6 sm:flex-row sm:items-center sm:text-left">
            <div className="relative h-[110px] w-[110px] shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#f3f4f6" strokeWidth="7" />
                <circle
                  ref={ringRef}
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke="#004aad"
                  strokeWidth="7"
                  strokeLinecap="square"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C}
                  style={{ transition: "stroke-dashoffset 1.15s ease 0.25s" }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[2rem] font-black leading-none tabular-nums">{total}</span>
                <span className="font-mono text-[0.5rem] font-semibold text-neutral-500">/ 160</span>
                <span className="mt-0.5 font-mono text-[0.4rem] font-bold uppercase tracking-[0.1em] text-neutral-500">
                  Overall
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-mono text-[0.42rem] font-bold uppercase tracking-[0.14em] text-neutral-500">
                Full mock test report
              </p>
              <h1 className="mt-1 text-[1.2rem] font-black tracking-tight text-neutral-900">DET fixed mock · 20 steps</h1>
              <p className="mt-1 text-[0.75rem] text-neutral-500">
                Est. duration {FIXED_MOCK_ESTIMATED_DURATION_LABEL} · Completed {completedLabel}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <span className="border-2 border-black bg-[#e6eef8] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-[#004aad]">
                  20 steps
                </span>
                <span className="border-2 border-black bg-[#fff9e0] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-neutral-800">
                  Session {sessionId.slice(0, 8)}…
                </span>
                <span className="border-2 border-black bg-[#d1fae5] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-emerald-700">
                  4-skill model
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Target strip */}
        <div className="mt-4 border-2 border-black bg-white px-4 py-3 shadow-[2px_2px_0_0_#111827]">
          <p className="font-mono text-[0.5rem] font-bold uppercase tracking-wide text-neutral-500">Targets vs actual</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {(
              [
                ["Total", total, targets.total],
                ["Listening", listening, targets.listening],
                ["Speaking", speaking, targets.speaking],
                ["Reading", reading, targets.reading],
                ["Writing", writing, targets.writing],
              ] as const
            ).map(([label, act, tgt]) => {
              const d = act - tgt;
              return (
                <div key={label} className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5">
                  <p className="text-[10px] font-bold uppercase text-neutral-500">{label}</p>
                  <p className="font-mono text-lg font-black">
                    {act}
                    <span className="text-xs font-semibold text-neutral-400"> / {tgt}</span>
                  </p>
                  <p className={`text-[10px] font-bold ${d >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {d >= 0 ? "+" : ""}
                    {Math.round(d)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill bars */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SKILL_ORDER.map((id) => {
            const s = skillScore(id);
            const meta = skillMeta[id];
            const pct = (s / 160) * 100;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSkill(id)}
                className="relative overflow-hidden border-2 border-black bg-white py-2.5 pl-3 pr-2 text-left shadow-[2px_2px_0_0_#111827] transition hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_0_#111827]"
              >
                <span className={`absolute bottom-0 left-0 top-0 w-1 ${meta.bar}`} />
                <p className="pl-2 font-mono text-[0.45rem] font-bold uppercase tracking-[0.08em] text-neutral-500">
                  {meta.icon} {meta.name}
                </p>
                <div className="mt-1 flex items-center gap-2 pl-2">
                  <span className={`font-mono text-[1.15rem] font-black tabular-nums ${meta.text}`}>{s}</span>
                  <div className="h-[5px] min-w-0 flex-1 bg-neutral-100">
                    <div className={`h-full ${meta.fill}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="shrink-0 font-mono text-[0.45rem] font-semibold text-neutral-500">/160</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Skill sections */}
        <div className="mt-3 space-y-2.5">
          {SKILL_ORDER.map((id) => {
            const meta = skillMeta[id];
            const s = skillScore(id);
            const open = openSkills[id];
            const weightRows = buildSkillWeightRows(id, responses);
            return (
              <div
                key={id}
                id={`mock-skill-${id}`}
                className="overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827]"
              >
                <button
                  type="button"
                  onClick={() => setOpenSkills((prev) => ({ ...prev, [id]: !prev[id] }))}
                  className="flex w-full items-stretch text-left transition hover:bg-neutral-50"
                >
                  <span className={`w-[5px] shrink-0 ${meta.bar}`} />
                  <div className="flex flex-1 items-center gap-2.5 px-3.5 py-3">
                    <span className="text-[1.1rem]">{meta.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.88rem] font-black tracking-tight text-neutral-900">{meta.name}</p>
                      <p className="mt-0.5 text-[0.65rem] text-neutral-500">
                        {weightRows.length} weighted parts · official mock blend
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 px-3.5">
                    <span className={`font-mono text-base font-black tabular-nums ${meta.text}`}>{s}/160</span>
                    <span className={`text-[0.7rem] font-black text-neutral-400 transition ${open ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </div>
                </button>
                <div
                  className={`border-t-2 border-neutral-100 transition-[max-height] duration-300 ${
                    open ? "max-h-[4000px]" : "max-h-0 overflow-hidden"
                  }`}
                >
                  <div className="divide-y divide-neutral-100">
                    {weightRows.map((w) => {
                      const barPct = (w.componentScore / 160) * 100;
                      return (
                        <div key={w.name} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                          <span className="min-w-[2rem] shrink-0 bg-neutral-100 px-1.5 py-0.5 text-center font-mono text-[0.5rem] font-extrabold text-neutral-600">
                            {w.pct}%
                          </span>
                          <span className="min-w-0 flex-1 text-[0.78rem] font-semibold text-neutral-900">{w.name}</span>
                          <span className="hidden shrink-0 font-mono text-[0.48rem] font-semibold text-neutral-500 sm:inline">
                            {w.stepsLabel}
                          </span>
                          <div className="h-1 w-12 shrink-0 bg-neutral-100">
                            <div className={`h-full ${meta.fill}`} style={{ width: `${Math.min(100, barPct)}%` }} />
                          </div>
                          <span className={`shrink-0 font-mono text-[0.75rem] font-extrabold ${meta.text}`}>
                            {w.componentScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Steps */}
        <div
          className={`mt-4 overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827] ${
            openSteps ? "open" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setOpenSteps((o) => !o)}
            className="flex w-full items-center justify-between border-b-[3px] border-black bg-[#e6eef8] px-3.5 py-2.5 text-left transition hover:bg-[#f0f5fb]"
          >
            <span className="font-mono text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-[#004aad]">
              Step-by-step review (20 steps)
            </span>
            <span className={`text-[0.7rem] font-black text-neutral-500 transition ${openSteps ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>
          <div className={openSteps ? "max-h-[8000px] overflow-y-auto" : "max-h-0 overflow-hidden"}>
            {FIXED_SEQUENCE_TEMPLATE.map((tpl) => {
              const row = rowsByStep.get(tpl.stepIndex);
              const score = row ? Math.round(Number(row.score)) : 0;
              const st = stepStatus(score);
              const numCls =
                st === "correct"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : st === "partial"
                    ? "border-[#ffcc00] bg-[#ffcc00] text-black"
                    : "border-red-600 bg-red-600 text-white";
              const scTone = scoreTone(score);
              const scCls =
                scTone === "high" ? "text-emerald-600" : scTone === "mid" ? "text-[#004aad]" : "text-red-600";
              const skills = skillsForStep(tpl.stepIndex, tpl.taskType);
              const expanded = expandedStep === tpl.stepIndex;
              return (
                <div key={tpl.stepIndex} className="border-b border-neutral-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setExpandedStep(expanded ? null : tpl.stepIndex)}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition hover:bg-neutral-50"
                  >
                    <span
                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center border-2 font-mono text-[0.5rem] font-extrabold ${numCls}`}
                    >
                      {tpl.stepIndex}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[0.42rem] font-bold uppercase tracking-[0.06em] text-neutral-500">
                        {taskLabel(tpl.taskType)}
                      </p>
                      <p className="truncate text-[0.75rem] font-bold text-neutral-900">
                        Step {tpl.stepIndex} · {tpl.timeLimitSec}s limit
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {skills.map((sk) => (
                        <span
                          key={sk}
                          className={`rounded border px-1 py-0.5 font-mono text-[0.38rem] font-bold uppercase ${skillBadgeClass(sk)}`}
                        >
                          {skillShort(sk)}
                        </span>
                      ))}
                    </div>
                    <span className={`shrink-0 font-mono text-[0.7rem] font-extrabold tabular-nums ${scCls}`}>{score}</span>
                    <span className="shrink-0 text-[0.55rem] text-neutral-400">▼</span>
                  </button>
                  {expanded && row ? (
                    <div className="border-b border-neutral-100 bg-[#fafaf8] px-3.5 py-3 pl-11 text-[0.78rem] leading-relaxed text-neutral-700">
                      <p className={`font-mono text-[0.42rem] font-bold uppercase ${st === "correct" ? "text-emerald-700" : "text-orange-700"}`}>
                        {st === "correct" ? "✓ Strong step" : st === "partial" ? "◆ Mixed" : "✗ Review"}
                      </p>
                      <p className="mt-1 font-semibold text-neutral-800">Saved response (preview)</p>
                      <p className="mt-2 whitespace-pre-wrap break-words">{formatMockAnswerSnippet(row.answer)}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 ? (
          <div className="mt-4 border-2 border-black bg-white px-4 py-3 shadow-[2px_2px_0_0_#111827]">
            <p className="font-mono text-[0.5rem] font-bold uppercase tracking-wide text-[#004aad]">Coach tips</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
              {recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/mock-test/start"
            className="flex min-h-[48px] flex-1 items-center justify-center border-[3px] border-black bg-white px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
          >
            ← Another mock
          </Link>
          <Link
            href="/practice"
            className="flex min-h-[48px] flex-1 items-center justify-center border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-black shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
          >
            Practice hub
          </Link>
        </div>
      </div>
    </div>
  );
}
