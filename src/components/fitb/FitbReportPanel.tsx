"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { playNotebookSavedSound } from "@/lib/notebook-save-feedback";
import { FITB_DIFFICULTY_LABEL, fitbMaxScore } from "@/lib/fitb-constants";
import { FITB_CLUE_SCORE_FACTOR } from "@/lib/fitb-scoring";
import {
  NOTEBOOK_BUILTIN,
  addNotebookEntry,
  normalizeCategoryIds,
} from "@/lib/notebook-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { FitbBlankGrade, FitbDifficulty, FitbRoundNum, FitbSet } from "@/types/fitb";

function gradeLabel(g: FitbBlankGrade): string {
  if (g === "exact") return "Exact match";
  if (g === "close") return "Close (1–2 letters off)";
  return "Incorrect";
}

export function FitbReportPanel({
  set,
  round,
  difficulty,
  setNumber,
  grades,
  userAnswers,
  clueUsed,
  detScore,
  onRedeemNow,
}: {
  set: FitbSet;
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  setNumber: number;
  grades: FitbBlankGrade[];
  userAnswers: string[];
  clueUsed: boolean[];
  detScore: number;
  onRedeemNow: () => void;
}) {
  const redeemRef = useRef<HTMLButtonElement>(null);
  const [wordToast, setWordToast] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set());
  const n = set.missingWords.length;
  const maxScore = fitbMaxScore(difficulty);
  const allExact = grades.length === n && grades.every((g) => g === "exact");
  const noClues = !clueUsed.some(Boolean);
  const flawless = allExact && noClues;
  const complete = allExact;
  const hubHref = `/practice/literacy/fill-in-blank/round/${round}/${difficulty}`;

  const flashRedeemButton = () => {
    playBlinkBeep();
    const el = redeemRef.current;
    if (!el) return;
    el.classList.add("ep-fitb-redeem-flash");
    window.setTimeout(() => el.classList.remove("ep-fitb-redeem-flash"), 500);
  };

  const handleRedeemNow = () => {
    flashRedeemButton();
    onRedeemNow();
  };

  const addWordToNotebook = async (blankIndex: number) => {
    const mw = set.missingWords[blankIndex];
    if (!mw) return;
    playBlinkBeep();
    await addNotebookEntry({
      source: "fill-in-blank",
      categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
      titleEn: mw.correctWord,
      titleTh: mw.explanationThai,
      bodyEn: mw.synonyms.length ? mw.synonyms.join(", ") : mw.clue,
      bodyTh: mw.clue,
      userNote: "",
      excerpt: `R${round} ${FITB_DIFFICULTY_LABEL[difficulty]} set ${setNumber} · blank ${blankIndex + 1}`,
    });
    playNotebookSavedSound();
    setWordToast(true);
    window.setTimeout(() => setWordToast(false), 4000);
  };

  const dismissMistake = (i: number) => {
    playBlinkBeep();
    setDismissed((prev) => new Set(prev).add(i));
  };

  return (
    <div className="space-y-6 border-t-4 border-black pt-6">
      {wordToast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[100] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 border-4 border-black bg-white px-4 py-3 text-center text-sm font-bold shadow-[4px_4px_0_0_#000]"
          role="status"
        >
          Saved to notebook — study it later.
        </div>
      ) : null}
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Results</p>
        <p className="mt-2 text-4xl font-black text-neutral-900">
          <span className="text-ep-blue">{Math.round(detScore)}</span>
          <span className="text-neutral-400">/{maxScore}</span>
        </p>
        <p className="ep-stat mt-1 text-sm text-neutral-600">
          DET score · {set.setId} · {set.cefrLevel} · Clue penalty: ×{FITB_CLUE_SCORE_FACTOR} per blank where clue was
          used
        </p>
        {flawless ? (
          <p className="mt-3 border-4 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-900">
            Flawless run — every blank exact and no clues. Bonus vibe unlocked.
          </p>
        ) : null}

        <ul className="mt-6 space-y-4">
          {set.missingWords.map((mw, i) => {
            if (dismissed.has(i)) return null;
            const g = grades[i] ?? "wrong";
            const ok = g === "exact";
            const user = userAnswers[i]?.trim() || "—";
            const close = g === "close";
            const bg = ok ? "bg-emerald-50" : close ? "bg-amber-50" : "bg-red-50";
            return (
              <li key={i} className={`border-4 border-black p-4 shadow-[3px_3px_0_0_#000] ${bg}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-black">
                    Blank {i + 1}:{" "}
                    <span className={ok ? "text-emerald-800" : close ? "text-amber-900" : "text-red-800"}>
                      {gradeLabel(g)}
                    </span>
                    {clueUsed[i] ? (
                      <span className="ml-2 text-xs font-bold text-neutral-600">· clue used</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!ok ? (
                      <button
                        type="button"
                        onClick={() => dismissMistake(i)}
                        className="shrink-0 border-2 border-black bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000]"
                      >
                        I already know this
                      </button>
                    ) : null}
                    <button
                      type="button"
                    onClick={() => void addWordToNotebook(i)}
                      className="shrink-0 border-2 border-black bg-ep-yellow px-2 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000]"
                    >
                      Add to notebook
                    </button>
                  </div>
                </div>
                {!ok ? (
                  <p className="ep-stat mt-2 text-xs text-neutral-700">
                    Your attempt: <span className="font-bold">{user}</span> · Correct:{" "}
                    <span className="font-bold">{mw.correctWord}</span>
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-semibold text-neutral-700">{mw.clue}</p>
                <p className="mt-2 text-sm text-neutral-800">{mw.explanationThai}</p>
                {mw.synonyms.length > 0 ? (
                  <p className="ep-stat mt-2 text-xs text-ep-blue">Synonyms: {mw.synonyms.join(" · ")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          {!complete ? (
            <>
              <button
                ref={redeemRef}
                type="button"
                onClick={handleRedeemNow}
                className="border-4 border-black bg-ep-yellow px-5 py-3 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
              >
                Try again (redeem)
              </button>
              <Link
                href={hubHref}
                onClick={() => playBlinkBeep()}
                className="inline-flex items-center border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:bg-neutral-50"
              >
                Redeem later
              </Link>
            </>
          ) : (
            <Link
              href={hubHref}
              onClick={() => playBlinkBeep()}
              className="inline-flex items-center border-4 border-black bg-ep-blue px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000]"
            >
              Done
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
