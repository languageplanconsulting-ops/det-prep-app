"use client";

import Link from "next/link";
import { useLatestDetSubscores, type DetSubscores } from "@/hooks/useLatestDetSubscores";

type Subscore = keyof DetSubscores;

const LABEL_TH: Record<Subscore, string> = {
  literacy: "Literacy",
  comprehension: "Comprehension",
  conversation: "Conversation",
  production: "Production",
};

const ACCENT: Record<Subscore, { bg: string; ring: string; bar: string }> = {
  literacy: { bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500" },
  comprehension: { bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "bg-emerald-500" },
  conversation: { bg: "bg-sky-50", ring: "ring-sky-200", bar: "bg-sky-500" },
  production: { bg: "bg-violet-50", ring: "ring-violet-200", bar: "bg-violet-500" },
};

/**
 * HubBoostsBadge — closes the "Boosts X" payoff loop.
 *
 * The brutalist hubs shouted "BOOSTS LITERACY" but the score itself was
 * invisible — students had to take the promise on faith. This badge shows
 * the relevant DET sub-score (0–160) right next to the hub header so the
 * loop is closed:  "this practice helps Literacy → here's your Literacy now".
 *
 * - Loading: skeleton shimmer
 * - No mock yet: compact CTA to take a Mock Test
 * - Has mock: number + thin progress bar + "ฝึกพาร์ทนี้ ↑ Literacy"
 *
 * Audit item #6.
 */
export function HubBoostsBadge({ subscore }: { subscore: Subscore }) {
  const { loading, scores, source } = useLatestDetSubscores();
  const label = LABEL_TH[subscore];
  const accent = ACCENT[subscore];

  if (loading) {
    return (
      <div
        aria-hidden
        className={`flex items-center gap-3 rounded-2xl ${accent.bg} px-4 py-2.5 ring-1 ${accent.ring}`}
      >
        <div className="h-3 w-24 animate-pulse rounded bg-white/70" />
        <div className="h-3 w-12 animate-pulse rounded bg-white/70" />
      </div>
    );
  }

  if (!scores) {
    // No mock yet — drive the learner to take one so this card stops nagging.
    return (
      <Link
        href="/mock-test"
        className={`group flex items-center justify-between gap-3 rounded-2xl ${accent.bg} px-4 py-2.5 ring-1 ${accent.ring} transition hover:shadow-sm`}
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="font-extrabold text-slate-700">ฝึกพาร์ทนี้ ↑ {label}</span>
          <span className="text-slate-500">— ทำ Mock 1 ครั้งเพื่อดูคะแนน</span>
        </div>
        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 ring-1 ring-slate-200 group-hover:bg-slate-50">
          เริ่ม Mock →
        </span>
      </Link>
    );
  }

  const value = Math.round(scores[subscore]);
  const pct = Math.max(0, Math.min(100, (value / 160) * 100));

  const tooltipText =
    source === "fixed-derived"
      ? `${label} = ค่าเฉลี่ยที่คำนวณจาก Mock ล่าสุด (สูตร DET)`
      : `คะแนน ${label} จาก Mock ครั้งล่าสุด`;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl ${accent.bg} px-4 py-2.5 ring-1 ${accent.ring}`}
      title={tooltipText}
    >
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          ฝึกพาร์ทนี้ ↑ {label}
        </span>
        <span className="text-[11px] text-slate-700">
          ปัจจุบัน {value} / 160
          {source === "fixed-derived" ? (
            <span className="ml-1 text-slate-400">· ประมาณการ</span>
          ) : null}
        </span>
      </div>
      <div className="ml-auto flex h-2 w-24 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 sm:w-32">
        <div
          className={`h-full ${accent.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
