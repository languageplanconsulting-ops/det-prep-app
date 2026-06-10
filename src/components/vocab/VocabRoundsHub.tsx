"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import { VocabExamIntroModal } from "@/components/vocab/VocabExamIntroModal";
import { VocabularyBuilderAvailabilityBanner } from "@/components/vocab/VocabularyBuilderAvailabilityBanner";
import { EnhancedRoundCard } from "@/components/practice/EnhancedRoundCard";
import { VOCAB_ROUND_NUMBERS } from "@/lib/vocab-constants";
import { getVocabRoundStats, loadVocabVisibleBank } from "@/lib/vocab-storage";
import type { VocabRoundNum } from "@/types/vocab";

function formatShortDate(iso: string | null): string {
  if (!iso) return "No attempts yet";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "No attempts yet";
  }
}

export function VocabRoundsHub() {
  // soft Brown UI promoted to default for all users (was admin-only)
  const soft = true;
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-vocab-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-vocab-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const recommendedRound: VocabRoundNum | null = (() => {
    void v;
    for (const r of VOCAB_ROUND_NUMBERS) {
      const s = getVocabRoundStats(r);
      if (s.setsAttempted === 0) return r;
    }
    return null;
  })();

  if (soft) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <VocabExamIntroModal />
        <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้าฝึก
        </Link>
        <SoftHubHeader
          color="emerald"
          icon="📚"
          eyebrow="Comprehension · Vocabulary"
          title="คลังข้อสอบคำศัพท์"
          subtitle="Vocabulary"
          tip={
            <>
              ฝึกเดาคำจากบริบทจริง — ไม่ต้องท่องทีละคำนะครับ · คลังคำจะค่อยๆ โตขึ้น ·
              ตอบผิดคำไหน เก็บลง Notebook ไว้ทบทวน
            </>
          }
        />
        <VocabularyBuilderAvailabilityBanner />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VOCAB_ROUND_NUMBERS.map((round) => (
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
      <VocabExamIntroModal />

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
          COMPREHENSION · VOCABULARY IN CONTEXT
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-5xl">
          คลังข้อสอบคำศัพท์ <br />
          <span className="text-2xl not-italic text-[#004aad] md:text-3xl">Vocabulary Exam Bank</span>
        </h1>

        <div className="mt-6 grid gap-6 border-t-4 border-black pt-6 md:grid-cols-2 md:items-center">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase text-gray-400">
              วิธีเก่งศัพท์แบบไม่ต้องท่อง (Strategy):
            </p>
            <ul className="space-y-2 text-sm font-bold">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">1</span>
                <span>เลือกความยาก (Easy / Medium / Hard) ในแต่ละชุด</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">2</span>
                <span>ทำแบบทดสอบเพื่อดูการใช้คำศัพท์ในบริบทจริง</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] text-white">3</span>
                <span>
                  คำไหนที่ผิด? <span className="text-[#004aad] underline">กด &quot;Add to Notebook&quot;</span> เพื่อไว้ทบทวน
                </span>
              </li>
            </ul>
          </div>
          <div className="border-2 border-dashed border-black bg-gray-50 p-4">
            <p className="mb-2 text-[11px] font-bold italic leading-tight text-gray-500">
              &quot;Five rounds of vocabulary sets. Each set is designed to test your situational word choice. Scores impact both Literacy and Comprehension sub-scores.&quot;
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="border-2 border-black bg-[#ffcc00] px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                Boosts Score
              </span>
              <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase">
                8 Sets / Round
              </span>
            </div>
          </div>
        </div>
      </header>

      <VocabularyBuilderAvailabilityBanner />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {VOCAB_ROUND_NUMBERS.map((round) => (
          <RoundCard key={`${round}-${v}`} round={round} />
        ))}
      </div>

      <footer className="relative border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_0_#111]">
        <div className="absolute -top-3 left-4 border-2 border-black bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
          VOCAB HACK
        </div>
        <p className="mt-1 text-xs font-bold italic leading-tight">
          แทนการท่องจำทีละคำ ให้ฝึกทำโจทย์บ่อยๆ เพื่อให้สมองจำภาพรวมของบริบท และอย่าลืมบันทึกคำที่ตอบผิดลง{" "}
          <span className="text-[#ffcc00]">Personal Notebook</span> เพื่อกลับมาทวนได้แม่นยำขึ้น!
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
  round: VocabRoundNum;
  soft?: boolean;
  recommendedRound?: VocabRoundNum | null;
}) {
  const bank = loadVocabVisibleBank();
  const totalSets = bank[round].length;
  const stats = getVocabRoundStats(round);
  const href = `/practice/comprehension/vocabulary/round/${round}`;
  const hasAttempts = stats.avgPercent != null;
  const avgLabel = hasAttempts ? `${stats.avgPercent}%` : "—";
  const statusLabel = "Ready";
  const cardClassName = round === 1 || hasAttempts ? "bg-[#ffcc00]" : "bg-white";

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
        estMinPerSet={3}
      />
    );
  }

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
        <span className="text-[#004aad]">({totalSets} SET{totalSets === 1 ? "" : "S"} UPLOADED)</span>
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
            <>
              <p>No attempts yet</p>
              <p>ยังไม่มีประวัติการสอบ</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
