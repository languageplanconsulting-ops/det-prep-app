"use client";

import { useMemo, useState } from "react";

import { useAdminGateOverride } from "@/hooks/useAdminGateOverride";
import {
  buildCloze,
  chipFits,
  clozeAnswers,
  clozeChoiceAnswers,
  shuffledPool,
  type ChoiceBlank,
} from "@/lib/course-plan/cloze";

/**
 * Rebuild a model answer with two kinds of gap.
 *
 * WORD gaps (every Nth word) come back from a drag/tap pool — a wrong word will
 * not drop in, it flashes and returns, so "filled" always means "correct".
 *
 * CHOICE gaps are the grammar of the sentence: pick "depicts" over "depict" and
 * "depicted", "are working out" over "is working out" and "works out". These are
 * what the exam actually marks, and a drag-the-exact-word gap cannot test them
 * because the correct form is the only chip on offer.
 */
export function ClozeStage({
  essay,
  seed,
  choices = [],
  introTh,
  onComplete,
  continueLabel = "ครบ 100% แล้ว 🎉 ไปต่อ →",
  onProgress,
}: {
  essay: string;
  /** Stable seed for the chip order — normally the item id. */
  seed: string;
  /** Phrases offered as pick-the-right-form gaps. */
  choices?: ChoiceBlank[];
  introTh?: string;
  onComplete: () => void;
  continueLabel?: string;
  onProgress?: (filled: number, total: number) => void;
}) {
  const tokens = useMemo(() => buildCloze(essay, choices), [essay, choices]);
  const answers = useMemo(() => clozeAnswers(tokens), [tokens]);
  const choiceAnswers = useMemo(() => clozeChoiceAnswers(tokens), [tokens]);
  const pool = useMemo(() => shuffledPool(answers, seed), [answers, seed]);
  const override = useAdminGateOverride();

  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [wrongBlank, setWrongBlank] = useState<number | null>(null);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);

  const usedChips = useMemo(() => new Set(Object.values(placed)), [placed]);
  const total = answers.length + choiceAnswers.length;
  const filledCount = Object.keys(placed).length + Object.keys(picked).length;
  const allFilled = filledCount === total;

  function report(nextPlaced: Record<number, number>, nextPicked: Record<number, string>) {
    onProgress?.(Object.keys(nextPlaced).length + Object.keys(nextPicked).length, total);
  }

  function place(blankIndex: number, chipIndex: number) {
    const chip = pool[chipIndex];
    if (!chip) return;
    if (!chipFits(chip.word, answers[blankIndex] ?? "")) {
      setWrongBlank(blankIndex);
      window.setTimeout(() => setWrongBlank((b) => (b === blankIndex ? null : b)), 600);
      setSelectedChip(null);
      return;
    }
    const next = { ...placed, [blankIndex]: chipIndex };
    setPlaced(next);
    setSelectedChip(null);
    report(next, picked);
  }

  function clearBlank(blankIndex: number) {
    const next = { ...placed };
    delete next[blankIndex];
    setPlaced(next);
    report(next, picked);
  }

  function pick(choiceIndex: number, value: string) {
    if (!value) return;
    if (value !== choiceAnswers[choiceIndex]) {
      setWrongChoice(choiceIndex);
      window.setTimeout(() => setWrongChoice((c) => (c === choiceIndex ? null : c)), 900);
      return;
    }
    const next = { ...picked, [choiceIndex]: value };
    setPicked(next);
    report(placed, next);
  }

  return (
    <div>
      <p className="mt-3 rounded-xl bg-sky-50 p-3 text-[12px] text-sky-900 ring-1 ring-sky-200">
        {introTh ?? "ลากคำด้านล่างมาวางในช่องว่างให้ครบ (หรือแตะคำ แล้วแตะช่อง) — ทุก ๆ คำที่ 3 จะถูกเว้นไว้"}
        {choiceAnswers.length > 0 && (
          <>
            <br />
            <span className="text-[13px] opacity-80">
              ช่องสีม่วงให้เลือก “รูปคำที่ถูก” — ระวังการเติม -s / -es / -ed และประธานเอกพจน์–พหูพจน์
            </span>
          </>
        )}
        <br />
        <span className="text-[13px] opacity-80">คำที่ผิดจะวางไม่ลง ต้องครบ 100% ถึงจะไปต่อได้</span>
      </p>

      <p className="mt-3 rounded-xl bg-white p-3.5 text-[15px] leading-[2.6] text-slate-800 ring-1 ring-slate-300">
        {tokens.map((t, i) => {
          // ---- pick-the-right-form gap ----
          if (t.choiceIndex >= 0) {
            const done = picked[t.choiceIndex] !== undefined;
            const isWrong = wrongChoice === t.choiceIndex;
            return (
              <span key={i}>
                {done ? (
                  <span className="mx-0.5 inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-[14px] font-bold text-violet-900 ring-1 ring-violet-400">
                    {t.word}
                  </span>
                ) : (
                  <select
                    value=""
                    onChange={(e) => pick(t.choiceIndex, e.target.value)}
                    aria-label="เลือกรูปคำที่ถูก"
                    className={`mx-0.5 inline-flex rounded-lg px-1.5 py-0.5 text-[13px] font-bold outline-none ring-1 transition ${
                      isWrong
                        ? "bg-rose-100 text-rose-700 ring-rose-400"
                        : "bg-violet-50 text-violet-900 ring-violet-300"
                    }`}
                  >
                    <option value="">เลือกรูปคำ ▾</option>
                    {(t.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}
                {t.suffix}{" "}
              </span>
            );
          }

          // ---- plain text ----
          if (t.blankIndex < 0) {
            return (
              <span key={i}>
                {t.word}
                {t.suffix}{" "}
              </span>
            );
          }

          // ---- drag/tap word gap ----
          const chipIndex = placed[t.blankIndex];
          const filled = chipIndex !== undefined;
          const isWrong = wrongBlank === t.blankIndex;
          return (
            <span key={i}>
              <button
                type="button"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const ci = Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                  if (!Number.isNaN(ci)) place(t.blankIndex, ci);
                }}
                onClick={() => {
                  if (filled) clearBlank(t.blankIndex);
                  else if (selectedChip !== null) place(t.blankIndex, selectedChip);
                }}
                className={`mx-0.5 inline-flex min-w-[64px] items-center justify-center rounded-lg px-2 py-0.5 text-[14px] font-bold ring-1 transition ${
                  filled
                    ? "bg-emerald-50 text-emerald-900 ring-emerald-300"
                    : isWrong
                      ? "bg-rose-100 text-rose-700 ring-rose-400"
                      : "bg-amber-50 text-amber-900 ring-amber-300"
                }`}
              >
                {filled ? pool[chipIndex]!.word : "____"}
              </button>
              {t.suffix}{" "}
            </span>
          );
        })}
      </p>

      {!allFilled && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pool.map((chip, ci) =>
            usedChips.has(ci) ? null : (
              <button
                key={ci}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(ci))}
                onClick={() => setSelectedChip(selectedChip === ci ? null : ci)}
                className={`cursor-grab rounded-lg px-2.5 py-1.5 text-[13px] font-bold transition active:cursor-grabbing ${
                  selectedChip === ci
                    ? "bg-[#004AAD] text-white ring-2 ring-[#004AAD]"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {chip.word}
              </button>
            ),
          )}
        </div>
      )}

      {allFilled ? (
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-sm font-bold text-white"
        >
          {continueLabel}
        </button>
      ) : (
        <>
          <p className="mt-3 text-center text-[13px] font-bold text-slate-400">
            เหลืออีก {total - filledCount} ช่อง
          </p>
          {override.enabled && (
            <button
              type="button"
              onClick={onComplete}
              className="mt-2 w-full rounded-full bg-amber-500 py-2.5 text-[12px] font-bold text-white"
            >
              ⚡ ข้ามด่านนี้ (admin)
            </button>
          )}
        </>
      )}
    </div>
  );
}
