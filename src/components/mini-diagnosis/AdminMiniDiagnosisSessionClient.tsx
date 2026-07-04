"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { setSfxEnabled, sfxCorrect, sfxSubmit } from "@/lib/exam-sfx";
import { ConfettiBurst, MascotTip, GradingOverlay } from "@/components/mini-diagnosis/steps/ui";
import { MiniStepIntro } from "@/components/mini-diagnosis/steps/MiniStepIntro";
import { MiniDictationStep } from "@/components/mini-diagnosis/steps/MiniDictationStep";
import { MiniFitbStep } from "@/components/mini-diagnosis/steps/MiniFitbStep";
import { MiniListeningStep } from "@/components/mini-diagnosis/steps/MiniListeningStep";
import { MiniReadThenSpeakStep } from "@/components/mini-diagnosis/steps/MiniReadThenSpeakStep";
import { MiniRealWordStep } from "@/components/mini-diagnosis/steps/MiniRealWordStep";
import { MiniVocabReadingStep } from "@/components/mini-diagnosis/steps/MiniVocabReadingStep";
import { MiniWritePhotoStep } from "@/components/mini-diagnosis/steps/MiniWritePhotoStep";

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

const TASK_META: Record<string, { th: string; en: string; icon: string; tip: string }> = {
  dictation: {
    th: "ฟังแล้วพิมพ์",
    en: "Dictation",
    icon: "🎧",
    tip: "ฟังประโยคแล้วพิมพ์ตามให้ตรงที่สุด — ฟังได้ 3 ครั้ง ใจเย็นๆ นะ",
  },
  real_english_word: {
    th: "คำอังกฤษจริง",
    en: "Real English Word",
    icon: "🔤",
    tip: "แตะเฉพาะคำที่มีอยู่จริง — คำสะกดมั่วจะหักคะแนน เลือกเฉพาะที่มั่นใจ",
  },
  vocabulary_reading: {
    th: "คำศัพท์ + การอ่าน",
    en: "Vocabulary + Reading",
    icon: "📖",
    tip: "แตะช่องว่างในเนื้อเรื่องเพื่อเลือกคำ เสร็จแล้วค่อยตอบคำถามการอ่าน",
  },
  fill_in_blanks: {
    th: "เติมคำในช่องว่าง",
    en: "Fill in the Blanks",
    icon: "✏️",
    tip: "ดูตัวอักษรที่ให้มาก่อน แล้วใช้บริบทของประโยคช่วยเดาคำ",
  },
  interactive_listening: {
    th: "มินิเทสต์การฟัง",
    en: "Listening Mini Test",
    icon: "🎙️",
    tip: "มี 3 สถานการณ์ ฟังได้สถานการณ์ละ 3 ครั้ง — ใส่หูฟังจะช่วยได้มาก",
  },
  write_about_photo: {
    th: "เขียนจากภาพ",
    en: "Write About Photo",
    icon: "🖼️",
    tip: "บรรยายสิ่งที่เห็นในภาพเป็นประโยคเต็มๆ ยิ่งเขียนได้เยอะยิ่งดี",
  },
  read_then_speak: {
    th: "อ่านแล้วพูด",
    en: "Read Then Speak",
    icon: "🗣️",
    tip: "ข้อสุดท้ายแล้ว! อ่านโจทย์ แล้วพูดเป็นประโยคต่อเนื่อง ไม่ต้องกลัวผิด",
  },
};

function taskMeta(taskType: string | undefined) {
  return (
    TASK_META[taskType ?? ""] ?? {
      th: "ข้อสอบเช็กระดับ",
      en: "Mini diagnosis task",
      icon: "📝",
      tip: "ตั้งใจตอบตามที่ทำได้จริง ระบบจะได้วัดระดับให้แม่นๆ",
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
  const [celebrating, setCelebrating] = useState<{ step: number } | null>(null);
  const [resting, setResting] = useState<{ remaining: number } | null>(null);
  const [introFor, setIntroFor] = useState<number | null>(null);
  const introSeen = useRef<Set<number>>(new Set());
  const restTimerRef = useRef<number | null>(null);
  const timer = usePhaseTimer();

  // Test-session sounds on for everyone (visual feedback always accompanies).
  useEffect(() => {
    setSfxEnabled(true);
  }, []);

  useEffect(
    () => () => {
      if (restTimerRef.current) window.clearInterval(restTimerRef.current);
    },
    [],
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const stepIndex = session?.current_step ?? 1;
  const current = useMemo(
    () => session?.mini_diagnosis_set_items?.find((item) => item.step_index === stepIndex) ?? null,
    [session, stepIndex],
  );
  const meta = taskMeta(current?.task_type);
  const answeredCount = session?.responses?.length ?? 0;

  useEffect(() => {
    if (!current) return;
    // Timer starts paused for every step — it begins after the intro panel is
    // dismissed (and, for dictation, only after the audio finishes playing).
    setDictationTimerStarted(current.task_type !== "dictation");
    timer.startTimer(stepIndex, current.time_limit_sec);
    timer.pauseTimer();
    if (!introSeen.current.has(current.step_index)) {
      setIntroFor(current.step_index);
    } else if (current.task_type !== "dictation") {
      timer.resumeTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.step_index, current?.task_type]);

  const dismissIntro = () => {
    if (!current) return;
    introSeen.current.add(current.step_index);
    setIntroFor(null);
    if (current.task_type !== "dictation") timer.resumeTimer();
  };

  const beginRest = (seconds: number, after: () => void) => {
    setResting({ remaining: seconds });
    restTimerRef.current = window.setInterval(() => {
      setResting((prev) => {
        if (!prev) return prev;
        if (prev.remaining <= 1) {
          if (restTimerRef.current) window.clearInterval(restTimerRef.current);
          restTimerRef.current = null;
          after();
          return null;
        }
        return { remaining: prev.remaining - 1 };
      });
    }, 1000);
  };

  const submit = async (answer: unknown) => {
    if (!current || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      sfxSubmit();
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
        sfxCorrect();
        if (typeof window !== "undefined") {
          window.location.assign(`/mini-diagnosis/results/${sessionId}`);
          return;
        }
        router.push(`/mini-diagnosis/results/${sessionId}`);
        return;
      }

      // Celebrate, then rest if this step has a break, then show the next step.
      const finishedStep = current.step_index;
      const restSec = Math.max(0, Number(current.rest_after_step_sec ?? 0));
      sfxCorrect();
      setCelebrating({ step: finishedStep });
      await load();
      window.setTimeout(() => {
        setCelebrating(null);
        if (restSec > 0) {
          beginRest(restSec, () => window.scrollTo({ top: 0 }));
        } else {
          window.scrollTo({ top: 0 });
        }
      }, 1600);
      setSubmitting(false);
    } catch {
      setError("ส่งคำตอบสำเร็จไม่ครบ กรุณาลองกดส่งอีกครั้งหรือรีโหลดหน้า");
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="max-w-md rounded-2xl border border-rose-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-ep-blue px-4 py-2.5 text-sm font-bold text-white"
          >
            รีโหลดหน้า
          </button>
        </div>
      </main>
    );
  }

  if (loading || !session || !current) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/mascot-doy.png" alt="" className="h-16 w-16 animate-bounce object-contain" />
          <p className="text-sm font-semibold text-slate-500">กำลังโหลดแบบเช็กระดับ…</p>
        </div>
      </main>
    );
  }

  /* ---------- rest screen between sections ---------- */
  if (resting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="w-full max-w-sm space-y-4">
          <MascotTip
            size="lg"
            text={`เก่งมาก! ผ่านมาแล้ว ${answeredCount}/${STEP_COUNT} ข้อ 🎉`}
            sub="พักหายใจแป๊บนึง เดี๋ยวไปข้อต่อไปกัน"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">พักสั้นๆ</p>
            <p className="mt-2 font-mono text-5xl font-bold text-ep-blue">{resting.remaining}</p>
            <p className="mt-1 text-xs text-slate-400">วินาที</p>
            <button
              type="button"
              onClick={() => {
                if (restTimerRef.current) window.clearInterval(restTimerRef.current);
                restTimerRef.current = null;
                setResting(null);
                window.scrollTo({ top: 0 });
              }}
              className="mt-4 rounded-xl border-2 border-ep-blue px-4 py-2 text-sm font-bold text-ep-blue transition hover:bg-blue-50"
            >
              พร้อมแล้ว ไปต่อเลย →
            </button>
          </div>
        </div>
      </main>
    );
  }

  const stepBody = (() => {
    const props = {
      content: current.content,
      submitting,
      onSubmit: submit,
    };
    switch (current.task_type) {
      case "dictation":
        return (
          <MiniDictationStep
            {...props}
            onAudioPlaybackFinished={() => {
              if (dictationTimerStarted) return;
              setDictationTimerStarted(true);
              timer.resumeTimer();
            }}
          />
        );
      case "real_english_word":
        return <MiniRealWordStep {...props} />;
      case "vocabulary_reading":
        return <MiniVocabReadingStep {...props} />;
      case "fill_in_blanks":
        return <MiniFitbStep {...props} />;
      case "interactive_listening":
        return <MiniListeningStep {...props} />;
      case "write_about_photo":
        return <MiniWritePhotoStep {...props} />;
      case "read_then_speak":
        return <MiniReadThenSpeakStep {...props} />;
      default:
        return (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Unsupported task type: {current.task_type}
          </p>
        );
    }
  })();

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-10">
      {/* sticky top bar: step dots + timer */}
      <div className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f5f7fb]/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex flex-1 items-center gap-1">
            {Array.from({ length: STEP_COUNT }).map((_, i) => {
              const n = i + 1;
              return (
                <span
                  key={n}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    n < stepIndex ? "bg-emerald-400" : n === stepIndex ? "bg-ep-blue" : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold ${
              timer.isCritical
                ? "bg-rose-100 text-rose-600"
                : timer.isWarning
                  ? "bg-amber-100 text-amber-700"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            ⏱ {timer.formattedTime}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* step heading + mascot tip */}
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-bold text-slate-900">
            {meta.icon} {meta.th}
          </h1>
          <span className="font-mono text-xs font-bold text-slate-400">
            ข้อ {stepIndex}/{STEP_COUNT}
          </span>
        </div>
        <MascotTip text={meta.tip} />

        {/* dictation: start-timer gate */}
        {current.task_type === "dictation" && !dictationTimerStarted ? (
          <p className="rounded-xl bg-ep-yellow/25 px-3 py-2 text-xs font-semibold text-slate-700">
            ⏱ เวลาจะเริ่มนับหลังเสียงเล่นจบครั้งแรก — กดฟังเมื่อพร้อม
          </p>
        ) : null}

        {stepBody}
      </div>

      {/* AI grading animation (writing / speaking) */}
      {submitting && current?.is_ai_graded ? (
        <GradingOverlay kind={current.task_type === "read_then_speak" ? "Speaking" : "Writing"} />
      ) : null}

      {/* pre-exam introduction (what this task really measures) */}
      {introFor != null && !celebrating && current ? (
        <MiniStepIntro
          taskType={current.task_type}
          stepIndex={current.step_index}
          stepCount={STEP_COUNT}
          timeLimitSec={current.time_limit_sec}
          onStart={dismissIntro}
        />
      ) : null}

      {/* celebration overlay */}
      {celebrating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6">
          <div className="relative w-full max-w-xs overflow-hidden rounded-3xl bg-white p-6 text-center shadow-xl">
            <ConfettiBurst />
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img
              src="/mascot-doy.png"
              alt=""
              className="mx-auto h-20 w-20 object-contain"
              style={{ animation: "minidiag-pop 0.5s ease-out" }}
            />
            <p className="mt-2 text-xl font-bold text-slate-900">เยี่ยมมาก! 🎉</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              ข้อ {celebrating.step} เสร็จแล้ว · เหลืออีก {STEP_COUNT - celebrating.step} ข้อ
            </p>
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${i < celebrating.step ? "bg-emerald-400" : "bg-slate-200"}`}
                />
              ))}
            </div>
            <style>{`@keyframes minidiag-pop { 0% { transform: scale(0.4); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }`}</style>
          </div>
        </div>
      ) : null}
    </main>
  );
}
