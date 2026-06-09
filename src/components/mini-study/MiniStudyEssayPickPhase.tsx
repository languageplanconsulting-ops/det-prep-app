"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  MiniStudyEssayPickExercise,
  MiniStudyEssayPickSession,
} from "@/lib/mini-study/content";

type Props = { session: MiniStudyEssayPickSession };

export function MiniStudyEssayPickPhase({ session }: Props) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<"A" | "B" | "C" | null>(null);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const ex: MiniStudyEssayPickExercise | undefined = session.exercises[idx];
  const total = session.exercises.length;

  if (done) {
    const numCorrect = results.filter((r) => r.correct).length;
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {numCorrect} / {total} correct
          </h1>
        </div>
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
        >
          ← กลับไปหน้าหลัก
        </Link>
      </main>
    );
  }

  if (!ex) return null;

  const checked = picked !== null;
  const isCorrect = picked === ex.correctLetter;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Session {session.index} · Exercise {idx + 1} / {total}
        </p>
        <h1 className="mt-1 text-base font-black">
          หัวข้อ: <span className="text-[#004AAD]">{ex.topic}</span>
        </h1>
        <p className="mt-2 text-xs leading-6 text-neutral-600">
          เลือก essay ที่ดีที่สุด · ดู checklist 4 ข้อ: stance · Explain ก่อน Example ·
          transitional words · conclusion
        </p>
      </header>

      <div className="space-y-4">
        {ex.options.map((o) => {
          const isPicked = picked === o.letter;
          const isCorrectOption = o.letter === ex.correctLetter;
          const colorClass = checked
            ? isCorrectOption
              ? "border-green-700 bg-green-50"
              : isPicked
                ? "border-red-700 bg-red-50"
                : "border-neutral-300 bg-white"
            : isPicked
              ? "border-[#004AAD] bg-[#eef4ff]"
              : "border-black bg-white hover:bg-neutral-50";
          return (
            <button
              key={o.letter}
              type="button"
              onClick={() => !checked && setPicked(o.letter)}
              disabled={checked}
              className={`block w-full rounded-xl border p-4 text-left shadow-sm ${colorClass}`}
            >
              <p className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Option {o.letter}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-900">
                {o.essayText}
              </p>
            </button>
          );
        })}
      </div>

      {checked ? (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-3 text-sm font-semibold ${
              isCorrect
                ? "border-green-700 bg-green-50 text-green-800"
                : "border-red-700 bg-red-50 text-red-800"
            }`}
          >
            {isCorrect
              ? `✓ Correct — Option ${ex.correctLetter} is the best essay`
              : `✗ Best answer is Option ${ex.correctLetter}`}
          </div>

          <div className="overflow-x-auto rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left">
                  <th className="py-1 pr-3 text-neutral-700">เกณฑ์</th>
                  <th className="py-1 pr-3 text-center">A</th>
                  <th className="py-1 pr-3 text-center">B</th>
                  <th className="py-1 pr-3 text-center">C</th>
                </tr>
              </thead>
              <tbody>
                {ex.analysisRowsTh.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-300">
                    <td className="py-1 pr-3 font-bold">{r.label}</td>
                    <td className="py-1 pr-3 text-center">{r.A}</td>
                    <td className="py-1 pr-3 text-center">{r.B}</td>
                    <td className="py-1 pr-3 text-center">{r.C}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 text-sm leading-7">
            <strong>คำอธิบาย:</strong> {ex.rationaleTh}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResults((p) => [...p, { id: ex.id, correct: isCorrect }]);
                if (idx + 1 >= total) {
                  setDone(true);
                  return;
                }
                setIdx((i) => i + 1);
                setPicked(null);
              }}
              className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
            >
              {idx + 1 >= total ? "จบ" : "ข้อถัดไป →"}
            </button>
          </div>
        </div>
      ) : null}

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        ออกจากบทเรียน
      </Link>
    </main>
  );
}
