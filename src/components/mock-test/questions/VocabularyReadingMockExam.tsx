"use client";

import { useEffect, useMemo, useState } from "react";
import { HighlightedReadingText } from "@/components/reading/ReadingExam";
import { shuffleMcOptions } from "@/lib/reading-utils";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import {
  getVocabularyReadingBlocks,
  VOCAB_READING_MOCK_STEPS,
} from "@/lib/mock-test/vocabulary-reading-mock";

const LABELS = [
  "Q1 — Vocabulary",
  "Q2 — Vocabulary",
  "Q3 — Vocabulary",
  "Q4 — Vocabulary",
  "Q5 — Vocabulary",
  "Q6 — Most suitable missing paragraph",
  "Q7 — Information location",
  "Q8 — Best title",
  "Q9 — Main idea",
] as const;

type Props = {
  content: Record<string, unknown>;
  /** Number of sub-questions already submitted (0…9). */
  completedSteps: number;
  onSubmit: (payload: { answer: { step: number; choice: string } }) => void;
};

export function VocabularyReadingMockExam({
  content,
  completedSteps,
  onSubmit,
}: Props) {
  const exam = content as unknown as VocabularyReadingMockContent;
  const blocks = getVocabularyReadingBlocks(exam);
  const vocab = exam.highlightedVocab ?? [];

  const [activeWord, setActiveWord] = useState<string | null>(null);
  /** Step 5: chosen option before Submit (practice reading reveals gap first). */
  const [missingPick, setMissingPick] = useState<string | null>(null);
  const [missingReveal, setMissingReveal] = useState(false);

  const step = completedSteps;
  const block = blocks[step];
  const p2 = exam.passage.p2;

  useEffect(() => {
    if (step !== 5) {
      setMissingPick(null);
      setMissingReveal(false);
    }
  }, [step]);

  const shuffled = useMemo(() => {
    if (!block) return { shuffled: [] as string[], correctIndex: 0 };
    return shuffleMcOptions(block.options, block.correctAnswer);
  }, [block]);

  /** Paragraph 2 hidden for vocab (0–4) and missing-paragraph until reveal. */
  const hideP2 = step <= 4 || (step === 5 && !missingReveal);

  const submitChoice = (choice: string) => {
    onSubmit({ answer: { step, choice } });
  };

  const onOptionClick = (opt: string) => {
    if (step < 5) {
      submitChoice(opt);
      return;
    }
    if (step === 5) {
      if (!missingReveal) {
        setMissingPick(opt);
        setMissingReveal(true);
        return;
      }
      setMissingPick(opt);
      return;
    }
    submitChoice(opt);
  };

  if (step >= VOCAB_READING_MOCK_STEPS || !block) {
    return (
      <p className="text-sm text-neutral-600">Loading next section… / กำลังโหลด…</p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="ep-brutal-reading rounded-sm bg-white p-5">
        <h2 className="text-lg font-black uppercase tracking-wide text-ep-blue">
          Vocabulary + reading (mock)
          {exam.titleEn?.trim() ? ` · ${exam.titleEn.trim()}` : ""}
        </h2>
        {vocab.length > 0 ? (
          <p className="mt-2 text-xs font-bold text-neutral-600">
            Tip: highlighted words are clickable for meanings.
          </p>
        ) : null}
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-800">
          <p className="whitespace-pre-wrap">
            <HighlightedReadingText
              text={exam.passage.p1}
              vocab={vocab}
              activeWord={activeWord}
              setNumber={0}
              examNumber={0}
              onPickWord={setActiveWord}
            />
          </p>
          {hideP2 ? (
            <div
              className="rounded-sm border-4 border-dashed border-black bg-ep-yellow/40 px-4 py-10 text-center text-lg font-black uppercase tracking-widest text-neutral-800"
              aria-label="Missing paragraph placeholder"
            >
              [MISSING PARAGRAPH]
            </div>
          ) : (
            <p className="whitespace-pre-wrap border-l-4 border-ep-blue pl-3">
              <HighlightedReadingText
                text={p2}
                vocab={vocab}
                activeWord={activeWord}
                setNumber={0}
                examNumber={0}
                onPickWord={setActiveWord}
              />
            </p>
          )}
          <p className="whitespace-pre-wrap">
            <HighlightedReadingText
              text={exam.passage.p3}
              vocab={vocab}
              activeWord={activeWord}
              setNumber={0}
              examNumber={0}
              onPickWord={setActiveWord}
            />
          </p>
        </div>
      </section>

      <section className="ep-brutal-reading rounded-sm bg-neutral-50 p-5">
        <p className="ep-stat text-xs font-bold uppercase text-neutral-500">
          {LABELS[step]}
        </p>
        <p className="mt-2 text-base font-bold text-neutral-900">{block.question}</p>
        <ul className="mt-4 space-y-2">
          {shuffled.shuffled.map((opt) => (
            <li key={opt.slice(0, 48) + opt.length}>
              <button
                type="button"
                onClick={() => onOptionClick(opt)}
                className={`w-full border-4 border-black px-3 py-3 text-left text-sm font-semibold shadow-[4px_4px_0_0_#000] transition hover:bg-ep-yellow/30 ${
                  step === 5 && missingReveal && missingPick === opt
                    ? "bg-ep-yellow/50"
                    : "bg-white"
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
        {step === 5 && missingReveal && missingPick ? (
          <button
            type="button"
            onClick={() => submitChoice(missingPick)}
            className="mt-5 w-full border-4 border-black bg-ep-blue px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000]"
          >
            Submit answer / ส่งคำตอบ
          </button>
        ) : null}
      </section>
    </div>
  );
}
