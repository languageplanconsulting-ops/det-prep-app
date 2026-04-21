"use client";

import { useMemo, useState } from "react";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: {
    score160: number;
    detail: Record<string, unknown>;
    round_selections?: Array<{
      selected: string[];
      realWords: string[];
      fakeWords: string[];
    }>;
  }) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function RealEnglishWordRoundsMock({ content, onSubmit, submitting = false }: Props) {
  const realWords = useMemo(
    () =>
      (Array.isArray(content.real_words) ? content.real_words : [])
        .map((w) => String(w).trim())
        .filter(Boolean),
    [content.real_words],
  );
  const fakeWords = useMemo(
    () =>
      (Array.isArray(content.fake_words) ? content.fake_words : [])
        .map((w) => String(w).trim())
        .filter(Boolean),
    [content.fake_words],
  );

  const configuredRounds = Math.max(1, Number(content.rounds ?? 4) || 4);
  const wordsPerRound = Math.max(8, Number(content.words_per_round ?? 20) || 20);
  const realPerRound = Math.max(4, Math.round(wordsPerRound * 0.4));
  const fakePerRound = Math.max(4, wordsPerRound - realPerRound);
  const scorePerCorrect = Math.max(1, Number(content.score_per_correct ?? 5) || 5);
  const fakePenalty = Math.max(0, Number(content.score_penalty_per_fake_pick ?? 2) || 2);
  const maxScore = Math.max(20, Number(content.max_score ?? 160) || 160);

  const rounds = useMemo(() => {
    const realNeeded = configuredRounds * realPerRound;
    const fakeNeeded = configuredRounds * fakePerRound;
    const real = shuffle(realWords).slice(0, realNeeded);
    const fake = shuffle(fakeWords).slice(0, fakeNeeded);
    if (real.length < realNeeded || fake.length < fakeNeeded) {
      return [] as Array<{ words: string[]; realSet: Set<string> }>;
    }
    const out: Array<{ words: string[]; realSet: Set<string> }> = [];
    for (let r = 0; r < configuredRounds; r++) {
      const realPart = real.slice(r * realPerRound, r * realPerRound + realPerRound);
      const fakePart = fake.slice(r * fakePerRound, r * fakePerRound + fakePerRound);
      out.push({
        words: shuffle([...realPart, ...fakePart]),
        realSet: new Set(realPart),
      });
    }
    return out;
  }, [configuredRounds, fakePerRound, fakeWords, realPerRound, realWords]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [roundSelections, setRoundSelections] = useState<Array<{ selected: string[]; realWords: string[]; fakeWords: string[] }>>([]);

  const round = rounds[roundIdx];
  if (!rounds.length || !round) {
    return (
      <p className="text-sm font-bold text-red-700">
        real_english_word step requires enough <code>real_words</code> and <code>fake_words</code> for the configured rounds.
      </p>
    );
  }

  const submitRound = () => {
    let plus = 0;
    let minus = 0;
    selected.forEach((w) => {
        if (round.realSet.has(w)) plus += scorePerCorrect;
      else minus += fakePenalty;
    });
    const nextScore = Math.max(0, Math.min(maxScore, score + plus - minus));
    const roundSelection = {
      selected: [...selected],
      realWords: [...round.realSet],
      fakeWords: round.words.filter((w) => !round.realSet.has(w)),
    };
    if (roundIdx >= configuredRounds - 1) {
      onSubmit({
        score160: nextScore,
        detail: {
          rounds: configuredRounds,
          per_round_sec: Number(content.round_duration_sec ?? 60) || 60,
          score_per_correct: scorePerCorrect,
          score_penalty_per_fake_pick: -fakePenalty,
          max_score: maxScore,
        },
        round_selections: [...roundSelections, roundSelection],
      });
      return;
    }
    setScore(nextScore);
    setRoundSelections((prev) => [...prev, roundSelection]);
    setRoundIdx((x) => x + 1);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-black text-[#004AAD]">
        Real English Word — Round {roundIdx + 1}/{configuredRounds}
      </p>
      <p className="text-xs text-neutral-600">
        Choose real words only. Each correct real word = +{scorePerCorrect} points. Each selected fake word = -{fakePenalty} points.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {round.words.map((w) => {
          const active = selected.has(w);
          return (
            <button
              key={w}
              type="button"
              disabled={submitting}
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(w)) next.delete(w);
                  else next.add(w);
                  return next;
                })
              }
              className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${active ? "bg-[#FFCC00]" : "bg-white"}`}
            >
              {w}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={submitRound}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting ? "Submitting..." : roundIdx >= configuredRounds - 1 ? "Submit real-word score" : "Next round"}
      </button>
    </div>
  );
}
