"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { QuestionRouter } from "@/components/mock-test/questions/QuestionRouter";
import { MockTestTimerBar } from "@/components/mock-test/MockTestTimerBar";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
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
const FAST_PASS_DWELL_MS = 2500;

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

/** Soft (admin) journey-rail icon per task type. Steps interleave skills, so we
 *  render them in true step order — not fabricated contiguous skill blocks. */
const TASK_ICON: Record<string, string> = {
  fill_in_blanks: "📝",
  write_about_photo: "✍️",
  dictation: "🎧",
  speak_about_photo: "🗣️",
  vocabulary_reading: "📖",
  read_and_write: "✍️",
  read_then_speak: "🗣️",
  interactive_conversation_mcq: "💬",
  conversation_summary: "🧾",
  interactive_speaking: "🎙️",
  real_english_word: "🔤",
};

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
  // Admin / preview-eligible users see the soft "Progress Journey" layout;
  // everyone else keeps the original brutalist layout byte-for-byte.
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;

  const answeredCount = session?.responses?.length ?? 0;
  const adminPreviewMode = session?.targets?.adminPreviewMode === true;
  const skipTimerMode = session?.targets?.skipTimerMode === true;
  const fastPassPreviewMode = session?.targets?.fastPassPreviewMode === true;
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

  // Soft journey rail: all 20 steps in true order, with done/current/locked state.
  const railSteps = useMemo(() => {
    const items = (session?.mock_fixed_set_items ?? []).slice().sort((a, b) => a.step_index - b.step_index);
    return items.map((it) => ({
      stepIndex: it.step_index,
      icon: TASK_ICON[it.task_type] ?? "•",
      label: TASK_LABELS[it.task_type]?.th ?? "แบบฝึก",
      state:
        it.step_index < stepIndex ? "done" : it.step_index === stepIndex ? "current" : "locked",
    }));
  }, [session, stepIndex]);

  const minutesLeft = useMemo(() => {
    const items = (session?.mock_fixed_set_items ?? []).filter((it) => it.step_index >= stepIndex);
    const sec = items.reduce((s, it) => s + (it.time_limit_sec || 0) + (it.rest_after_step_sec || 0), 0);
    return Math.max(1, Math.round(sec / 60));
  }, [session, stepIndex]);

  const load = async (reason: typeof loadingReason = "init", opts?: { silent?: boolean }) => {
    // Silent = background reconcile after an optimistic advance: no full-screen
    // spinner, no error overlay (the answer is already saved server-side).
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadingReason(reason);
      setError(null);
    }
    try {
      const ctl = new AbortController();
      const t = window.setTimeout(() => ctl.abort(), 20000);
      const res = await fetch(`/api/mock-test/fixed/session/${sessionId}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: ctl.signal,
      });
      window.clearTimeout(t);
      const json = (await res.json()) as { session?: SessionPayload; error?: string };
      if (!res.ok || !json.session) {
        if (!silent) {
          setError(json.error ?? "Session not found");
          setLoading(false);
        }
        return;
      }
      setSession(json.session);
      if (!silent) setLoading(false);
    } catch {
      if (!silent) {
        setError("Failed to load session (timeout). Please refresh and try again.");
        setLoading(false);
      }
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

  useEffect(() => {
    if (!fastPassPreviewMode) return;
    if (!current) return;
    if (loading || resting || submittingStep) return;

    const timeout = window.setTimeout(() => {
      void submit({ skippedByAdmin: true, fastPassPreview: true });
    }, FAST_PASS_DWELL_MS);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fastPassPreviewMode, current?.step_index, loading, resting, submittingStep]);

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

    // Instant advance: the next question is already loaded client-side (this is
    // a fixed 20-step mock), so don't make the learner wait on a full re-fetch
    // when they submit before the timer runs out.
    //   - Step 13 feeds the linked step 14 (conversation summary) → keep it
    //     authoritative (blocking reload).
    //   - Admin-gated for now (verify a full run, then flip `instantAdvance`
    //     to all users by dropping the `soft` check).
    const instantAdvance = soft && current.step_index !== 13;
    if (!instantAdvance) {
      await load("adapting");
      return;
    }
    const submittedStep = current.step_index;
    const submittedTask = current.task_type;
    setSession((prev) =>
      prev
        ? {
            ...prev,
            current_step: submittedStep + 1,
            responses: prev.responses.some((r) => r.step_index === submittedStep)
              ? prev.responses
              : [...prev.responses, { step_index: submittedStep, task_type: submittedTask, answer }],
          }
        : prev,
    );
    setSubmittingStep(false);
    // No re-fetch needed: this fixed mock keeps all 20 questions client-side,
    // and the server already advanced current_step + saved the answer, so the
    // optimistic state stays in lockstep. Rest steps / step 13 / a refresh
    // reconcile with the server. (silent option on load kept for safety.)
  };

  if (error) return <div className="p-8 text-center font-bold text-red-700">{error}</div>;
  if (loading || !session || !question)
    return (
      <MascotLoader
        label={
          loadingReason === "adapting"
            ? "กำลังเตรียมข้อต่อไป…"
            : loadingReason === "rest"
              ? "กำลังพักสั้น ๆ…"
              : "กำลังโหลด…"
        }
      />
    );
  if (!current || !question) {
    return (
      <div className="p-8 text-center font-bold text-red-700">
        Step {stepIndex}/20 not found in the uploaded set.
      </div>
    );
  }

  if (resting) {
    if (soft) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#004AAD]">พักสั้น ๆ</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">พัก 45 วินาที</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              หยุดพักสายตา ผ่อนมือ หายใจเข้าลึก ๆ แล้วค่อยไปต่อข้อถัดไปนะ
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#004AAD] transition-[width] duration-1000 ease-linear"
                  style={{ width: `${Math.round(Math.max(0, Math.min(1, timer.progress)) * 100)}%` }}
                />
              </div>
              <span
                className="text-sm font-bold tabular-nums text-slate-700"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                {timer.formattedTime}
              </span>
            </div>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <span className="rounded-xl bg-[#eaf1ff] px-3 py-2 text-xs font-semibold text-[#004AAD]">
                ต่อไป: {currentMeta.th}
              </span>
              <button
                type="button"
                onClick={() => {
                  setResting(false);
                  void load();
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ข้ามการพัก
              </button>
            </div>
          </div>
        </div>
      );
    }
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
          <p className="mt-3 text-3xl sm:text-4xl font-black text-[#004AAD]">{singleStepResult.score}/160</p>
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

  if (soft) {
    const timerColor = timer.isCritical ? "#ef4444" : timer.isWarning ? "#FFCC00" : "#004AAD";
    return (
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="sticky top-3 z-20">
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#004AAD]">English&nbsp;Plan</span>
              <span className="truncate text-[12px] font-semibold text-slate-500">
                {session.mock_fixed_sets?.user_title ?? session.mock_fixed_sets?.name ?? "Mock"}
              </span>
              <span className="ml-auto shrink-0 text-[12px] font-semibold text-slate-500">
                ข้อ{" "}
                <b className="text-slate-900" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                  {stepIndex}
                </b>
                /{STEP_COUNT}
              </span>
            </div>
            {skipTimerMode ? (
              <div className="mt-2 rounded-xl bg-[#eaf1ff] px-3 py-1.5 text-[12px] font-semibold text-[#004AAD]">
                {fastPassPreviewMode
                  ? "Fast pass preview · ระบบจะข้ามแต่ละข้อให้อัตโนมัติ"
                  : "Admin preview · ไม่จับเวลาและไม่มีช่วงพัก"}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                      timer.isCritical || timer.isWarning ? "animate-pulse" : ""
                    }`}
                    style={{
                      width: `${Math.round(Math.max(0, Math.min(1, timer.progress)) * 100)}%`,
                      backgroundColor: timerColor,
                    }}
                  />
                </div>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: timer.isCritical ? "#ef4444" : timer.isWarning ? "#a16207" : "#334155",
                  }}
                >
                  {timer.formattedTime}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* Journey rail — all 20 steps in true order */}
          <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">เส้นทางของคุณ</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                ทำแล้ว <span className="text-[#004AAD]">{answeredCount}</span> · เหลือ {stepsLeft}
              </p>
              <ol className="mt-3 space-y-1">
                {railSteps.map((s) => (
                  <li
                    key={s.stepIndex}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                      s.state === "current" ? "bg-[#FFCC00]/15 ring-1 ring-[#FFCC00]/50" : ""
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        s.state === "done"
                          ? "bg-emerald-500 text-white"
                          : s.state === "current"
                            ? "animate-pulse bg-[#004AAD] text-[#FFCC00]"
                            : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      {s.state === "done" ? "✓" : s.stepIndex}
                    </span>
                    <span
                      className={`truncate text-[11px] ${
                        s.state === "current"
                          ? "font-bold text-slate-900"
                          : s.state === "done"
                            ? "text-slate-400"
                            : "text-slate-300"
                      }`}
                    >
                      {s.icon} {s.label}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[12px] text-slate-500">
                เหลืออีก ~{minutesLeft} นาที · 📈 ทำต่อไปเรื่อย ๆ นะ
              </div>
            </div>
          </aside>

          {/* Task */}
          <div className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {error}
              </div>
            ) : null}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 pt-4 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#004AAD]">
                  ข้อ {stepIndex} · {currentMeta.th}
                </p>
                <h1 className="mt-1 text-lg font-bold text-slate-900">{questionCardTitle}</h1>
                <p className="mt-0.5 text-[13px] text-slate-500">{currentMeta.hint}</p>
              </div>
              <div className="p-5">
                <QuestionRouter
                  key={question.id}
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

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {adminPreviewMode ? (
                <span className="rounded-lg bg-[#eaf1ff] px-3 py-1.5 text-[12px] font-semibold text-[#004AAD]">
                  Preview ใช้สูตรคะแนนเดียวกับผู้เรียน · ข้อที่ admin ข้ามนับเป็น 0
                </span>
              ) : null}
              {fastPassPreviewMode ? (
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-900">
                  Auto-advancing ทุก {Math.round(FAST_PASS_DWELL_MS / 1000)} วิ
                </span>
              ) : null}
              {adminPreviewMode ? (
                <button
                  type="button"
                  disabled={fastPassPreviewMode}
                  onClick={() => void submit({ skippedByAdmin: true })}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-[12px] font-semibold text-amber-900 disabled:opacity-50"
                >
                  {fastPassPreviewMode ? "Admin: auto-skip active" : "Admin: ข้ามข้อนี้"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/mock-test/fixed/session/${sessionId}`, {
                    method: "PATCH",
                    cache: "no-store",
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
                className="ml-auto text-[12px] font-semibold text-rose-600 hover:text-rose-700"
              >
                ออกจากการซ้อม
              </button>
            </div>
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
                <div className="text-sm font-black text-neutral-900">
                  {fastPassPreviewMode ? "Fast pass" : skipTimerMode ? "Preview" : "Live timing"}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden border-4 border-black bg-neutral-200">
            <div className="h-full bg-[#004AAD] transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {skipTimerMode ? (
          <div className="rounded-[4px] border-2 border-dashed border-[#004AAD] bg-[#eaf1ff] px-3 py-2 text-xs font-black text-[#004AAD]">
            {fastPassPreviewMode
              ? "Fast pass preview: each step is shown briefly, then auto-skipped through the normal grading path."
              : "Admin preview mode: timer and rest are skipped, but the question flow and report path still run."}
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
                key={question.id}
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
            {fastPassPreviewMode ? (
              <p className="mt-3 rounded-[4px] border-2 border-dashed border-amber-500 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                Auto-advancing every {Math.round(FAST_PASS_DWELL_MS / 1000)}s so you can QA the full question sequence in under a minute.
              </p>
            ) : null}
            {adminPreviewMode ? (
              <button
                type="button"
                disabled={fastPassPreviewMode}
                onClick={() => void submit({ skippedByAdmin: true })}
                className="mt-3 w-full rounded-[4px] border-4 border-black bg-amber-100 px-4 py-2 text-sm font-black text-amber-900 shadow-[3px_3px_0_0_#000]"
              >
                {fastPassPreviewMode ? "Admin: auto-skip active" : "Admin: skip this task"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(`/api/mock-test/fixed/session/${sessionId}`, {
                  method: "PATCH",
                  cache: "no-store",
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
