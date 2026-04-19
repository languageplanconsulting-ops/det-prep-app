"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REALWORD_DIFFICULTIES, REALWORD_ROUND_NUMBERS } from "@/lib/realword-constants";
import { getRealWordRoundStats, loadRealWordVisibleBank } from "@/lib/realword-storage";
import type { RealWordRoundNum } from "@/types/realword";

function formatShortDate(iso: string | null): string {
  if (!iso) return "No attempts yet";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "No attempts yet";
  }
}

export function RealWordRoundsHub() {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-realword-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-realword-storage", refresh);
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
          LITERACY · REAL WORD
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-5xl">
          คัดคำจริงในประโยค <br />
          <span className="text-2xl not-italic text-[#004aad] md:text-3xl">Real Word Detection</span>
        </h1>

        <div className="mt-6 grid gap-6 border-t-4 border-black pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase text-gray-400">
              เทคนิคการจับคำจริง (Strategy):
            </p>
            <ul className="space-y-2 text-sm font-bold">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">1</span>
                <span>อ่านทั้งบรรทัดก่อน แล้วดูว่าคำไหนมีอยู่จริงในภาษาอังกฤษ</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">2</span>
                <span>ระวังคำหลอกที่หน้าตาคล้ายคำจริง แต่สะกดผิดเพียงเล็กน้อย</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">3</span>
                <span>คำที่พลาดบ่อย ให้เก็บลง Notebook เพื่อฝึกสายตาให้แม่นขึ้น</span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-dashed border-black bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-bold italic leading-tight text-gray-500">
              &quot;Spot the authentic English words and ignore the fake traps. This task sharpens spelling accuracy, lexical recognition, and fast pattern judgment for Literacy performance.&quot;
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="border-2 border-black bg-[#ffcc00] px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Spelling + Recognition
              </span>
              <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Fast Visual Scan
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {REALWORD_ROUND_NUMBERS.map((round) => (
          <RoundCard key={`${round}-${v}`} round={round} />
        ))}
      </div>

      <footer className="relative border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_0_#111]">
        <div className="absolute -top-3 left-4 border-2 border-black bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
          TRAP TIP
        </div>
        <p className="mt-1 text-xs font-bold italic leading-tight">
          อย่าดูแค่ความคุ้นตา เพราะคำหลอกมักทำให้เราตอบตามความรีบ ใช้เวลาเพิ่มอีกนิดเพื่อเช็ก{" "}
          <span className="text-[#ffcc00]">การสะกดจริง</span> แล้วคะแนน Literacy จะนิ่งขึ้นมาก
        </p>
      </footer>
    </div>
  );
}

function RoundCard({ round }: { round: RealWordRoundNum }) {
  const bank = loadRealWordVisibleBank();
  let totalSets = 0;
  for (const d of REALWORD_DIFFICULTIES) totalSets += bank[round][d].length;
  const stats = getRealWordRoundStats(round);
  const href = `/practice/literacy/real-word/round/${round}`;
  const hasAttempts = stats.avgPercent != null;
  const avgLabel = hasAttempts ? `${stats.avgPercent}%` : "—";
  const statusLabel = round === 1 ? "Active" : "Ready";
  const cardClassName = round === 1 ? "bg-[#ffcc00]" : "bg-white";

  return (
    <Link
      href={href}
      className={`flex h-full flex-col border-4 border-black p-5 shadow-[8px_8px_0_0_#111] transition duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_#111] ${cardClassName}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase text-black">
          {statusLabel}
        </span>
        <span className="font-mono text-[10px] font-black opacity-40">ROUND 0{round}</span>
      </div>

      <h3 className={`mb-1 text-3xl font-black uppercase italic ${round >= 3 && !hasAttempts ? "text-gray-300" : ""}`}>
        Round {round}
      </h3>
      <p className={`mb-4 text-[11px] font-black leading-tight ${round >= 3 && !hasAttempts ? "opacity-60" : ""}`}>
        {totalSets} ชุดในคลังข้อสอบ <br />
        <span className="text-[#004aad]">({totalSets} SET{totalSets === 1 ? "" : "S"} IN BANK)</span>
      </p>

      <div className="mt-auto space-y-3">
        <div className={`border-2 border-black p-2 ${hasAttempts ? "bg-white" : "bg-gray-50 opacity-40"}`}>
          <p className="font-mono text-[9px] font-black uppercase opacity-50">Avg Score / คะแนนเฉลี่ย</p>
          <p className={`text-3xl font-black ${hasAttempts ? "text-[#004aad]" : "text-black"}`}>{avgLabel}</p>
        </div>
        <div className={`text-[10px] font-bold leading-none ${hasAttempts ? "" : "opacity-30 italic"}`}>
          {hasAttempts ? (
            <>
              <p className="opacity-50">LATEST ATTEMPT / ฝึกล่าสุด</p>
              <p>{formatShortDate(stats.latestAttemptDate)}</p>
            </>
          ) : (
            <p>No attempts yet</p>
          )}
        </div>
      </div>
    </Link>
  );
}
