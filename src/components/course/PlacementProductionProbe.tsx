"use client";

import { useEffect, useState } from "react";

import { PhotoAssessmentSession } from "@/components/photo-speak/PhotoAssessmentSession";
import { ReadWriteSession } from "@/components/writing/ReadWriteSession";
import { ReadSpeakSession } from "@/components/speaking/ReadSpeakSession";
import { InteractiveSpeakingSession } from "@/components/interactive-speaking/InteractiveSpeakingSession";
import { DialogueSummarySessionClient } from "@/components/dialogue-summary/DialogueSummarySessionClient";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { fetchPhotoSpeakItems } from "@/lib/photo-speak-api";
import { loadWritingTopicsByRound } from "@/lib/writing-storage";
import { loadSpeakingVisibleTopicsForRound } from "@/lib/speaking-storage";
import { loadInteractiveSpeakingScenarios } from "@/lib/interactive-speaking-storage";
import { getDialogueSummaryVisibleExam } from "@/lib/dialogue-summary-storage";
import { TASK_LABEL_TH } from "@/lib/course-plan/categories";
import { AI_GRADED_PLACEMENT_TASKS, placementForScore } from "@/lib/course-plan/placement";
import type { RungLevel } from "@/lib/course-plan/rungs";
import type { DialogueSummaryExam } from "@/types/dialogue-summary";
import type { InteractiveSpeakingScenario } from "@/types/interactive-speaking";

export type AiGradedTaskType = (typeof AI_GRADED_PLACEMENT_TASKS)[number];

type Content =
  | { kind: "photo"; mode: "write" | "speak"; itemId: string }
  | { kind: "write"; topicId: string }
  | { kind: "speak"; topicId: string; questionId: string }
  | { kind: "interactive"; scenario: InteractiveSpeakingScenario }
  | { kind: "dialogue"; exam: DialogueSummaryExam };

async function resolveContent(taskType: AiGradedTaskType): Promise<Content | null> {
  if (taskType === "write_about_photo" || taskType === "speak_about_photo") {
    const items = await fetchPhotoSpeakItems(taskType);
    const item = items[0];
    return item ? { kind: "photo", mode: taskType === "write_about_photo" ? "write" : "speak", itemId: item.id } : null;
  }
  if (taskType === "read_and_write") {
    const topic = loadWritingTopicsByRound(1)[0];
    return topic ? { kind: "write", topicId: topic.id } : null;
  }
  if (taskType === "read_then_speak") {
    const topic = loadSpeakingVisibleTopicsForRound(1)[0];
    const question = topic?.questions[0];
    return topic && question ? { kind: "speak", topicId: topic.id, questionId: question.id } : null;
  }
  if (taskType === "interactive_speaking") {
    const scenario = loadInteractiveSpeakingScenarios().filter((s) => (s.round ?? 1) === 1)[0];
    return scenario ? { kind: "interactive", scenario } : null;
  }
  // dialogue_summary
  const exam = getDialogueSummaryVisibleExam(1, "easy", 1);
  return exam ? { kind: "dialogue", exam } : null;
}

/**
 * One ad-hoc AI-graded submission per skill — no ladder (asking for 2 AI
 * submissions per level, like the objective probes do, would make the whole
 * placement far too long). The single score160 the grader returns is bucketed
 * straight through the same rungForScore() the rest of the app uses.
 */
export function PlacementProductionProbe({
  taskType,
  onSettled,
  onSkip,
}: {
  taskType: AiGradedTaskType;
  onSettled: (level: RungLevel, score160: number) => void;
  onSkip: () => void;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; content: Content }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      await ensureCanonicalPracticeContent();
      if (cancelled) return;
      const content = await resolveContent(taskType);
      if (cancelled) return;
      setState(content ? { status: "ready", content } : { status: "error" });
    })();
    return () => {
      cancelled = true;
    };
  }, [taskType]);

  const titleTh = TASK_LABEL_TH[taskType] ?? taskType;

  function settle(score160: number) {
    onSettled(placementForScore(score160), score160);
  }

  if (state.status === "loading") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <div className="p-4">
          <LuxuryLoader label="กำลังเตรียมโจทย์…" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <div className="p-4">
          <p className="rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800 ring-1 ring-amber-200">
            ยังไม่มีโจทย์สำหรับทักษะนี้ในคลัง — ข้ามไปก่อน ระบบจะเริ่มที่ระดับง่าย
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 w-full rounded-full bg-slate-900 py-2.5 text-sm font-bold text-white"
          >
            ข้ามทักษะนี้ →
          </button>
        </div>
      </div>
    );
  }

  const c = state.content;

  if (c.kind === "photo") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <PhotoAssessmentSession
          mode={c.mode}
          itemId={c.itemId}
          embedded
          attemptSource="placement"
          onComplete={(r) => settle(r.score160)}
        />
      </div>
    );
  }

  if (c.kind === "write") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <ReadWriteSession
          topicId={c.topicId}
          embedded
          attemptSource="placement"
          onComplete={(r) => settle(r.score160)}
        />
      </div>
    );
  }

  if (c.kind === "speak") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <ReadSpeakSession
          topicId={c.topicId}
          round={1}
          presetQuestionId={c.questionId}
          embedded
          attemptSource="placement"
          onComplete={(r) => settle(r.score160)}
        />
      </div>
    );
  }

  if (c.kind === "interactive") {
    return (
      <div>
        <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
        <InteractiveSpeakingSession
          scenario={c.scenario}
          embedded
          attemptSource="placement"
          onComplete={(r) => settle(r.score160)}
        />
      </div>
    );
  }

  return (
    <div>
      <ProbeHeader titleTh={titleTh} onCancel={onSkip} />
      <DialogueSummarySessionClient
        exam={c.exam}
        embedded
        attemptSource="placement"
        onComplete={(r) => settle(r.score160)}
      />
    </div>
  );
}

/** None of the 5 session components take onCancel — mirrors InteractiveCourseRunner's own header bar. */
function ProbeHeader({ titleTh, onCancel }: { titleTh: string; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
      <p className="text-[12px] font-bold text-slate-700">{titleTh}</p>
      <button type="button" onClick={onCancel} className="text-[13px] font-bold text-slate-400">
        ปิด
      </button>
    </div>
  );
}
