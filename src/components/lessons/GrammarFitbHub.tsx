"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  exercisesForLevel,
  GRAMMAR_DIFFICULTY_META,
  GRAMMAR_LEVEL_ORDER,
  GRAMMAR_TOPICS,
  type GrammarDifficulty,
} from "@/lib/grammar-fitb";
import { useLessonUserId } from "@/lib/lesson-user";
import { getLessonProgress, loadLessonProgress, unitKey, type UnitScores } from "@/lib/lessons-progress";

const TOPIC = "grammar-fitb";

/** How many of a level's exercises are recorded as done (unit index = position in exercisesForLevel(level)). */
function levelDone(scores: UnitScores, level: GrammarDifficulty): number {
  const total = exercisesForLevel(level).length;
  let n = 0;
  for (let i = 0; i < total; i++) {
    if (unitKey(TOPIC, level, i) in scores) n += 1;
  }
  return n;
}

export function GrammarFitbHub() {
  const uid = useLessonUserId();
  const [scores, setScores] = useState<UnitScores>(getLessonProgress());

  useEffect(() => {
    let alive = true;
    loadLessonProgress(uid).then((s) => alive && setScores({ ...s }));
    return () => {
      alive = false;
    };
  }, [uid]);

  const totalEx = GRAMMAR_LEVEL_ORDER.reduce((n, l) => n + exercisesForLevel(l).length, 0);
  const doneEx = GRAMMAR_LEVEL_ORDER.reduce((n, l) => n + levelDone(scores, l), 0);
  const pct = totalEx ? Math.round((doneEx / totalEx) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#FFCC00]">บทเรียน · เติมคำในช่องว่าง (ไวยากรณ์)</p>
          <p className="mt-2 text-xl font-black leading-tight">เดินทางฝึกไวยากรณ์ 3 ระดับ</p>
          <p className="mt-2 text-xs text-slate-300">
            {totalEx} ข้อ (5 ช่อง/ข้อ) · แต่ละระดับคละไวยากรณ์ทั้ง {GRAMMAR_TOPICS.length} เรื่อง · เลือกระดับไหนก่อนก็ได้
          </p>
        </div>
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-[#FFCC00] bg-white/5 text-center">
          <span className="text-lg font-black">{pct}%</span>
          <span className="text-[9px] font-bold text-slate-300">{doneEx}/{totalEx}</span>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-indigo-50 p-3.5 text-xs font-semibold leading-relaxed text-indigo-900">
        โจทย์ Fill-in-the-Blank ใน Duolingo English Test คละไวยากรณ์หลายเรื่องในข้อเดียวกัน — ทั้ง tense, passive, adverb,
        คำเชื่อม จึงต้องฝึก “จับสัญญาณ” ว่าแต่ละช่องต้องใช้กฎไหน แต่ละระดับด้านล่างปรับคำศัพท์ตามเป้าหมายคะแนน DET (B1/B2/C1)
        — จะเริ่มจากด่านไหนก่อนก็ได้ตามใจ
      </p>

      <div className="relative mt-8 flex flex-col items-center gap-3 pb-4">
        {/* connecting path line */}
        <div className="pointer-events-none absolute left-1/2 top-10 h-[calc(100%-70px)] w-1 -translate-x-1/2 rounded-full bg-slate-200" />

        {GRAMMAR_LEVEL_ORDER.map((level, idx) => {
          const meta = GRAMMAR_DIFFICULTY_META[level];
          const total = exercisesForLevel(level).length;
          const done = levelDone(scores, level);
          const isComplete = total > 0 && done >= total;
          return (
            <Link key={level} href={`/practice/lessons/grammar-fitb/${level}`} className="w-full">
              <div
                className={`relative z-10 flex w-full items-center gap-4 rounded-2xl border-2 p-5 shadow-sm transition hover:shadow-md active:scale-[0.99] ${
                  isComplete ? "border-emerald-400 bg-emerald-50" : "border-[#FFCC00] bg-white"
                }`}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-4 text-sm font-black ${
                    isComplete ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#004AAD] bg-[#004AAD] text-[#FFCC00]"
                  }`}
                >
                  {isComplete ? "✓" : meta.cefr}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900">
                    ด่านที่ {idx + 1} · {meta.th} <span className="font-bold text-slate-400">({meta.cefr})</span>
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold text-slate-500">เป้าหมาย DET {meta.scoreBand}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`text-sm font-black ${isComplete ? "text-emerald-600" : "text-[#004AAD]"}`}>{done}/{total}</span>
                  <span className="text-xl text-slate-300">›</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">ไวยากรณ์ที่คละอยู่ในทุกระดับ</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {GRAMMAR_TOPICS.map((t) => (
            <span key={t.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {t.icon} {t.th}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">แต่ละข้อต้องเติมถูกครบ 100% ถึงจะนับว่าผ่าน (แก้ข้อที่ผิดจนกว่าจะถูก)</p>
    </div>
  );
}
