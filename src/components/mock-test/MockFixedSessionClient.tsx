"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { QuestionRouter } from "@/components/mock-test/questions/QuestionRouter";
import { MockTestTimerBar } from "@/components/mock-test/MockTestTimerBar";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { mt } from "@/lib/mock-test/mock-test-styles";
import type { MockQuestionRow } from "@/lib/mock-test/types";

type SessionPayload = {
  id: string;
  set_id: string;
  status: string;
  current_step: number;
  responses: Array<{ step_index: number; task_type?: string; answer?: unknown }>;
  targets: Record<string, unknown>;
  mock_fixed_sets?: { name: string; user_title?: string };
  mock_fixed_set_items: Array<{
    step_index: number;
    task_type: MockQuestionRow["question_type"];
    time_limit_sec: number;
    rest_after_step_sec: number;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    is_ai_graded: boolean;
  }>;
};

const STEP_COUNT = 20;

const TASK_LABELS: Record<string, { en: string; th: string; hint: string }> = {
  fill_in_blanks: { en: "Fill in the blanks", th: "เติมคำในช่องว่าง", hint: "Read the full context before deciding each word." },
  write_about_photo: { en: "Write about photo", th: "เขียนจากภาพ", hint: "Stay direct and keep your writing easy to follow." },
  dictation: { en: "Dictation", th: "ฟังแล้วพิมพ์", hint: "Wait for the audio, then type exactly what you hear." },
  speak_about_photo: { en: "Speak about photo", th: "พูดจากภาพ", hint: "Describe clearly first, then add supporting detail." },
  vocabulary_reading: { en: "Vocabulary + reading", th: "คำศัพท์ + การอ่าน", hint: "Manage your time across the full reading block." },
  read_and_write: { en: "Read and write", th: "อ่านแล้วเขียน", hint: "Answer the prompt directly and structure your response." },
  read_then_speak: { en: "Read then speak", th: "อ่านแล้วพูด", hint: "Scan first, then speak in a calm and complete way." },
  interactive_conversation_mcq: { en: "Interactive conversation", th: "บทสนทนาโต้ตอบ", hint: "Choose the best continuation at each turn." },
  conversation_summary: { en: "Conversation summary", th: "สรุปบทสนทนา", hint: "Capture the main point, useful details, and outcome." },
  interactive_speaking: { en: "Interactive speaking", th: "พูดโต้ตอบ", hint: "Keep answering naturally and avoid one-line responses." },
  real_english_word: { en: "Real English word", th: "คำอังกฤษจริง", hint: "Decide quickly and trust your vocabulary instincts." },
};

function taskMeta(taskType: string | undefined) {
  return (
    TASK_LABELS[taskType ?? ""] ?? {
      en: "Mock task",
      th: "แบบฝึกม็อก",
      hint: "Stay focused and keep moving through the section.",
    }
  );
}

export function MockFixedSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingStep, setSubmittingStep] = useState(false);
  const [loadingReason, setLoadingReason] = useState<"init" | "adapting" | "rest">("init");
  const [resting, setResting] = useState(false);
  const [singleStepResult, setSingleStepResult] = useState<{
    stepIndex: number;
    taskType: string;
    score: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dictationTimerStarted, setDictationTimerStarted] = useState(true);
  const [speakPhotoTimerStarted, setSpeakPhotoTimerStarted] = useState(true);
  const timer = usePhaseTimer();

  const answeredCount = session?.responses?.length ?? 0;
  const adminPreviewMode = session?.targets?.adminPreviewMode === true;
  const skipTimerMode = session?.targets?.skipTimerMode === true;
  const stepIndex = session?.current_step ?? 1;
  const current = useMemo(
    () => session?.mock_fixed_set_items?.find((i) => i.step_index === stepIndex) ?? null,
    [session, stepIndex],
  );
  const currentMeta = taskMeta(current?.task_type);
  const prevInteractive = useMemo(() => {
    if (!session) return null;
    const prev = (session.responses ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.step_index === 13 && r.task_type === "interactive_conversation_mcq",
    ) as
      | {
          answer?: {
            user_turn_answers?: string[];
            turns?: Array<Record<string, unknown>>;
          };
        }
      | undefined;
    return prev ?? null;
  }, [session]);

  const load = async (reason: typeof loadingReason = "init") => {
    setLoading(true);
    setLoadingReason(reason);
    setError(null);
    try {
      const ctl = new AbortController();
      const t = window.setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(`/api/mock-test/fixed/session/${sessionId}`, {
        credentials: "same-origin",
        signal: ctl.signal,
      });
      window.clearTimeout(t);
      const json = (await res.json()) as { session?: SessionPayload; error?: string };
      if (!res.ok || !json.session) {
        setError(json.error ?? "Session not found");
        setLoading(false);
        return;
      }
      setSession(json.session);
      setLoading(false);
    } catch {
      setError("Failed to load session (timeout). Please refresh and try again.");
      setLoading(false);
    } finally {
      setSubmittingStep(false);
    }
  };

  useEffect(() => {
    void load("init");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!current) return;
    if (skipTimerMode) return;
    if (current.task_type === "dictation") {
      setDictationTimerStarted(false);
      timer.startTimer(stepIndex, current.time_limit_sec);
      timer.pauseTimer();
      return;
    }
    if (current.task_type === "speak_about_photo") {
      setSpeakPhotoTimerStarted(false);
      timer.startTimer(stepIndex, current.time_limit_sec);
      timer.pauseTimer();
      return;
    }
    setDictationTimerStarted(true);
    setSpeakPhotoTimerStarted(true);
    timer.resetTimer(stepIndex, current.time_limit_sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.step_index, current?.task_type, skipTimerMode]);

  useEffect(() => {
    if (!resting || !timer.isExpired) return;
    setResting(false);
    void load("rest");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resting, timer.isExpired]);

  const mergedContent =
    current?.task_type === "conversation_summary" && prevInteractive?.answer
      ? {
          ...current.content,
          turns:
            (current.content?.turns as unknown[]) ??
            prevInteractive.answer.turns ??
            [],
          user_turn_answers: prevInteractive.answer.user_turn_answers ?? [],
          mock_linked_from_interactive: true,
        }
      : current?.content;
  const progressPct = Math.round((answeredCount / STEP_COUNT) * 100);
  const stepsLeft = Math.max(0, STEP_COUNT - answeredCount);
  const questionCardTitle = `${currentMeta.en} / ${currentMeta.th}`;

  const question = current
    ? ({
        id: `${sessionId}-${current.step_index}`,
        phase: current.step_index,
        question_type: current.task_type,
        skill: "literacy",
        difficulty: "medium",
        content: (mergedContent ?? current.content) as Record<string, unknown>,
        correct_answer: current.correct_answer,
        is_ai_graded: current.is_ai_graded,
        is_active: true,
      } as MockQuestionRow)
    : null;

  const submit = async (answer: unknown) => {
    if (!current) return;
    if (submittingStep) return;
    setSubmittingStep(true);
    // Prevent double-submit from double-click / fast taps.
    // If the server already has this step, we will reload and continue.
    const res = await fetch(`/api/mock-test/fixed/session/${sessionId}/submit-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ stepIndex: current.step_index, answer }),
    });
    const json = (await res.json()) as {
      complete?: boolean;
      error?: string;
      singleStepPreview?: boolean;
      stepScore?: number;
      stepIndex?: number;
      taskType?: string;
    };
    if (!res.ok || json.error) {
      if (json.error === "Step already submitted") {
        // Step is already recorded; reload session so UI can move on.
        await load("adapting");
        setError(null);
        return;
      }
      if ((json.error ?? "").startsWith("Invalid step order.")) {
        await load("adapting");
        setError("This step was already advanced in another tab or request. We reloaded your session to keep you on the correct step.");
        return;
      }
      setSubmittingStep(false);
      return setError(json.error ?? "Submit failed");
    }

    if (json.complete) {
      setSubmittingStep(false);
      if (json.singleStepPreview) {
        setSingleStepResult({
          stepIndex: Number(json.stepIndex ?? current.step_index),
          taskType: String(json.taskType ?? current.task_type),
          score: Number(json.stepScore ?? 0),
        });
        return;
      }
      router.push(`/mock-test/fixed/results-loading/${sessionId}`);
      return;
    }

    if (!skipTimerMode && current.rest_after_step_sec > 0) {
      setResting(true);
      timer.resetTimer(999, current.rest_after_step_sec);
      setSubmittingStep(false);
      return;
    }
    await load("adapting");
  };

  if (error) return <div className="p-8 text-center font-bold text-red-700">{error}</div>;
  if (loading || !session || !question)
    return (
      <div className="p-10 text-center">
        <div className="mx-auto flex w-fit items-center gap-3 rounded-[4px] border-4 border-black bg-white px-5 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <div className="text-left">
            <div className="font-black">
              {loadingReason === "adapting"
                ? "Adapting next questions... / กำลังปรับคำถามตามประสิทธิภาพของคุณ"
                : loadingReason === "rest"
                  ? "Refocusing... / กำลังรีเฟรชช่วงพัก"
                  : "Loading... / กำลังโหลด..."}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-600">Please wait</div>
          </div>
        </div>
      </div>
    );
  if (!current || !question) {
    return (
      <div className="p-8 text-center font-bold text-red-700">
        Step {stepIndex}/20 not found in the uploaded set.
      </div>
    );
  }

  if (resting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className={`${mt.border} ${mt.shadow} ${mt.gridBg} bg-[#fffdf2] p-6 text-center sm:p-8`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">Mock break</p>
          <h2 className="mt-2 text-2xl font-black">45s Refocus Rest</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-700">
            This short pause helps you reset your attention before the next section. Breathe, relax your hands,
            and get ready to continue.
          </p>
          <div className="mt-4">
            <MockTestTimerBar
              progress={timer.progress}
              isWarning={timer.isWarning}
              isCritical={timer.isCritical}
              formattedTime={timer.formattedTime}
            />
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <div className="rounded-[4px] border-2 border-dashed border-[#004AAD] bg-white px-3 py-2 text-xs font-bold text-[#004AAD]">
              Coming up: {currentMeta.en}
            </div>
            <button
              type="button"
              onClick={() => {
                setResting(false);
                void load();
              }}
              className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#000]"
            >
              Skip rest
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (singleStepResult) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <div className={`${mt.border} ${mt.shadow} bg-white p-6`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">Admin separate preview</p>
          <h2 className="mt-2 text-2xl font-black text-neutral-900">Step grading complete</h2>
          <p className="mt-2 text-sm font-bold text-neutral-700">
            Step {singleStepResult.stepIndex} ({singleStepResult.taskType})
          </p>
          <p className="mt-3 text-4xl font-black text-[#004AAD]">{singleStepResult.score}/160</p>
          <p className="mt-2 text-xs font-bold text-neutral-600">
            This preview mode runs one step only so you can QA UI + grading quickly.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.push("/mock-test/start?adminPreview=1&previewSeparate=1")}
              className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_0_#000]"
            >
              Back to separate preview setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-6">
      <div className="sticky top-3 z-20 space-y-3">
        <div className={`${mt.gridBg} ${mt.border} ${mt.shadow} rounded-[4px] bg-[#fffdf2] p-4`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004AAD]">Fixed mock sequence</p>
              <h1 className="mt-1 text-lg font-black text-neutral-900 sm:text-2xl">
                {session.mock_fixed_sets?.user_title ?? session.mock_fixed_sets?.name ?? "Fixed Mock"}
              </h1>
              <p className="mt-1 text-sm font-bold text-neutral-700">
                Step {stepIndex}/{STEP_COUNT} · {questionCardTitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Done</div>
                <div className="text-lg font-black text-neutral-900">{answeredCount}</div>
              </div>
              <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Left</div>
                <div className="text-lg font-black text-neutral-900">{stepsLeft}</div>
              </div>
              <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Progress</div>
                <div className="text-lg font-black text-neutral-900">{progressPct}%</div>
              </div>
              <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
                <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Mode</div>
                <div className="text-sm font-black text-neutral-900">{skipTimerMode ? "Preview" : "Live timing"}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden border-4 border-black bg-neutral-200">
            <div className="h-full bg-[#004AAD] transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {skipTimerMode ? (
          <div className="rounded-[4px] border-2 border-dashed border-[#004AAD] bg-[#eaf1ff] px-3 py-2 text-xs font-black text-[#004AAD]">
            Admin preview mode: timer and rest are skipped, but the question flow and report path still run.
          </div>
        ) : (
          <MockTestTimerBar
            progress={timer.progress}
            isWarning={timer.isWarning}
            isCritical={timer.isCritical}
            formattedTime={timer.formattedTime}
          />
        )}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          {error ? (
            <div className="rounded-[4px] border-4 border-red-800 bg-red-50 px-4 py-3 text-sm font-bold text-red-900 shadow-[3px_3px_0_0_#000]">
              {error}
            </div>
          ) : null}
          <div className={`${mt.border} ${mt.shadow} overflow-hidden bg-white`}>
            <div className="border-b-4 border-black bg-[#fff8cc] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004AAD]">Current task</p>
              <h2 className="mt-1 text-lg font-black text-neutral-900">{questionCardTitle}</h2>
              <p className="mt-1 text-sm text-neutral-700">{currentMeta.hint}</p>
            </div>
            <div className="p-4 sm:p-5">
              <QuestionRouter
                question={question}
                submitting={submittingStep}
          onSpeakPhotoReady={() => {
            if (skipTimerMode) return;
            if (current?.task_type !== "speak_about_photo") return;
            if (speakPhotoTimerStarted) return;
            setSpeakPhotoTimerStarted(true);
            timer.resumeTimer();
          }}
                onDictationAudioFinished={() => {
                  if (skipTimerMode) return;
                  if (current?.task_type !== "dictation") return;
                  if (dictationTimerStarted) return;
                  setDictationTimerStarted(true);
                  timer.resumeTimer();
                }}
                onSubmit={submit}
              />
            </div>
          </div>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-40 xl:self-start">
          <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004AAD]">Focus guide</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              <li className="rounded-[4px] border-2 border-black bg-neutral-50 px-3 py-2">
                Read the task once before reacting quickly.
              </li>
              <li className="rounded-[4px] border-2 border-black bg-neutral-50 px-3 py-2">
                Keep moving. One rough answer is better than no answer.
              </li>
              <li className="rounded-[4px] border-2 border-black bg-neutral-50 px-3 py-2">
                Avoid refreshing or opening multiple tabs during the same session.
              </li>
            </ul>
          </div>
          <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004AAD]">Session controls</p>
            {adminPreviewMode ? (
              <p className="mt-3 rounded-[4px] border-2 border-dashed border-[#004AAD] bg-[#eaf1ff] px-3 py-2 text-xs font-bold text-[#004AAD]">
                Preview uses the same scoring formula as learners. Any task skipped by admin is counted as zero.
              </p>
            ) : null}
            {adminPreviewMode ? (
              <button
                type="button"
                onClick={() => void submit({ skippedByAdmin: true })}
                className="mt-3 w-full rounded-[4px] border-4 border-black bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 shadow-[3px_3px_0_0_#000]"
              >
                Admin: skip this task
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(`/api/mock-test/fixed/session/${sessionId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "cancelled", cancelled_at: new Date().toISOString() }),
                });
                if (!res.ok) {
                  const json = (await res.json().catch(() => ({}))) as { error?: string };
                  setError(json.error ?? "Could not cancel this session.");
                  return;
                }
                router.push("/mock-test/start");
              }}
              className="mt-3 w-full rounded-[4px] border-4 border-red-800 bg-red-50 px-4 py-2 text-sm font-black text-red-900 shadow-[3px_3px_0_0_#000]"
            >
              Quit and cancel session
            </button>
            <p className="mt-2 text-xs font-bold text-neutral-500">
              Quitting ends this attempt and sends you back to the start page.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
