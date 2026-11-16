"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { postPracticeAttempt } from "@/lib/practice-attempts-sync";
import { finalizeLatestStudySession } from "@/lib/study-tracker";
import {
  SFITB_MAX_SCORE,
  SFITB_SECONDS_PER_ITEM,
  SFITB_TASK_TYPE,
  sfitbContentKey,
  sfitbIsCorrect,
  sfitbPrefix,
  sfitbRemainderLength,
  sfitbScore,
  type SfitbExam,
} from "@/lib/sentence-fitb";

type Result = { typed: string; correct: boolean; hintUsed: boolean };

const EXERCISE_TYPE = "sentence_fitb";

/**
 * Real-DET "Fill in the Blanks" (sentence): one sentence at a time, 20 s each, no going back,
 * the clock moves you on. Practice extras that the real test doesn't have: a Thai hint (costs half
 * the item) and a full explained report.
 */
export function SentenceFillRunner({ exam }: { exam: SfitbExam }) {
  const total = exam.items.length;
  const [phase, setPhase] = useState<"intro" | "run" | "report">("intro");
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [left, setLeft] = useState(SFITB_SECONDS_PER_ITEM);
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const setId = exam.id;

  const item = exam.items[idx]!;
  const prefix = sfitbPrefix(item);
  const remLen = sfitbRemainderLength(item);
  const [before, after] = item.sentence.split("{blank}");

  useEffect(() => {
    if (phase !== "run") return;
    const endAt = Date.now() + SFITB_SECONDS_PER_ITEM * 1000;
    setLeft(SFITB_SECONDS_PER_ITEM);
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(remain);
    }, 200);
    inputRef.current?.focus();
    return () => window.clearInterval(id);
  }, [phase, idx]);

  const finish = (all: Result[]) => {
    setResults(all);
    setPhase("report");
    const score = sfitbScore(all);
    const correct = all.filter((r) => r.correct).length;
    void postPracticeAttempt({
      taskType: SFITB_TASK_TYPE,
      scorePct: (score / SFITB_MAX_SCORE) * 100,
      detail: { correct, total: all.length, score160: score, contentKey: sfitbContentKey(exam.round, exam.exam) },
    });
    void finalizeLatestStudySession({
      exerciseType: EXERCISE_TYPE,
      setId,
      score,
      completed: true,
      submissionPayload: { answers: all.map((r) => r.typed), hintsUsed: all.map((r) => r.hintUsed) },
      reportPayload: { score, maxScore: SFITB_MAX_SCORE, correct, total: all.length },
    }).catch(() => {
      /* best-effort */
    });
  };

  const next = () => {
    const r: Result = { typed, correct: sfitbIsCorrect(item, typed), hintUsed };
    const all = [...results, r];
    if (idx + 1 >= total) {
      finish(all);
      return;
    }
    setResults(all);
    setIdx(idx + 1);
    setTyped("");
    setHintOpen(false);
    setHintUsed(false);
  };

  // Time's up → whatever is typed is submitted, as on the real test.
  useEffect(() => {
    if (phase === "run" && left === 0) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  const restart = () => {
    setIdx(0);
    setTyped("");
    setResults([]);
    setHintOpen(false);
    setHintUsed(false);
    setPhase("run");
  };

  const score = useMemo(() => sfitbScore(results), [results]);

  if (phase === "intro") {
    return (
      <StudySessionBoundary skill="literacy" exerciseType={EXERCISE_TYPE} setId={setId}>
        <div className="mx-auto max-w-2xl space-y-5">
          <Link href="/practice/literacy/sentence-fill" className="text-sm font-bold text-[#004AAD] hover:underline">
            ← ชุดข้อสอบทั้งหมด
          </Link>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <span className="rounded-full bg-[#004AAD] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#FFCC00]">
              รูปแบบข้อสอบจริงปัจจุบัน
            </span>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Fill in the Blanks · ชุดที่ {exam.exam}</h1>
            <p className="mt-1 text-sm text-slate-600">รอบที่ {exam.round} · {total} ประโยค</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>📝 ประโยคละ 1 คำที่หายไป ให้ตัวอักษรแรกมาแล้ว เติมที่เหลือให้ครบทุกช่อง</li>
              <li>⏱ ข้อละ {SFITB_SECONDS_PER_ITEM} วินาที หมดเวลาระบบส่งให้อัตโนมัติ ย้อนกลับไม่ได้</li>
              <li>🎯 วัดคำศัพท์ในบริบท + รูปคำ (เช่น -ly, -tion, -ing, พหูพจน์)</li>
              <li>💡 กดดูคำใบ้ภาษาไทยได้ แต่ข้อนั้นได้คะแนนครึ่งเดียว (ข้อสอบจริงไม่มีคำใบ้)</li>
            </ul>
            <button
              type="button"
              onClick={() => setPhase("run")}
              className="mt-6 w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90"
            >
              เริ่มทำข้อสอบ →
            </button>
          </div>
        </div>
      </StudySessionBoundary>
    );
  }

  if (phase === "report") {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Fill in the Blanks · ชุดที่ {exam.exam}</p>
          <p className="mt-2 text-5xl font-black text-[#004AAD]">
            {score}
            <span className="text-xl text-slate-400">/{SFITB_MAX_SCORE}</span>
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            ถูก {correct} จาก {results.length} ข้อ
          </p>
        </div>
        {exam.items.map((it, i) => {
          const r = results[i];
          const p = sfitbPrefix(it);
          const [b, a] = it.sentence.split("{blank}");
          return (
            <div
              key={it.id}
              className={`rounded-xl bg-white p-4 ring-1 ${r?.correct ? "ring-emerald-200" : "ring-rose-200"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-500">
                  ข้อ {i + 1} · {it.level}
                </span>
                <span className={`text-xs font-black ${r?.correct ? "text-emerald-700" : "text-rose-700"}`}>
                  {r?.correct ? (r.hintUsed ? "✓ ถูก (ใช้คำใบ้)" : "✓ ถูก") : "✗ ผิด"}
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-7 text-slate-800">
                {b}
                <strong className="rounded bg-emerald-50 px-1 text-emerald-800">{it.answer}</strong>
                {a}
              </p>
              {!r?.correct ? (
                <p className="mt-1 text-sm text-rose-700">
                  คุณตอบ: <span className="font-mono">{r && r.typed.trim() ? p + r.typed.trim() : "(ไม่ได้ตอบ)"}</span>
                </p>
              ) : null}
              <p className="mt-2 text-sm font-bold text-slate-800">
                {it.answer} = {it.meaningTh}
              </p>
              <p className="mt-1 text-sm text-slate-600">{it.explanationTh}</p>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={restart}
            className="flex-1 rounded-xl border-2 border-black bg-white py-3 text-sm font-bold"
          >
            ทำชุดนี้อีกครั้ง
          </button>
          {exam.exam < 50 ? (
            <Link
              href={`/practice/literacy/sentence-fill/${exam.round}/${exam.exam + 1}`}
              className="flex-1 rounded-xl bg-[#004AAD] py-3 text-center text-sm font-bold text-[#FFCC00]"
            >
              ชุดถัดไป →
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const urgent = left <= 5;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl bg-white ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className={`text-sm font-black ${urgent ? "text-rose-600" : "text-slate-800"}`}>
            ⏱ 0:{String(left).padStart(2, "0")} <span className="font-medium text-slate-500">สำหรับข้อนี้</span>
          </p>
          <p className="text-xs font-bold text-slate-500">
            ข้อ {idx + 1}/{total}
          </p>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className={`h-1 transition-all ${urgent ? "bg-rose-500" : "bg-[#004AAD]"}`}
            style={{ width: `${(left / SFITB_SECONDS_PER_ITEM) * 100}%` }}
          />
        </div>
        <div className="px-5 py-10 sm:px-10">
          <h2 className="text-center text-lg font-bold text-slate-800">Complete the sentence with the correct word</h2>
          <p
            className="mt-8 cursor-text text-center text-[17px] leading-[2.4rem] text-slate-800"
            onClick={() => inputRef.current?.focus()}
          >
            {before}
            <span className="mx-1 inline-flex items-center gap-[3px] align-middle">
              {prefix.split("").map((ch, k) => (
                <span key={`p${k}`} className="inline-flex h-8 w-6 items-center justify-center rounded border border-slate-300 bg-slate-50 font-mono text-[15px] text-slate-800">
                  {ch}
                </span>
              ))}
              {Array.from({ length: remLen }, (_, k) => {
                const ch = typed[k];
                const cursor = k === Math.min(typed.length, remLen - 1) && !ch;
                return (
                  <span
                    key={`s${k}`}
                    className={`inline-flex h-8 w-6 items-center justify-center rounded border font-mono text-[15px] ${
                      cursor ? "border-[#1CB0F6] ring-2 ring-[#1CB0F6]/30" : "border-slate-300"
                    } ${ch ? "bg-white text-slate-900" : "bg-white"}`}
                  >
                    {ch ?? ""}
                  </span>
                );
              })}
            </span>
            {after}
          </p>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/[^A-Za-z'-]/g, "").slice(0, remLen))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed.length > 0) next();
            }}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Missing letters"
            className="absolute h-px w-px opacity-0"
          />
          {hintOpen ? (
            <p className="mx-auto mt-6 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
              💡 {item.hintTh}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setHintOpen((v) => !v);
              setHintUsed(true);
              inputRef.current?.focus();
            }}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800"
          >
            💡 คำใบ้ (ได้ครึ่งคะแนน)
          </button>
          <button
            type="button"
            onClick={next}
            disabled={typed.length === 0}
            className="rounded-xl bg-[#1CB0F6] px-8 py-2.5 text-sm font-black uppercase tracking-wide text-white disabled:bg-slate-200 disabled:text-slate-400"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
