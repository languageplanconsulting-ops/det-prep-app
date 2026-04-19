"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DIALOGUE_SUMMARY_ROUND_NUMBERS } from "@/lib/dialogue-summary-constants";
import { getDialogueSummaryRoundStats, loadDialogueSummaryVisibleBank } from "@/lib/dialogue-summary-storage";
import type { DialogueSummaryRoundNum } from "@/types/dialogue-summary";

function formatShortDate(iso: string | null): string {
  if (!iso) return "No data";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "No data";
  }
}

function getStatusMeta(totalSets: number, avgPercent: number | null) {
  if (totalSets === 0) {
    return {
      label: "Locked",
      pillClassName: "bg-black text-white",
      cardClassName: "bg-gray-200 opacity-60 grayscale cursor-not-allowed",
      uploadedLabel: "Coming soon",
      uploadedSubLabel: "เร็วๆ นี้",
      scoreLabel: "—",
      scoreClassName: "text-neutral-500",
      latestLabel: "No data",
      disabled: true,
    };
  }

  if (avgPercent != null) {
    return {
      label: "Completed",
      pillClassName: "bg-white text-black",
      cardClassName: "bg-[#ffcc00]",
      uploadedLabel: `${totalSets} set(s) uploaded`,
      uploadedSubLabel: "ชุดข้อสอบพร้อมใช้งาน",
      scoreLabel: `${avgPercent}%`,
      scoreClassName: "text-[#004aad]",
      latestLabel: null,
      disabled: false,
    };
  }

  return {
    label: "Open",
    pillClassName: "bg-white text-black",
    cardClassName: "bg-[#ffcc00]",
    uploadedLabel: `${totalSets} set(s) uploaded`,
    uploadedSubLabel: "ชุดข้อสอบพร้อมใช้งาน",
    scoreLabel: "—",
    scoreClassName: "text-neutral-700",
    latestLabel: null,
    disabled: false,
  };
}

export function DialogueSummaryRoundsHub() {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dialogue-summary-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dialogue-summary-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

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
          LISTENING · DIALOGUE → SUMMARY
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-5xl">
          เลือกชุดฝึกซ้อม <br />
          <span className="not-italic text-[#004aad]">Choose a Round</span>
        </h1>

        <div className="mt-6 grid gap-6 border-t-4 border-black pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-2">
            <p className="text-sm font-black uppercase text-gray-400">
              วิธีทำแบบฝึกหัด (How to practice):
            </p>
            <ul className="space-y-1 text-sm font-bold">
              <li className="flex gap-2">
                <span>1.</span>
                <span>อ่านสถานการณ์และบทสนทนา</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>เขียนสรุปใจความ (ขั้นต่ำ 20 คำ)</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>รับ Feedback ภาษาไทย/อังกฤษ ทันที</span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-dashed border-black bg-gray-50 p-4">
            <p className="text-[11px] font-bold italic leading-tight text-gray-500">
              &quot;Graded out of 160 points. Averages use your best score per set. The date shown is your most recent attempt in that specific round.&quot;
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DIALOGUE_SUMMARY_ROUND_NUMBERS.map((round) => (
          <RoundCard key={`${round}-${v}`} round={round} />
        ))}
      </div>

      <footer className="border-4 border-black bg-black p-4 text-white shadow-[8px_8px_0_0_#111]">
        <p className="text-xs font-bold italic leading-tight">
          <span className="uppercase text-[#ffcc00]">Tip:</span> คะแนนเฉลี่ย (Avg Score) จะคำนวณจากคะแนนที่ดีที่สุดในแต่ละชุดข้อสอบของคุณ
          ฝึกซ้ำเพื่อเพิ่มความแม่นยำได้ไม่จำกัด!
        </p>
      </footer>
    </div>
  );
}

function RoundCard({ round }: { round: DialogueSummaryRoundNum }) {
  const bank = loadDialogueSummaryVisibleBank();
  const totalSets = bank[round].easy.length + bank[round].medium.length + bank[round].hard.length;
  const stats = getDialogueSummaryRoundStats(round);
  const status = getStatusMeta(totalSets, stats.avgPercent);

  const cardBody = (
    <>
      <div className="mb-4 flex items-start justify-between">
        <span className={`border-2 border-black px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${status.pillClassName}`}>
          {status.label}
        </span>
        <span className="font-mono text-[10px] font-black opacity-40">SET 0{round}</span>
      </div>

      <h3 className="mb-1 text-3xl font-black uppercase italic">Round {round}</h3>
      <p className="mb-4 border-b-2 border-black/10 pb-2 text-[10px] font-black uppercase">
        {status.uploadedLabel}
        <br />
        <span className="font-bold text-[#004aad]">({status.uploadedSubLabel})</span>
      </p>

      {status.disabled ? (
        <div className="mt-auto flex justify-center">
          <span className="text-4xl opacity-20">🔒</span>
        </div>
      ) : (
        <div className="mt-auto space-y-3">
          <div className={`border-2 border-black bg-white p-2 ${stats.avgPercent == null ? "opacity-60" : ""}`}>
            <p className="font-mono text-[9px] font-black uppercase opacity-50">
              Avg Score / คะแนนเฉลี่ย
            </p>
            <p className={`text-3xl font-black ${status.scoreClassName}`}>{status.scoreLabel}</p>
          </div>
          <div className={`text-[10px] font-bold ${stats.latestAttemptDate ? "" : "opacity-50"}`}>
            <p className="opacity-50">LATEST ATTEMPT / ฝึกล่าสุด</p>
            <p>{formatShortDate(stats.latestAttemptDate)}</p>
          </div>
        </div>
      )}
    </>
  );

  if (status.disabled) {
    return (
      <div className={`flex h-full flex-col border-4 border-black p-5 shadow-[8px_8px_0_0_#111] ${status.cardClassName}`}>
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      href={`/practice/listening/dialogue-summary/round/${round}`}
      className={`flex h-full flex-col border-4 border-black p-5 shadow-[8px_8px_0_0_#111] transition duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#111] ${status.cardClassName}`}
    >
      {cardBody}
    </Link>
  );
}
