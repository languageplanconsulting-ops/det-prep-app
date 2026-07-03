"use client";

import { useMemo, useState, type ReactNode } from "react";

import { shuffleMcOptions } from "@/lib/reading-utils";
import {
  getVocabularyReadingCombinedBlocks,
  type VocabularyReadingMockContent,
} from "@/lib/mock-test/vocabulary-reading-mock";
import {
  BlankChip,
  BottomSheet,
  OptionPill,
  PrimaryButton,
  SoftCard,
} from "@/components/mini-diagnosis/steps/ui";
import { sfxCorrect } from "@/lib/exam-sfx";

const READING_LABELS_TH = [
  "ย่อหน้าที่หายไป",
  "ข้อมูลอยู่ตรงไหน",
  "ชื่อเรื่องที่ดีที่สุด",
  "ใจความสำคัญ",
] as const;

/**
 * Mini-diagnosis vocabulary + reading. Tap a blank in the passage → an options
 * sheet pops up → picking fills the blank. Vocab first, reading unlocks after.
 * Submits the same payload shape as VocabularyReadingMockExam aggregate mode:
 * { averageScore0To100, selected_answers, correct_answers, … }.
 */
export function MiniVocabReadingStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const exam = content as unknown as VocabularyReadingMockContent;
  const blocks = useMemo(() => getVocabularyReadingCombinedBlocks(exam), [exam]);
  const vocabCount = Math.min(6, exam.vocabularyQuestions?.length ?? 0);
  const missingIdx = vocabCount; // block index of the missing-paragraph question

  // Stable shuffled options per block.
  const shuffledOptions = useMemo(
    () => blocks.map((b) => shuffleMcOptions(b.options, b.correctAnswer).shuffled),
    [blocks],
  );

  /** answers[blockIdx] = user's pick ("" = unanswered). */
  const [answers, setAnswers] = useState<string[]>(() => blocks.map(() => ""));
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const answeredCount = answers.filter(Boolean).length;
  const vocabDone = answers.slice(0, vocabCount).every(Boolean);
  const missingDone = Boolean(answers[missingIdx]);
  const allDone = answeredCount >= blocks.length;

  const pick = (blockIdx: number, choice: string) => {
    setAnswers((prev) => {
      const next = prev.slice();
      next[blockIdx] = choice;
      return next;
    });
    setOpenIdx(null);
  };

  // Which vocab blocks map to a [BLANK n] token in the passage text.
  const blankTokens = useMemo(() => {
    const found = new Set<number>();
    const re = /\[BLANK\s*(\d+)\]/gi;
    for (const part of [exam.passage?.p1 ?? "", exam.passage?.p3 ?? ""]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(part)) !== null) {
        const n = Number(m[1]);
        if (n >= 1 && n <= vocabCount) found.add(n - 1);
      }
    }
    return found;
  }, [exam.passage?.p1, exam.passage?.p3, vocabCount]);

  /** Render a paragraph, replacing [BLANK n] with tappable chips. */
  const renderPassage = (text: string): ReactNode[] => {
    const re = /\[BLANK\s*(\d+)\]/gi;
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(<span key={`t${last}`}>{text.slice(last, m.index)}</span>);
      const n = Number(m[1]);
      const blockIdx = n - 1;
      const userPick = answers[blockIdx] ?? "";
      // After the missing paragraph is answered, lock blanks to the correct
      // words so the reading questions are judged against a correct passage
      // (same behavior as the mock component).
      const locked = missingDone;
      out.push(
        <BlankChip
          key={`b${m.index}`}
          number={n}
          value={locked ? blocks[blockIdx]?.correctAnswer ?? userPick : userPick}
          state={locked ? "locked" : userPick ? "filled" : "empty"}
          onClick={locked ? undefined : () => setOpenIdx(blockIdx)}
        />,
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(<span key={`t${last}e`}>{text.slice(last)}</span>);
    return out;
  };

  const openBlock = openIdx != null ? blocks[openIdx] : null;

  return (
    <div className="space-y-4">
      {/* progress chip */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">
          {vocabDone ? "ช่วงที่ 2 · การอ่าน" : "ช่วงที่ 1 · เติมคำศัพท์"}
        </p>
        <span className="rounded-full bg-ep-blue/10 px-3 py-1 font-mono text-xs font-bold text-ep-blue">
          {answeredCount}/{blocks.length}
        </span>
      </div>

      {/* Passage */}
      <SoftCard>
        {exam.titleEn?.trim() ? (
          <p className="mb-2 text-base font-bold text-slate-900">{exam.titleEn.trim()}</p>
        ) : null}
        <div className="space-y-3 text-[15px] leading-[1.9] text-slate-800">
          <p>{renderPassage(exam.passage?.p1 ?? "")}</p>
          {missingDone ? (
            <p className="rounded-xl border-l-4 border-ep-blue bg-blue-50/60 py-2 pl-3 pr-2">
              {exam.passage?.p2 ?? ""}
            </p>
          ) : (
            <button
              type="button"
              disabled={!vocabDone}
              onClick={() => setOpenIdx(missingIdx)}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm font-bold transition ${
                vocabDone
                  ? "animate-pulse border-ep-blue/60 bg-ep-yellow/20 text-ep-blue active:scale-[0.99]"
                  : "border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              {vocabDone ? "แตะเพื่อเลือกย่อหน้าที่หายไป" : "🔒 ย่อหน้าที่หายไป — เติมคำศัพท์ให้ครบก่อน"}
            </button>
          )}
          <p>{renderPassage(exam.passage?.p3 ?? "")}</p>
        </div>
      </SoftCard>

      {/* Vocab questions that don't map to a blank in the passage */}
      {Array.from({ length: vocabCount }).some((_, i) => !blankTokens.has(i)) ? (
        <div className="space-y-2">
          {Array.from({ length: vocabCount }).map((_, i) => {
            if (blankTokens.has(i)) return null;
            const done = Boolean(answers[i]);
            return (
              <QuestionCard
                key={i}
                label={`คำศัพท์ ข้อ ${i + 1}`}
                question={blocks[i]?.question ?? ""}
                answer={answers[i] ?? ""}
                locked={missingDone}
                done={done}
                onOpen={() => setOpenIdx(i)}
              />
            );
          })}
        </div>
      ) : null}

      {/* Reading questions (after missing paragraph) */}
      <div className="space-y-2">
        {blocks.slice(missingIdx + 1).map((b, i) => {
          const blockIdx = missingIdx + 1 + i;
          const enabled = missingDone;
          return (
            <QuestionCard
              key={blockIdx}
              label={`การอ่าน · ${READING_LABELS_TH[i + 1] ?? `ข้อ ${i + 2}`}`}
              question={b.question}
              answer={answers[blockIdx] ?? ""}
              done={Boolean(answers[blockIdx])}
              disabled={!enabled}
              onOpen={() => setOpenIdx(blockIdx)}
            />
          );
        })}
      </div>

      <PrimaryButton
        disabled={submitting || !allDone}
        onClick={() => {
          if (!allDone) return;
          let correct = 0;
          answers.forEach((picked, idx) => {
            if (picked && picked === blocks[idx]?.correctAnswer) correct += 1;
          });
          if (correct >= Math.ceil(blocks.length * 0.7)) sfxCorrect();
          onSubmit({
            averageScore0To100: blocks.length > 0 ? (correct / blocks.length) * 100 : 0,
            detail: {
              total: blocks.length,
              correct,
              vocabCount,
              readingCount: Math.max(0, blocks.length - vocabCount),
            },
            selected_answers: answers,
            correct_answers: blocks.map((b) => b.correctAnswer),
            question_prompts: blocks.map((b) => b.question),
          });
        }}
      >
        {submitting ? "กำลังส่ง…" : allDone ? "ส่งคำตอบทั้งหมด" : `ตอบให้ครบก่อนนะ (เหลือ ${blocks.length - answeredCount} ข้อ)`}
      </PrimaryButton>

      {/* Options sheet */}
      <BottomSheet
        open={openIdx != null}
        title={openBlock?.question ?? ""}
        onClose={() => setOpenIdx(null)}
      >
        <div className="space-y-2">
          {openIdx != null
            ? (shuffledOptions[openIdx] ?? []).map((opt) => (
                <OptionPill
                  key={opt}
                  label={opt}
                  active={answers[openIdx] === opt}
                  disabled={submitting}
                  onClick={() => pick(openIdx, opt)}
                />
              ))
            : null}
        </div>
      </BottomSheet>
    </div>
  );
}

function QuestionCard({
  label,
  question,
  answer,
  done,
  disabled = false,
  locked = false,
  onOpen,
}: {
  label: string;
  question: string;
  answer: string;
  done: boolean;
  disabled?: boolean;
  locked?: boolean;
  onOpen: () => void;
}) {
  const interactive = !disabled && !locked;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onOpen}
      className={`w-full rounded-2xl border-2 p-3.5 text-left transition ${
        done
          ? "border-emerald-200 bg-emerald-50/70"
          : disabled
            ? "border-slate-200 bg-slate-50 opacity-60"
            : "border-slate-200 bg-white hover:border-ep-blue/40 active:scale-[0.99]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {done ? (
          <span className="text-emerald-600" aria-hidden>
            ✓
          </span>
        ) : disabled ? (
          <span aria-hidden>🔒</span>
        ) : (
          <span className="rounded-full bg-ep-yellow/40 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            แตะเพื่อตอบ
          </span>
        )}
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-800">{question}</p>
      {done ? <p className="mt-1 text-sm font-bold text-emerald-700">{answer}</p> : null}
    </button>
  );
}
