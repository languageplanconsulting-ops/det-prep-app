"use client";

import { useMemo, useState } from "react";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: { score160: number; detail: Record<string, unknown> }) => void;
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

  const rounds = useMemo(() => {
    const real = shuffle(realWords).slice(0, 32);
    const fake = shuffle(fakeWords).slice(0, 48);
    if (real.length < 32 || fake.length < 48) return [] as Array<{ words: string[]; realSet: Set<string> }>;
    const out: Array<{ words: string[]; realSet: Set<string> }> = [];
    for (let r = 0; r < 4; r++) {
      const realPart = real.slice(r * 8, r * 8 + 8);
      const fakePart = fake.slice(r * 12, r * 12 + 12);
      out.push({
        words: shuffle([...realPart, ...fakePart]),
        realSet: new Set(realPart),
      });
    }
    return out;
  }, [fakeWords, realWords]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [roundSelections, setRoundSelections] = useState<Array<{ selected: string[]; realWords: string[]; fakeWords: string[] }>>([]);

  const round = rounds[roundIdx];
  if (!rounds.length || !round) {
    return (
      <p className="text-sm font-bold text-red-700">
        real_english_word step requires 32 <code>real_words</code> and 48 <code>fake_words</code>.
      </p>
    );
  }

  const submitRound = () => {
    let plus = 0;
    let minus = 0;
    selected.forEach((w) => {
      if (round.realSet.has(w)) plus += 5;
      else minus += 2;
    });
    const nextScore = Math.max(0, Math.min(160, score + plus - minus));
    const roundSelection = {
      selected: [...selected],
      realWords: [...round.realSet],
      fakeWords: round.words.filter((w) => !round.realSet.has(w)),
    };
    if (roundIdx >= 3) {
      onSubmit({
        score160: nextScore,
        detail: {
          rounds: 4,
          per_round_sec: 60,
          score_per_correct: 5,
          score_penalty_per_fake_pick: -2,
          max_score: 160,
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
      <p className="text-sm font-black text-[#004AAD]">Real English Word — Round {roundIdx + 1}/4</p>
      <p className="text-xs text-neutral-600">
        Choose real words only. Each correct real word = +5 points. Each selected fake word = -2 points.
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
        {submitting ? "Submitting..." : roundIdx >= 3 ? "Submit real-word score" : "Next round"}
      </button>
    </div>
  );
}
