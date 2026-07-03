"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { setSfxEnabled, sfxReveal } from "@/lib/exam-sfx";
import { ConfettiBurst } from "@/components/mini-diagnosis/steps/ui";

// ─── Types (verbatim) ─────────────────────────────────────────────────────────

type StepItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
};

type ResponseRow = {
  step_index: number;
  task_type: string;
  score: number;
  answer?: unknown;
  review?: Record<string, unknown> | null;
};

type ResultRow = {
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  level_label?: string | null;
  strengths?: Array<{ key: string; score: number }>;
  weaknesses?: Array<{ key: string; score: number }>;
  report_payload?: {
    responses?: ResponseRow[];
    scoreBreakdown?: {
      total?: Record<string, number>;
      listening?: Record<string, number>;
      speaking?: Record<string, number>;
      reading?: Record<string, number>;
      writing?: Record<string, number>;
      supporting?: Record<string, number>;
    };
  };
  created_at?: string;
};

// ─── Label helpers ────────────────────────────────────────────────────────────

const SKILL_TH: Record<string, { th: string; icon: string; practiceNote: string }> = {
  listening: { th: "ฟัง", icon: "🎧", practiceNote: "ฝึก Dictation + Listening มินิเทสต์" },
  speaking: { th: "พูด", icon: "🗣️", practiceNote: "ฝึก Read Then Speak + Speak About Photo" },
  reading: { th: "อ่าน", icon: "📖", practiceNote: "ฝึก Reading + เติมคำในช่องว่าง" },
  writing: { th: "เขียน", icon: "✍️", practiceNote: "ฝึก Write About Photo + Read & Write" },
};

function breakdownLabel(key: string) {
  const labels: Record<string, string> = {
    dictation: "ฟังแล้วพิมพ์ (Dictation)",
    interactive_listening: "มินิเทสต์การฟัง",
    read_then_speak: "อ่านแล้วพูด",
    fill_in_blanks: "เติมคำในช่องว่าง",
    vocabulary_reading: "คำศัพท์ + การอ่าน",
    write_about_photo: "เขียนจากภาพ",
    real_english_word: "คำอังกฤษจริง",
    reading: "อ่าน (Reading)",
    listening: "ฟัง (Listening)",
    speaking: "พูด (Speaking)",
    writing: "เขียน (Writing)",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function breakdownPctLabel(skill: string, part: string) {
  const map: Record<string, Record<string, string>> = {
    listening: { dictation: "50%", interactive_listening: "50%" },
    speaking: { read_then_speak: "100%" },
    reading: { fill_in_blanks: "50%", vocabulary_reading: "50%" },
    writing: { write_about_photo: "55%", dictation: "30%", fill_in_blanks: "15%" },
  };
  return map[skill]?.[part] ?? "";
}

function taskLabel(taskType: string) {
  const labels: Record<string, string> = {
    dictation: "🎧 ฟังแล้วพิมพ์",
    real_english_word: "🔤 คำอังกฤษจริง",
    vocabulary_reading: "📖 คำศัพท์ + การอ่าน",
    fill_in_blanks: "✏️ เติมคำในช่องว่าง",
    interactive_listening: "🎙️ มินิเทสต์การฟัง",
    write_about_photo: "🖼️ เขียนจากภาพ",
    read_then_speak: "🗣️ อ่านแล้วพูด",
  };
  return labels[taskType] ?? taskType;
}

function extractFitbAnswers(answer: unknown): string[] {
  if (Array.isArray((answer as { answers?: unknown[] })?.answers)) {
    return ((answer as { answers?: unknown[] }).answers ?? []).map((item) => String(item ?? ""));
  }
  if (Array.isArray((answer as { answer?: { answers?: unknown[] } })?.answer?.answers)) {
    return (((answer as { answer?: { answers?: unknown[] } }).answer?.answers ?? []).map((item) =>
      String(item ?? "")));
  }
  return [];
}

// CEFR band from a 0–160 score, using Duolingo's published mapping.
function cefrFromTotal(total: number): string {
  if (total >= 150) return "C2";
  if (total >= 130) return "C1";
  if (total >= 110) return "B2";
  if (total >= 90) return "B1";
  if (total >= 60) return "A2";
  return "A1";
}

// ─── Objective review renderer (logic verbatim, soft reskin) ──────────────────

function renderObjectiveReview(taskType: string, answer: unknown, item: StepItem) {
  if (taskType === "dictation") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">คำตอบของคุณ</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {String((answer as { answer?: unknown })?.answer ?? answer ?? "") || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ep-blue">เฉลย</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {String((item.content as { reference_sentence?: unknown } | null)?.reference_sentence ?? "") || "—"}
          </p>
        </div>
      </div>
    );
  }

  if (taskType === "fill_in_blanks") {
    const yourAnswers = extractFitbAnswers(answer);
    const correctAnswers = Array.isArray((item.correct_answer as { answers?: unknown[] } | null)?.answers)
      ? (((item.correct_answer as { answers?: unknown[] }).answers ?? []).map((value) => String(value ?? "")))
      : [];
    return (
      <div className="space-y-2">
        {correctAnswers.map((correct, idx) => {
          const typed = yourAnswers[idx] ?? "";
          const match = typed.trim().toLowerCase() === correct.trim().toLowerCase();
          return (
            <div
              key={idx}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                match ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <span className="font-semibold text-slate-700">
                ช่อง {idx + 1}: {typed || "—"}
              </span>
              <span className={match ? "font-bold text-emerald-700" : "font-bold text-rose-600"}>
                {match ? "✓" : `เฉลย: ${correct}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (taskType === "vocabulary_reading" || taskType === "interactive_listening") {
    const selectedAnswers = Array.isArray((answer as { selected_answers?: unknown[] })?.selected_answers)
      ? ((answer as { selected_answers?: unknown[] }).selected_answers ?? []).map((value) => String(value ?? ""))
      : [];
    const correctAnswers = Array.isArray((answer as { correct_answers?: unknown[] })?.correct_answers)
      ? ((answer as { correct_answers?: unknown[] }).correct_answers ?? []).map((value) => String(value ?? ""))
      : [];
    const prompts = Array.isArray((answer as { question_prompts?: unknown[] })?.question_prompts)
      ? ((answer as { question_prompts?: unknown[] }).question_prompts ?? []).map((value) => String(value ?? ""))
      : [];
    const rows = prompts.length > 0 ? prompts : correctAnswers.map((_, i) => `ข้อ ${i + 1}`);
    return (
      <div className="space-y-2">
        {rows.map((prompt, idx) => {
          const picked = selectedAnswers[idx] ?? "";
          const correct = correctAnswers[idx] ?? "";
          const match = picked === correct;
          return (
            <div
              key={idx}
              className={`rounded-xl border p-3.5 ${
                match ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <p className="text-xs font-bold text-slate-500">
                {match ? "✓" : "✕"} Q{idx + 1}. {prompt}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                คุณตอบ: <span className="font-semibold">{picked || "—"}</span>
                {!match ? (
                  <span className="ml-2 text-emerald-700">
                    เฉลย: <span className="font-semibold">{correct || "—"}</span>
                  </span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  if (taskType === "real_english_word") {
    const rounds = Array.isArray((answer as { round_selections?: unknown[] })?.round_selections)
      ? ((answer as { round_selections?: Array<Record<string, unknown>> }).round_selections ?? [])
      : [];
    return (
      <div className="space-y-2">
        {rounds.map((round, idx) => {
          const selected = Array.isArray(round.selected) ? round.selected.map((value) => String(value ?? "")) : [];
          const realWords = Array.isArray(round.realWords) ? round.realWords.map((value) => String(value ?? "")) : [];
          const fakeWords = Array.isArray(round.fakeWords) ? round.fakeWords.map((value) => String(value ?? "")) : [];
          const missedReal = realWords.filter((word) => !selected.includes(word));
          const pickedFake = selected.filter((word) => fakeWords.includes(word));
          return (
            <div key={idx} className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                <p className="text-xs font-bold text-ep-blue">คำจริงที่พลาด</p>
                <p className="mt-1.5 text-sm text-slate-700">{missedReal.join(", ") || "ไม่มี 🎉"}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
                <p className="text-xs font-bold text-rose-600">คำมั่วที่เผลอกด</p>
                <p className="mt-1.5 text-sm text-slate-700">{pickedFake.join(", ") || "ไม่มี 🎉"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <pre className="whitespace-pre-wrap text-xs text-slate-600">{JSON.stringify(answer ?? null, null, 2)}</pre>
    </div>
  );
}

// ─── Step review card ─────────────────────────────────────────────────────────

function StepReviewCard({ item, response }: { item: StepItem; response: ResponseRow | null }) {
  const [open, setOpen] = useState(false);
  const score = Math.round(Number(response?.score ?? 0));
  const good = score >= 112; // ≥70%
  const mid = score >= 80;
  const hasImprovement = Boolean(response?.review?.improvementPoints);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
      >
        <span
          className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
            good ? "bg-emerald-100 text-emerald-700" : mid ? "bg-blue-50 text-ep-blue" : "bg-rose-50 text-rose-600"
          }`}
        >
          {score}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{taskLabel(item.task_type)}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3.5">
          {hasImprovement ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">คำตอบของคุณ</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {String((response!.answer as { text?: unknown })?.text ?? response!.answer ?? "")}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">วิธีเพิ่มคะแนน</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700">
                  {((response!.review!.improvementPoints as Array<{ th?: string; en?: string }>) ?? []).map(
                    (point, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                        {point.th || point.en}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          ) : (
            renderObjectiveReview(item.task_type, response?.answer, item)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminMiniDiagnosisResultsClient({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<ResultRow | null>(null);
  const [stepItems, setStepItems] = useState<StepItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const revealPlayed = useRef(false);

  useEffect(() => {
    setSfxEnabled(true);
  }, []);

  const loadReport = async () => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/mini-diagnosis/results/${sessionId}/report`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: ResultRow;
        stepItems?: StepItem[];
        error?: string;
      };
      if (!res.ok || !json.result) {
        setLoadError(json.error ?? "ยังโหลดผล mini diagnosis ไม่สำเร็จ");
        return;
      }
      setResult(json.result ?? null);
      setStepItems(json.stepItems ?? []);
    } catch {
      setLoadError("ยังโหลดผล mini diagnosis ไม่สำเร็จ กรุณากดรีโหลดอีกครั้ง");
    }
  };

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Count-up + reveal celebration once the result arrives.
  useEffect(() => {
    if (!result) return;
    const total = Math.round(result.actual_total ?? 0);
    if (!revealPlayed.current) {
      revealPlayed.current = true;
      sfxReveal();
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1800);
    }
    const durationMs = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplayTotal(Math.round(total * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const responses = useMemo(() => result?.report_payload?.responses ?? [], [result]);
  const scoreBreakdown = useMemo(() => result?.report_payload?.scoreBreakdown ?? {}, [result]);
  const merged = useMemo(
    () =>
      stepItems.map((item) => ({
        item,
        response: responses.find((row) => row.step_index === item.step_index) ?? null,
      })),
    [responses, stepItems],
  );

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">หน้านี้โหลดไม่สำเร็จ</h1>
          <p className="mt-2 text-sm text-rose-600">{loadError}</p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void loadReport()}
              className="rounded-xl bg-ep-blue px-5 py-3 text-sm font-bold text-white"
            >
              โหลดใหม่
            </button>
            <Link
              href="/mini-diagnosis/start"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              กลับ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/mascot-doy.png" alt="" className="h-16 w-16 animate-bounce object-contain" />
          <p className="text-sm font-semibold text-slate-500">พี่ดอยกำลังรวมคะแนน…</p>
        </div>
      </main>
    );
  }

  const total = Math.round(result.actual_total ?? 0);
  const totalPct = Math.min(100, Math.max(0, (total / 160) * 100));
  const skills = [
    { key: "reading", value: Math.round(result.actual_reading ?? 0) },
    { key: "listening", value: Math.round(result.actual_listening ?? 0) },
    { key: "writing", value: Math.round(result.actual_writing ?? 0) },
    { key: "speaking", value: Math.round(result.actual_speaking ?? 0) },
  ].sort((a, b) => b.value - a.value);
  const weakest = skills[skills.length - 1]!;
  const strongest = skills[0]!;
  const weakMeta = SKILL_TH[weakest.key] ?? { th: weakest.key, icon: "🎯", practiceNote: "" };
  const strongMeta = SKILL_TH[strongest.key] ?? { th: strongest.key, icon: "💪", practiceNote: "" };

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4">
        {/* mascot header */}
        <div className="flex items-end gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/mascot-doy.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
          <div className="relative flex-1 rounded-2xl rounded-bl-md border border-blue-100 bg-blue-50 px-3.5 py-2.5">
            <p className="text-sm font-semibold leading-snug text-slate-800">
              ทำครบทั้ง 9 ข้อแล้ว เก่งมาก! 🎉 นี่คือระดับของคุณตอนนี้
            </p>
          </div>
        </div>

        {/* score hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {celebrate ? <ConfettiBurst /> : null}
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            คะแนนประเมิน (เทียบสเกล DET 10–160)
          </p>
          <p className="mt-2 font-mono text-6xl font-bold tracking-tight text-ep-blue">≈{displayTotal}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="rounded-full bg-ep-yellow/40 px-3 py-1 text-xs font-bold text-slate-800">
              CEFR ≈ {cefrFromTotal(total)}
            </span>
            {result.level_label ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-ep-blue">
                {result.level_label}
              </span>
            ) : null}
          </div>
          <div className="mx-auto mt-4 h-3 max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-ep-blue transition-all duration-700"
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <div className="mx-auto mt-1 flex max-w-sm justify-between font-mono text-[10px] font-bold text-slate-400">
            <span>10</span>
            <span>85</span>
            <span>160</span>
          </div>
        </section>

        {/* 4 skill bars */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-800">4 ทักษะของคุณ</p>
          <div className="mt-3.5 space-y-3.5">
            {skills.map((s) => {
              const meta = SKILL_TH[s.key] ?? { th: s.key, icon: "•", practiceNote: "" };
              const pct = Math.min(100, Math.max(0, (s.value / 160) * 100));
              const isWeakest = s.key === weakest.key;
              return (
                <div key={s.key}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {meta.icon} {meta.th}
                      <span className="ml-1.5 text-[11px] font-bold uppercase text-slate-400">{s.key}</span>
                      {isWeakest ? (
                        <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          แก้ก่อน
                        </span>
                      ) : null}
                    </span>
                    <span className={`font-mono text-sm font-bold ${isWeakest ? "text-rose-600" : "text-ep-blue"}`}>
                      {s.value}
                      <span className="ml-0.5 text-[10px] text-slate-400">/160</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isWeakest ? "bg-rose-400" : "bg-ep-blue"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* strength + focus-first */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-bold text-emerald-700">💪 จุดแข็งของคุณ</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {strongMeta.icon} {strongMeta.th} · {strongest.value}/160
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              ทักษะนี้เป็นฐานที่ดี ใช้ต่อยอดทักษะอื่นได้เลย
            </p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <p className="text-xs font-bold text-rose-600">🎯 โฟกัสอันนี้ก่อน</p>
            <p className="mt-1 text-base font-bold text-slate-900">
              {weakMeta.icon} {weakMeta.th} · {weakest.value}/160
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{weakMeta.practiceNote}</p>
          </div>
        </section>

        {/* single clear next action */}
        <Link
          href="/practice"
          className="flex items-center justify-center gap-2 rounded-2xl bg-ep-blue px-6 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.99]"
        >
          เริ่มฝึก{weakMeta.th}เลย →
        </Link>

        {/* step review */}
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-sm font-bold text-slate-800">รีวิวทีละข้อ</p>
            <p className="text-xs text-slate-400">แตะเพื่อดูคำตอบ + เฉลย</p>
          </div>
          {merged.map(({ item, response }) => (
            <StepReviewCard key={item.step_index} item={item} response={response} />
          ))}
        </section>

        {/* score breakdown — progressive disclosure */}
        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3.5 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
            คะแนนแต่ละทักษะคิดมายังไง?
            <svg
              className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3.5">
            {(
              [
                ["reading", result.actual_reading],
                ["listening", result.actual_listening],
                ["writing", result.actual_writing],
                ["speaking", result.actual_speaking],
              ] as const
            ).map(([skill, value]) => {
              const parts = Object.entries(
                (scoreBreakdown?.[skill as keyof typeof scoreBreakdown] as Record<string, number> | undefined) ?? {},
              );
              return (
                <div key={skill} className="rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">{breakdownLabel(skill)}</p>
                    <p className="font-mono text-sm font-bold text-ep-blue">{Math.round(Number(value ?? 0))}/160</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    {parts.map(([part, partScore]) => (
                      <div key={part} className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          {breakdownLabel(part)}
                          {breakdownPctLabel(skill, part) ? (
                            <span className="ml-1 text-slate-400">({breakdownPctLabel(skill, part)})</span>
                          ) : null}
                        </span>
                        <span className="font-mono font-bold">{Math.round(Number(partScore ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* raw section scores */}
            <div className="rounded-xl bg-blue-50/50 p-3.5">
              <p className="text-xs font-bold text-ep-blue">คะแนนดิบแต่ละส่วน (เต็ม 160)</p>
              <div className="mt-2 space-y-1">
                {Object.entries((scoreBreakdown.supporting as Record<string, number> | undefined) ?? {}).map(
                  ([part, partScore]) => (
                    <div key={part} className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {breakdownLabel(part)}
                        {part === "real_english_word" ? (
                          <span className="ml-1 text-slate-400">(ไว้ดูประกอบ ไม่คิดในสูตร)</span>
                        ) : null}
                      </span>
                      <span className="font-mono font-bold">{Math.round(Number(partScore ?? 0))}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </details>

        {/* honesty note */}
        <p className="px-2 text-center text-xs leading-relaxed text-slate-400">
          นี่คือแบบทดสอบขนาดสั้น ความแม่นของคะแนนจะไม่เท่า full mock test —
          ใช้ผลนี้เพื่อดูว่าเด่นด้านไหนและควรแก้จุดไหนก่อน
        </p>

        {/* quiet secondary row */}
        <div className="flex items-center justify-center gap-4 pb-6 text-xs">
          <Link href="/mock-test/start" className="font-semibold text-slate-500 underline-offset-2 hover:underline">
            อยากได้คะแนนแม่นขึ้น? ลอง Full Mock Test
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/pricing" className="font-semibold text-slate-500 underline-offset-2 hover:underline">
            ดูแพ็กเกจ
          </Link>
        </div>
      </div>
    </main>
  );
}
