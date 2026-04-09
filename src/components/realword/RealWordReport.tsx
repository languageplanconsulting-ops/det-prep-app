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
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">Learning report</p>
        <p className="mt-1 text-xs font-bold text-neutral-600">
          {wordSet.setId} · {REALWORD_DIFFICULTY_LABEL[difficulty]}
        </p>
        <p
          className="mt-4 text-5xl font-black tabular-nums tracking-tight text-neutral-900"
          style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
        >
          {Math.round(score)}
          <span className="text-2xl font-bold text-neutral-400">/{maxScore}</span>
        </p>
        <p className="ep-stat mt-2 text-sm text-neutral-600">
          Real words in set: {R} · You matched {UR} real · Fake mistakes: {M}
        </p>
      </div>

      <section className="ep-brutal rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-sm font-black uppercase tracking-wide text-neutral-900">Missed & mistakes</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-ep-blue">Real words you did not select</p>
            {missedReal.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">None — you found them all.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {missedReal.map((w) => (
                  <li
                    key={w.word}
                    className="border-4 border-amber-600/40 bg-amber-50 px-3 py-2 text-sm font-bold text-neutral-900"
                  >
                    {w.word}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-red-700">Fake words you selected</p>
            {pickedFake.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">None — no traps clicked.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {pickedFake.map((w, i) => (
                  <li
                    key={`${w.word}-fake-${i}`}
                    className="border-4 border-red-600/50 bg-red-50 px-3 py-2 text-sm font-bold text-red-900"
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
        <h2 className="text-sm font-black uppercase tracking-wide text-ep-blue">Vocabulary deep dive</h2>
        <p className="mt-1 text-xs text-neutral-600">Every authentic word in this set — Thai gloss and synonyms.</p>
        <ul className="mt-4 space-y-4">
          {realWords.map((w) => {
            const done = added.has(w.word.toLowerCase());
            return (
              <li
                key={w.word}
                className="border-4 border-black bg-neutral-50 p-4 shadow-[3px_3px_0_0_#000]"
              >
                <p className="text-xl font-black text-neutral-900">{w.word}</p>
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
