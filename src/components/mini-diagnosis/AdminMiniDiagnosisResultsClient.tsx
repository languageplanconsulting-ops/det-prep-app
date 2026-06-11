"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// ─── Types (verbatim from MiniDiagnosisResultsClient) ────────────────────────

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

// ─── Label helpers (verbatim) ─────────────────────────────────────────────────

function breakdownLabel(key: string) {
  const labels: Record<string, string> = {
    dictation: "Dictation / ฟังแล้วพิมพ์",
    interactive_listening: "Listening Mini Test / มินิเทสต์การฟัง",
    read_then_speak: "Read Then Speak / อ่านแล้วพูด",
    fill_in_blanks: "Fill in the Blank / เติมคำ",
    vocabulary_reading: "Vocabulary Reading / คำศัพท์ + การอ่าน",
    write_about_photo: "Write About Photo / เขียนจากภาพ",
    reading: "Reading",
    listening: "Listening",
    speaking: "Speaking",
    writing: "Writing",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function breakdownPctLabel(skill: string, part: string) {
  const map: Record<string, Record<string, string>> = {
    listening: {
      dictation: "50%",
      interactive_listening: "50%",
    },
    speaking: {
      read_then_speak: "100%",
    },
    reading: {
      fill_in_blanks: "50%",
      vocabulary_reading: "50%",
    },
    writing: {
      write_about_photo: "55%",
      dictation: "30%",
      fill_in_blanks: "15%",
    },
  };
  return map[skill]?.[part] ?? "";
}

function taskLabel(taskType: string) {
  const labels: Record<string, string> = {
    dictation: "Dictation / ฟังแล้วพิมพ์",
    real_english_word: "Real English Word / คำอังกฤษจริง",
    vocabulary_reading: "Vocabulary Reading / คำศัพท์ + การอ่าน",
    fill_in_blanks: "Fill in the Blank / เติมคำ",
    interactive_listening: "Listening Mini Test / มินิเทสต์การฟัง",
    write_about_photo: "Write About Photo / เขียนจากภาพ",
    read_then_speak: "Read Then Speak / อ่านแล้วพูด",
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

// ─── Objective review renderer (verbatim logic, calm visual reskin) ───────────

function renderObjectiveReview(taskType: string, answer: unknown, item: StepItem) {
  if (taskType === "dictation") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
            คำตอบของคุณ / Your answer
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            {String((answer as { answer?: unknown })?.answer ?? answer ?? "") || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
            เฉลย / Reference script
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
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
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
            คำตอบของคุณ / Your blanks
          </p>
          <div className="mt-3 space-y-2">
            {yourAnswers.map((value, idx) => (
              <div key={idx} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                Blank {idx + 1}: <span className="font-semibold">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
            เฉลย / Correct blanks
          </p>
          <div className="mt-3 space-y-2">
            {correctAnswers.map((value, idx) => (
              <div key={idx} className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-neutral-700">
                Blank {idx + 1}: <span className="font-semibold">{value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
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
    return (
      <div className="space-y-3">
        {prompts.map((prompt, idx) => {
          const picked = selectedAnswers[idx] ?? "";
          const correct = correctAnswers[idx] ?? "";
          const match = picked === correct;
          return (
            <div key={idx} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="text-xs font-bold text-[#004AAD]">Q{idx + 1}</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-700">{prompt}</p>
              </div>
              <div className={`rounded-lg border px-3 py-2 text-sm ${match ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span className="font-semibold">คุณตอบ:</span> {picked || "—"}
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-sm text-neutral-700">
                <span className="font-semibold">เฉลย:</span> {correct || "—"}
              </div>
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
      <div className="space-y-3">
        {rounds.map((round, idx) => {
          const selected = Array.isArray(round.selected) ? round.selected.map((value) => String(value ?? "")) : [];
          const realWords = Array.isArray(round.realWords) ? round.realWords.map((value) => String(value ?? "")) : [];
          const fakeWords = Array.isArray(round.fakeWords) ? round.fakeWords.map((value) => String(value ?? "")) : [];
          const missedReal = realWords.filter((word) => !selected.includes(word));
          const pickedFake = selected.filter((word) => fakeWords.includes(word));
          return (
            <div key={idx} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-xs font-bold text-[#004AAD]">คำจริงที่พลาด / Missed real words</p>
                <p className="mt-2 text-sm text-neutral-700">{missedReal.join(", ") || "None / ไม่มี"}</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
                <p className="text-xs font-bold text-red-700">คำปลอมที่กด / Fake words picked</p>
                <p className="mt-2 text-sm text-neutral-700">{pickedFake.join(", ") || "None / ไม่มี"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">Answer / คำตอบ</p>
        <pre className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
          {JSON.stringify(answer ?? null, null, 2)}
        </pre>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">Correct / เฉลย</p>
        <pre className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
          {JSON.stringify(item.correct_answer ?? item.content ?? null, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ─── Skill score bar helper ───────────────────────────────────────────────────

const SKILL_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Reading: { bg: "bg-violet-50", text: "text-violet-700", bar: "bg-violet-400" },
  Listening: { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-400" },
  Speaking: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400" },
  Writing: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
};

function SkillBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 160) * 100));
  const c = SKILL_COLORS[label] ?? { bg: "bg-neutral-50", text: "text-neutral-600", bar: "bg-neutral-400" };
  return (
    <div className={`rounded-2xl ${c.bg} p-5`}>
      <div className="flex items-end justify-between">
        <p className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>{label}</p>
        <p className={`font-mono text-2xl font-bold ${c.text}`}>
          {Math.round(value)}
          <span className="ml-0.5 text-sm font-normal opacity-60">/160</span>
        </p>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-black/8">
        <div className={`h-2 rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Collapsible step review ──────────────────────────────────────────────────

function StepReviewCard({
  item,
  response,
}: {
  item: StepItem;
  response: ResponseRow | null;
}) {
  const [open, setOpen] = useState(false);
  const score = Math.round(Number(response?.score ?? 0));
  const hasImprovement = Boolean(response?.review?.improvementPoints);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#004AAD]/10 font-mono text-xs font-bold text-[#004AAD]">
          {item.step_index}
        </span>
        <span className="flex-1 text-sm font-semibold text-neutral-800">{taskLabel(item.task_type)}</span>
        <span className="font-mono text-lg font-bold text-[#004AAD]">{score}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-5 pb-5 pt-4">
          {hasImprovement ? (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#004AAD]">
                  คำตอบของคุณ / Your submission
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                  {String((response!.answer as { text?: unknown })?.text ?? response!.answer ?? "")}
                </p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">
                  วิธีเพิ่มคะแนน / How to improve
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-700">
                  {((response!.review!.improvementPoints as Array<{ th?: string; en?: string }>) ?? []).map(
                    (point, idx) => (
                      <li key={idx} className="flex gap-2 border-b border-amber-100 pb-2 last:border-0 last:pb-0">
                        <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                        {point.th || point.en}
                      </li>
                    )
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

// ─── Value-peek upsell card ───────────────────────────────────────────────────

function MockValuePeek({ weakSkills }: { weakSkills: string[] }) {
  const weak1 = weakSkills[0];
  const weak2 = weakSkills[1];

  return (
    <div className="rounded-3xl border border-[#004AAD]/20 bg-gradient-to-br from-[#004AAD]/5 to-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#004AAD]">
        Full Mock Test เพิ่มอะไรให้คุณ?
      </p>
      <p className="mt-1 text-xs text-neutral-500">What you get beyond this mini snapshot</p>

      <ul className="mt-4 space-y-3">
        {[
          {
            icon: "📋",
            th: "แบบทดสอบเต็มรูปแบบ 40+ ข้อ ใกล้เคียง DET จริง",
            en: "Full 40-item exam that mirrors the real DET format",
          },
          {
            icon: "🎯",
            th: weak1
              ? `ข้อสอบเจาะลึก ${weak1} — จุดอ่อนที่ระบบตรวจพบในผลนี้`
              : "ข้อสอบเจาะลึกทุกสกิล",
            en: weak1 ? `Deep practice set for ${weak1} — your flagged weak skill` : "Targeted deep practice per skill",
          },
          {
            icon: "💬",
            th: `ฟีดแบ็กแบบละเอียดรายข้อ${weak2 ? ` สำหรับ ${weak2} ด้วย` : ""}`,
            en: `Detailed per-item feedback${weak2 ? ` including ${weak2}` : ""}`,
          },
          {
            icon: "📈",
            th: "ดู score trajectory ข้ามเดือน วัดพัฒนาการได้จริง",
            en: "Month-over-month score tracking so progress is visible",
          },
        ].map((item, idx) => (
          <li key={idx} className="flex gap-3 text-sm leading-snug text-neutral-700">
            <span className="mt-0.5 shrink-0 text-base">{item.icon}</span>
            <span>
              <span className="font-semibold">{item.th}</span>
              <br />
              <span className="text-neutral-400">{item.en}</span>
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/pricing"
        className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-[#004AAD]/30 bg-white px-5 py-3 text-sm font-semibold text-[#004AAD] shadow-sm transition-colors hover:bg-[#004AAD]/5"
      >
        ดูแพ็กเกจทั้งหมด
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      <p className="mt-2 text-center text-xs text-neutral-400">No pressure — explore when you&apos;re ready</p>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AdminMiniDiagnosisResultsClient({ sessionId }: { sessionId: string }) {
  // ── data loading (verbatim) ──────────────────────────────────────────────
  const [result, setResult] = useState<ResultRow | null>(null);
  const [stepItems, setStepItems] = useState<StepItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  }, [sessionId]);

  // ── derived values (verbatim) ────────────────────────────────────────────
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

  // ── weak-skill derivation for CTA (uses verbatim weaknesses field) ───────
  const weakSkillNames = useMemo(
    () =>
      (result?.weaknesses ?? [])
        .slice(0, 2)
        .map((w) => w.key.charAt(0).toUpperCase() + w.key.slice(1)),
    [result],
  );

  // ── error state ──────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-md">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#004AAD]">
            Mini diagnosis — Admin preview
          </p>
          <h1 className="mt-3 text-xl font-bold text-neutral-900">หน้านี้โหลดไม่สำเร็จ</h1>
          <p className="mt-3 text-sm text-red-600">{loadError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void loadReport()}
              className="rounded-xl bg-[#004AAD] px-5 py-3 text-sm font-semibold text-[#FFCC00] shadow-sm transition-opacity hover:opacity-90"
            >
              Reload / โหลดใหม่
            </button>
            <Link
              href="/mini-diagnosis/start"
              className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
            >
              Back / กลับ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!result)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-medium text-neutral-500">
        Loading diagnosis report…
      </div>
    );

  const skills: Array<{ label: string; value: number }> = [
    { label: "Reading", value: result.actual_reading },
    { label: "Listening", value: result.actual_listening },
    { label: "Speaking", value: result.actual_speaking },
    { label: "Writing", value: result.actual_writing },
  ];

  // primary weak skill for the practice CTA anchor

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      {/* Admin badge */}
      <div className="mx-auto mb-6 max-w-4xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700">
          Admin preview — redesigned results screen
        </span>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* ── Score snapshot ─────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-white p-8 shadow-md">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#004AAD]">
                Mini diagnosis result
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">
                คะแนนและจุดอ่อน
                <br />
                <span className="text-[#004AAD]">Your level snapshot</span>
              </h1>
              <p className="mt-3 text-sm text-neutral-500">{result.level_label ?? "Mini diagnosis complete"}</p>
            </div>

            {/* Total score pill */}
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-[#FFCC00] px-10 py-6 shadow-sm">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-600">Total</p>
              <p className="font-mono text-6xl font-bold text-[#004AAD]">{Math.round(result.actual_total ?? 0)}</p>
              <p className="mt-0.5 text-xs font-medium text-neutral-600">out of 160</p>
            </div>
          </div>

          {/* Skill bars */}
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {skills.map((s) => (
              <SkillBar key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </section>

        {/* ── Strengths / Weaknesses ──────────────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Top strengths / จุดแข็ง
            </p>
            <div className="mt-4 space-y-3">
              {(result.strengths ?? []).map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-neutral-800">{row.key}</p>
                  <p className="font-mono text-sm font-bold text-emerald-700">
                    {Math.round(Number(row.score ?? 0))}
                    <span className="ml-0.5 text-xs font-normal opacity-60">/160</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">
              Main weaknesses / จุดอ่อนหลัก
            </p>
            <div className="mt-4 space-y-3">
              {(result.weaknesses ?? []).map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-neutral-800">{row.key}</p>
                  <p className="font-mono text-sm font-bold text-red-600">
                    {Math.round(Number(row.score ?? 0))}
                    <span className="ml-0.5 text-xs font-normal opacity-60">/160</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contextual next-step CTA (fixed: no bare /pricing dump) ──────── */}
        <section className="rounded-3xl border border-[#004AAD]/10 bg-gradient-to-br from-[#004AAD] to-[#0059CC] p-7 shadow-md text-white">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#FFCC00]">
            Next step / ไปต่อยังไงดี
          </p>

          {weakSkillNames.length > 0 && (
            <p className="mt-2 text-lg font-semibold leading-snug">
              ระบบตรวจพบว่าคุณควรเพิ่ม{" "}
              <span className="font-bold text-[#FFCC00]">{weakSkillNames.join(" และ ")}</span>
              {" "}ก่อนเลย
            </p>
          )}
          <p className="mt-1 text-sm text-white/75">
            {weakSkillNames.length > 0
              ? `Your score shows ${weakSkillNames.join(" & ")} need the most attention right now.`
              : "Use this report to decide what to practise next."}
          </p>

          {/* Primary CTA — practice the weak skill */}
          <Link
            href="/practice"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#FFCC00] px-6 py-4 text-base font-bold text-[#004AAD] shadow transition-opacity hover:opacity-90"
          >
            ฝึกจุดอ่อนเลย
            {weakSkillNames[0] ? ` — ${weakSkillNames[0]}` : ""}
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <p className="mt-2 text-center text-xs text-white/60">
            ไปยังหน้า Practice / Go to /practice
          </p>
        </section>

        {/* ── Value-peek upsell (contextual, not a bare /pricing dump) ─────── */}
        <MockValuePeek weakSkills={weakSkillNames} />

        {/* ── Score breakdown ────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-white p-7 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xl font-bold text-neutral-900">Score breakdown / ที่มาของคะแนน</p>
              <p className="mt-1 text-sm text-neutral-500">ทุกสกิลคิดเต็ม 160 ตามสูตร mini test ชุดนี้</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-medium text-neutral-500">
              Total = (Reading + Listening + Speaking + Writing) / 4
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {(
              [
                ["listening", result.actual_listening],
                ["speaking", result.actual_speaking],
                ["reading", result.actual_reading],
                ["writing", result.actual_writing],
              ] as const
            ).map(([skill, value]) => {
              const parts = Object.entries(
                (scoreBreakdown?.[skill as keyof typeof scoreBreakdown] as Record<string, number> | undefined) ?? {},
              );
              return (
                <div key={skill} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                        {skill}
                      </p>
                      <p className="text-base font-bold text-neutral-800">{breakdownLabel(skill)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-right shadow-sm">
                      <p className="font-mono text-[9px] font-bold uppercase text-neutral-400">Skill score</p>
                      <p className="font-mono text-xl font-bold text-[#004AAD]">
                        {Math.round(Number(value ?? 0))}/160
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {parts.map(([part, partScore]) => (
                      <div
                        key={part}
                        className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">{breakdownLabel(part)}</p>
                          <p className="text-xs text-neutral-400">
                            Weight {breakdownPctLabel(skill, part) || "Included"}
                          </p>
                        </div>
                        <p className="font-mono text-lg font-bold text-[#004AAD]">
                          {Math.round(Number(partScore ?? 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw section scores */}
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <p className="text-sm font-bold text-[#004AAD]">Raw section scores / คะแนนดิบแต่ละส่วน</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(
                (scoreBreakdown.supporting as Record<string, number> | undefined) ?? {},
              ).map(([part, partScore]) => (
                <div
                  key={part}
                  className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-neutral-800">{breakdownLabel(part)}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-[#004AAD]">
                    {Math.round(Number(partScore ?? 0))}/160
                  </p>
                  {part === "real_english_word" ? (
                    <p className="mt-1 text-xs text-neutral-400">
                      Shown for practice review, not used in skill formula.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to read this result ─────────────────────────────────────── */}
        <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <p className="text-lg font-bold text-neutral-900">วิธีดูผลนี้ / How to read this result</p>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
            <p>
              This is a mini test, so the score accuracy will not be the same as the full mock test.
              It is designed to give you a quick snapshot of your current strengths and weaknesses.
            </p>
            <p>
              นี่คือแบบทดสอบขนาดสั้น ดังนั้นความแม่นของคะแนนจะไม่เท่ากับ full mock test
              แต่ผลนี้จะช่วยให้คุณเห็นภาพเร็วๆ ว่าตอนนี้คุณเด่นด้านไหน และควรกลับไปแก้จุดไหนก่อน
            </p>
            <p>
              Use this report to decide where to practise next, especially in the skills and task types where your score dropped most.
            </p>
          </div>
        </section>

        {/* ── Step review (collapsible) ───────────────────────────────────── */}
        <section className="rounded-3xl bg-white p-7 shadow-md">
          <p className="text-xl font-bold text-neutral-900">Step review / รีวิวทีละข้อ</p>
          <p className="mt-1 text-sm text-neutral-400">กดแต่ละข้อเพื่อดูรายละเอียด / Tap to expand each step</p>
          <div className="mt-5 space-y-3">
            {merged.map(({ item, response }) => (
              <StepReviewCard key={item.step_index} item={item} response={response} />
            ))}
          </div>
        </section>

        {/* ── Bottom action row ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-3 pb-10 sm:flex-row">
          <Link
            href="/practice"
            className="flex-1 rounded-2xl bg-[#004AAD] px-6 py-4 text-center text-sm font-bold text-[#FFCC00] shadow-md transition-opacity hover:opacity-90"
          >
            ฝึกจุดอ่อนเลย → /practice
          </Link>
          <Link
            href="/pricing"
            className="flex-1 rounded-2xl border border-neutral-200 bg-white px-6 py-4 text-center text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
          >
            ดูแพ็กเกจ Full Mock → /pricing
          </Link>
        </section>
      </div>
    </main>
  );
}
