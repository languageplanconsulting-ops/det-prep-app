"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminCoachTip } from "@/components/practice/AdminCoachTip";
import { sfxCelebrate, sfxTransition } from "@/lib/exam-sfx";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { DICTATION_SET_COUNT } from "@/lib/dictation-constants";
import {
  buildRedeemSlots,
  dictationScoreFromDiff,
  diffDictationChars,
  mergeRedeemAnswers,
  type CharDisplaySegment,
  type RedeemSlot,
} from "@/lib/dictation-diff";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

/** Word-level diff via LCS — marks which expected words the learner got. */
function wordLevelDiff(expected: string, user: string): Array<{ word: string; ok: boolean }> {
  const norm = (w: string) => w.toLowerCase().replace(/[.,!?;:"']/g, "");
  const e = expected.trim().split(/\s+/).filter(Boolean);
  const u = user.trim().split(/\s+/).filter(Boolean).map(norm);
  const eN = e.map(norm);
  const m = eN.length;
  const n = u.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = eN[i] === u[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (eN[i] === u[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return e.map((word, idx) => ({ word, ok: matched.has(idx) }));
}

function CharLine({ segments }: { segments: CharDisplaySegment[] }) {
  return (
    <p
      className="ep-stat min-w-0 max-w-full text-base leading-relaxed tracking-tight sm:text-lg [overflow-wrap:anywhere] [word-break:break-word]"
      aria-label="Your attempt compared to the answer key"
    >
      {segments.map((seg, i) => {
        if (seg.kind === "match" && seg.ch != null) {
          return (
            <span key={i} className="rounded-sm bg-emerald-100 px-0.5 text-emerald-900">
              {seg.ch === " " ? "\u00a0" : seg.ch}
            </span>
          );
        }
        if (seg.kind === "wrong" && seg.ch != null) {
          return (
            <span key={i} className="rounded-sm bg-red-200 px-0.5 text-red-900">
              {seg.ch === " " ? "\u00a0" : seg.ch}
            </span>
          );
        }
        const ec = seg.expectedCh ?? "";
        const isSpace = ec === " ";
        return (
          <span
            key={i}
            className="inline-block max-w-full min-h-[1.1em] min-w-[0.35em] border-b-2 border-red-600 bg-red-50 px-0.5 align-baseline text-red-700"
            title={isSpace ? "Missing space" : `Missing: ${ec}`}
          >
            {isSpace ? "\u00a0" : "·"}
          </span>
        );
      })}
    </p>
  );
}

function countInputSlots(slots: RedeemSlot[]): number {
  return slots.filter((s) => s.type === "input").length;
}

function inputSlotIndexBefore(slots: RedeemSlot[], idx: number): number {
  return slots.slice(0, idx).filter((s) => s.type === "input").length;
}

function RedeemRow({
  slot,
  value,
  onChange,
}: {
  slot: Extract<RedeemSlot, { type: "input" }>;
  value: string;
  onChange: (v: string) => void;
}) {
  const wch = Math.max(slot.expected.length, 2);
  const peek = slot.expected.replace(/\s/g, "·");
  const ariaHint = slot.isPunctuation
    ? `Type this punctuation: ${slot.expected}`
    : slot.isWhitespace
      ? "Type the missing space or spaces here (use the space bar)."
      : slot.hintLetter
        ? `Retype this word. Hint: it starts with the letter ${slot.hintLetter}.`
        : "Retype the missing or incorrect word.";

  return (
    <span className="mx-0.5 inline-flex max-w-full flex-col gap-0.5 align-baseline">
      {slot.isPunctuation ? (
        <span className="text-[10px] font-bold leading-tight text-ep-blue">
          Punctuation:{" "}
          <kbd className="rounded border border-black/20 bg-white px-1.5 py-0.5 font-mono text-xs text-neutral-900">
            {peek || "—"}
          </kbd>
        </span>
      ) : null}
      {slot.isWhitespace ? (
        <span className="text-[10px] font-bold leading-tight text-neutral-600">
          Space between words (press Space)
        </span>
      ) : null}
      {!slot.isPunctuation && !slot.isWhitespace && slot.hintLetter ? (
        <span className="text-[10px] font-semibold leading-tight text-neutral-600">
          Hint: starts with <span className="font-mono text-neutral-900">{slot.hintLetter}</span>
        </span>
      ) : null}
      {!slot.isPunctuation && !slot.isWhitespace && !slot.hintLetter ? (
        <span className="text-[10px] font-semibold leading-tight text-neutral-600">
          Retype this part
        </span>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={`Expected: ${peek}`}
        style={{ width: `min(100%, ${wch + 2}ch)` }}
        className="max-w-full min-w-[2.5rem] border-b-4 border-black bg-ep-yellow/15 px-1 py-0.5 font-mono text-sm font-semibold text-neutral-900 outline-none focus:bg-ep-yellow/40"
        aria-label={ariaHint}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </span>
  );
}

export function DictationReport({
  expected,
  userText,
  maxScore,
  round,
  difficulty,
  setNumber,
  onPracticeAgain,
  onFixSubmit,
}: {
  expected: string;
  userText: string;
  maxScore: number;
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
  onPracticeAgain: () => void;
  onFixSubmit: (merged: string, newScore: number) => void;
}) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;
  const [showFix, setShowFix] = useState(false);
  const [redeemDismissed, setRedeemDismissed] = useState(false);
  const [fixValues, setFixValues] = useState<string[]>([]);
  const nextSetHref =
    setNumber < DICTATION_SET_COUNT
      ? `/practice/literacy/dictation/round/${round}/${difficulty}/${setNumber + 1}`
      : null;

  useEffect(() => {
    sfxCelebrate("md");
  }, []);

  const charDiff = useMemo(() => diffDictationChars(expected, userText), [expected, userText]);
  const score = useMemo(
    () => dictationScoreFromDiff(charDiff.correctChars, charDiff.totalChars, maxScore),
    [charDiff.correctChars, charDiff.totalChars, maxScore],
  );

  const redeem = useMemo(() => buildRedeemSlots(expected, userText), [expected, userText]);
  const inputCount = countInputSlots(redeem.slots);

  const words = useMemo(() => wordLevelDiff(expected, userText), [expected, userText]);
  const missed = words.filter((w) => !w.ok);
  const correctWords = words.length - missed.length;

  const showRedeem = inputCount > 0 && !redeemDismissed;

  const setFixAt = (inputIdx: number, v: string) => {
    setFixValues((prev) => {
      const next = [...prev];
      next[inputIdx] = v;
      return next;
    });
  };

  useEffect(() => {
    setFixValues((prev) => {
      if (prev.length === inputCount) return prev;
      return Array.from({ length: inputCount }, (_, i) => prev[i] ?? "");
    });
  }, [inputCount]);

  const handleSubmitFix = () => {
    const merged = mergeRedeemAnswers(redeem.slots, fixValues);
    const d = diffDictationChars(expected, merged);
    const newScore = dictationScoreFromDiff(d.correctChars, d.totalChars, maxScore);
    onFixSubmit(merged, newScore);
  };

  const handleGiveUp = () => {
    setRedeemDismissed(true);
  };

  const reopenRedeem = () => {
    setFixValues(Array.from({ length: inputCount }, () => ""));
    setRedeemDismissed(false);
  };

  if (soft) {
    // ── Plan A (clear comparison) + optional Plan B (guided fix) — admins only ──
    return (
      <div className="min-w-0 max-w-full space-y-4">
        {/* score */}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold leading-none text-[#004AAD]">{Math.round(score)}</p>
                <p className="text-xs text-slate-500">/ {maxScore}</p>
              </div>
              <div>
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  {missed.length === 0 ? "เยี่ยมมาก! 🎉" : "ฝึกต่ออีกนิด"}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  ถูก {correctWords} จาก {words.length} คำ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPracticeAgain}
              className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
            >
              ↻ ลองอีกครั้ง
            </button>
          </div>
        </div>

        {/* correct answer + word diff */}
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            ✅ เฉลยที่ถูกต้อง
          </p>
          <p className="rounded-xl bg-emerald-50 p-4 text-lg leading-8 text-slate-900 ring-1 ring-emerald-200 [overflow-wrap:anywhere]">
            {expected}
          </p>

          <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            ✏️ เทียบกับที่คุณพิมพ์
          </p>
          <p className="rounded-xl bg-white p-4 text-lg leading-9 ring-1 ring-slate-200 [overflow-wrap:anywhere]">
            {words.map((w, idx) =>
              w.ok ? (
                <span key={idx} className="text-slate-900">
                  {w.word}{" "}
                </span>
              ) : (
                <span key={idx} className="mx-0.5 rounded bg-rose-100 px-1 text-rose-700">
                  {w.word}{" "}
                </span>
              ),
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">สีแดง = คำที่ขาดหรือพิมพ์ผิด</p>
        </div>

        {/* misses list */}
        {missed.length > 0 ? (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              🎯 จุดที่พลาด ({missed.length})
            </p>
            <ul className="space-y-1.5 text-sm">
              {missed.slice(0, 6).map((w, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-rose-500">✗</span>
                  <span>
                    <strong>{w.word}</strong>
                  </span>
                </li>
              ))}
              {missed.length > 6 ? (
                <li className="text-xs text-slate-400">…และอีก {missed.length - 6} คำ</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <AdminCoachTip>
          ฟังให้จบประโยคก่อนพิมพ์ · ระวัง <strong>-ed ท้ายคำ</strong> และ <strong>comma</strong> —
          2 จุดนี้ทำคะแนนหลุดบ่อยสุด
        </AdminCoachTip>

        {/* actions: retry + optional guided fix (Plan B reuses redeem logic) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPracticeAgain}
            className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
          >
            ↻ ลองอีกครั้ง
          </button>
          {inputCount > 0 && !showFix ? (
            <button
              type="button"
              onClick={() => setShowFix(true)}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              ✍️ แก้ทีละจุดเพื่อเพิ่มคะแนน
            </button>
          ) : null}
          {nextSetHref ? (
            <Link
              href={nextSetHref}
              onClick={() => sfxTransition()}
              className="rounded-xl bg-ep-blue px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              ข้อถัดไป →
            </Link>
          ) : null}
        </div>

        {showFix && inputCount > 0 ? (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#004AAD]">
              แก้ทีละจุด
            </p>
            <p className="mb-3 text-xs text-slate-500">
              กล่องเหลือง = จุดที่ต้องแก้ · ป้ายบอกว่าต้องพิมพ์อะไร (คำ / เว้นวรรค / เครื่องหมาย)
            </p>
            <div className="max-w-full overflow-x-auto rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-end gap-x-1 gap-y-2 font-mono text-base leading-relaxed">
                {redeem.slots.map((slot, idx) => {
                  if (slot.type === "locked") {
                    return (
                      <span
                        key={idx}
                        className="mx-0.5 rounded bg-emerald-100 px-0.5 font-semibold text-emerald-900"
                      >
                        {slot.text}
                      </span>
                    );
                  }
                  const inputPos = inputSlotIndexBefore(redeem.slots, idx);
                  return (
                    <RedeemRow
                      key={idx}
                      slot={slot}
                      value={fixValues[inputPos] ?? ""}
                      onChange={(v) => setFixAt(inputPos, v)}
                    />
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSubmitFix}
                className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
              >
                ส่งการแก้ไข
              </button>
              <button
                type="button"
                onClick={() => setShowFix(false)}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                ปิด
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="ep-brutal min-w-0 max-w-full rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-4 border-black pb-4">
          <div className="min-w-0">
            <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Report</p>
            <p className="mt-1 text-3xl font-black text-neutral-900">
              Score{" "}
              <span className="text-ep-blue">
                {score}/{maxScore}
              </span>
            </p>
            <p className="ep-stat mt-1 text-xs text-neutral-500">
              Correct characters ÷ answer length × level max. Capitalization and full stops are ignored;
              commas must match.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onPracticeAgain}
              className="border-4 border-black bg-white px-4 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] hover:bg-neutral-50"
            >
              Practice again
            </button>
          </div>
        </div>

        <div className="mt-6 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Your attempt</p>
          <div className="mt-2 min-w-0 max-w-full overflow-x-auto rounded-sm border-2 border-neutral-200 bg-neutral-50/90 p-3 [-webkit-overflow-scrolling:touch]">
            <CharLine segments={charDiff.segments} />
          </div>
        </div>

        {inputCount > 0 ? (
          <div className="mt-6 min-w-0 border-t-4 border-dashed border-neutral-300 pt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-ep-blue">Redeem your score</p>
            <p className="ep-stat mt-1 text-xs text-neutral-600">
              Green text is already correct. Yellow boxes are only what needs fixing — each label says what to
              type (word hint, space, or punctuation mark).
            </p>

            {showRedeem ? (
              <>
                <div className="mt-4 min-w-0 max-w-full overflow-x-auto rounded-sm border-2 border-black/10 bg-white p-3 [-webkit-overflow-scrolling:touch]">
                  <div className="flex min-w-0 flex-wrap items-end gap-x-1 gap-y-2 font-mono text-base leading-relaxed">
                    {redeem.slots.map((slot, idx) => {
                      if (slot.type === "locked") {
                        return (
                          <span
                            key={idx}
                            className="mx-0.5 rounded-sm bg-emerald-100 px-0.5 font-semibold text-emerald-900"
                          >
                            {slot.text}
                          </span>
                        );
                      }
                      const inputPos = inputSlotIndexBefore(redeem.slots, idx);
                      return (
                        <RedeemRow
                          key={idx}
                          slot={slot}
                          value={fixValues[inputPos] ?? ""}
                          onChange={(v) => setFixAt(inputPos, v)}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitFix}
                    className="border-4 border-black bg-ep-blue px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    Submit fixes
                  </button>
                  <button
                    type="button"
                    onClick={handleGiveUp}
                    className="border-4 border-dashed border-black bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 shadow-[2px_2px_0_0_#000] hover:bg-neutral-200"
                  >
                    I gave up
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-neutral-600">
                Redeem form hidden. Compare with the answer key below, or try again when you are ready.
                <button
                  type="button"
                  onClick={reopenRedeem}
                  className="ml-2 font-bold text-ep-blue underline underline-offset-2 hover:text-ep-blue/80"
                >
                  Show redeem again
                </button>
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="ep-brutal min-w-0 max-w-full rounded-sm border-4 border-ep-blue bg-ep-yellow/10 p-4 shadow-[4px_4px_0_0_#004aad]">
        <p className="text-xs font-bold uppercase tracking-wide text-ep-blue">Answer key</p>
        <p className="ep-stat mt-2 break-words text-sm text-neutral-800 [overflow-wrap:anywhere]">{expected}</p>
      </div>
    </div>
  );
}
