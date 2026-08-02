"use client";

import { useEffect, useMemo, useState } from "react";

import { Frame } from "@/components/course/InlineExercise";
import { ReadingSessionClient } from "@/components/reading/ReadingSessionClient";
import { VocabSessionClient } from "@/components/vocab/VocabSessionClient";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { questionsFor } from "@/lib/course-plan/question-sets";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import {
  getReadingExamFromSet,
  getReadingVisibleSetByNumber,
} from "@/lib/reading-storage";
import { getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import type { ReadingDifficulty, ReadingExamUnit, ReadingRoundNum } from "@/types/reading";
import type { VocabPassageUnit, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

type ComprehensionTaskType = "reading_comprehension" | "vocabulary_reading";

/** Reading ref: "round:difficulty:setNumber:examNumber" e.g. 1:easy:1:3 */
function parseReadingRef(ref: string): {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
} | null {
  const m = ref.match(/^(\d+):(easy|medium|hard):(\d+):(\d+)$/);
  if (!m) return null;
  return {
    round: Number(m[1]) as ReadingRoundNum,
    difficulty: m[2] as ReadingDifficulty,
    setNumber: Number(m[3]),
    examNumber: Number(m[4]),
  };
}

/** Vocab ref: "round:setNumber:level:passageNumber" e.g. 1:1:easy:2 */
function parseVocabRef(ref: string): {
  round: VocabRoundNum;
  setNumber: number;
  sessionLevel: VocabSessionLevel;
  passageNumber: number;
} | null {
  const m = ref.match(/^(\d+):(\d+):(easy|medium|hard):(\d+)$/);
  if (!m) return null;
  return {
    round: Number(m[1]) as VocabRoundNum,
    setNumber: Number(m[2]),
    sessionLevel: m[3] as VocabSessionLevel,
    passageNumber: Number(m[4]),
  };
}

/**
 * Course runner for reading + vocab exams — right/wrong report only, no AI
 * grading. Reuses the same session + report components as /practice.
 */
export function ComprehensionExamRunner({
  exerciseKey,
  taskType,
  titleTh,
  onDone,
  onCancel,
  hasNext = true,
}: {
  exerciseKey: string;
  taskType: ComprehensionTaskType;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  hasNext?: boolean;
}) {
  const refs = useMemo(() => questionsFor(exerciseKey), [exerciseKey]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  /** Score for the current item — set when the exam finishes; continue advances. */
  const [pendingScore, setPendingScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureCanonicalPracticeContent();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset pending when the slot changes.
  useEffect(() => {
    setPendingScore(null);
  }, [index]);

  const total = refs.length;

  if (total === 0) {
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          แบบฝึกนี้ยังไม่มีโจทย์ที่กำหนดไว้ — ทำเครื่องหมายว่าเรียบร้อยแล้วไปต่อได้เลย
        </p>
        <button
          type="button"
          onClick={() => onDone(1, 1)}
          className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-black text-white"
        >
          ทำเสร็จแล้ว ทำเครื่องหมายว่าเรียบร้อย
        </button>
      </Frame>
    );
  }

  if (!ready) {
    return (
      <Frame title={titleTh} onCancel={onCancel}>
        <LuxuryLoader label="Loading exam…" />
      </Frame>
    );
  }

  const ref = refs[index]!;
  const isLast = index + 1 >= total;
  const progress = total > 1 ? `${index + 1}/${total}` : undefined;

  function finishAll(finalScores: number[]) {
    // Each exam is scored 0–100 pct; treat ≥50% as "correct" for the session badge.
    const correct = finalScores.filter((p) => p >= 50).length;
    onDone(correct, total);
  }

  function advance(scorePct: number) {
    const nextScores = [...scores, scorePct];
    setScores(nextScores);
    setPendingScore(null);
    if (isLast) finishAll(nextScores);
    else setIndex((i) => i + 1);
  }

  return (
    <div className="relative space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-black text-slate-700">{titleTh}</p>
        <div className="flex items-center gap-2">
          {progress ? <span className="text-[11px] font-bold text-slate-400">{progress}</span> : null}
          <button type="button" onClick={onCancel} className="text-[11px] font-bold text-slate-400">
            ปิด
          </button>
        </div>
      </div>

      {taskType === "reading_comprehension" ? (
        <ReadingSlot
          refKey={ref}
          onScored={(pct) => setPendingScore(pct)}
        />
      ) : (
        <VocabSlot
          refKey={ref}
          onScored={(pct) => setPendingScore(pct)}
        />
      )}

      {pendingScore !== null ? (
        <button
          type="button"
          onClick={() => advance(pendingScore)}
          className={`w-full rounded-full py-3 text-sm font-black text-white ${
            hasNext || !isLast ? "bg-[#004AAD]" : "bg-emerald-600"
          }`}
        >
          {isLast && !hasNext ? "จบของวันนี้ 🎉" : "แบบฝึกถัดไป →"}
        </button>
      ) : null}
    </div>
  );
}

function ReadingSlot({
  refKey,
  onScored,
}: {
  refKey: string;
  onScored: (scorePct: number) => void;
}) {
  const parsed = parseReadingRef(refKey);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; exam: ReadingExamUnit; totalExams: number }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      if (!parsed) {
        setState({ status: "error", message: `รูปแบบโจทย์ไม่ถูกต้อง: ${refKey}` });
        return;
      }
      await ensureCanonicalPracticeContent();
      if (cancelled) return;
      const set = getReadingVisibleSetByNumber(parsed.round, parsed.difficulty, parsed.setNumber);
      const totalExams = set?.exams.length ?? 0;
      const exam = set ? getReadingExamFromSet(set, parsed.examNumber) : undefined;
      if (!exam) {
        setState({
          status: "error",
          message: `ไม่พบข้อสอบอ่าน ${refKey}`,
        });
        return;
      }
      setState({ status: "ready", exam, totalExams });
    })();
    return () => {
      cancelled = true;
    };
  }, [refKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === "loading") return <LuxuryLoader label="Loading reading exam…" />;
  if (state.status === "error") {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
        {state.message}
      </p>
    );
  }
  if (!parsed) return null;

  return (
    <ReadingSessionClient
      key={refKey}
      round={parsed.round}
      difficulty={parsed.difficulty}
      setNumber={parsed.setNumber}
      examNumber={parsed.examNumber}
      readingExam={state.exam}
      totalExams={state.totalExams}
      onRunnerComplete={(scorePct) => onScored(scorePct)}
    />
  );
}

function VocabSlot({
  refKey,
  onScored,
}: {
  refKey: string;
  onScored: (scorePct: number) => void;
}) {
  const parsed = parseVocabRef(refKey);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; passage: VocabPassageUnit }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      if (!parsed) {
        setState({ status: "error", message: `รูปแบบโจทย์ไม่ถูกต้อง: ${refKey}` });
        return;
      }
      await ensureCanonicalPracticeContent();
      if (cancelled) return;
      const set = getVocabVisibleSetByNumber(parsed.setNumber, parsed.round);
      const passage = set?.passages.find(
        (p) =>
          p.contentLevel === parsed.sessionLevel && p.passageNumber === parsed.passageNumber,
      );
      if (!passage) {
        setState({ status: "error", message: `ไม่พบข้อสอบศัพท์ ${refKey}` });
        return;
      }
      setState({ status: "ready", passage });
    })();
    return () => {
      cancelled = true;
    };
  }, [refKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === "loading") return <LuxuryLoader label="Loading vocab exam…" />;
  if (state.status === "error") {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
        {state.message}
      </p>
    );
  }
  if (!parsed) return null;

  return (
    <VocabSessionClient
      key={refKey}
      round={parsed.round}
      sessionLevel={parsed.sessionLevel}
      setNumber={parsed.setNumber}
      passageNumber={parsed.passageNumber}
      passage={state.passage}
      nextPassageNumber={null}
      onRunnerComplete={(scorePct) => onScored(scorePct)}
    />
  );
}
