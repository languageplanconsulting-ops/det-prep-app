"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { DICTATION_ROUND_NUMBERS } from "@/lib/dictation-constants";
import {
  ensureDictationBankReady,
  getDictationRoundStats,
  loadDictationBank,
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

function RoundCard({ round }: { round: DictationRoundNum }) {
  const bank = loadDictationBank();
  const totalSets = bank[round].easy.length + bank[round].medium.length + bank[round].hard.length;
  const stats = getDictationRoundStats(round);
  const href = `/practice/literacy/dictation/round/${round}`;
  const hasAttempts = stats.avgPercent != null;
  const avgLabel = hasAttempts ? `${stats.avgPercent}%` : "—";
  const statusLabel = hasAttempts ? "Completed" : "Ready";
  const cardClassName = hasAttempts ? "bg-[#ffcc00]" : "bg-white";

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
        {totalSets} ชุดในคลังข้อสอบ <br />
        <span className="text-[#004aad]">({totalSets} SET{totalSets === 1 ? "" : "S"} IN BANK)</span>
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
