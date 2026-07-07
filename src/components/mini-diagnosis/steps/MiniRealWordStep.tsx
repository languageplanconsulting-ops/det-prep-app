"use client";

import { useMemo, useState } from "react";

import { PrimaryButton, SoftCard } from "@/components/mini-diagnosis/steps/ui";
import { sfxCelebrate, sfxTap, sfxTransition } from "@/lib/exam-sfx";

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Mini-diagnosis real-word check. Same round/scoring model + submit payload as
 * RealEnglishWordRoundsMock — restyled: word chips with a running counter,
 * round dots, clear "fake words lose points" note.
 */
export function MiniRealWordStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
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
  const realPerRound = Math.max(
    1,
    Number(content.real_words_per_round ?? content.real_word_count ?? Math.round(wordsPerRound * 0.4)) ||
      Math.round(wordsPerRound * 0.4),
  );
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
  const [roundSelections, setRoundSelections] = useState<
    Array<{ selected: string[]; realWords: string[]; fakeWords: string[] }>
  >([]);

  const round = rounds[roundIdx];
  if (!rounds.length || !round) {
    return (
      <SoftCard className="text-center">
        <p className="text-sm font-bold text-rose-600">ชุดคำศัพท์ไม่ครบ กรุณาแจ้งทีมงาน</p>
      </SoftCard>
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
      sfxCelebrate("md");
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
    sfxTransition();
    setScore(nextScore);
    setRoundSelections((prev) => [...prev, roundSelection]);
    setRoundIdx((x) => x + 1);
    setSelected(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: configuredRounds }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < roundIdx ? "bg-emerald-500" : i === roundIdx ? "bg-ep-blue" : "bg-slate-200"
              }`}
            />
          ))}
          {configuredRounds > 1 ? (
            <span className="ml-1.5 text-xs font-bold text-slate-500">
              รอบ {roundIdx + 1}/{configuredRounds}
            </span>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
            selected.size > realPerRound ? "bg-amber-100 text-amber-700" : "bg-ep-blue/10 text-ep-blue"
          }`}
        >
          เลือกแล้ว {selected.size}/{realPerRound} คำ
        </span>
      </div>

      <SoftCard>
        <p className="text-sm font-bold text-slate-800">แตะเฉพาะคำอังกฤษที่มีอยู่จริง</p>
        <p className="mt-0.5 text-xs text-slate-500">
          รอบนี้มีคำจริงอยู่ <span className="font-bold text-ep-blue">{realPerRound} คำ</span> จากทั้งหมด {round.words.length} คำ
        </p>
        <p className="mt-1 text-xs text-slate-500">
          คำจริง +{scorePerCorrect} คะแนน · คำมั่ว (สะกดไม่มีจริง) −{fakePenalty} คะแนน
        </p>
        <div key={roundIdx} className="mt-3 grid grid-cols-2 gap-2">
          {round.words.map((w, i) => {
            const active = selected.has(w);
            return (
              <button
                key={w}
                type="button"
                disabled={submitting}
                style={{ animation: `minidiag-tile-in 0.34s ease-out ${Math.min(i * 0.035, 0.5)}s both` }}
                onClick={() => {
                  sfxTap();
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(w)) next.delete(w);
                    else next.add(w);
                    return next;
                  });
                }}
                className={`rounded-xl border-2 px-3 py-2.5 text-center text-sm font-bold transition-colors active:scale-95 ${
                  active
                    ? "border-ep-blue bg-ep-blue text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-800 hover:border-ep-blue/40"
                }`}
              >
                {active ? "✓ " : ""}
                {w}
              </button>
            );
          })}
        </div>
        <style>{`@keyframes minidiag-tile-in { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      </SoftCard>

      <PrimaryButton disabled={submitting} onClick={submitRound}>
        {submitting
          ? "กำลังส่ง…"
          : roundIdx >= configuredRounds - 1
            ? "ส่งคำตอบ"
            : "รอบต่อไป →"}
      </PrimaryButton>
    </div>
  );
}
