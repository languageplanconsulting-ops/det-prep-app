"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { QuestionRouter } from "@/components/mock-test/questions/QuestionRouter";
import { MockTestTimerBar } from "@/components/mock-test/MockTestTimerBar";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";

type SessionPayload = {
  id: string;
  set_id: string;
  status: string;
  current_step: number;
  responses: Array<{ step_index: number; task_type?: string; answer?: unknown }>;
  targets: Record<string, unknown>;
  mini_diagnosis_sets?: { name: string; user_title?: string };
  mini_diagnosis_set_items: Array<{
    step_index: number;
    task_type: string;
    time_limit_sec: number;
    rest_after_step_sec: number;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    is_ai_graded: boolean;
  }>;
};

const STEP_COUNT = 9;

const TASK_LABELS: Record<string, { en: string; th: string; hint: string }> = {
  dictation: { en: "Dictation", th: "ฟังแล้วพิมพ์", hint: "Type exactly what you hear." },
  real_english_word: { en: "Real English Word", th: "คำอังกฤษจริง", hint: "Pick only the real English words." },
  vocabulary_reading: { en: "Vocabulary Reading", th: "คำศัพท์ + การอ่าน", hint: "Balance vocab accuracy and passage understanding." },
  fill_in_blanks: { en: "Fill in the Blanks", th: "เติมคำในช่องว่าง", hint: "Use grammar and context together." },
  interactive_listening: { en: "Listening Mini Test", th: "มินิเทสต์การฟัง", hint: "You can listen up to 3 times, then answer all 5 questions." },
  write_about_photo: { en: "Write About Photo", th: "เขียนจากภาพ", hint: "Keep your sentence structure clear and on topic." },
  read_then_speak: { en: "Read Then Speak", th: "อ่านแล้วพูด", hint: "Read quickly, then speak in full connected ideas." },
};

function taskMeta(taskType: string | undefined) {
  return (
    TASK_LABELS[taskType ?? ""] ?? {
      en: "Mini diagnosis task",
      th: "ข้อสอบมินิไดแอกโนซิส",
      hint: "Stay calm and answer directly.",
    }
  );
}

export function MiniDiagnosisSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resting, setResting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictationTimerStarted, setDictationTimerStarted] = useState(true);
  const timer = usePhaseTimer();

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/mini-diagnosis/session/${sessionId}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { session?: SessionPayload; error?: string };
    if (!res.ok || !json.session) {
      setError(json.error ?? "Session not found");
      setLoading(false);
      return;
    }
    setSession(json.session);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [sessionId]);

  const stepIndex = session?.current_step ?? 1;
  const current = useMemo(
    () => session?.mini_diagnosis_set_items?.find((item) => item.step_index === stepIndex) ?? null,
    [session, stepIndex],
  );
  const currentMeta = taskMeta(current?.task_type);
  const answeredCount = session?.responses?.length ?? 0;
  const progressPct = Math.round((answeredCount / STEP_COUNT) * 100);

  useEffect(() => {
    if (!current) return;
    if (current.task_type === "dictation") {
      setDictationTimerStarted(false);
      timer.startTimer(stepIndex, current.time_limit_sec);
      timer.pauseTimer();
      return;
    }
    setDictationTimerStarted(true);
    timer.resetTimer(stepIndex, current.time_limit_sec);
  }, [current?.step_index, current?.task_type]);

  useEffect(() => {
    if (!resting || !timer.isExpired) return;
    setResting(false);
    void load();
  }, [resting, timer.isExpired]);

  const question = current
    ? {
        id: `${sessionId}-${current.step_index}`,
        phase: current.step_index,
        question_type: current.task_type as any,
        skill: "production" as const,
        difficulty: "medium" as const,
        content: current.content,
        correct_answer: current.correct_answer,
        is_ai_graded: current.is_ai_graded,
        is_active: true,
      }
    : null;

  const submit = async (answer: unknown) => {
    if (!current || submitting) return;
    setSubmitting(true);
    const res = await fetch(`/api/mini-diagnosis/session/${sessionId}/submit-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ stepIndex: current.step_index, answer }),
    });
    const json = (await res.json().catch(() => ({}))) as { complete?: boolean; error?: string };
    if (!res.ok || json.error) {
      setError(json.error ?? "Submit failed");
      setSubmitting(false);
      return;
    }
    if (json.complete) {
      router.push(`/mini-diagnosis/results/${sessionId}`);
      return;
    }
    if (current.rest_after_step_sec > 0) {
      setResting(true);
      timer.resetTimer(999, current.rest_after_step_sec);
      setSubmitting(false);
      return;
    }
    await load();
    setSubmitting(false);
  };

  if (error) return <div className="p-8 text-center font-bold text-red-700">{error}</div>;
  if (loading || !session || !question || !current) {
    return <div className="p-8 text-center font-black">Loading mini diagnosis…</div>;
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#004AAD]">
                Mini diagnosis
              </p>
              <h1 className="text-3xl font-black italic uppercase leading-none text-[#111111] md:text-4xl">
                {currentMeta.th}
                <br />
                <span className="not-italic text-[#004AAD]">{currentMeta.en}</span>
              </h1>
              <p className="mt-3 text-sm font-bold text-neutral-600">{currentMeta.hint}</p>
            </div>
            <div className="min-w-[220px] border-4 border-black bg-[#FFCC00] p-4 shadow-[6px_6px_0_0_#111111]">
              <p className="font-mono text-[10px] font-black uppercase">Current set</p>
              <p className="mt-2 text-xl font-black text-[#004AAD]">
                {session.mini_diagnosis_sets?.user_title ?? session.mini_diagnosis_sets?.name ?? "Mini diagnosis"}
              </p>
              <p className="mt-2 text-sm font-bold">
                Step {stepIndex}/{STEP_COUNT}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <MockTestTimerBar
              progress={timer.progress}
              isWarning={timer.isWarning}
              isCritical={timer.isCritical}
              formattedTime={timer.formattedTime}
            />
            {current.task_type === "dictation" && !dictationTimerStarted ? (
              <button
                type="button"
                onClick={() => {
                  setDictationTimerStarted(true);
                  timer.resumeTimer();
                }}
                className="mt-4 rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-3 text-sm font-black uppercase text-[#FFCC00] shadow-[4px_4px_0_0_#111111]"
              >
                Start timer / เริ่มจับเวลา
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-black uppercase text-neutral-600">
            <span>Progress / ความคืบหน้า</span>
            <span>{progressPct}%</span>
          </div>
        </section>

        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111111]">
          <QuestionRouter
            question={question as any}
            submitting={submitting}
            onDictationAudioFinished={() => {
              if (dictationTimerStarted) return;
              setDictationTimerStarted(true);
              timer.resumeTimer();
            }}
            onSubmit={submit}
          />
        </section>

        {resting ? (
          <section className="border-4 border-black bg-black p-5 text-center text-white shadow-[8px_8px_0_0_#111111]">
            <p className="text-xl font-black text-[#FFCC00]">Reset and breathe / พักสั้นๆ</p>
            <p className="mt-2 text-sm font-bold">Next task is loading in {timer.formattedTime}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
