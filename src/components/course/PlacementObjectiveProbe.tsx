"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Frame, InlineExercise } from "@/components/course/InlineExercise";
import { ReadingSessionClient } from "@/components/reading/ReadingSessionClient";
import { VocabSessionClient } from "@/components/vocab/VocabSessionClient";
import { ConversationSessionClient } from "@/components/conversation/ConversationSessionClient";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { hydrateConversationExamForPlayback } from "@/lib/conversation-audio-hydrate";
import { getConversationExam } from "@/lib/conversation-storage";
import { diffDictationChars } from "@/lib/dictation-diff";
import { dictationByTier, type DictationLesson, type DictationTier } from "@/lib/dictation-lessons";
import { exercisesForLevel } from "@/lib/grammar-fitb";
import { speakLesson, type LessonPlayer } from "@/lib/lesson-audio";
import { realWordByTier, type RealWordTier } from "@/lib/realword-lesson";
import { getReadingExamFromSet, getReadingVisibleSetByNumber } from "@/lib/reading-storage";
import { getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import { TASK_LABEL_TH } from "@/lib/course-plan/categories";
import {
  nextProbe,
  placementFor,
  OBJECTIVE_PLACEMENT_TASKS,
  type ProbeResult,
} from "@/lib/course-plan/placement";
import { rung, RUNG_TH, type RungLevel } from "@/lib/course-plan/rungs";
import type { ConversationExam } from "@/types/conversation";
import type { ReadingExamUnit } from "@/types/reading";
import type { VocabPassageUnit } from "@/types/vocab";

export type ObjectiveTaskType = (typeof OBJECTIVE_PLACEMENT_TASKS)[number];

/** The content banks predate rungs.ts and still call the top tier "advanced". */
function toDictationTier(level: RungLevel): DictationTier {
  return level === "hard" ? "advanced" : level;
}
function toRealWordTier(level: RungLevel): RealWordTier {
  return level === "hard" ? "advanced" : level;
}

/**
 * Walks one skill's 2-item-per-level ladder (see placement.ts) and reports the
 * settled level once it stops climbing. Pure UI — persistence is the caller's
 * job (PlacementRunner), so a skill can be resumed just by not calling this
 * again once its row already exists.
 */
export function PlacementObjectiveProbe({
  taskType,
  onSettled,
  onSkip,
}: {
  taskType: ObjectiveTaskType;
  onSettled: (level: RungLevel, lastScore160: number) => void;
  onSkip: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [itemIndex, setItemIndex] = useState<0 | 1>(0);
  const [levelCorrect, setLevelCorrect] = useState(0);

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

  const step = useMemo(() => nextProbe(taskType, results), [taskType, results]);

  useEffect(() => {
    if (step) return;
    const level = placementFor(taskType, results);
    onSettled(level, rung(level).entryScore);
    // Settled — the parent swaps this probe out once it advances to the next skill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!ready || !step) {
    return <LuxuryLoader label="กำลังเตรียมแบบวัดระดับ…" />;
  }

  function recordItem(correct: boolean) {
    const nowCorrect = levelCorrect + (correct ? 1 : 0);
    if (itemIndex === 0) {
      setLevelCorrect(nowCorrect);
      setItemIndex(1);
      return;
    }
    setResults((prev) => [...prev, { taskType, level: step!.level, correct: nowCorrect, total: 2 }]);
    setLevelCorrect(0);
    setItemIndex(0);
  }

  const titleTh = `${TASK_LABEL_TH[taskType] ?? taskType} · ระดับ${RUNG_TH[step.level]}`;
  const progress = `ข้อ ${itemIndex + 1}/2`;

  return (
    <ProbeItem
      key={`${taskType}-${step.level}-${itemIndex}`}
      taskType={taskType}
      level={step.level}
      itemIndex={itemIndex}
      titleTh={titleTh}
      progress={progress}
      onGraded={recordItem}
      onCancel={onSkip}
    />
  );
}

function ProbeItem({
  taskType,
  level,
  itemIndex,
  titleTh,
  progress,
  onGraded,
  onCancel,
}: {
  taskType: ObjectiveTaskType;
  level: RungLevel;
  itemIndex: 0 | 1;
  titleTh: string;
  progress: string;
  onGraded: (correct: boolean) => void;
  onCancel: () => void;
}) {
  if (taskType === "real_english_word") {
    const item = realWordByTier(toRealWordTier(level))[itemIndex];
    if (!item) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;
    return (
      <InlineExercise
        exerciseKey={`placement-${taskType}-${level}-${itemIndex}`}
        taskType={taskType}
        titleTh={titleTh}
        content={{ kind: "realword", items: [item] }}
        singleAttempt
        onDone={(correct) => onGraded(correct > 0)}
        onCancel={onCancel}
      />
    );
  }

  if (taskType === "fill_in_blanks") {
    const item = exercisesForLevel(level)[itemIndex];
    if (!item) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;
    return (
      <InlineExercise
        exerciseKey={`placement-${taskType}-${level}-${itemIndex}`}
        taskType={taskType}
        titleTh={titleTh}
        content={{ kind: "grammar", items: [item] }}
        singleAttempt
        onDone={(correct) => onGraded(correct > 0)}
        onCancel={onCancel}
      />
    );
  }

  if (taskType === "dictation") {
    const item = dictationByTier(toDictationTier(level))[itemIndex];
    if (!item) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;
    return (
      <DictationProbeItem
        item={item}
        titleTh={titleTh}
        progress={progress}
        onGraded={onGraded}
        onCancel={onCancel}
      />
    );
  }

  if (taskType === "reading_comprehension") {
    return (
      <ReadingProbeSlot
        level={level}
        examNumber={itemIndex + 1}
        titleTh={titleTh}
        progress={progress}
        onGraded={onGraded}
        onCancel={onCancel}
      />
    );
  }

  if (taskType === "vocabulary_reading") {
    return (
      <VocabProbeSlot
        level={level}
        passageNumber={itemIndex + 1}
        titleTh={titleTh}
        progress={progress}
        onGraded={onGraded}
        onCancel={onCancel}
      />
    );
  }

  // interactive_conversation_mcq
  return (
    <ConversationProbeSlot
      level={level}
      setNumber={itemIndex + 1}
      titleTh={titleTh}
      progress={progress}
      onGraded={onGraded}
      onCancel={onCancel}
    />
  );
}

/** The bank has fewer than 2 items at this level — don't get stuck, count it as a pass. */
function EmptyBank({
  titleTh,
  onCancel,
  onGraded,
}: {
  titleTh: string;
  onCancel: () => void;
  onGraded: (correct: boolean) => void;
}) {
  return (
    <Frame title={titleTh} onCancel={onCancel}>
      <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
        ยังไม่มีโจทย์ระดับนี้ในคลัง — ข้ามข้อนี้ไปก่อน
      </p>
      <button
        type="button"
        onClick={() => onGraded(true)}
        className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white"
      >
        ไปข้อต่อไป →
      </button>
    </Frame>
  );
}

/**
 * Plain typed-transcription dictation, deliberately not the drag-token
 * DictationItem used elsewhere in the course — a placement probe grades on
 * the app's real dictation policy (diffDictationChars: only the comma among
 * punctuation counts) rather than the token-arrangement mechanic, and it is
 * single-shot by construction (no retry loop).
 */
function DictationProbeItem({
  item,
  titleTh,
  progress,
  onGraded,
  onCancel,
}: {
  item: DictationLesson;
  titleTh: string;
  progress: string;
  onGraded: (correct: boolean) => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const player = useRef<LessonPlayer | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    player.current?.remove();
    const p = speakLesson(item.answer);
    player.current = p;
    autoplayTimer.current = setTimeout(() => {
      autoplayTimer.current = null;
      p.play();
    }, 350);
    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
      p.remove();
    };
  }, [item.answer]);

  function check() {
    const diff = diffDictationChars(item.answer, typed);
    setChecked(diff.totalChars > 0 && diff.correctChars === diff.totalChars);
  }

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={progress}>
      <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500 ring-1 ring-slate-200">
        ฟังประโยค แล้วพิมพ์ตามที่ได้ยิน
      </p>
      <button
        type="button"
        onClick={() => player.current?.play()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-white"
      >
        🔊 ฟังอีกครั้ง
      </button>
      <textarea
        value={typed}
        disabled={checked !== null}
        onChange={(e) => setTyped(e.target.value)}
        rows={3}
        placeholder="พิมพ์สิ่งที่ได้ยิน…"
        className="mt-3 w-full rounded-xl bg-slate-50 p-3 text-[14px] font-semibold text-slate-800 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-slate-400"
      />

      {checked === null ? (
        <button
          type="button"
          disabled={typed.trim().length === 0}
          onClick={check}
          className="mt-4 w-full rounded-full bg-[#004AAD] py-3 text-sm font-bold text-white disabled:opacity-30"
        >
          ตรวจคำตอบ
        </button>
      ) : (
        <div className="mt-4">
          <div
            className={`rounded-2xl p-3.5 ring-1 ${
              checked
                ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                : "bg-rose-50 text-rose-900 ring-rose-200"
            }`}
          >
            <p className="text-sm font-bold">{checked ? "ถูกต้อง! 🎉" : "ยังไม่ถูก — นี่คือเฉลย"}</p>
            <p className="mt-1 text-[12px]">
              <strong>เฉลย:</strong> {item.answer}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGraded(checked)}
            className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-bold text-white"
          >
            ข้อต่อไป →
          </button>
        </div>
      )}
    </Frame>
  );
}

function ReadingProbeSlot({
  level,
  examNumber,
  titleTh,
  progress,
  onGraded,
  onCancel,
}: {
  level: RungLevel;
  examNumber: number;
  titleTh: string;
  progress: string;
  onGraded: (correct: boolean) => void;
  onCancel: () => void;
}) {
  const [pendingPct, setPendingPct] = useState<number | null>(null);
  const set = getReadingVisibleSetByNumber(1, level, 1);
  const totalExams = set?.exams.length ?? 0;
  const exam = set ? getReadingExamFromSet(set, examNumber) : undefined;

  if (!exam) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={progress}>
      <ReadingSlotBody
        key={`${level}-${examNumber}`}
        exam={exam}
        level={level}
        examNumber={examNumber}
        totalExams={totalExams}
        onScored={(pct) => setPendingPct(pct)}
      />
      {pendingPct !== null ? (
        <button
          type="button"
          onClick={() => onGraded(pendingPct >= 50)}
          className="mt-3 w-full rounded-full bg-[#004AAD] py-3 text-sm font-bold text-white"
        >
          ข้อต่อไป →
        </button>
      ) : null}
    </Frame>
  );
}

function ReadingSlotBody({
  exam,
  level,
  examNumber,
  totalExams,
  onScored,
}: {
  exam: ReadingExamUnit;
  level: RungLevel;
  examNumber: number;
  totalExams: number;
  onScored: (scorePct: number) => void;
}) {
  return (
    <ReadingSessionClient
      round={1}
      difficulty={level}
      setNumber={1}
      examNumber={examNumber}
      readingExam={exam}
      totalExams={totalExams}
      onRunnerComplete={(scorePct) => onScored(scorePct)}
    />
  );
}

function VocabProbeSlot({
  level,
  passageNumber,
  titleTh,
  progress,
  onGraded,
  onCancel,
}: {
  level: RungLevel;
  passageNumber: number;
  titleTh: string;
  progress: string;
  onGraded: (correct: boolean) => void;
  onCancel: () => void;
}) {
  const [pendingPct, setPendingPct] = useState<number | null>(null);
  const set = getVocabVisibleSetByNumber(1, 1);
  const passage = set?.passages.find(
    (p) => p.contentLevel === level && p.passageNumber === passageNumber,
  );

  if (!passage) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={progress}>
      <VocabSlotBody
        key={`${level}-${passageNumber}`}
        passage={passage}
        level={level}
        passageNumber={passageNumber}
        onScored={(pct) => setPendingPct(pct)}
      />
      {pendingPct !== null ? (
        <button
          type="button"
          onClick={() => onGraded(pendingPct >= 50)}
          className="mt-3 w-full rounded-full bg-[#004AAD] py-3 text-sm font-bold text-white"
        >
          ข้อต่อไป →
        </button>
      ) : null}
    </Frame>
  );
}

function VocabSlotBody({
  passage,
  level,
  passageNumber,
  onScored,
}: {
  passage: VocabPassageUnit;
  level: RungLevel;
  passageNumber: number;
  onScored: (scorePct: number) => void;
}) {
  return (
    <VocabSessionClient
      round={1}
      sessionLevel={level}
      setNumber={1}
      passageNumber={passageNumber}
      passage={passage}
      nextPassageNumber={null}
      onRunnerComplete={(scorePct) => onScored(scorePct)}
    />
  );
}

function ConversationProbeSlot({
  level,
  setNumber,
  titleTh,
  progress,
  onGraded,
  onCancel,
}: {
  level: RungLevel;
  setNumber: number;
  titleTh: string;
  progress: string;
  onGraded: (correct: boolean) => void;
  onCancel: () => void;
}) {
  const [exam, setExam] = useState<ConversationExam | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setExam(undefined);
    void (async () => {
      const raw = getConversationExam(1, level, setNumber);
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
  }, [level, setNumber]);

  if (exam === undefined) {
    return (
      <Frame title={titleTh} onCancel={onCancel} progress={progress}>
        <LuxuryLoader label="Loading conversation…" />
      </Frame>
    );
  }
  if (!exam) return <EmptyBank titleTh={titleTh} onCancel={onCancel} onGraded={onGraded} />;

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={progress}>
      <ConversationSessionClient
        key={`${level}-${setNumber}`}
        exam={exam}
        round={1}
        difficulty={level}
        setNumber={setNumber}
        embedded
        onComplete={(correct, total) => onGraded(total > 0 && correct / total >= 0.5)}
      />
    </Frame>
  );
}
