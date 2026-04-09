"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildRedeemSlots,
  dictationScoreFromDiff,
  diffDictationChars,
  mergeRedeemAnswers,
  type CharDisplaySegment,
  type RedeemSlot,
} from "@/lib/dictation-diff";

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
  return (
    <span className="relative mx-0.5 inline-flex align-baseline">
      {slot.isPunctuation ? (
        <span
          className="mr-0.5 inline-flex h-8 w-6 items-center justify-center border-2 border-ep-blue/40 text-[10px] text-ep-blue"
          title="Punctuation missing"
          aria-hidden
        >
          ⁂
        </span>
      ) : null}
      {slot.isWhitespace ? (
        <span
          className="mr-0.5 text-[9px] font-bold uppercase tracking-tighter text-neutral-400"
          title="Whitespace"
        >
          sp
        </span>
      ) : null}
      <span className="relative inline-block">
        {!slot.isPunctuation && slot.hintLetter ? (
          <span
            className="pointer-events-none absolute left-1 top-1/2 z-0 -translate-y-1/2 font-mono text-sm opacity-20 select-none"
            aria-hidden
          >
            {slot.hintLetter}
          </span>
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: `min(100%, ${wch + 1}ch)` }}
          className="relative z-10 max-w-full min-w-0 border-b-4 border-black bg-ep-yellow/15 px-1 py-0.5 font-mono text-sm font-semibold text-neutral-900 outline-none focus:bg-ep-yellow/30"
          aria-label="Fix incorrect segment"
          spellCheck={false}
        />
      </span>
    </span>
  );
}

export function DictationReport({
  expected,
  userText,
  maxScore,
  onPracticeAgain,
  onFixSubmit,
}: {
  expected: string;
  userText: string;
  maxScore: number;
  onPracticeAgain: () => void;
  onFixSubmit: (merged: string, newScore: number) => void;
}) {
  const [redeemDismissed, setRedeemDismissed] = useState(false);
  const [fixValues, setFixValues] = useState<string[]>([]);

  const charDiff = useMemo(() => diffDictationChars(expected, userText), [expected, userText]);
  const score = useMemo(
    () => dictationScoreFromDiff(charDiff.correctChars, charDiff.totalChars, maxScore),
    [charDiff.correctChars, charDiff.totalChars, maxScore],
  );

  const redeem = useMemo(() => buildRedeemSlots(expected, userText), [expected, userText]);
  const inputCount = countInputSlots(redeem.slots);

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
              Type the correct words in the yellow slots. Locked segments are already correct. Punctuation
              slots show ⁂ when a mark is missing.
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
