"use client";

import { useEffect, useMemo, useState } from "react";

import { Frame } from "@/components/course/InlineExercise";
import { ConversationSessionClient } from "@/components/conversation/ConversationSessionClient";
import { DialogueSummarySessionClient } from "@/components/dialogue-summary/DialogueSummarySessionClient";
import { InteractiveSpeakingSession } from "@/components/interactive-speaking/InteractiveSpeakingSession";
import { InteractiveSpeakingReportView } from "@/components/interactive-speaking/InteractiveSpeakingReportView";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { questionsFor } from "@/lib/course-plan/question-sets";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { hydrateConversationExamForPlayback } from "@/lib/conversation-audio-hydrate";
import { getConversationExam } from "@/lib/conversation-storage";
import { getDialogueSummaryVisibleExam } from "@/lib/dialogue-summary-storage";
import { getInteractiveSpeakingScenarioById } from "@/lib/interactive-speaking-storage";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";
import type { DialogueSummaryExam } from "@/types/dialogue-summary";
import type {
  InteractiveSpeakingAttemptReport,
} from "@/types/interactive-speaking";
import type { DialogueSummaryAttemptReport } from "@/types/dialogue-summary";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

type InteractiveTaskType =
  | "interactive_speaking"
  | "interactive_conversation_mcq"
  | "dialogue_summary";

/** Parse "1:easy:3" conversation refs. */
function parseConvRef(ref: string): {
  round: number;
  difficulty: ConversationDifficulty;
  setNumber: number;
} | null {
  const m = ref.match(/^(\d+):(easy|medium|hard):(\d+)$/);
  if (!m) return null;
  return {
    round: Number(m[1]),
    difficulty: m[2] as ConversationDifficulty,
    setNumber: Number(m[3]),
  };
}

/** Parse dialogue-summary exam id `ds-r1-easy-s01`. */
function parseDsRef(ref: string): {
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
} | null {
  const m = ref.match(/^ds-r(\d+)-(easy|medium|hard)-s(\d+)$/i);
  if (!m) return null;
  return {
    round: Number(m[1]) as DialogueSummaryRoundNum,
    difficulty: m[2].toLowerCase() as DialogueSummaryDifficulty,
    setNumber: Number(m[3]),
  };
}

/**
 * Course-journey runner for interactive speaking, interactive conversation,
 * and dialogue summary — fixed refs from question-sets, report stays in the
 * session modal (no jump to /practice/...).
 */
export function InteractiveCourseRunner({
  exerciseKey,
  taskType,
  titleTh,
  onDone,
  onCancel,
  hasNext = true,
}: {
  exerciseKey: string;
  taskType: InteractiveTaskType;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  hasNext?: boolean;
}) {
  const refs = useMemo(() => questionsFor(exerciseKey), [exerciseKey]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [isReport, setIsReport] = useState<InteractiveSpeakingAttemptReport | null>(null);

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
        <LuxuryLoader label="Loading practice content…" />
      </Frame>
    );
  }

  const ref = refs[index]!;
  const isLast = index + 1 >= total;
  const progress = total > 1 ? `${index + 1}/${total}` : undefined;

  function finishAll(finalScores: number[]) {
    if (taskType === "interactive_conversation_mcq") {
      const correct = finalScores.reduce((a, b) => a + b, 0);
      const tot = finalScores.length * 8; // conversation has 8 scored steps
      onDone(correct, Math.max(tot, 1));
      return;
    }
    // Speaking / dialogue summary: average score160 → approximate correct/total.
    const avg = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    const correct = Math.round((avg / 160) * total);
    onDone(correct, total);
  }

  function advanceWithScore(score: number) {
    const nextScores = [...scores, score];
    setScores(nextScores);
    setIsReport(null);
    if (isLast) finishAll(nextScores);
    else setIndex((i) => i + 1);
  }

  if (taskType === "interactive_speaking") {
    if (isReport) {
      return (
        <div className="space-y-4">
          <InteractiveSpeakingReportView report={isReport} embedded />
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => advanceWithScore(isReport.score160)}
              className={`w-full rounded-full py-3 text-sm font-black text-white ${
                hasNext || !isLast ? "bg-[#004AAD]" : "bg-emerald-600"
              }`}
            >
              {isLast && !hasNext ? "จบของวันนี้ 🎉" : "แบบฝึกถัดไป →"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <SpeakingSlot
        scenarioId={ref}
        titleTh={titleTh}
        progress={progress}
        onCancel={onCancel}
        onComplete={setIsReport}
      />
    );
  }

  if (taskType === "interactive_conversation_mcq") {
    return (
      <ConversationSlot
        refKey={ref}
        titleTh={titleTh}
        progress={progress}
        onCancel={onCancel}
        onComplete={(correct) => advanceWithScore(correct)}
      />
    );
  }

  return (
    <DialogueSlot
      examId={ref}
      titleTh={titleTh}
      progress={progress}
      onCancel={onCancel}
      onComplete={(report) => advanceWithScore(report.score160)}
    />
  );
}

function SpeakingSlot({
  scenarioId,
  titleTh,
  progress,
  onCancel,
  onComplete,
}: {
  scenarioId: string;
  titleTh: string;
  progress?: string;
  onCancel: () => void;
  onComplete: (report: InteractiveSpeakingAttemptReport) => void;
}) {
  const scenario = getInteractiveSpeakingScenarioById(scenarioId);
  if (!scenario) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          ไม่พบสถานการณ์ “{scenarioId}” ในคลัง — ซิงก์ content bank แล้วลองใหม่
        </p>
      </Frame>
    );
  }
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
        <p className="text-[12px] font-black text-slate-700">{titleTh}</p>
        <div className="flex items-center gap-2">
          {progress ? <span className="text-[11px] font-bold text-slate-400">{progress}</span> : null}
          <button type="button" onClick={onCancel} className="text-[11px] font-bold text-slate-400">
            ปิด
          </button>
        </div>
      </div>
      <InteractiveSpeakingSession scenario={scenario} embedded onComplete={onComplete} />
    </div>
  );
}

function ConversationSlot({
  refKey,
  titleTh,
  progress,
  onCancel,
  onComplete,
}: {
  refKey: string;
  titleTh: string;
  progress?: string;
  onCancel: () => void;
  onComplete: (correct: number) => void;
}) {
  const parsed = parseConvRef(refKey);
  const [exam, setExam] = useState<ConversationExam | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!parsed) {
        setExam(null);
        return;
      }
      const raw = getConversationExam(parsed.round, parsed.difficulty, parsed.setNumber);
      if (!raw) {
        if (!cancelled) setExam(null);
        return;
      }
      try {
        const h = await hydrateConversationExamForPlayback(raw);
        if (!cancelled) setExam(h);
      } catch {
        if (!cancelled) setExam(raw);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refKey]); // eslint-disable-line react-hooks/exhaustive-deps -- refKey encodes parsed fields

  if (exam === undefined) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <LuxuryLoader label="Loading conversation…" />
      </Frame>
    );
  }
  if (!parsed || !exam) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          ไม่พบชุดสนทนา “{refKey}” ในคลัง
        </p>
      </Frame>
    );
  }
  return (
    <div className="relative p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-black text-slate-700">{titleTh}</p>
        <div className="flex items-center gap-2">
          {progress ? <span className="text-[11px] font-bold text-slate-400">{progress}</span> : null}
          <button type="button" onClick={onCancel} className="text-[11px] font-bold text-slate-400">
            ปิด
          </button>
        </div>
      </div>
      <ConversationSessionClient
        exam={exam}
        round={parsed.round}
        difficulty={parsed.difficulty}
        setNumber={parsed.setNumber}
        embedded
        onComplete={(correct) => onComplete(correct)}
      />
    </div>
  );
}

function DialogueSlot({
  examId,
  titleTh,
  progress,
  onCancel,
  onComplete,
}: {
  examId: string;
  titleTh: string;
  progress?: string;
  onCancel: () => void;
  onComplete: (report: DialogueSummaryAttemptReport) => void;
}) {
  const parsed = parseDsRef(examId);
  const [exam, setExam] = useState<DialogueSummaryExam | null | undefined>(undefined);

  useEffect(() => {
    if (!parsed) {
      setExam(null);
      return;
    }
    setExam(getDialogueSummaryVisibleExam(parsed.round, parsed.difficulty, parsed.setNumber) ?? null);
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (exam === undefined) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <LuxuryLoader label="Loading dialogue summary…" />
      </Frame>
    );
  }
  if (!exam) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
          ไม่พบชุดสรุปบทสนทนา “{examId}” ในคลัง
        </p>
      </Frame>
    );
  }
  return (
    <div className="relative p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-black text-slate-700">{titleTh}</p>
        <div className="flex items-center gap-2">
          {progress ? <span className="text-[11px] font-bold text-slate-400">{progress}</span> : null}
          <button type="button" onClick={onCancel} className="text-[11px] font-bold text-slate-400">
            ปิด
          </button>
        </div>
      </div>
      <DialogueSummarySessionClient exam={exam} embedded onComplete={onComplete} />
    </div>
  );
}
