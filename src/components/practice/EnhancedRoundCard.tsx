"use client";

import Link from "next/link";

/**
 * EnhancedRoundCard — shared round-card UI for every exam-bank hub.
 *
 * Replaces the original inline cards with:
 *  - Progress arc + "X/Y done" so students see how far they are inside the round
 *  - Difficulty breakdown (Easy/Med/Hard with done/total) — addresses choice paralysis
 *  - "Start here" highlight on Round 1 when nobody's started yet
 *  - "🔒 Locked" affordance with reason text instead of mystery-meat fading
 *  - Action-framed empty state ("เริ่มเพื่อตั้งคะแนนแรก ▶") instead of dead "—"
 *  - Time-estimate chip ("≈12 นาที / 5 ข้อ") so habit-building is friction-free
 */

export type DifficultyBreakdown = {
  easy: { done: number; total: number };
  medium: { done: number; total: number };
  hard: { done: number; total: number };
};

export type EnhancedRoundCardProps = {
  href: string;
  round: number;
  /** Total sets across all difficulties in this round. */
  totalSets: number;
  /** Distinct sets the learner has any progress on. */
  setsAttempted: number;
  /** Average best score across attempted sets (0-100), or null when none attempted. */
  avgPercent: number | null;
  /** ISO date of the most recent attempt, or null. */
  latestAttemptDate: string | null;
  /** When true, render a yellow "เริ่มที่นี่" highlight. */
  isRecommended?: boolean;
  /** When set, render as locked: clickable to gate page or show tooltip-style message. */
  lockReason?: string;
  /** Per-difficulty breakdown rendered as Easy/Med/Hard chips. */
  byDifficulty?: DifficultyBreakdown;
  /** Optional minutes per session for the time-estimate chip. */
  estMinPerSet?: number;
};

function formatShortDate(iso: string | null): string {
  if (!iso) return "ยังไม่เคยทำ";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "ยังไม่เคยทำ";
  }
}

/** Tiny progress arc — 36px circle, blue at <80%, green at ≥80%. */
function ProgressRing({
  done,
  total,
  size = 44,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (pct / 100) * circ;
  const isFull = pct >= 80;
  const color = pct === 0 ? "#cbd5e1" : isFull ? "#10b981" : "#004AAD";
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`progress ${done} of ${total}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#e2e8f0"
          strokeWidth={4}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold"
        style={{ color: pct === 0 ? "#94a3b8" : color }}
      >
        {pct}%
      </span>
    </div>
  );
}

function DifficultyChip({
  label,
  emoji,
  done,
  total,
}: {
  label: string;
  emoji: string;
  done: number;
  total: number;
}) {
  const isAllDone = total > 0 && done >= total;
  const hasStarted = done > 0;
  const cls = isAllDone
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : hasStarted
      ? "bg-blue-50 text-blue-800 ring-blue-200"
      : "bg-slate-50 text-slate-500 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${cls}`}
      title={`${label}: ${done}/${total}`}
    >
      <span className="text-[10px]">{emoji}</span>
      <span>
        {done}/{total}
      </span>
    </span>
  );
}

export function EnhancedRoundCard(props: EnhancedRoundCardProps) {
  const {
    href,
    round,
    totalSets,
    setsAttempted,
    avgPercent,
    latestAttemptDate,
    isRecommended,
    lockReason,
    byDifficulty,
    estMinPerSet = 2,
  } = props;

  const hasAttempts = avgPercent != null;
  const isLocked = !!lockReason;
  const estMin = Math.max(1, Math.round(5 * estMinPerSet));

  const baseClass =
    "relative flex h-full flex-col rounded-2xl border bg-white p-5 transition";
  const stateClass = isLocked
    ? "border-slate-200 opacity-60 cursor-not-allowed"
    : isRecommended
      ? "border-[#FFCC00] ring-2 ring-[#FFCC00]/40 shadow-[0_8px_22px_rgba(255,204,0,0.18)] hover:shadow-[0_12px_28px_rgba(255,204,0,0.28)]"
      : "border-slate-200 hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.08)]";

  const inner = (
    <>
      {/* Top row: status pill + round badge */}
      <div className="mb-3 flex items-center justify-between">
        {isLocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            🔒 ล็อก
          </span>
        ) : isRecommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#004AAD]">
            ⭐ เริ่มที่นี่
          </span>
        ) : (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
              hasAttempts
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {hasAttempts ? "ทำแล้ว" : "พร้อมทำ"}
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          รอบ {round}
        </span>
      </div>

      {/* Title + progress ring on right */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Round {round}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            ≈{estMin} นาที / 5 ข้อ
          </p>
        </div>
        <ProgressRing done={setsAttempted} total={totalSets} />
      </div>

      {/* Difficulty chips */}
      {byDifficulty ? (
        <div className="mt-3 flex flex-wrap gap-1">
          <DifficultyChip label="Easy" emoji="🟢" {...byDifficulty.easy} />
          <DifficultyChip label="Medium" emoji="🟡" {...byDifficulty.medium} />
          <DifficultyChip label="Hard" emoji="🔴" {...byDifficulty.hard} />
        </div>
      ) : null}

      {/* Metric + footer */}
      <div className="mt-auto pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          คะแนนเฉลี่ย
        </p>
        {hasAttempts ? (
          <>
            <p className="text-2xl font-bold text-[#004AAD]">
              {avgPercent.toFixed(0)}%
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              ฝึกล่าสุด: {formatShortDate(latestAttemptDate)}
            </p>
          </>
        ) : isLocked ? (
          <>
            <p className="text-sm font-semibold text-slate-500">{lockReason}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-[#004AAD]">
              ▶ เริ่มเพื่อตั้งคะแนนแรก
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {setsAttempted > 0
                ? `${setsAttempted} / ${totalSets} ข้อแล้ว`
                : "ยังไม่เคยทำ"}
            </p>
          </>
        )}
      </div>
    </>
  );

  if (isLocked) {
    return <div className={`${baseClass} ${stateClass}`}>{inner}</div>;
  }

  return (
    <Link href={href} className={`${baseClass} ${stateClass}`}>
      {inner}
    </Link>
  );
}
