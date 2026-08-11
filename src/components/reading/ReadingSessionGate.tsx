"use client";

import Link from "next/link";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { InteractiveReadingRunner } from "@/components/reading/InteractiveReadingRunner";
import { irSetsByTier, type IrTier } from "@/lib/interactive-reading";
import { READING_DIFFICULTY_MAX } from "@/lib/reading-constants";
import { saveReadingAttempt } from "@/lib/reading-storage";

export function ReadingSessionGate({
  round,
  difficulty,
  setNumber,
  examNumber,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
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
      />
    </StudySessionBoundary>
  );
}

/**
 * The exam runs the REAL Interactive Reading task — all six steps, on the validated bank.
 *
 * It cannot run the exam's own uploaded content and still be faithful: an exam unit has no cloze
 * data, offers four options where the real task offers five, and its `mainIdea` block is built on
 * the opposite logic to the real "select the idea that is expressed" question — its wrong answers
 * are TRUE details from the passage, which is title-question logic. Relabelling it would teach a
 * rule the real test punishes. So the exam serves the bank that was authored and validated against
 * the measured spec. The old exam content is left in storage, untouched.
 */
function ReadingExamRunner({
  round,
  difficulty,
  setNumber,
  examNumber,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
}) {
  const tier: IrTier = difficulty === "easy" ? "easy" : difficulty === "hard" ? "advanced" : "medium";
  const pool = irSetsByTier(tier);
  const backHref = `/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}`;
  if (!pool.length) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <p className="font-bold text-slate-800">ยังไม่มีบทอ่านในระดับนี้</p>
        <Link href={backHref} className="mt-3 inline-block text-sm font-bold text-[#004AAD]">
          กลับไปเลือกข้อสอบ
        </Link>
      </div>
    );
  }
  // deterministic: the same round/set/exam always opens the same passage
  const idx = (((round - 1) * 97 + (setNumber - 1) * 13 + (examNumber - 1)) % pool.length + pool.length) % pool.length;
  return (
    <InteractiveReadingRunner
      sets={[pool[idx]!]}
      // Reading comprehension is the four reading questions only: the missing paragraph, the two
      // highlight questions, the idea expressed and the best title. The word-fill step is the
      // VOCABULARY exercise and lives under /practice/comprehension/vocabulary — running it here
      // too would make a learner do the same task twice under two different names.
      steps={[1, 2, 3, 4, 5]}
      progressTopic="reading-exam"
      backHref={backHref}
      celebrateTitle="จบข้อสอบแล้ว!"
      celebrateSub="รูปแบบเดียวกับ Interactive Reading ในข้อสอบจริงครบทั้ง 6 ขั้นตอน"
      hostOwnsProgress
      onFinish={(results) => {
        // The exam keeps its own progress store: it drives the tick on the exam list, the round
        // stats, and the server-side practice log the study plan reads. Swapping the runner in
        // dropped both until this was restored.
        const maxScore = READING_DIFFICULTY_MAX[difficulty];
        const total = results.length || 1;
        const correctCount = results.reduce((a, r) => a + r.score, 0);
        saveReadingAttempt({
          round,
          difficulty,
          setNumber,
          examNumber,
          attainedScore: Math.round((correctCount / total) * maxScore),
          maxScore,
          correctCount: Math.round(correctCount),
        });
      }}
    />
  );
}
