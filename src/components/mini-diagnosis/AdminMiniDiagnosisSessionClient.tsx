"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { QuestionRouter } from "@/components/mock-test/questions/QuestionRouter";
import { MockTestTimerBar } from "@/components/mock-test/MockTestTimerBar";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { MiniInteractiveListeningStep } from "@/components/mini-diagnosis/MiniInteractiveListeningStep";

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
  interactive_listening: { en: "Listening Mini Test", th: "มินิเทสต์การฟัง", hint: "ฟังบทสนทนาในแคมปัส 3 สถานการณ์ กดฟังได้ไม่เกิน 3 ครั้งต่อสถานการณ์ แล้วตอบคำถามทั้งหมด / 3 campus scenarios, up to 3 plays each, then answer every question." },
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

export function AdminMiniDiagnosisSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictationTimerStarted, setDictationTimerStarted] = useState(true);
  const timer = usePhaseTimer();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
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
    } catch {
      setError("หน้านี้โหลดไม่สำเร็จ กรุณากดรีโหลดแล้วลองใหม่อีกครั้ง");
      setLoading(false);
    }
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
    try {
      setSubmitting(true);
      setError(null);
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
        if (typeof window !== "undefined") {
          window.location.assign(`/mini-diagnosis/results/${sessionId}`);
          return;
        }
        router.push(`/mini-diagnosis/results/${sessionId}`);
        return;
      }
      await load();
      setSubmitting(false);
    } catch {
      setError("ส่งคำตอบสำเร็จไม่ครบ กรุณาลองกดส่งอีกครั้งหรือรีโหลดหน้า");
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-600">{error}</p>
        </div>
      </main>
    );
  }
  if (loading || !session || !question || !current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-ep-blue" />
          กำลังโหลดแบบเช็กระดับ…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Header */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* top progress bar */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-400">
              <span>เช็กระดับฟรี · ข้อ {stepIndex}/{STEP_COUNT}</span>
              <span className="font-mono">{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-ep-blue transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ep-blue">
                Mini diagnosis
              </p>
              <h1 className="mt-1.5 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                {currentMeta.th}
                <span className="ml-2 align-middle text-base font-semibold text-ep-blue">{currentMeta.en}</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{currentMeta.hint}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">ชุดข้อสอบ</p>
              <p className="mt-1 text-sm font-bold text-ep-blue">
                {session.mini_diagnosis_sets?.user_title ?? session.mini_diagnosis_sets?.name ?? "Mini diagnosis"}
              </p>
            </div>
          </div>

          {/* timer */}
          <div className="mt-5">
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
                className="mt-4 rounded-xl bg-ep-blue px-5 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                เริ่มจับเวลา / Start timer
              </button>
            ) : null}
          </div>
        </section>

        {/* Question body (shared QuestionRouter, wrapped in a calm card) */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {current.task_type === "interactive_listening" ? (
            <MiniInteractiveListeningStep
              content={current.content}
              submitting={submitting}
              onSubmit={submit}
            />
          ) : (
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
          )}
        </section>
      </div>
    </main>
  );
}
