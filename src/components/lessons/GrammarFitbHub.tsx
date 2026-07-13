"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GRAMMAR_CHAPTERS, GRAMMAR_DIFFICULTY_META, type GrammarDifficulty } from "@/lib/grammar-fitb";
import { useLessonUserId } from "@/lib/lesson-user";
import { getLessonProgress, loadLessonProgress, unitKey, type UnitScores } from "@/lib/lessons-progress";

const TOPIC = "grammar-fitb";

/** How many of a chapter's exercises are recorded as done. */
function chapterDone(scores: UnitScores, chapterId: string, total: number): number {
  let n = 0;
  for (let i = 0; i < total; i++) {
    if (unitKey(TOPIC, chapterId, i) in scores) n += 1;
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

  const totalEx = GRAMMAR_CHAPTERS.reduce((n, c) => n + c.exercises.length, 0);
  const doneEx = GRAMMAR_CHAPTERS.reduce((n, c) => n + chapterDone(scores, c.id, c.exercises.length), 0);
  const pct = totalEx ? Math.round((doneEx / totalEx) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#FFCC00]">บทเรียน · เติมคำในช่องว่าง (ไวยากรณ์)</p>
          <p className="mt-2 text-xl font-black leading-tight">ฝึกไวยากรณ์ผ่านโจทย์เติมคำ</p>
          <p className="mt-2 text-xs text-slate-300">
            {GRAMMAR_CHAPTERS.length} บท · {totalEx} ข้อ (5 ช่อง/ข้อ) · ไล่ระดับ ง่าย → ปานกลาง → ยาก · มีพี่ดอยคอยสอนกฎก่อนทำ
          </p>
        </div>
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-[#FFCC00] bg-white/5 text-center">
          <span className="text-lg font-black">{pct}%</span>
          <span className="text-[9px] font-bold text-slate-300">{doneEx}/{totalEx}</span>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-indigo-50 p-3.5 text-xs font-semibold leading-relaxed text-indigo-900">
        โจทย์ Fill-in-the-Blank ใน Duolingo English Test วัด &ldquo;ไวยากรณ์&rdquo; เป็นหลัก — เลือก tense ให้ถูก ผันกริยาให้เป็น
        และวางคำเชื่อมให้ตรง แต่ละบทด้านล่างจะสอนกฎทีละเรื่อง แล้วให้ลองทำจริงกับย่อหน้าที่มี 5 ช่องว่าง
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {GRAMMAR_CHAPTERS.map((c, idx) => {
          const done = chapterDone(scores, c.id, c.exercises.length);
          const isDone = done >= c.exercises.length;
          return (
            <Link
              key={c.id}
              href={`/practice/lessons/grammar-fitb/${c.id}`}
              className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#004AAD]/40 hover:shadow-md active:scale-[0.99]"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 text-2xl ${
                  isDone ? "border-emerald-500 bg-emerald-50" : "border-[#FFCC00] bg-white"
                }`}
              >
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">บทที่ {idx + 1}</span>
                  {isDone ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">ผ่านครบแล้ว</span>
                  ) : done > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600">กำลังทำ</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate font-display text-base font-black leading-tight text-slate-900">{c.th}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500">{c.tagline}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(["easy", "medium", "hard"] as GrammarDifficulty[]).map((d) => {
                    const num = c.exercises.filter((e) => e.difficulty === d).length;
                    if (!num) return null;
                    return (
                      <span key={d} className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${GRAMMAR_DIFFICULTY_META[d].badge}`}>
                        {GRAMMAR_DIFFICULTY_META[d].th} {num}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs font-black text-[#004AAD]">{done}/{c.exercises.length}</span>
                <span className="text-xl text-slate-300 transition group-hover:translate-x-0.5">›</span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">แต่ละบทมีข้อสอบเติมคำหลายข้อ · เติมถูกให้ครบเพื่อสะสมความคืบหน้า</p>
    </div>
  );
}
