"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EnhancedRoundCard } from "@/components/practice/EnhancedRoundCard";
import { HubMomentumStrip } from "@/components/practice/HubMomentumStrip";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { DICTATION_ROUND_NUMBERS } from "@/lib/dictation-constants";
import {
  ensureDictationBankReady,
  getDictationRoundStats,
} from "@/lib/dictation-storage";
import type { DictationRoundNum } from "@/types/dictation";

function formatShortDate(iso: string | null): string {
  if (!iso) return "No attempts yet";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "No attempts yet";
  }
}

export function DictationRoundsHub() {
  // soft Brown UI promoted to default for all users (was admin-only)
  const soft = true;
  const [v, setV] = useState(0);
  const [bankReady, setBankReady] = useState(false);

  useEffect(() => {
    void ensureDictationBankReady().then(() => setBankReady(true));
  }, []);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dictation-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dictation-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!bankReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LuxuryLoader label="Loading dictation bank…" />
      </div>
    );
  }

  // "Start here" recommendation:
  // - Surface the first round the learner hasn't started yet
  // - When every round has progress, no recommendation (badge falls back to ทำแล้ว/พร้อมทำ)
  // Reads stats once; tied to `v` so reload events bust the cache.
  const recommendedRound: DictationRoundNum | null = (() => {
    void v;
    for (const r of DICTATION_ROUND_NUMBERS) {
      const s = getDictationRoundStats(r);
      if (s.setsAttempted === 0) return r;
    }
    return null;
  })();

  if (soft) {
    // ── Soft-modern admin hub (Brown: outcome-first, not intimidating) ──
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้าฝึก
        </Link>
        <HubMomentumStrip />

        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-2xl text-white">
              🎧
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Literacy · Dictation
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">
                เขียนตามคำบอก{" "}
                <span className="font-semibold text-slate-400">· Listen and type</span>
              </h1>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
              D
            </div>
            <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
                <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
              </span>
              <p className="text-[13px] leading-6 text-slate-800">
                ฟังประโยคให้จบ (ฟังซ้ำได้) → พิมพ์ตาม → <strong>เช็ก Tense / ตัวสะกด</strong> ให้ดีนะครับ ·
                พาร์ทนี้คือการ <strong>ซ่อมประโยคให้ถูกไวยากรณ์</strong> หลังได้ยินเสียง — เพิ่มคะแนน Literacy โดยตรง
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DICTATION_ROUND_NUMBERS.map((round) => (
            <RoundCard
              key={`${round}-${v}`}
              round={round}
              soft
              recommendedRound={recommendedRound}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-10"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, 'Anuphan', sans-serif",
      }}
    >
      <Link
        href="/practice"
        className="font-mono text-xs font-black text-[#004aad] hover:underline"
      >
        ← BACK TO PRACTICE HUB / กลับหน้าหลัก
      </Link>

      <header
        className="relative overflow-hidden border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111] md:p-8"
        style={{
          backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          backgroundColor: "#f3f4f6",
        }}
      >
        <div className="absolute right-0 top-0 border-b-4 border-l-4 border-black bg-[#004aad] px-4 py-1 font-mono text-[10px] text-white">
          LITERACY · DICTATION
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-5xl">
          เขียนตามคำบอก <br />
          <span className="not-italic text-[#004aad]">Listen and Type</span>
        </h1>

        <div className="mt-6 grid gap-6 border-t-4 border-black pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase text-gray-400">
              เทคนิคการทำคะแนน (Strategy):
            </p>
            <ul className="space-y-2 text-sm font-bold">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">1</span>
                <span>ฟังประโยคภาษาอังกฤษ (ฟังซ้ำได้เพื่อความชัวร์)</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">2</span>
                <span>
                  พิมพ์สิ่งที่ได้ยิน และ <span className="text-[#004aad] underline">ตรวจเช็ก Tense / ตัวสะกด</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">3</span>
                <span>ฝึกให้ครบทุกระดับ Easy / Medium / Hard</span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-dashed border-black bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-bold italic leading-tight text-gray-500">
              &quot;Each round contains sets of various difficulties. Averages use your best score as a percent of the set&apos;s maximum. High scores directly boost your Literacy sub-score.&quot;
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="border-2 border-black bg-[#ffcc00] px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Boosts Literacy
              </span>
              <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                120 Sets / Round
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DICTATION_ROUND_NUMBERS.map((round) => (
          <RoundCard key={`${round}-${v}`} round={round} />
        ))}
      </div>

      <footer className="relative border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_0_#111]">
        <div className="absolute -top-3 left-4 border-2 border-black bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
          MINDSET
        </div>
        <p className="mt-1 text-xs font-bold italic leading-tight">
          จำไว้ว่าพาร์ทนี้ไม่ได้วัดแค่หู แต่คือการ{" "}
          <span className="text-[#ffcc00]">ซ่อมประโยคให้ถูกไวยากรณ์</span> หลังจากที่คุณได้ยินเสียง
          (Grammar Correction is the key!)
        </p>
      </footer>
    </div>
  );
}

function RoundCard({
  round,
  soft = false,
  recommendedRound,
}: {
  round: DictationRoundNum;
  soft?: boolean;
  recommendedRound?: DictationRoundNum | null;
}) {
  const stats = getDictationRoundStats(round);
  const href = `/practice/literacy/dictation/round/${round}`;
  const hasAttempts = stats.avgPercent != null;
  const statusLabel = hasAttempts ? "Completed" : "Ready";
  const cardClassName = hasAttempts ? "bg-[#ffcc00]" : "bg-white";
  // The brutalist branch still expects totals for its raw text — keep computed.
  const totalSetsForBrutalist = stats.totalSets;
  const avgLabel = hasAttempts ? `${stats.avgPercent}%` : "—";

  if (soft) {
    return (
      <EnhancedRoundCard
        href={href}
        round={round}
        totalSets={stats.totalSets}
        setsAttempted={stats.setsAttempted}
        avgPercent={stats.avgPercent}
        latestAttemptDate={stats.latestAttemptDate}
        byDifficulty={stats.byDifficulty}
        isRecommended={recommendedRound === round}
        estMinPerSet={2}
      />
    );
  }

  return (
    <Link
      href={href}
      className={`flex h-full flex-col border-4 border-black p-5 shadow-[8px_8px_0_0_#111] transition duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#111] ${cardClassName}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${hasAttempts ? "bg-white text-black" : "bg-gray-100 text-black"}`}>
          {statusLabel}
        </span>
        <span className="font-mono text-[10px] font-black opacity-40">ROUND 0{round}</span>
      </div>

      <h3 className={`mb-1 text-3xl font-black uppercase italic ${hasAttempts ? "" : "text-gray-700"}`}>
        Round {round}
      </h3>
      <p className="mb-4 text-[11px] font-black leading-tight">
        {totalSetsForBrutalist} ชุดในคลังข้อสอบ <br />
        <span className="text-[#004aad]">({totalSetsForBrutalist} SET{totalSetsForBrutalist === 1 ? "" : "S"} IN BANK)</span>
      </p>

      <div className={`mt-auto space-y-3 ${hasAttempts ? "border-t-2 border-black/10 pt-4" : ""}`}>
        <div className={`border-2 border-black p-2 ${hasAttempts ? "bg-white" : "bg-gray-50 opacity-40"}`}>
          <p className="font-mono text-[9px] font-black uppercase opacity-50">Avg Score / คะแนนเฉลี่ย</p>
          <p className={`text-3xl font-black ${hasAttempts ? "text-[#004aad]" : "text-black"}`}>{avgLabel}</p>
        </div>
        <div className={`text-[10px] font-bold ${hasAttempts ? "" : "opacity-30 italic"}`}>
          <p className="opacity-50">LATEST ATTEMPT / ฝึกล่าสุด</p>
          <p>{formatShortDate(stats.latestAttemptDate)}</p>
        </div>
      </div>
    </Link>
  );
}
