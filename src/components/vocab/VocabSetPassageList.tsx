"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  VOCAB_CONTENT_LEVEL_LABEL,
  VOCAB_MAX_PASSAGES_PER_SET,
  VOCAB_SESSION_LABEL,
  VOCAB_SESSION_MAX,
} from "@/lib/vocab-constants";
import {
  getVocabPassageProgress,
  getVocabVisibleSetByNumber,
} from "@/lib/vocab-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { VocabPassageUnit, VocabRoundNum, VocabSessionLevel, VocabSet } from "@/types/vocab";

export function VocabSetPassageList({
  round,
  sessionLevel,
  setNumber,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
}) {
  const [set, setSet] = useState<VocabSet | null | undefined>(undefined);

  useEffect(() => {
    setSet(getVocabVisibleSetByNumber(setNumber, round) ?? null);
  }, [round, setNumber]);

  const maxScore = VOCAB_SESSION_MAX[sessionLevel];
  const hubHref = `/practice/comprehension/vocabulary/round/${round}`;
  const levelPickHref = `/practice/comprehension/vocabulary/round/${round}/${setNumber}`;

  if (set === undefined) {
    return <LuxuryLoader label="Gathering tests in this set…" />;
  }

  if (set === null) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Set {setNumber} is not available yet.
        </p>
        <Link
          href={hubHref}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to sets
        </Link>
      </div>
    );
  }

  const tests = set.passages
    .filter((p) => p.contentLevel === sessionLevel)
    .sort((a, b) => a.passageNumber - b.passageNumber);

  const overCap = set.passages.length > VOCAB_MAX_PASSAGES_PER_SET;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={levelPickHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Set {setNumber} levels
        </Link>
        <p className="ep-stat text-xs text-neutral-500">
          {VOCAB_SESSION_LABEL[sessionLevel]} · Max {maxScore} pts per test
        </p>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Round {round} · Set {setNumber} · {VOCAB_CONTENT_LEVEL_LABEL[sessionLevel]} tests
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Choose a test</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {tests.length} test{tests.length === 1 ? "" : "s"} at this level (target about 10–20 per
          level in a full bank). Each test has six blanks. Scoring cap:{" "}
          <strong>{maxScore}</strong> points.
        </p>
        {overCap ? (
          <p className="mt-2 text-sm font-bold text-red-700">
            This set has more than {VOCAB_MAX_PASSAGES_PER_SET} passages total — trim in Admin.
          </p>
        ) : null}
      </header>

      {tests.length === 0 ? (
        <div className="ep-brutal-reading rounded-sm bg-neutral-50 p-6 text-sm text-neutral-700">
          <p>
            No passages tagged <strong>{VOCAB_CONTENT_LEVEL_LABEL[sessionLevel]}</strong> in this set.
            Add passages with <code className="ep-stat text-xs">contentLevel: &quot;{sessionLevel}&quot;</code>{" "}
            in Admin, or pick another difficulty.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tests.map((p) => (
            <PassageRow
              key={p.passageNumber}
              round={round}
              sessionLevel={sessionLevel}
              setNumber={setNumber}
              passage={p}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PassageRow({
  round,
  sessionLevel,
  setNumber,
  passage,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passage: VocabPassageUnit;
}) {
  const prog = getVocabPassageProgress(round, sessionLevel, setNumber, passage.passageNumber);
  const href = `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}/${passage.passageNumber}`;
  const title = passage.titleEn?.trim() || `Test ${passage.passageNumber}`;

  return (
    <li>
      <Link
        href={href}
        className="ep-interactive block rounded-sm border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/30"
      >
        <span className="font-bold text-neutral-900">{title}</span>
        <span className="ep-stat mt-1 block text-xs text-neutral-600">
          {prog != null ? (
            <>
              Best: {prog.bestScore}/{prog.maxScore}
              {prog.bestScore < prog.maxScore ? (
                <span className="ml-1 font-bold text-ep-blue">· Redeem</span>
              ) : null}
            </>
          ) : (
            "Start"
          )}
        </span>
      </Link>
    </li>
  );
}
