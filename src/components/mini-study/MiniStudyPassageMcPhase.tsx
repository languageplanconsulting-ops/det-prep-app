"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  MiniStudyPassageMcExercise,
  MiniStudyPassageMcSession,
} from "@/lib/mini-study/content";

type Props = { session: MiniStudyPassageMcSession };

export function MiniStudyPassageMcPhase({ session }: Props) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const ex: MiniStudyPassageMcExercise | undefined = session.exercises[idx];
  const total = session.exercises.length;

  if (done) {
    const num = results.filter((r) => r.correct).length;
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {num} / {total} correct
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
        <h1 className="mt-1 text-base font-black">{ex.question}</h1>
      </header>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-900">
          {ex.passage}
        </p>
      </div>

      <div className="space-y-2">
        {ex.options.map((o) => {
          const isPicked = picked === o.letter;
          const isCorrectOption = o.letter === ex.correctLetter;
          const baseClass =
            "block w-full rounded-xl border px-3 py-2 text-left text-sm";
          const colorClass = checked
            ? isCorrectOption
              ? "border-green-700 bg-green-50"
              : isPicked
                ? "border-red-700 bg-red-50"
                : "border-neutral-300 bg-white text-neutral-500"
            : isPicked
              ? "border-[#004AAD] bg-[#eef4ff] font-bold"
              : "border-black bg-white hover:bg-neutral-50";
          return (
            <button
              key={o.letter}
              type="button"
              onClick={() => !checked && setPicked(o.letter)}
              disabled={checked}
              className={`${baseClass} ${colorClass}`}
            >
              <span className="mr-2 font-black">{o.letter}.</span>
              {o.text}
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
              ? `✓ Correct — ${ex.correctLetter}`
              : `✗ Best answer is ${ex.correctLetter}`}
          </div>
          <div className="space-y-2 rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30 text-sm leading-7">
            <p>
              <strong>คำอธิบาย:</strong>
            </p>
            {ex.options.map((o) => (
              <p key={o.letter}>
                <span
                  className={
                    o.letter === ex.correctLetter ? "text-green-800" : "text-red-800"
                  }
                >
                  {o.letter === ex.correctLetter ? "✅" : "❌"}
                </span>{" "}
                <strong>{o.letter}</strong> — {o.explanationTh}
              </p>
            ))}
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

      <Link
        href="/practice/mini-study"
        className="inline-block text-xs text-neutral-500 underline"
      >
        ออกจากบทเรียน
      </Link>
    </main>
  );
}
