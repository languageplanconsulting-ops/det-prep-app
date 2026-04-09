"use client";

import { useMemo, useState } from "react";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { shuffleMcOptions, answersMatch } from "@/lib/reading-utils";
import type {
  ReadingExamResultRow,
  ReadingExamUnit,
  ReadingMcBlock,
  ReadingQuestionKey,
  ReadingVocabItem,
} from "@/types/reading";

const ORDER: {
  key: ReadingQuestionKey;
  label: string;
  pick: (s: ReadingExamUnit) => ReadingMcBlock;
}[] = [
  {
    key: "missingSentence",
    label: "Q1 — Missing paragraph",
    pick: (s) => s.missingSentence,
  },
  {
    key: "informationLocation",
    label: "Q2 — Information location",
    pick: (s) => s.informationLocation,
  },
  { key: "bestTitle", label: "Q3 — Best title", pick: (s) => s.bestTitle },
  { key: "mainIdea", label: "Q4 — Main idea", pick: (s) => s.mainIdea },
];

export function ReadingExam({
  setNumber,
  examNumber,
  readingExam,
  onComplete,
}: {
  setNumber: number;
  examNumber: number;
  readingExam: ReadingExamUnit;
  onComplete: (rows: ReadingExamResultRow[]) => void;
}) {
  const shuffledPerStep = useMemo(() => {
    return ORDER.map(({ pick }) => {
      const block = pick(readingExam);
      return shuffleMcOptions(block.options, block.correctAnswer);
    });
  }, [readingExam]);

  const [step, setStep] = useState(0);
  const [q1Revealed, setQ1Revealed] = useState(false);
  const [answers, setAnswers] = useState<Partial<Record<ReadingQuestionKey, string>>>({});
  const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);

  const correctP2 = readingExam.missingSentence.correctAnswer;
  const current = ORDER[step];
  const block = current.pick(readingExam);
  const { shuffled } = shuffledPerStep[step];

  const selectQ1 = (option: string) => {
    setAnswers((a) => ({ ...a, missingSentence: option }));
    setQ1Revealed(true);
  };

  const selectOther = (option: string) => {
    setAnswers((a) => ({ ...a, [current.key]: option }));
  };

  const canAdvance =
    step === 0
      ? q1Revealed
      : Boolean(answers[current.key] && answers[current.key]!.length > 0);

  const goNext = () => {
    if (!canAdvance) return;
    if (step < ORDER.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    const rows: ReadingExamResultRow[] = ORDER.map(({ key, label, pick }) => {
      const b = pick(readingExam);
      const userAnswer = answers[key] ?? "";
      const isCorrect = answersMatch(userAnswer, b.correctAnswer);
      return {
        key,
        label,
        question: b.question,
        userAnswer,
        correctAnswer: b.correctAnswer,
        isCorrect,
        explanationThai: b.explanationThai,
      };
    });
    onComplete(rows);
  };

  const examTitle = readingExam.titleEn?.trim();

  return (
    <div className="space-y-6">
      <section className="ep-brutal-reading rounded-sm bg-white p-5">
        <h2 className="text-lg font-black uppercase tracking-wide text-ep-blue">
          Passage — Set {setNumber} · Exam {examNumber}
          {examTitle ? ` · ${examTitle}` : ""}
        </h2>
        {readingExam.highlightedVocab.length > 0 ? (
          <p className="mt-2 text-xs font-bold text-neutral-600">
            Tip: highlighted words are clickable for meanings.
          </p>
        ) : null}
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-800">
          <p className="whitespace-pre-wrap">
            <HighlightedReadingText
              text={readingExam.passage.p1}
              vocab={readingExam.highlightedVocab}
              activeWord={activeVocabWord}
              setNumber={setNumber}
              examNumber={examNumber}
              onPickWord={setActiveVocabWord}
            />
          </p>
          {step === 0 && !q1Revealed ? (
            <div
              className="rounded-sm border-4 border-dashed border-black bg-ep-yellow/40 px-4 py-10 text-center text-lg font-black uppercase tracking-widest text-neutral-800"
              aria-label="Missing paragraph placeholder"
            >
              [MISSING PARAGRAPH]
            </div>
          ) : (
            <p className="whitespace-pre-wrap border-l-4 border-ep-blue pl-3">
              <HighlightedReadingText
                text={correctP2}
                vocab={readingExam.highlightedVocab}
                activeWord={activeVocabWord}
                setNumber={setNumber}
                examNumber={examNumber}
                onPickWord={setActiveVocabWord}
              />
            </p>
          )}
          <p className="whitespace-pre-wrap">
            <HighlightedReadingText
              text={readingExam.passage.p3}
              vocab={readingExam.highlightedVocab}
              activeWord={activeVocabWord}
              setNumber={setNumber}
              examNumber={examNumber}
              onPickWord={setActiveVocabWord}
            />
          </p>
        </div>
      </section>

      <section className="ep-brutal-reading rounded-sm bg-neutral-50 p-5">
        <p className="ep-stat text-xs font-bold uppercase text-neutral-500">{current.label}</p>
        <p className="mt-2 text-base font-bold text-neutral-900">{block.question}</p>
        <ul className="mt-4 space-y-2">
          {shuffled.map((opt) => {
            const chosen = answers[current.key];
            const active = chosen === opt;
            const onPick =
              step === 0 ? () => selectQ1(opt) : () => selectOther(opt);
            return (
              <li key={opt.slice(0, 48) + opt.length}>
                <button
                  type="button"
                  onClick={onPick}
                  className={`w-full border-4 border-black px-3 py-3 text-left text-sm font-semibold shadow-[4px_4px_0_0_#000] transition hover:bg-ep-yellow/30 ${
                    active ? "bg-ep-yellow/50" : "bg-white"
                  }`}
                >
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="border-4 border-black bg-white px-4 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000]"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canAdvance}
            onClick={goNext}
            className="border-4 border-black bg-ep-blue px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] disabled:opacity-40"
          >
            {step < ORDER.length - 1 ? "Next question" : "See score report"}
          </button>
        </div>
      </section>
    </div>
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findVocabMatch(
  text: string,
  vocab: ReadingVocabItem[],
  from: number,
): { start: number; end: number; word: string } | null {
  let best: { start: number; end: number; word: string } | null = null;
  for (const item of vocab) {
    const word = item.word.trim();
    if (!word) continue;
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(word)})(?=$|[^A-Za-z0-9])`, "i");
    const slice = text.slice(from);
    const m = pattern.exec(slice);
    if (!m || m.index < 0) continue;
    const start = from + m.index + (m[1]?.length ?? 0);
    const end = start + m[2]!.length;
    if (!best || start < best.start || (start === best.start && end - start > best.end - best.start)) {
      best = { start, end, word };
    }
  }
  return best;
}

function HighlightedReadingText({
  text,
  vocab,
  activeWord,
  setNumber,
  examNumber,
  onPickWord,
}: {
  text: string;
  vocab: ReadingVocabItem[];
  activeWord: string | null;
  setNumber: number;
  examNumber: number;
  onPickWord: (word: string | null) => void;
}) {
  const pieces: Array<{ t: string; word?: string }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const hit = findVocabMatch(text, vocab, cursor);
    if (!hit) {
      pieces.push({ t: text.slice(cursor) });
      break;
    }
    if (hit.start > cursor) {
      pieces.push({ t: text.slice(cursor, hit.start) });
    }
    pieces.push({ t: text.slice(hit.start, hit.end), word: hit.word });
    cursor = hit.end;
  }

  return (
    <>
      {pieces.map((p, i) => {
        if (!p.word) return <span key={`${i}-${p.t.slice(0, 8)}`}>{p.t}</span>;
        const active = activeWord?.toLowerCase() === p.word.toLowerCase();
        return (
          <span key={`${i}-${p.word}-${p.t}`} className="relative mx-[1px] inline-block">
            <button
              type="button"
              onClick={() => onPickWord(active ? null : p.word!)}
              className={`inline rounded px-1 font-semibold ${
                active ? "bg-ep-blue text-white" : "bg-ep-yellow/60 text-neutral-900 hover:bg-ep-yellow"
              }`}
              title="Show meaning"
            >
              {p.t}
            </button>
            {active ? (
              <span className="absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-[280px] -translate-x-1/2 rounded-sm border-2 border-black bg-white p-2 text-left shadow-[4px_4px_0_0_#000]">
                <button
                  type="button"
                  onClick={() => onPickWord(null)}
                  className="absolute right-1 top-1 border border-black bg-white px-1 text-[10px] font-black"
                >
                  x
                </button>
                {(() => {
                  const v = vocab.find((x) => x.word.toLowerCase() === p.word!.toLowerCase());
                  if (!v) return null;
                  return (
                    <>
                      <p className="pr-5 text-xs font-black text-neutral-900">{v.word}</p>
                      <p className="mt-1 text-[11px] text-neutral-700">EN: {v.meaningEn}</p>
                      <p className="mt-1 text-[11px] text-neutral-700">TH: {v.meaningTh}</p>
                      <AddToNotebookButton
                        attemptId={`reading-vocab-${setNumber}-${examNumber}-${v.word.toLowerCase()}`}
                        suggestedPremade="vocabulary"
                        className="mt-2"
                        getPayload={() => ({
                          titleEn: `Reading vocab: ${v.word}`,
                          titleTh: `คำศัพท์จาก Reading: ${v.word}`,
                          bodyEn: `Word: ${v.word}\nMeaning (EN): ${v.meaningEn}\nExample: ${v.example}`,
                          bodyTh: `คำศัพท์: ${v.word}\nความหมาย (TH): ${v.meaningTh}`,
                          excerpt: v.word,
                        })}
                      />
                    </>
                  );
                })()}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}
