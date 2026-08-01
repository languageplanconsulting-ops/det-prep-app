"use client";

import { useMemo, useState } from "react";

import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";
import { PhotoSpeakReportView } from "@/components/photo-speak/PhotoSpeakReportView";
import { ReadWriteSession } from "@/components/writing/ReadWriteSession";
import { WritingReportView } from "@/components/writing/WritingReportView";
import { ReadSpeakSession } from "@/components/speaking/ReadSpeakSession";
import { SpeakingReportView } from "@/components/speaking/SpeakingReportView";
import { Frame } from "@/components/course/InlineExercise";
import { questionsFor } from "@/lib/course-plan/question-sets";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import type { WritingAttemptReport } from "@/types/writing";
import type { SpeakingAttemptReport, SpeakingRoundNum } from "@/types/speaking";

type ProductionTaskType =
  | "write_about_photo"
  | "speak_about_photo"
  | "read_and_write"
  | "read_then_speak";

type AnyReport = PhotoSpeakAttemptReport | WritingAttemptReport | SpeakingAttemptReport;

/**
 * The full Gemini-graded production assessments (real photo/topic submission,
 * scored against a min-score gate) — run inline via the same session and
 * report components the standalone practice pages use, so a learner never
 * leaves the course journey to submit or to read their report, and every
 * existing notebook-save button on the report keeps working unmodified.
 */
export function ProductionExerciseRunner({
  exerciseKey,
  taskType,
  titleTh,
  onDone,
  onCancel,
  hasNext = true,
}: {
  exerciseKey: string;
  taskType: ProductionTaskType;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  hasNext?: boolean;
}) {
  const refs = useMemo(() => questionsFor(exerciseKey), [exerciseKey]);
  const [index, setIndex] = useState(0);
  const [report, setReport] = useState<AnyReport | null>(null);
  const [scores, setScores] = useState<number[]>([]);

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

  const ref = refs[index]!;
  const isLastRef = index + 1 >= total;

  function finishAll(finalScores: number[]) {
    const avg = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    const correct = Math.round((avg / 160) * total);
    onDone(correct, total);
  }

  function advance(score160: number) {
    const nextScores = [...scores, score160];
    setScores(nextScores);
    setReport(null);
    if (isLastRef) {
      finishAll(nextScores);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (report) {
    return (
      <div className="space-y-4">
        {taskType === "write_about_photo" || taskType === "speak_about_photo" ? (
          <PhotoSpeakReportView report={report as PhotoSpeakAttemptReport} />
        ) : taskType === "read_and_write" ? (
          <WritingReportView report={report as WritingAttemptReport} />
        ) : (
          <SpeakingReportView report={report as SpeakingAttemptReport} />
        )}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => advance(report.score160)}
            className={`w-full rounded-full py-3 text-sm font-black text-white ${
              hasNext || !isLastRef ? "bg-[#004AAD]" : "bg-emerald-600"
            }`}
          >
            {isLastRef && !hasNext ? "จบของวันนี้ 🎉" : "แบบฝึกถัดไป →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={total > 1 ? `${index + 1}/${total}` : undefined}>
      {taskType === "write_about_photo" || taskType === "speak_about_photo" ? (
        <PhotoAssessmentSession
          mode={taskType === "speak_about_photo" ? "speak" : "write"}
          itemId={ref}
          embedded
          onComplete={setReport}
        />
      ) : null}
      {taskType === "read_and_write" ? (
        <ReadWriteSession topicId={ref} embedded onComplete={setReport} />
      ) : null}
      {taskType === "read_then_speak" ? (
        <ReadSpeakSpread itemRef={ref} onComplete={setReport} />
      ) : null}
    </Frame>
  );
}

/** Splits the generator's fixed "topicId::questionId::round" ref apart. */
function ReadSpeakSpread({
  itemRef,
  onComplete,
}: {
  itemRef: string;
  onComplete: (report: SpeakingAttemptReport) => void;
}) {
  const [topicId, questionId, roundRaw] = itemRef.split("::");
  const round = (Number.parseInt(roundRaw ?? "1", 10) || 1) as SpeakingRoundNum;
  return (
    <ReadSpeakSession
      topicId={topicId!}
      round={round}
      presetQuestionId={questionId}
      embedded
      onComplete={onComplete}
    />
  );
}
