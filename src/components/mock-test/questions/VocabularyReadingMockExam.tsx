"use client";

/**
 * Mock test — the reading step, on the real Interactive Reading screen.
 *
 * This used to be ten multiple-choice cards in a row: five or six "Q1 — Vocabulary" boxes, then a
 * yellow missing-paragraph block, then three more cards. The content was already a complete real
 * task; only the presentation was ours. It now runs the same engine the practice reading and the
 * reading exam run, so a learner meets one screen everywhere and the mock stops being the odd one
 * out — which matters most here, because this is the run they treat as the real thing.
 *
 * The scoring contract is unchanged. The engine reports what was chosen at every step and this
 * builds exactly the payload the grader already expects: averageScore0To100, selected_answers,
 * correct_answers, question_labels, question_prompts. The mock still owns the step clock; the
 * engine's own timer stays off because it only runs for a full six-step practice set.
 */

import { useMemo, useRef, useState } from "react";

import { useTimeUpSubmit } from "@/hooks/useTimeUpSubmit";
import { InteractiveReadingRunner, type IrStepResult } from "@/components/reading/InteractiveReadingRunner";
import { mockReadingToIrSet } from "@/lib/mock-test/mock-reading-to-ir";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import {
  getVocabularyReadingCombinedBlocks,
  getVocabularyReadingBlocks,
} from "@/lib/mock-test/vocabulary-reading-mock";

type Props = {
  content: Record<string, unknown>;
  /** Number of sub-questions already submitted (0…9). */
  completedSteps: number;
  aggregateMode?: boolean;
  submitting?: boolean;
  /** Step countdown hit 00:00 — score the sub-questions answered so far. */
  timeUp?: boolean;
  onSubmit: (payload: unknown) => void;
};

const STEP_LABEL: Record<number, string> = {
  1: "Most suitable missing paragraph",
  2: "Information location",
  4: "Main idea expressed",
  5: "Best title",
};

export function VocabularyReadingMockExam({
  content,
  aggregateMode = false,
  submitting = false,
  timeUp = false,
  onSubmit,
}: Props) {
  const exam = content as unknown as VocabularyReadingMockContent;
  const vocabCount = aggregateMode ? 6 : 5;
  const blocks = aggregateMode ? getVocabularyReadingCombinedBlocks(exam) : getVocabularyReadingBlocks(exam);

  const { set, steps } = useMemo(
    () => mockReadingToIrSet(exam, "mock-reading", vocabCount),
    [exam, vocabCount],
  );
  // What the engine actually asks, which is not always what the upload declares: a set with fewer
  // blanks in the passage than questions grades fewer blanks, and the report's split has to match.
  const gradedVocabCount = set.blanks.length;

  const [done, setDone] = useState(false);
  const collected = useRef<IrStepResult[]>([]);
  const submitted = useRef(false);

  /** Flatten step results into the flat per-sub-question arrays the grader expects. */
  function buildPayload(results: IrStepResult[]) {
    const selected: string[] = [];
    const correct: string[] = [];
    const labels: string[] = [];
    const prompts: string[] = [];

    for (const r of results) {
      if (r.step === 0) {
        r.chosen.forEach((c, i) => {
          selected.push(c);
          correct.push(r.correct[i] ?? "");
          labels.push(`Q${labels.length + 1} — Vocabulary`);
          prompts.push(exam.vocabularyQuestions?.[i]?.question ?? "");
        });
        continue;
      }
      selected.push(r.chosen[0] ?? "");
      correct.push(r.correct[0] ?? "");
      labels.push(`Q${labels.length + 1} — ${STEP_LABEL[r.step] ?? "Reading"}`);
      const block =
        r.step === 1
          ? exam.missingParagraph
          : r.step === 2
            ? exam.informationLocation
            : r.step === 4
              ? exam.mainIdea
              : exam.bestTitle;
      prompts.push(block?.question ?? "");
    }

    // Score on the engine's verdicts, not on string equality: the highlight step is graded on the
    // span the learner dragged, which never equals the key character for character.
    let hits = 0;
    for (const r of results) hits += r.step === 0 ? r.score * r.chosen.length : r.score;
    const total = selected.length || blocks.length;

    return {
      averageScore0To100: total > 0 ? (hits / total) * 100 : 0,
      detail: {
        total,
        correct: Math.round(hits),
        vocabCount: gradedVocabCount,
        readingCount: Math.max(0, total - gradedVocabCount),
      },
      selected_answers: selected,
      correct_answers: correct,
      question_labels: labels,
      question_prompts: prompts,
    };
  }

  function submitOnce(results: IrStepResult[], timedOutAt?: number) {
    if (submitted.current) return;
    submitted.current = true;
    const payload = buildPayload(results);
    onSubmit(
      timedOutAt == null
        ? payload
        : { ...payload, detail: { ...payload.detail, timedOutAtSubQuestion: timedOutAt } },
    );
  }

  // Section clock ended: hand in whatever was answered. Unanswered sub-questions score as wrong,
  // which is what the real exam does — the mock must never stall on the last screen.
  useTimeUpSubmit(timeUp, () => {
    submitOnce(collected.current, collected.current.length + 1);
  });

  return (
    <div className="mx-auto w-full max-w-5xl">
      <InteractiveReadingRunner
        sets={[set]}
        steps={steps}
        hideReport
        // The mock owns scoring end to end. Without this the runner would ALSO write a lesson
        // progress row and award XP mid-exam — practice rewards leaking into a timed mock.
        hostOwnsProgress
        glossary={(exam.highlightedVocab ?? []).map((v) => ({ word: v.word, meaningTh: v.meaningTh }))}
        onStepDone={(_r, all) => {
          // keep the running total so a time-up submits what was actually answered
          collected.current = all;
        }}
        onFinish={(results) => {
          collected.current = results;
          setDone(true);
          submitOnce(results);
        }}
      />
      {done || submitting ? (
        <p className="mt-4 text-center text-sm font-bold text-slate-500">กำลังบันทึกคำตอบ…</p>
      ) : null}
    </div>
  );
}
