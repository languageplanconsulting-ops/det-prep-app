"use client";

import { useMemo, useState } from "react";

import { inlineContentFor } from "@/lib/course-plan/exercise-content";

/**
 * Runs an exercise inside the session, so a learner never leaves the course to
 * answer questions and come back for the report.
 *
 * Covers the three auto-gradable banks: dictation (arrange the tokens),
 * fill-in-the-blank grammar (choose per blank), and real word (spot the correct
 * spelling). Speaking and writing still need their own runners — they are
 * marked as such rather than silently skipped.
 */
export function InlineExercise({
  exerciseKey,
  taskType,
  titleTh,
  gateTh,
  onDone,
  onCancel,
}: {
  exerciseKey: string;
  taskType: string | null;
  titleTh: string;
  gateTh?: string;
  /** correct / total, so the session can apply the gate. */
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
}) {
  const content = useMemo(
    () => inlineContentFor(exerciseKey, taskType),
    [exerciseKey, taskType],
  );

  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [answer, setAnswer] = useState<string[]>([]);

  if (!content) {
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          แบบฝึกนี้ยังทำในหน้านี้ไม่ได้ — ต้องใช้หน้าฝึกเฉพาะทาง (พูด/เขียน/โต้ตอบ)
        </p>
        <button
          type="button"
          onClick={() => onDone(1, 1)}
          className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-black text-white"
        >
          ทำเสร็จแล้ว ทำเครื่องหมายว่าเรียบร้อย
        </button>
      </Frame>
    );
  }

  const total = content.items.length;
  const done = index >= total;

  if (done) {
    const pct = Math.round((correct / total) * 100);
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <div className="py-4 text-center">
          <p className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{pct}%</p>
          <p className="mt-1 text-sm text-slate-600">
            ถูก {correct} จาก {total} ข้อ
          </p>
          {gateTh && <p className="mt-2 text-[11px] text-slate-400">เกณฑ์ผ่าน: {gateTh}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDone(correct, total)}
          className="w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white"
        >
          บันทึกผล แล้วไปต่อ
        </button>
      </Frame>
    );
  }

  function next(wasCorrect: boolean) {
    if (wasCorrect) setCorrect((c) => c + 1);
    setChecked(null);
    setAnswer([]);
    setIndex((i) => i + 1);
  }

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={`${index + 1}/${total}`}>
      {content.kind === "dictation" && (
        <DictationItem
          item={content.items[index]}
          answer={answer}
          setAnswer={setAnswer}
          checked={checked}
          onCheck={(ok) => setChecked(ok)}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "realword" && (
        <RealWordItemView
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => setChecked(ok)}
          onNext={() => next(checked === true)}
        />
      )}
      {content.kind === "grammar" && (
        <GrammarItemView
          item={content.items[index]}
          checked={checked}
          onCheck={(ok) => setChecked(ok)}
          onNext={() => next(checked === true)}
        />
      )}
    </Frame>
  );
}

function Frame({
  title,
  progress,
  onCancel,
  children,
}: {
  title: string;
  progress?: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-2 py-1 text-xs font-bold text-slate-400"
        >
          ← กลับ
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-black text-slate-800">
          {title}
        </p>
        <span className="w-14 text-right text-[11px] font-black text-slate-400">
          {progress ?? ""}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Arrange the scrambled tokens into the sentence. */
function DictationItem({
  item,
  answer,
  setAnswer,
  checked,
  onCheck,
  onNext,
}: {
  item: { answer: string; tokens: string[]; distractors: string[]; hintTh: string };
  answer: string[];
  setAnswer: (a: string[]) => void;
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
}) {
  // Distractors sit after the real tokens in a stable order — no shuffling, so
  // the same item always presents identically.
  const pool = useMemo(() => [...item.tokens, ...item.distractors], [item]);
  const used = new Map<string, number>();
  for (const a of answer) used.set(a, (used.get(a) ?? 0) + 1);

  return (
    <div>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        เรียงคำให้เป็นประโยคที่ถูกต้อง
      </p>

      <div className="mt-3 min-h-[56px] rounded-xl bg-white p-3 ring-1 ring-slate-300">
        <p className="text-[15px] font-bold text-slate-800">
          {answer.length ? answer.join(" ") : <span className="text-slate-300">แตะคำด้านล่าง…</span>}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {pool.map((tok, i) => {
          const avail = pool.filter((t) => t === tok).length - (used.get(tok) ?? 0);
          return (
            <button
              key={`${tok}-${i}`}
              type="button"
              disabled={checked !== null || avail <= 0}
              onClick={() => setAnswer([...answer, tok])}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-30"
            >
              {tok}
            </button>
          );
        })}
      </div>

      {answer.length > 0 && checked === null && (
        <button
          type="button"
          onClick={() => setAnswer(answer.slice(0, -1))}
          className="mt-2 text-[11px] font-bold text-slate-400"
        >
          ↩︎ ลบคำสุดท้าย
        </button>
      )}

      <Verdict
        checked={checked}
        correctText={item.answer}
        hintTh={item.hintTh}
        onCheck={() => onCheck(answer.join(" ") === item.answer)}
        canCheck={answer.length > 0}
        onNext={onNext}
      />
    </div>
  );
}

/** Which spelling is the real word? */
function RealWordItemView({
  item,
  checked,
  onCheck,
  onNext,
}: {
  item: { word: string; misspelling: string; meaningTh: string };
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  // Stable order: alphabetical, so the answer is not always in the same slot
  // but is also never random between attempts.
  const options = useMemo(
    () => [item.word, item.misspelling].sort((a, b) => a.localeCompare(b)),
    [item],
  );

  return (
    <div>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        คำไหนสะกดถูก?
      </p>
      <div className="mt-3 space-y-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={checked !== null}
            onClick={() => setPicked(o)}
            className={`w-full rounded-xl px-4 py-3 text-left text-[15px] font-bold ring-1 transition ${
              picked === o
                ? "bg-sky-50 text-sky-900 ring-sky-400"
                : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"
            } disabled:opacity-70`}
          >
            {o}
          </button>
        ))}
      </div>
      <Verdict
        checked={checked}
        correctText={`${item.word} — ${item.meaningTh}`}
        onCheck={() => onCheck(picked === item.word)}
        canCheck={picked !== null}
        onNext={onNext}
      />
    </div>
  );
}

/** Five blanks: the first letters are given, the learner types the rest. */
function GrammarItemView({
  item,
  checked,
  onCheck,
  onNext,
}: {
  item: {
    titleEn: string;
    passage: string;
    passageTh: string;
    blanks: {
      correctWord: string;
      clueTh: string;
      prefixLength: number;
      synonyms?: string[];
      explanationThai: string;
    }[];
  };
  checked: boolean | null;
  onCheck: (ok: boolean) => void;
  onNext: () => void;
}) {
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [hintFor, setHintFor] = useState<number | null>(null);
  const allTyped = item.blanks.every((_, i) => (typed[i] ?? "").trim().length > 0);

  const isRight = (i: number) => {
    const b = item.blanks[i];
    const given = b.correctWord.slice(0, b.prefixLength);
    const full = (given + (typed[i] ?? "")).trim().toLowerCase();
    return (
      full === b.correctWord.toLowerCase() ||
      (b.synonyms ?? []).some((s) => s.toLowerCase() === full)
    );
  };

  return (
    <div>
      <p className="text-[13px] font-black text-slate-800">{item.titleEn}</p>
      <p className="text-[11px] text-slate-400">{item.passageTh}</p>
      <p className="mt-2 rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
        {item.passage}
      </p>

      <div className="mt-3 space-y-2.5">
        {item.blanks.map((b, i) => {
          const given = b.correctWord.slice(0, b.prefixLength);
          const ok = checked !== null && isRight(i);
          return (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] font-black text-slate-500">
                  ช่อง {i + 1}
                </span>
                <span
                  className={`flex min-w-0 flex-1 items-center gap-1 rounded-xl px-3 py-2 ring-1 ${
                    checked === null
                      ? "bg-white ring-slate-300"
                      : ok
                        ? "bg-emerald-50 ring-emerald-300"
                        : "bg-rose-50 ring-rose-300"
                  }`}
                >
                  <span className="shrink-0 text-[14px] font-black text-slate-400">{given}</span>
                  <input
                    value={typed[i] ?? ""}
                    disabled={checked !== null}
                    onChange={(e) => setTyped({ ...typed, [i]: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-slate-800 outline-none"
                    placeholder="…"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => setHintFor(hintFor === i ? null : i)}
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-slate-400"
                >
                  💡
                </button>
              </div>
              {hintFor === i && checked === null && (
                <p className="ml-16 mt-1 text-[11px] text-slate-500">{b.clueTh}</p>
              )}
              {checked !== null && (
                <p className="ml-16 mt-1 text-[11px] text-slate-500">
                  <strong>{b.correctWord}</strong> — {b.explanationThai}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Verdict
        checked={checked}
        correctText={item.blanks.map((b, i) => `${i + 1}. ${b.correctWord}`).join("  ·  ")}
        onCheck={() => onCheck(item.blanks.every((_, i) => isRight(i)))}
        canCheck={allTyped}
        onNext={onNext}
      />
    </div>
  );
}

/** Shared check / result / next footer. */
function Verdict({
  checked,
  correctText,
  hintTh,
  canCheck,
  onCheck,
  onNext,
}: {
  checked: boolean | null;
  correctText: string;
  hintTh?: string;
  canCheck: boolean;
  onCheck: () => void;
  onNext: () => void;
}) {
  if (checked === null) {
    return (
      <button
        type="button"
        disabled={!canCheck}
        onClick={onCheck}
        className="mt-4 w-full rounded-full bg-[#004AAD] py-3 text-sm font-black text-white disabled:opacity-30"
      >
        ตรวจคำตอบ
      </button>
    );
  }
  return (
    <div className="mt-4">
      <div
        className={`rounded-2xl p-3.5 ring-1 ${
          checked
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : "bg-rose-50 text-rose-900 ring-rose-200"
        }`}
      >
        <p className="text-sm font-black">{checked ? "ถูกต้อง! 🎉" : "ยังไม่ถูก"}</p>
        <p className="mt-1 text-[12px]">
          <strong>เฉลย:</strong> {correctText}
        </p>
        {!checked && hintTh && <p className="mt-1 text-[11px] opacity-80">💡 {hintTh}</p>}
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-black text-white"
      >
        ข้อต่อไป →
      </button>
    </div>
  );
}
