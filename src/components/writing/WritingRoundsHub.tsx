"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { WRITING_ROUND_NUMBERS } from "@/lib/writing-constants";
import { countWritingTopicsByRound } from "@/lib/writing-storage";

export function WritingRoundsHub() {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;
  const [, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-writing-topics", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-writing-topics", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const counts = countWritingTopicsByRound();

  if (soft) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-2">
        <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้าฝึก
        </Link>
        <SoftHubHeader
          color="violet"
          icon="📝"
          eyebrow="Production · Read, then write"
          title="อ่านแล้วเขียน"
          subtitle="Read & write (essay)"
          tip={
            <>
              เลือกหัวข้อ แล้ว <strong>วางแผน 1-5 นาที → เขียนอย่างน้อย 50 คำ</strong> ·
              โครง: เลือกข้าง → เหตุผล + ตัวอย่าง → สรุปครับ
            </>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {WRITING_ROUND_NUMBERS.map((r) => {
            const empty = counts[r] === 0;
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
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    รอบ {r}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Round {r}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {empty ? "ยังไม่มีหัวข้อ" : `${counts[r]} หัวข้อให้เลือก`}
                </p>
              </>
            );
            return empty ? (
              <div
                key={r}
                className="flex min-h-[120px] flex-col rounded-2xl border border-slate-200 bg-white p-5 opacity-70"
              >
                {inner}
              </div>
            ) : (
              <Link
                key={r}
                href={`/practice/production/read-and-write/round/${r}`}
                className="flex min-h-[120px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.08)]"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/practice" className="text-sm font-bold text-ep-blue hover:underline">
        ← Practice hub
      </Link>
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Read & write (essay)
        </p>
        <h1 className="mt-2 text-3xl font-black">Choose a round</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Each round lists its own topics. Plan 1–5 minutes, then write at least 50 words.
        </p>
      </header>
      <ul className="space-y-3">
        {WRITING_ROUND_NUMBERS.map((r) => (
          <li key={r}>
            <Link href={`/practice/production/read-and-write/round/${r}`}>
              <BrutalPanel className="hover:bg-ep-yellow/20">
                <p className="text-lg font-extrabold">Round {r}</p>
                <p className="text-sm text-neutral-600">
                  {counts[r]} topic{counts[r] === 1 ? "" : "s"}
                </p>
              </BrutalPanel>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
