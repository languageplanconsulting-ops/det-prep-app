"use client";

import Link from "next/link";

/**
 * Shared admin "score-band mastery" difficulty picker, used across every
 * round→difficulty→sets exam. Each exam computes its 3 bands (from its own
 * progress storage) and passes them in; this renders the consistent mastery
 * checklist: push each band's average accuracy to the 95% gate.
 */

const MASTERY_GATE = 95;

export const DIFFICULTY_THAI: Record<string, string> = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ยาก",
};

export type SoftBandInput = {
  key: string;
  label: string;
  /** sets uploaded for this band */
  total: number;
  /** sets the learner has attempted */
  done: number;
  /** average best-score % over attempted sets, or null if none */
  avgPct: number | null;
  /** DET score cap for the band */
  maxScore: number;
  /** link to the band's sets page */
  href: string;
};

/** Compute one band's {total, done, avgPct} from a per-set progress lookup. */
export function softBandStat(
  setNumbers: number[],
  getProg: (setNumber: number) => { bestScore: number; maxScore: number } | null,
): { total: number; done: number; avgPct: number | null } {
  let done = 0;
  let sum = 0;
  for (const n of setNumbers) {
    const p = getProg(n);
    if (p && p.maxScore > 0) {
      done += 1;
      sum += Math.max(0, Math.min(100, Math.round((p.bestScore / p.maxScore) * 100)));
    }
  }
  return { total: setNumbers.length, done, avgPct: done > 0 ? Math.round(sum / done) : null };
}

type BandState = "mastered" | "active" | "future" | "coming";

export function SoftDifficultyHub({
  round,
  bands,
  backHref,
  subtitle,
}: {
  round: number;
  bands: SoftBandInput[];
  backHref: string;
  subtitle?: string;
}) {
  // Progression: push the lowest not-yet-mastered band first.
  let foundActive = false;
  const states: BandState[] = bands.map((b) => {
    if (b.total === 0) return "coming";
    if (b.avgPct != null && b.avgPct >= MASTERY_GATE) return "mastered";
    if (!foundActive) {
      foundActive = true;
      return "active";
    }
    return "future";
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-[#004AAD]">
        <Link href={backHref} className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#004AAD]">Round {round}</p>
        <h1 className="mt-1 text-[24px] font-bold text-slate-900">เลือกระดับความยาก</h1>
        <p className="mt-1 text-sm text-slate-500">
          {subtitle ?? "ดันความแม่นเฉลี่ยของแต่ละระดับให้ถึง 95% แล้วไต่ขึ้นระดับถัดไป"}
        </p>
      </div>

      <div className="space-y-3">
        {bands.map((b, i) => {
          const s = states[i]!;
          const thai = DIFFICULTY_THAI[b.key] ?? "";
          const gap = b.avgPct != null ? Math.max(0, MASTERY_GATE - b.avgPct) : MASTERY_GATE;
          const badge =
            s === "mastered"
              ? { txt: "เชี่ยวชาญแล้ว ≥95%", cls: "bg-emerald-100 text-emerald-800" }
              : s === "active"
                ? { txt: "✦ ทำต่อนะครับ", cls: "bg-yellow-100 text-yellow-900" }
                : s === "future"
                  ? { txt: "รอคิว", cls: "bg-slate-100 text-slate-500" }
                  : { txt: "ยังไม่มีชุด", cls: "bg-slate-100 text-slate-400" };

          const inner = (
            <>
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                  s === "mastered"
                    ? "bg-emerald-500 text-white"
                    : s === "active"
                      ? "bg-[#FFCC00] text-slate-900"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {s === "mastered" ? "✓" : s === "coming" ? "…" : "🎧"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {b.label} {thai ? <span className="text-slate-400">({thai})</span> : null}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge.cls}`}>
                    {badge.txt}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  เต็ม {b.maxScore} ·{" "}
                  <span className="tabular-nums">
                    ทำแล้ว {b.done}/{b.total} ชุด
                  </span>
                </p>
                {s === "active" && b.avgPct != null ? (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    ความแม่นเฉลี่ย {b.avgPct}% — ขาดอีก {gap}% เพื่อผ่าน 95%
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p
                  className="text-2xl font-black text-[#004AAD] tabular-nums"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  {b.avgPct != null ? `${b.avgPct}%` : "—"}
                </p>
                <p className="text-[10px] font-bold uppercase text-slate-400 tabular-nums">
                  {b.done}/{b.total}
                </p>
              </div>
            </>
          );

          if (b.total === 0) {
            return (
              <div
                key={b.key}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 opacity-60"
              >
                {inner}
              </div>
            );
          }
          return (
            <Link
              key={b.key}
              href={b.href}
              className={`flex items-center gap-4 rounded-2xl border bg-white p-4 transition hover:shadow-md ${
                s === "active" ? "border-[#FFCC00] ring-2 ring-[#FFCC00]/40" : "border-slate-200"
              }`}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
