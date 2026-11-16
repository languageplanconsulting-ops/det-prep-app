"use client";

import Link from "next/link";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { InteractiveReadingRunner, type IrStepResult } from "@/components/reading/InteractiveReadingRunner";
import { IR_STEP_COUNT, type IrSet } from "@/lib/interactive-reading";
import { READING_DIFFICULTY_MAX } from "@/lib/reading-constants";
import { saveReadingAttempt } from "@/lib/reading-storage";

export function ReadingSessionGate({
  round,
  difficulty,
  setNumber,
  examNumber,
  irSet,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  /** Picked on the server with `pickReadingExamIrSet`. */
  irSet: IrSet | null;
}) {
  return (
    <StudySessionBoundary
      skill="comprehension"
      exerciseType="reading"
      difficulty={difficulty}
      setId={`read-r${round}-${difficulty}-s${setNumber}-e${examNumber}`}
    >
      <ReadingExamRunner
        key={`${round}-${difficulty}-${setNumber}-${examNumber}`}
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        examNumber={examNumber}
        irSet={irSet}
      />
    </StudySessionBoundary>
  );
}

/**
 * The exam runs the REAL Interactive Reading task — all six steps, in DET's order, on one clock:
 * word-fill, missing sentence, two highlights, the idea expressed and the best title.
 *
 * It cannot run the exam's own uploaded content and still be faithful: an exam unit has no cloze
 * data, offers four options where the real task offers five, and its `mainIdea` block is built on
 * the opposite logic to the real "select the idea that is expressed" question — its wrong answers
 * are TRUE details from the passage, which is title-question logic. Relabelling it would teach a
 * rule the real test punishes. So the exam serves the bank that was authored and validated against
 * the measured spec. The old exam content is left in storage, untouched.
 *
 * The passage is picked on the server by `pickReadingExamIrSet` (the same function the mobile app's
 * API route uses, so both open the same text) and only that one set is shipped to the browser.
 *
 * Step 1 (word-fill) used to be left out here because the vocabulary exercise also runs it. The real
 * task opens with it, and the exam is meant to be the real task, so it is back; the vocabulary
 * exercise is unchanged.
 */
function ReadingExamRunner({
  round,
  difficulty,
  setNumber,
  examNumber,
  irSet,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  irSet: IrSet | null;
}) {
  const backHref = `/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}`;
  if (!irSet) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <p className="font-bold text-slate-800">ยังไม่มีบทอ่านในระดับนี้</p>
        <Link href={backHref} className="mt-3 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปเลือกข้อสอบ
        </Link>
      </div>
    );
  }
  // Score = mean of the six step scores (word-fill is partial credit per blank), scaled to the
  // difficulty's max. Unanswered steps — a time-up — count as 0 out of the full six.
  const save = (results: IrStepResult[]) => {
    const maxScore = READING_DIFFICULTY_MAX[difficulty];
    const earned = results.reduce((a, r) => a + r.score, 0);
    saveReadingAttempt({
      round,
      difficulty,
      setNumber,
      examNumber,
      attainedScore: Math.round((earned / IR_STEP_COUNT) * maxScore),
      maxScore,
      correctCount: Math.round(earned),
      total: IR_STEP_COUNT,
    });
  };
  return (
    <InteractiveReadingRunner
      sets={[irSet]}
      progressTopic="reading-exam"
      backHref={backHref}
      celebrateTitle="จบข้อสอบแล้ว!"
      celebrateSub="รูปแบบเดียวกับ Interactive Reading ในข้อสอบจริงครบทั้ง 6 ขั้นตอน"
      hostOwnsProgress
      // The exam keeps its own progress store: it drives the tick on the exam list, the round
      // stats, and the server-side practice log the study plan reads.
      onFinish={save}
      // the clock ran out: hand in what was answered, like DET does
      onTimeUp={save}
    />
  );
}
