"use client";

import { useEffect, useMemo, useState } from "react";
import { HighlightedReadingText } from "@/components/reading/ReadingExam";
import { shuffleMcOptions } from "@/lib/reading-utils";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import {
  getVocabularyReadingCombinedBlocks,
  getVocabularyReadingBlocks,
  VOCAB_READING_COMBINED_STEPS,
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

const COMBINED_LABELS = [
  "Q1 — Vocabulary",
  "Q2 — Vocabulary",
  "Q3 — Vocabulary",
  "Q4 — Vocabulary",
  "Q5 — Vocabulary",
  "Q6 — Vocabulary",
  "Q7 — Most suitable missing paragraph",
  "Q8 — Information location",
  "Q9 — Best title",
  "Q10 — Main idea",
] as const;

function fillVocabBlanks(text: string, words: string[]): string {
  let next = text;
  words.forEach((w, idx) => {
    const token = `[BLANK ${idx + 1}]`;
    next = next.replaceAll(token, w);
  });
  return next;
}

type Props = {
  content: Record<string, unknown>;
  /** Number of sub-questions already submitted (0…9). */
  completedSteps: number;
  aggregateMode?: boolean;
  submitting?: boolean;
  onSubmit: (payload: unknown) => void;
};

export function VocabularyReadingMockExam({
  content,
  completedSteps,
  aggregateMode = false,
  submitting = false,
  onSubmit,
}: Props) {
  const exam = content as unknown as VocabularyReadingMockContent;
  const blocks = aggregateMode
    ? getVocabularyReadingCombinedBlocks(exam)
    : getVocabularyReadingBlocks(exam);
  const vocab = exam.highlightedVocab ?? [];
  const labels = aggregateMode ? COMBINED_LABELS : LABELS;

  const [activeWord, setActiveWord] = useState<string | null>(null);
  /** Step 5: chosen option before Submit (practice reading reveals gap first). */
  const [missingPick, setMissingPick] = useState<string | null>(null);
  const [missingReveal, setMissingReveal] = useState(false);
  const [internalStep, setInternalStep] = useState(0);
  const [internalAnswers, setInternalAnswers] = useState<string[]>([]);

  const step = aggregateMode ? internalStep : completedSteps;
  const block = blocks[step];
  const p2Correct = String(exam.missingParagraph?.correctAnswer ?? exam.passage.p2 ?? "");
  const missingSelectionStep = aggregateMode ? 6 : 5;
  const vocabAnswers = aggregateMode
    ? Array.from({ length: 6 }).map((_, idx) => internalAnswers[idx] ?? `[BLANK ${idx + 1}]`)
    : (exam.vocabularyQuestions ?? []).slice(0, 6).map((q) => q.correctAnswer);
  const shouldFillVocabBlanks =
    aggregateMode && (step > missingSelectionStep || (step === missingSelectionStep && missingReveal));
  const p1Display = shouldFillVocabBlanks ? fillVocabBlanks(exam.passage.p1, vocabAnswers) : exam.passage.p1;
  const p3Display = shouldFillVocabBlanks ? fillVocabBlanks(exam.passage.p3, vocabAnswers) : exam.passage.p3;

  useEffect(() => {
    if (step !== missingSelectionStep) {
      setMissingPick(null);
      setMissingReveal(false);
    }
  }, [step, missingSelectionStep]);

  const shuffled = useMemo(() => {
    if (!block) return { shuffled: [] as string[], correctIndex: 0 };
    return shuffleMcOptions(block.options, block.correctAnswer);
  }, [block]);

  /** Paragraph 2 hidden for vocab (0–4) and missing-paragraph until reveal. */
  const hideP2 = step <= (aggregateMode ? 5 : 4) || (step === (aggregateMode ? 6 : 5) && !missingReveal);

  const commitChoice = (choice: string) => {
    if (submitting) return;
    if (!aggregateMode) {
      onSubmit({ answer: { step, choice } });
      return;
    }
    const nextAnswers = [...internalAnswers, choice];
    const endStep = VOCAB_READING_COMBINED_STEPS - 1;
    if (step >= endStep) {
      let correct = 0;
      nextAnswers.forEach((picked, idx) => {
        if (idx >= blocks.length) return;
        if (picked && picked === blocks[idx]?.correctAnswer) correct += 1;
      });
      const averageScore0To100 = blocks.length > 0 ? (correct / blocks.length) * 100 : 0;
      onSubmit({
        averageScore0To100,
        detail: {
          total: blocks.length,
          correct,
          vocabCount: 6,
          readingCount: Math.max(0, blocks.length - 6),
        },
      });
      return;
    }
    setInternalAnswers(nextAnswers);
    setInternalStep((s) => s + 1);
  };

  const submitChoice = (choice: string) => {
    if (submitting) return;
    commitChoice(choice);
  };

  const onOptionClick = (opt: string) => {
    if (submitting) return;
    const revealStep = aggregateMode ? 6 : 5;
    if (step < revealStep) {
      submitChoice(opt);
      return;
    }
    if (step === revealStep) {
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

  const maxSteps = aggregateMode ? VOCAB_READING_COMBINED_STEPS : VOCAB_READING_MOCK_STEPS;
  if (step >= maxSteps || !block) {
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
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4 text-sm leading-relaxed text-neutral-800">
          <p className="whitespace-pre-wrap">
            {aggregateMode ? (
              renderMockVocabBlanksAsBoxes(exam.passage.p1, internalAnswers)
            ) : (
              <HighlightedReadingText
                text={p1Display}
                vocab={vocab}
                activeWord={activeWord}
                setNumber={0}
                examNumber={0}
                onPickWord={setActiveWord}
              />
            )}
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
                text={p2Correct}
                vocab={vocab}
                activeWord={activeWord}
                setNumber={0}
                examNumber={0}
                onPickWord={setActiveWord}
              />
            </p>
          )}
          <p className="whitespace-pre-wrap">
            {aggregateMode ? (
              renderMockVocabBlanksAsBoxes(exam.passage.p3, internalAnswers)
            ) : (
              <HighlightedReadingText
                text={p3Display}
                vocab={vocab}
                activeWord={activeWord}
                setNumber={0}
                examNumber={0}
                onPickWord={setActiveWord}
              />
            )}
          </p>
          </div>
          <div className="ep-brutal-reading rounded-sm bg-neutral-50 p-4">
            <p className="ep-stat text-xs font-bold uppercase text-neutral-500">{labels[step]}</p>
            <p className="mt-2 text-base font-bold text-neutral-900">{block.question}</p>
            <ul className="mt-4 space-y-2">
              {shuffled.shuffled.map((opt) => (
                <li key={opt.slice(0, 48) + opt.length}>
                  <button
                    type="button"
                    onClick={() => onOptionClick(opt)}
                    disabled={submitting}
                    className={`w-full border-4 border-black px-3 py-3 text-left text-sm font-semibold shadow-[4px_4px_0_0_#000] transition hover:bg-ep-yellow/30 ${
                      step === (aggregateMode ? 6 : 5) && missingReveal && missingPick === opt
                        ? "bg-ep-yellow/50"
                        : "bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </ul>
            {step === (aggregateMode ? 6 : 5) && missingReveal && missingPick ? (
              <button
                type="button"
                onClick={() => submitChoice(missingPick)}
                disabled={submitting}
                className="mt-5 w-full border-4 border-black bg-ep-blue px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit answer / ส่งคำตอบ"}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function renderMockVocabBlanksAsBoxes(text: string, answers: string[] = []) {
  const re = /\[BLANK\s*(\d+)\]/gi;
  const out: any[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const idx = match.index ?? 0;
    if (idx > last) {
      out.push(<span key={`t-${last}-${idx}`}>{text.slice(last, idx)}</span>);
    }

    const blankNum = match[1] ?? "";
    const idxNum = Number(blankNum) - 1;
    const picked = idxNum >= 0 ? String(answers[idxNum] ?? "").trim() : "";
    out.push(
      <span
        key={`b-${idx}-${blankNum}`}
        className="mx-0.5 inline-flex items-center justify-center rounded-[8px] border-4 border-black bg-[#dbffd8] px-2 py-1 font-black tracking-widest text-[#0f7a16] shadow-[3px_3px_0_0_#000]"
      >
        {picked || `____${blankNum}`}
      </span>,
    );
    last = idx + match[0]!.length;
  }

  if (last < text.length) {
    out.push(<span key={`t-${last}-end`}>{text.slice(last)}</span>);
  }

  return out;
}
