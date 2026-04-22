"use client";

import Link from "next/link";
import { useState } from "react";
import {
  REALWORD_DIFFICULTY_LABEL,
  REALWORD_MAX_SCORE,
} from "@/lib/realword-constants";
import { realWordCounts, realWordRunScore } from "@/lib/realword-scoring";
import {
  NOTEBOOK_BUILTIN,
  addNotebookEntry,
  normalizeCategoryIds,
} from "@/lib/notebook-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { RealWordDifficulty, RealWordSet } from "@/types/realword";

function getScoreTone(scorePercent: number): {
  label: string;
  badgeClass: string;
  panelClass: string;
  meterClass: string;
} {
  if (scorePercent >= 85) {
    return {
      label: "Sharp recognition",
      badgeClass: "bg-emerald-200 text-emerald-950",
      panelClass: "bg-[linear-gradient(135deg,#ecfccb_0%,#ffffff_55%,#dcfce7_100%)]",
      meterClass: "bg-emerald-500",
    };
  }
  if (scorePercent >= 60) {
    return {
      label: "Solid progress",
      badgeClass: "bg-amber-200 text-amber-950",
      panelClass: "bg-[linear-gradient(135deg,#fef3c7_0%,#ffffff_55%,#fde68a_100%)]",
      meterClass: "bg-amber-500",
    };
  }
  return {
    label: "Needs another pass",
    badgeClass: "bg-rose-200 text-rose-950",
    panelClass: "bg-[linear-gradient(135deg,#ffe4e6_0%,#ffffff_55%,#fecdd3_100%)]",
    meterClass: "bg-rose-500",
  };
}

export function RealWordReport({
  wordSet,
  difficulty,
  selected,
  hubHref,
  onRedeemNow,
}: {
  wordSet: RealWordSet;
  difficulty: RealWordDifficulty;
  selected: Set<number>;
  hubHref: string;
  onRedeemNow: () => void;
}) {
  const maxScore = REALWORD_MAX_SCORE[difficulty];
  const { R, UR, M } = realWordCounts({ words: wordSet.words, selectedIndices: selected });
  const score = realWordRunScore(UR, M, R, maxScore);
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const selectedCount = selected.size;
  const tone = getScoreTone(scorePercent);
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  const missedReal = wordSet.words.filter((w, i) => w.is_real && !selected.has(i));
  const pickedFake = wordSet.words.filter((w, i) => !w.is_real && selected.has(i));
  const realWords = wordSet.words.filter((w) => w.is_real);

  const addToNotebook = (word: string, explanationThai: string, synonyms: string) => {
    playBlinkBeep();
    addNotebookEntry({
      source: "real-word",
      categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
      titleEn: word,
      titleTh: explanationThai || "—",
      bodyEn: synonyms || "—",
      bodyTh: `Set ${wordSet.setId}`,
      userNote: "",
      excerpt: wordSet.setId,
    });
    setAdded((prev) => new Set(prev).add(word.toLowerCase()));
  };

  const redeemNow = () => {
    playBlinkBeep();
    onRedeemNow();
  };

  const redeemLater = () => {
    playBlinkBeep();
  };

  return (
    <div className="space-y-8">
      <section className={`ep-brutal overflow-hidden rounded-sm border-4 border-black p-0 shadow-[5px_5px_0_0_#000] ${tone.panelClass}`}>
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="border-b-4 border-black p-6 lg:border-b-0 lg:border-r-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-ep-blue">
                  Learning report
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-wide text-neutral-900">
                  {REALWORD_DIFFICULTY_LABEL[difficulty]} real-word check
                </p>
                <p className="mt-1 text-xs font-bold text-neutral-600">{wordSet.setId}</p>
              </div>
              <span className={`border-4 border-black px-3 py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_#000] ${tone.badgeClass}`}>
                {tone.label}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4">
              <p
                className="text-6xl font-black tabular-nums tracking-tight text-neutral-900 sm:text-7xl"
                style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
              >
                {Math.round(score)}
                <span className="ml-2 text-2xl font-bold text-neutral-400 sm:text-3xl">/{maxScore}</span>
              </p>
              <div className="mb-2 border-4 border-black bg-white px-3 py-2 shadow-[3px_3px_0_0_#000]">
                <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Accuracy</p>
                <p className="text-2xl font-black text-neutral-900">{scorePercent}%</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-5 overflow-hidden border-4 border-black bg-white">
                <div
                  className={`h-full transition-[width] duration-500 ${tone.meterClass}`}
                  style={{ width: `${Math.max(0, Math.min(100, scorePercent))}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-bold text-neutral-700">
                You found {UR} of {R} real words. Fake-word penalties: {M}.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="ep-brutal border-4 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Words tapped</p>
              <p className="mt-2 text-4xl font-black text-neutral-900">{selectedCount}</p>
              <p className="mt-1 text-xs font-bold text-neutral-600">Total choices you made this round.</p>
            </div>
            <div className="ep-brutal border-4 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Real found</p>
              <p className="mt-2 text-4xl font-black text-ep-blue">{UR}</p>
              <p className="mt-1 text-xs font-bold text-neutral-600">Authentic words identified correctly.</p>
            </div>
            <div className="ep-brutal border-4 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Missed real</p>
              <p className="mt-2 text-4xl font-black text-amber-700">{missedReal.length}</p>
              <p className="mt-1 text-xs font-bold text-neutral-600">Good words that slipped by this time.</p>
            </div>
            <div className="ep-brutal border-4 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Trap clicks</p>
              <p className="mt-2 text-4xl font-black text-red-700">{pickedFake.length}</p>
              <p className="mt-1 text-xs font-bold text-neutral-600">Fake words selected by mistake.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">Missed real words</h2>
            <span className="border-2 border-black bg-amber-100 px-2 py-1 text-xs font-black">
              {missedReal.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600">These were authentic but not selected.</p>
          <div className="mt-4">
            {missedReal.length === 0 ? (
              <div className="border-4 border-dashed border-emerald-700 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-900">
                Clean round. You found every real word in this set.
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {missedReal.map((w) => (
                  <li
                    key={w.word}
                    className="border-4 border-amber-700 bg-amber-50 px-3 py-2 text-sm font-black text-neutral-900 shadow-[2px_2px_0_0_#000]"
                  >
                    {w.word}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-red-800">Trap words clicked</h2>
            <span className="border-2 border-black bg-red-100 px-2 py-1 text-xs font-black">
              {pickedFake.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600">These are the fake spellings to watch out for next time.</p>
          <div className="mt-4">
            {pickedFake.length === 0 ? (
              <div className="border-4 border-dashed border-emerald-700 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-900">
                Nice control. You avoided every fake trap word.
              </div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {pickedFake.map((w, i) => (
                  <li
                    key={`${w.word}-fake-${i}`}
                    className="border-4 border-red-700 bg-red-50 px-3 py-2 text-sm font-black text-red-900 shadow-[2px_2px_0_0_#000]"
                  >
                    {w.word}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="ep-brutal rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-ep-blue">Vocabulary deep dive</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Every authentic word in this set, with Thai meaning and synonyms.
            </p>
          </div>
          <div className="border-4 border-black bg-ep-yellow px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]">
            {realWords.length} real words to review
          </div>
        </div>
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {realWords.map((w) => {
            const done = added.has(w.word.toLowerCase());
            return (
              <li
                key={w.word}
                className="border-4 border-black bg-[linear-gradient(180deg,#fafafa_0%,#f5f5f5_100%)] p-4 shadow-[3px_3px_0_0_#000]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl font-black text-neutral-900">{w.word}</p>
                  <span className="ep-stat border-2 border-black bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                    Real
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-800">
                  <span className="font-bold text-ep-blue">TH:</span> {w.explanationThai || "—"}
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  <span className="font-bold">Synonyms:</span> {w.synonyms || "—"}
                </p>
                {done ? (
                  <span className="mt-3 inline-flex items-center gap-1 border-2 border-emerald-700 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                    ✓ In notebook
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToNotebook(w.word, w.explanationThai, w.synonyms)}
                    className="mt-3 border-4 border-black bg-ep-blue px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#000]"
                  >
                    Add to notebook
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={redeemNow}
          className="ep-redeem-pulse flex-1 border-4 border-black bg-ep-yellow py-4 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
        >
          Redeem now
        </button>
        <Link
          href={hubHref}
          onClick={redeemLater}
          className="inline-flex flex-1 items-center justify-center border-4 border-black bg-ep-blue py-4 text-center text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000]"
        >
          Redeem later
        </Link>
      </div>
    </div>
  );
}
