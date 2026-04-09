"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FitbReportPanel } from "@/components/fitb/FitbReportPanel";
import {
  assembleFitbAttempt,
  calculateFitbDetScore,
  fitbExpectedPrefix,
  fitbRemainderLength,
  gradeFitbBlank,
} from "@/lib/fitb-scoring";
import { splitFitbPassage } from "@/lib/fitb-passage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import { getFitbProgress, saveFitbProgress } from "@/lib/fitb-storage";
import type { FitbBlankGrade, FitbDifficulty, FitbRoundNum, FitbSet } from "@/types/fitb";

type Phase = "quiz" | "report";

function nextEditableIndex(locked: boolean[], from: number, missingWords: FitbSet["missingWords"]): number {
  for (let j = from + 1; j < locked.length; j++) {
    if (locked[j]) continue;
    if (fitbRemainderLength(missingWords[j]!) > 0) return j;
  }
  return -1;
}

export function FitbSessionClient({
  set,
  round,
  difficulty,
  setNumber,
  startWithRedeem,
}: {
  set: FitbSet;
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  setNumber: number;
  startWithRedeem: boolean;
}) {
  const n = set.missingWords.length;
  const hubHref = `/practice/literacy/fill-in-blank/round/${round}/${difficulty}`;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [phase, setPhase] = useState<Phase>("quiz");
  const [locked, setLocked] = useState<boolean[]>(() => new Array(n).fill(false));
  const [inputs, setInputs] = useState<string[]>(() => new Array(n).fill(""));
  const [clueUsed, setClueUsed] = useState<boolean[]>(() => new Array(n).fill(false));
  const [clueVisible, setClueVisible] = useState<boolean[]>(() => new Array(n).fill(false));

  const [grades, setGrades] = useState<FitbBlankGrade[]>(() => new Array(n).fill("wrong"));
  const [userAnswers, setUserAnswers] = useState<string[]>(() => new Array(n).fill(""));
  const [detScore, setDetScore] = useState(0);

  useEffect(() => {
    const emptyInputs = new Array(n).fill("");
    const emptyClue = new Array(n).fill(false);
    const emptyVis = new Array(n).fill(false);

    if (startWithRedeem) {
      const prog = getFitbProgress(round, difficulty, setNumber);
      const base =
        prog?.lastBlankOk && prog.lastBlankOk.length === n ? [...prog.lastBlankOk] : new Array(n).fill(false);
      setLocked(base);
      setInputs(emptyInputs);
      setClueVisible(emptyVis);
      if (base.every(Boolean) && prog) {
        const g: FitbBlankGrade[] =
          prog.lastGrades && prog.lastGrades.length === n
            ? [...prog.lastGrades]
            : base.map((ok) => (ok ? "exact" : "wrong"));
        const cu =
          prog.lastClueUsed && prog.lastClueUsed.length === n ? [...prog.lastClueUsed] : new Array(n).fill(false);
        const ua =
          prog.lastUserAnswers && prog.lastUserAnswers.length === n
            ? [...prog.lastUserAnswers]
            : set.missingWords.map((mw, i) => (base[i] ? mw.correctWord.trim() : ""));
        setGrades(g);
        setClueUsed(cu);
        setUserAnswers(ua);
        setDetScore(
          calculateFitbDetScore({ grades: g, clueUsed: cu, difficulty }),
        );
        setPhase("report");
      } else {
        setClueUsed(emptyClue);
        setPhase("quiz");
      }
    } else {
      setLocked(new Array(n).fill(false));
      setInputs(emptyInputs);
      setClueUsed(emptyClue);
      setClueVisible(emptyVis);
      setPhase("quiz");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- missingWords tied to set.setId / n
  }, [startWithRedeem, round, difficulty, setNumber, n, set.setId]);

  const segments = useMemo(() => splitFitbPassage(set.passage), [set.passage]);

  const progressPct = useMemo(() => {
    let done = 0;
    for (let i = 0; i < n; i++) {
      if (locked[i]) {
        done += 1;
        continue;
      }
      const rem = fitbRemainderLength(set.missingWords[i]!);
      if (rem === 0) done += 1;
      else if (inputs[i]!.trim().length >= rem) done += 1;
    }
    return n > 0 ? Math.min(100, (done / n) * 100) : 0;
  }, [locked, inputs, n, set.missingWords]);

  const canSubmit = useMemo(() => {
    for (let i = 0; i < n; i++) {
      if (locked[i]) continue;
      const rem = fitbRemainderLength(set.missingWords[i]!);
      if (rem === 0) continue;
      if (inputs[i]!.trim().length !== rem) return false;
    }
    return true;
  }, [locked, inputs, n, set.missingWords]);

  const toggleClue = (i: number) => {
    playBlinkBeep();
    setClueVisible((v) => {
      const nv = [...v];
      nv[i] = !nv[i];
      return nv;
    });
    setClueUsed((u) => {
      if (u[i]) return u;
      const nu = [...u];
      nu[i] = true;
      return nu;
    });
  };

  const updateInput = useCallback(
    (i: number, raw: string) => {
      const rem = fitbRemainderLength(set.missingWords[i]!);
      const next = rem > 0 ? raw.slice(0, rem) : "";
      setInputs((prev) => {
        const cp = [...prev];
        cp[i] = next;
        return cp;
      });
      if (rem > 0 && next.length >= rem) {
        const ni = nextEditableIndex(locked, i, set.missingWords);
        if (ni >= 0) {
          window.requestAnimationFrame(() => inputRefs.current[ni]?.focus());
        }
      }
    },
    [locked, set.missingWords],
  );

  const submitAttempt = () => {
    if (phase !== "quiz" || !canSubmit) return;
    playBlinkBeep();
    const g: FitbBlankGrade[] = [];
    const ua: string[] = [];
    for (let i = 0; i < n; i++) {
      const mw = set.missingWords[i]!;
      if (locked[i]) {
        g.push("exact");
        ua.push(mw.correctWord.trim());
      } else {
        g.push(gradeFitbBlank(mw, inputs[i] ?? ""));
        ua.push(assembleFitbAttempt(mw, inputs[i] ?? ""));
      }
    }
    const score = calculateFitbDetScore({ grades: g, clueUsed, difficulty });
    const nextLocked = g.map((gr) => gr === "exact");
    setGrades(g);
    setUserAnswers(ua);
    setDetScore(score);
    setLocked(nextLocked);
    saveFitbProgress({
      round,
      difficulty,
      setNumber,
      grades: g,
      userAnswers: ua,
      clueUsed: [...clueUsed],
    });
    setPhase("report");
  };

  const onRedeemNow = () => {
    playBlinkBeep();
    const q = locked.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0);
    setInputs(new Array(n).fill(""));
    setClueVisible(new Array(n).fill(false));
    setClueUsed((prev) => prev.map((c, i) => (locked[i] ? c : false)));
    setPhase(q.length === 0 ? "report" : "quiz");
    window.requestAnimationFrame(() => {
      const first = q[0];
      if (first != null && first >= 0) inputRefs.current[first]?.focus();
    });
  };

  return (
    <div className="flex min-h-[min(100vh,920px)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <Link
          href={hubHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Sets
        </Link>
        <p className="ep-stat text-xs text-neutral-500">
          {set.setId} · {set.cefrLevel} · {n} blank{n === 1 ? "" : "s"}
        </p>
      </div>

      {phase === "quiz" ? (
        <>
          <div className="mb-3 border-4 border-black bg-white p-1 shadow-[4px_4px_0_0_#000]">
            <div
              className="h-4 bg-ep-yellow transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <p className="ep-stat text-sm leading-[1.85] text-neutral-900">
              {segments.map((seg, idx) => {
                if (seg.type === "text") {
                  return <span key={idx}>{seg.value}</span>;
                }
                const b = seg.blankIndex;
                if (b < 0 || b >= n) return <span key={idx}>{seg.value}</span>;
                const mw = set.missingWords[b]!;
                if (locked[b]) {
                  return (
                    <span
                      key={idx}
                      className="mx-0.5 inline-block border-b-4 border-emerald-700 bg-emerald-100 px-1 font-semibold text-emerald-900"
                    >
                      {mw.correctWord}
                    </span>
                  );
                }
                const prefix = fitbExpectedPrefix(mw);
                const remLen = fitbRemainderLength(mw);
                if (remLen === 0) {
                  return (
                    <span
                      key={idx}
                      className="mx-0.5 inline-block border-b-4 border-emerald-600 bg-emerald-50 px-1 font-bold text-emerald-900"
                    >
                      {mw.correctWord}
                    </span>
                  );
                }
                const wch = Math.min(Math.max(remLen + 1, 3), 22);
                const typed = inputs[b] ?? "";
                return (
                  <span key={idx} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-baseline">
                    <span className="font-black text-ep-blue">{prefix}</span>
                    <span className="relative inline-flex items-center">
                      <input
                        ref={(el) => {
                          inputRefs.current[b] = el;
                        }}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        value={typed}
                        maxLength={remLen}
                        onChange={(e) => updateInput(b, e.target.value)}
                        className="absolute left-0 top-0 h-full w-full opacity-0"
                        style={{ width: `${wch}ch`, minWidth: "2.5ch" }}
                        aria-label={`Blank ${b + 1}`}
                      />
                      <span
                        className="inline-flex cursor-text gap-0.5"
                        onClick={() => inputRefs.current[b]?.focus()}
                        aria-hidden="true"
                      >
                        {Array.from({ length: remLen }, (_, k) => (
                          <span
                            key={k}
                            className={`inline-flex h-7 w-6 items-center justify-center rounded border text-xs font-bold ${
                              typed[k]
                                ? "border-emerald-300 bg-emerald-100 text-neutral-900"
                                : "border-neutral-300 bg-neutral-50 text-neutral-400"
                            }`}
                          >
                            {typed[k] ?? "_"}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                );
              })}
            </p>

            <ul className="mt-6 space-y-3 border-t-4 border-black pt-4">
              {set.missingWords.map((mw, i) => {
                if (locked[i]) return null;
                return (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-neutral-600">
                      Blank {i + 1}
                      {clueUsed[i] ? (
                        <span className="ml-2 text-amber-800">· clue used (score penalty)</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleClue(i)}
                      className="border-2 border-black bg-white px-2 py-1 font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/30"
                    >
                      {clueVisible[i] ? "Hide clue" : "Clue"}
                    </button>
                    {clueVisible[i] ? (
                      <p className="w-full text-sm font-semibold text-neutral-800">{mw.clue}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 shrink-0 border-t-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <p className="text-xs font-bold text-neutral-600">
              Type the <strong>rest</strong> of each word after the blue prefix. Underscores show length. Use{" "}
              <strong>Clue</strong> if you&apos;re stuck (lowers points for that blank).
            </p>
            <button
              type="button"
              onClick={submitAttempt}
              disabled={!canSubmit}
              className="mt-4 w-full border-4 border-black bg-ep-blue py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit attempt
            </button>
          </div>
        </>
      ) : (
        <FitbReportPanel
          set={set}
          round={round}
          difficulty={difficulty}
          setNumber={setNumber}
          grades={grades}
          userAnswers={userAnswers}
          clueUsed={clueUsed}
          detScore={detScore}
          onRedeemNow={onRedeemNow}
        />
      )}
    </div>
  );
}
