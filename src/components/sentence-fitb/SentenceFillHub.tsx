"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPracticeAttempts } from "@/lib/practice-attempts-sync";
import { SFITB_MAX_SCORE, SFITB_SECONDS_PER_ITEM, SFITB_TASK_TYPE, sfitbContentKey } from "@/lib/sentence-fitb";

/** Best score per exam, from attempts on either the website or the app. */
function useBestScores(round: number): Record<number, number> {
  const [best, setBest] = useState<Record<number, number>>({});
  useEffect(() => {
    let cancelled = false;
    void fetchPracticeAttempts(SFITB_TASK_TYPE).then((rows) => {
      const out: Record<number, number> = {};
      for (const r of rows) {
        const key = String(r.detail?.contentKey ?? "");
        const m = /^sentence-fitb:r(\d+):e(\d+)$/.exec(key);
        if (!m || Number(m[1]) !== round) continue;
        const exam = Number(m[2]);
        const s = Math.round(((r.score_pct ?? 0) / 100) * SFITB_MAX_SCORE);
        out[exam] = Math.max(out[exam] ?? 0, s);
      }
      if (!cancelled) setBest(out);
    });
    return () => {
      cancelled = true;
    };
  }, [round]);
  return best;
}

export function SentenceFillHub({ round, exams }: { round: number; exams: { exam: number; levels: string[] }[] }) {
  const best = useBestScores(round);
  const done = Object.keys(best).length;
  return (
    <div className="space-y-6">
      <Link href="/practice" className="text-sm font-bold text-[#004AAD] hover:underline">
        ← ศูนย์ฝึก
      </Link>
      <header className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <span className="rounded-full bg-[#004AAD] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">
          ใหม่ · ตรงกับข้อสอบจริง
        </span>
        <h1 className="mt-3 text-2xl font-black text-slate-900">Fill in the Blanks (ประโยค)</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ข้อสอบ DET ตอนนี้มีส่วน Fill in the Blanks แบบประโยคเดี่ยว: เห็นตัวอักษรแรกของคำ แล้วเติมที่เหลือให้ครบ ข้อละ{" "}
          {SFITB_SECONDS_PER_ITEM} วินาที ต่างจาก “เติมคำในย่อหน้า” แบบเดิม ฝึกคำศัพท์ในบริบท คำที่มักใช้คู่กัน และรูปคำ
        </p>
        <p className="mt-3 text-xs font-bold text-slate-500">
          รอบที่ {round} · {exams.length} ชุด · ชุดละ 8 ประโยค · ทำแล้ว {done}/{exams.length}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {exams.map((e) => {
          const s = best[e.exam];
          return (
            <Link
              key={e.exam}
              href={`/practice/literacy/sentence-fill/${round}/${e.exam}`}
              className={`rounded-xl p-4 ring-1 transition hover:-translate-y-0.5 hover:ring-[#004AAD] ${
                s === undefined ? "bg-white ring-black/5" : s >= SFITB_MAX_SCORE ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200"
              }`}
            >
              <p className="text-xs font-bold text-slate-500">ชุดที่</p>
              <p className="text-2xl font-black text-slate-900">{e.exam}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">
                {s === undefined ? "ยังไม่ได้ทำ" : `${s}/${SFITB_MAX_SCORE}`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
