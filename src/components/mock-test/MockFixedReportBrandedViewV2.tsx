"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sfxReveal } from "@/lib/exam-sfx";
import type { FixedMockScoredRow } from "@/lib/mock-test/fixed-mock-score-buckets";

/**
 * MockFixedReportBrandedViewV2 — soft-modern admin-only redesign of the mock
 * results report (Cagan + Krug). IDENTICAL prop contract to the original
 * MockFixedReportBrandedView, so it consumes the same already-fetched data.
 * Rendered only for admins from MockFixedResultsClient; users keep the original.
 */

type FixedStepItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
};

type Props = {
  sessionId: string;
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
  targets: { total: number; listening: number; speaking: number; reading: number; writing: number };
  responses: FixedMockScoredRow[];
  stepItems: FixedStepItem[];
  completedAt: string | null;
  recommendations: string[];
};

const TASK_LABEL: Record<string, string> = {
  vocabulary_reading: "Vocabulary (reading)",
  conversation_summary: "Dialogue → summary",
  fill_in_blanks: "Fill in the blank",
  dictation: "Dictation",
  real_english_word: "Real English word",
  interactive_conversation: "Interactive conversation",
  write_about_photo: "Write about photo",
  speak_about_photo: "Speak about photo",
  read_and_write: "Read, then write",
  read_then_speak: "Read, then speak",
  interactive_speaking: "Interactive speaking",
  reading_comprehension: "Reading",
};

function humanizeTask(t: string): string {
  return TASK_LABEL[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function SkillBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (score / 160) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="font-bold" style={{ color }}>
          {score}/160
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function TargetCell({
  label,
  actual,
  target,
  primary,
}: {
  label: string;
  actual: number;
  target: number;
  primary?: boolean;
}) {
  const delta = actual - target;
  const deltaColor = delta >= 0 ? "text-emerald-600" : "text-rose-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${primary ? "text-[#004AAD]" : "text-slate-900"}`}>{actual}</p>
      {target > 0 ? (
        <p className={`text-[10px] font-bold ${deltaColor}`}>
          เป้า {target} · {delta >= 0 ? "+" : ""}
          {delta}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400">—</p>
      )}
    </div>
  );
}

export function MockFixedReportBrandedViewV2({
  total,
  listening,
  speaking,
  reading,
  writing,
  targets,
  responses,
  completedAt,
  recommendations,
}: Props) {
  // Weakest task types (bottom 3 by average score) — used to flag "review" steps.
  const byTask = new Map<string, number[]>();
  for (const r of responses) {
    const prev = byTask.get(r.task_type) ?? [];
    prev.push(Number(r.score ?? 0));
    byTask.set(r.task_type, prev);
  }
  const taskAvg = [...byTask.entries()].map(([t, s]) => ({
    t,
    a: s.reduce((x, y) => x + y, 0) / (s.length || 1),
  }));
  const lowTasks = new Set([...taskAvg].sort((a, b) => a.a - b.a).slice(0, 3).map((x) => x.t));

  const steps = [...responses].sort((a, b) => a.step_index - b.step_index);

  const ringCirc = 2 * Math.PI * 44;
  const ringOffset = ringCirc * (1 - Math.max(0, Math.min(160, total)) / 160);

  // Celebratory chime when the score report reveals (admin + unmuted only).
  useEffect(() => {
    sfxReveal();
  }, []);

  // Outcome-first: the 2 weakest skills + a one-tap route to practise each
  // (Cagan/Brown — the results page must answer "what do I do next?").
  const SKILL_ROUTE: Record<string, { label: string; emoji: string; href: string }> = {
    writing: { label: "Writing", emoji: "✍️", href: "/practice/production/write-about-photo" },
    listening: { label: "Listening", emoji: "👂", href: "/practice/literacy/dictation" },
    reading: { label: "Reading", emoji: "📖", href: "/practice/comprehension/reading" },
    speaking: { label: "Speaking", emoji: "🗣️", href: "/practice/production/speak-about-photo" },
  };
  const weakest = (
    [
      ["writing", writing],
      ["listening", listening],
      ["reading", reading],
      ["speaking", speaking],
    ] as Array<[string, number]>
  )
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([key]) => SKILL_ROUTE[key]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#fff7d1] px-3 py-2 text-xs ring-1 ring-[#FFCC00]">
        <span className="rounded bg-[#004AAD] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFCC00]">
          Admin preview
        </span>
        <span className="font-semibold text-slate-700">Mock results V2 · ผู้ใช้จริงยังเห็นหน้าเดิม</span>
      </div>

      {/* Score hero */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e2e8f0" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#004AAD"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold leading-none text-[#004AAD]">{total}</span>
                <span className="text-[10px] text-slate-500">/ 160</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                DET fixed mock · 20 ขั้น
              </p>
              <h1 className="text-xl font-bold">รายงานผลของคุณ</h1>
              {completedAt ? (
                <p className="mt-1 text-xs text-slate-500">เสร็จเมื่อ {fmtDate(completedAt)}</p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/mock-test/start"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Mock อีกชุด
            </Link>
            <Link
              href="/practice"
              className="rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
            >
              ไปฝึกต่อ
            </Link>
          </div>
        </div>
      </div>

      {/* Next action — what to do next (outcome-first) */}
      <div className="mt-4 rounded-2xl bg-[#004AAD] p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCC00]">
          ทำอะไรต่อให้คะแนนขึ้นเร็วสุด
        </p>
        <p className="mt-1 text-lg font-bold">
          จุดอ่อน:{" "}
          {weakest.map((w, i) => (
            <span key={w.href} className="text-[#FFCC00]">
              {i > 0 ? " และ " : ""}
              {w.label}
            </span>
          ))}
        </p>
        <p className="mt-1 text-sm text-white/85">เก็บ 2 ทักษะนี้ก่อน จะขึ้นถึงเป้าได้เร็วสุด</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {weakest.map((w, i) => (
            <Link
              key={w.href}
              href={w.href}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                i === 0 ? "bg-[#FFCC00] text-[#004AAD]" : "bg-white/15 text-white"
              }`}
            >
              {w.emoji} ฝึก {w.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Targets vs actual */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <TargetCell label="รวม" actual={total} target={targets.total} primary />
        <TargetCell label="Listening" actual={listening} target={targets.listening} />
        <TargetCell label="Speaking" actual={speaking} target={targets.speaking} />
        <TargetCell label="Reading" actual={reading} target={targets.reading} />
        <TargetCell label="Writing" actual={writing} target={targets.writing} />
      </div>

      {/* Skill bars */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold">คะแนนรายทักษะ</p>
        <div className="space-y-3">
          <SkillBar label="🗣️ Speaking" score={speaking} color="#004AAD" />
          <SkillBar label="👂 Listening" score={listening} color="#7c3aed" />
          <SkillBar label="📖 Reading" score={reading} color="#0d9488" />
          <SkillBar label="✍️ Writing" score={writing} color="#ea580c" />
        </div>
      </div>

      {/* Step review */}
      {steps.length ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm font-bold">ทบทวนทีละขั้น ({steps.length} ขั้น)</p>
          <div className="space-y-2">
            {steps.map((s) => {
              const review = lowTasks.has(s.task_type);
              return (
                <div
                  key={s.step_index}
                  className="relative flex items-center justify-between rounded-xl border border-slate-200 bg-white py-2.5 pl-[18px] pr-3.5"
                >
                  <span
                    className="absolute bottom-2.5 left-0 top-2.5 w-1 rounded-full"
                    style={{ background: review ? "#f59e0b" : "#22c55e" }}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      ขั้น {s.step_index + 1} · {humanizeTask(s.task_type)}
                    </p>
                    {review ? (
                      <p className="text-[11px] font-semibold text-amber-600">ควรทบทวน</p>
                    ) : null}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{Math.round(s.score)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Coach tips */}
      {recommendations.length ? (
        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
            D
          </div>
          <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
              <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
            </span>
            <ul className="space-y-1 text-[13px] leading-6 text-slate-800">
              {recommendations.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </main>
  );
}
