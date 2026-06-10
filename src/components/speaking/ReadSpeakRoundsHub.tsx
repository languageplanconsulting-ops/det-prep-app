"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import { HubMomentumStrip } from "@/components/practice/HubMomentumStrip";
import { HubBoostsBadge } from "@/components/practice/HubBoostsBadge";
import { SPEAKING_ROUND_NUMBERS } from "@/lib/speaking-constants";
import { countSpeakingVisibleTopicsInRound } from "@/lib/speaking-storage";
import type { SpeakingRoundNum } from "@/types/speaking";

export function ReadSpeakRoundsHub() {
  // soft Brown UI promoted to default for all users (was admin-only)
  const soft = true;
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-speaking-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-speaking-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (soft) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-2">
        <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้าฝึก
        </Link>
        <HubMomentumStrip />
        <HubBoostsBadge subscore="production" />
        <SoftHubHeader
          color="violet"
          icon="📑"
          eyebrow="Production · Read, then speak"
          title="อ่านแล้วพูด"
          subtitle="Read, then speak"
          tip={
            <>
              อ่านบทความสั้น แล้วพูดตอบด้วยคำของคุณเอง · เริ่มที่ชุด 1 ได้เลย ·
              ระบบ <strong>ตรวจและให้คะแนนทันที</strong> พร้อมคำแนะนำภาษาไทยครับ
            </>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SPEAKING_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} soft />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <Link href="/practice" className="text-sm font-bold text-ep-blue hover:underline">
        ← Practice hub
      </Link>
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Read, then speak</p>
        <h1 className="mt-2 text-3xl font-black">เลือกชุดข้อสอบ</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          อ่านบทความสั้น แล้วพูดตอบด้วยคำของคุณเอง · เริ่มได้ที่ <strong>ชุดที่ 1</strong> ·
          ระบบจะ <strong>ตรวจและให้คะแนนทันที</strong> พร้อมคำแนะนำเป็นภาษาไทย
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SPEAKING_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round, soft = false }: { round: SpeakingRoundNum; soft?: boolean }) {
  const n = countSpeakingVisibleTopicsInRound(round);
  const empty = n === 0;
  if (soft) {
    const inner = (
      <>
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
              empty ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-500"
            }`}
          >
            {empty ? "เร็วๆ นี้" : "พร้อมทำ"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">รอบ {round}</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Round {round}</h3>
        <p className="mt-1 text-sm text-slate-500">{empty ? "ยังไม่มีหัวข้อ" : `${n} หัวข้อให้เลือก`}</p>
      </>
    );
    return empty ? (
      <div className="flex min-h-[120px] flex-col rounded-2xl border border-slate-200 bg-white p-5 opacity-70">
        {inner}
      </div>
    ) : (
      <Link
        href={`/practice/production/read-and-speak/round/${round}`}
        className="flex min-h-[120px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.08)]"
      >
        {inner}
      </Link>
    );
  }
  return (
    <Link
      href={`/practice/production/read-and-speak/round/${round}`}
      className="ep-interactive ep-brutal flex flex-col rounded-sm border-4 border-black bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {empty ? "COMING SOON" : `${n} topic${n === 1 ? "" : "s"}`}
      </span>
      <span className="ep-stat mt-3 text-xs text-neutral-600">{empty ? "No content yet" : "Open round"}</span>
    </Link>
  );
}
