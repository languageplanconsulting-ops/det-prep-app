"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DialogueSummaryReportView } from "@/components/dialogue-summary/DialogueSummaryReportView";
import { VipAiFeedbackQuotaBanner } from "@/components/vip/VipAiFeedbackQuotaBanner";
import { GradingProgressLoader } from "@/components/ui/GradingProgressLoader";
import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import {
  DIALOGUE_SUMMARY_DIFFICULTY_LABEL,
  DIALOGUE_SUMMARY_MIN_WORDS,
  DIALOGUE_SUMMARY_RUBRIC_WEIGHTS,
} from "@/lib/dialogue-summary-constants";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import { saveDialogueSummaryBestScore } from "@/lib/dialogue-summary-storage";
import type { DialogueSummaryAttemptReport, DialogueSummaryExam } from "@/types/dialogue-summary";

const RUBRIC_CHIPS: { key: keyof typeof DIALOGUE_SUMMARY_RUBRIC_WEIGHTS; label: string; accent: string }[] = [
  { key: "relevancy", label: "Relevancy", accent: "bg-sky-100 text-sky-900 border-sky-300" },
  { key: "grammar", label: "Grammar", accent: "bg-rose-100 text-rose-900 border-rose-300" },
  { key: "flow", label: "Flow", accent: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { key: "vocabulary", label: "Vocabulary", accent: "bg-amber-100 text-amber-900 border-amber-300" },
];

function speakerBubbleClass(index: number): string {
  const styles = [
    "border-ep-blue/40 bg-gradient-to-br from-white to-sky-50/80",
    "border-amber-400/50 bg-gradient-to-br from-white to-amber-50/80",
    "border-violet-400/40 bg-gradient-to-br from-white to-violet-50/70",
    "border-teal-400/40 bg-gradient-to-br from-white to-teal-50/70",
  ];
  return styles[index % styles.length]!;
}

export function DialogueSummarySessionClient({ exam }: { exam: DialogueSummaryExam }) {
  const vipGate = useVipAiFeedbackGate();
  const [summary, setSummary] = useState("");
  const [phase, setPhase] = useState<"write" | "loading" | "report">("write");
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DialogueSummaryAttemptReport | null>(null);

  const attemptId = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const listHref = `/practice/listening/dialogue-summary/round/${exam.round}/${exam.difficulty}`;
  const roundHref = `/practice/listening/dialogue-summary/round/${exam.round}`;
  const wordProgressPct = Math.min(100, (wordCount / DIALOGUE_SUMMARY_MIN_WORDS) * 100);
  const meetsMin = wordCount >= DIALOGUE_SUMMARY_MIN_WORDS;

  const speakerOrder = useMemo(() => {
    const seen: string[] = [];
    for (const t of exam.dialogue) {
      if (!seen.includes(t.speaker)) seen.push(t.speaker);
    }
    return seen;
  }, [exam.dialogue]);

  const speakerIdx = (name: string) => Math.max(0, speakerOrder.indexOf(name));

  const submit = async () => {
    setError(null);
    if (wordCount < DIALOGUE_SUMMARY_MIN_WORDS) {
      setError(`Write at least ${DIALOGUE_SUMMARY_MIN_WORDS} words.`);
      return;
    }
    if (!vipGate.confirmBeforeAiSubmit()) return;
    setPhase("loading");
    try {
      const submittedAt = new Date().toISOString();
      const geminiKey = getStoredGeminiKey();
      const res = await fetch("/api/dialogue-summary-report", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
        },
        body: JSON.stringify({
          attemptId,
          summary,
          exam,
          submittedAt,
        }),
      });
      const data = (await res.json()) as DialogueSummaryAttemptReport | { error?: string };
      if (!res.ok) {
        setPhase("write");
        setError(typeof (data as { error?: string }).error === "string" ? (data as { error: string }).error : "Request failed");
        return;
      }
      const r = data as DialogueSummaryAttemptReport;
      if (
        typeof r.score160 !== "number" ||
        typeof r.attemptId !== "string" ||
        !r.relevancy ||
        !r.grammar ||
        !r.flow ||
        !r.vocabulary
      ) {
        setPhase("write");
        setError("Invalid response from grading service.");
        return;
      }
      setReport(r);
      saveDialogueSummaryBestScore({
        round: exam.round,
        difficulty: exam.difficulty,
        setNumber: exam.setNumber,
        score160: r.score160,
      });
      vipGate.recordSuccessfulAiSubmit();
      setPhase("report");
    } catch {
      setPhase("write");
      setError("Network error. Try again.");
    }
  };

  if (phase === "loading") {
    return <GradingProgressLoader eyebrow="Grading your summary" placement="inline" />;
  }

  if (phase === "report" && report) {
    return <DialogueSummaryReportView report={report} listHref={listHref} roundHref={roundHref} />;
  }

  return (
    <div className="relative mx-auto max-w-4xl space-y-10 pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-72 bg-gradient-to-b from-ep-blue/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-24 h-56 w-56 rounded-full bg-ep-yellow/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-8 top-48 h-48 w-48 rounded-full bg-ep-blue/10 blur-3xl"
        aria-hidden
      />

      <nav className="relative flex flex-wrap items-center gap-2 text-sm font-bold">
        <Link
          href={listHref}
          className="rounded-full border-2 border-black bg-white px-4 py-2 shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5"
        >
          ← Set list
        </Link>
        <Link
          href={roundHref}
          className="rounded-full border-2 border-black/20 bg-white/80 px-3 py-2 text-neutral-700 hover:border-black"
        >
          Round {exam.round}
        </Link>
        <Link
          href="/practice/listening/dialogue-summary"
          className="rounded-full border-2 border-black/20 bg-white/80 px-3 py-2 text-neutral-700 hover:border-black"
        >
          All rounds
        </Link>
      </nav>

      <header className="relative overflow-hidden rounded-sm border-4 border-black bg-white shadow-[6px_6px_0_0_#0a0a0a]">
        <div className="absolute inset-0 bg-gradient-to-br from-ep-yellow/35 via-white to-ep-blue/10" />
        <div className="relative border-b-4 border-black/10 bg-ep-blue/5 px-6 py-4">
          <p className="ep-stat text-[11px] font-bold uppercase tracking-[0.35em] text-ep-blue">
            Listening · Dialogue → summary
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black text-neutral-900">
              Round {exam.round}
            </span>
            <span className="rounded-full border-2 border-black bg-ep-yellow px-3 py-1 text-xs font-black uppercase">
              {DIALOGUE_SUMMARY_DIFFICULTY_LABEL[exam.difficulty]}
            </span>
            <span className="rounded-full border-2 border-dashed border-neutral-400 bg-white px-3 py-1 text-xs font-bold text-neutral-700">
              Set {exam.setNumber}
            </span>
          </div>
        </div>
        <div className="relative px-6 py-8">
          <h1 className="text-3xl font-black leading-tight tracking-tight text-neutral-900 md:text-4xl">
            {exam.titleEn}
          </h1>
          <p className="mt-2 text-lg font-semibold text-neutral-600">{exam.titleTh}</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Read the situation, follow the conversation, then write a clear English summary in your own words.
            Graded out of <strong>160</strong> using the mix below.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {RUBRIC_CHIPS.map(({ key, label, accent }) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold ${accent}`}
              >
                <span>{label}</span>
                <span className="ep-stat opacity-90">{DIALOGUE_SUMMARY_RUBRIC_WEIGHTS[key] * 100}%</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-ep-blue">The situation</h2>
            <p className="ep-stat mt-1 text-xs text-neutral-500">Five sentences · สถานการณ์ 5 ประโยค</p>
          </div>
          <span className="hidden rounded-sm border-2 border-black bg-ep-yellow/40 px-2 py-1 text-[10px] font-black uppercase sm:inline-block">
            Context
          </span>
        </div>
        <div className="overflow-hidden rounded-sm border-4 border-black bg-gradient-to-b from-white to-slate-50 shadow-[5px_5px_0_0_#0a0a0a]">
          <div className="border-b-4 border-black bg-ep-blue px-5 py-3">
            <p className="text-sm font-black uppercase tracking-wide text-white">Scenario</p>
          </div>
          <ol className="divide-y-2 divide-black/10">
            {exam.scenarioSentences.map((s, i) => (
              <li key={i} className="flex gap-4 bg-white/60 px-5 py-5 transition-colors hover:bg-ep-yellow/10">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-ep-yellow text-sm font-black text-neutral-900 shadow-[2px_2px_0_0_#000]"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 text-base leading-relaxed text-neutral-900">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-wide text-ep-blue">The dialogue</h2>
            <p className="ep-stat mt-1 text-xs text-neutral-500">
              {exam.dialogue.length} turns · อ่านทีละบรรทัดแล้วสรุปใจความ
            </p>
          </div>
        </div>
        <div className="rounded-sm border-4 border-black bg-gradient-to-b from-neutral-50 to-white p-4 shadow-[5px_5px_0_0_#0a0a0a] sm:p-6">
          <ul className="space-y-4">
            {exam.dialogue.map((t, i) => {
              const si = speakerIdx(t.speaker);
              const bubble = speakerBubbleClass(si);
              const initial = t.speaker.trim().charAt(0).toUpperCase() || "?";
              return (
                <li
                  key={i}
                  className={`flex gap-3 ${i % 2 === 1 ? "sm:flex-row-reverse sm:text-right" : ""}`}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm font-black text-ep-blue shadow-[2px_2px_0_0_#000]"
                    aria-hidden
                  >
                    {initial}
                  </div>
                  <div
                    className={`min-w-0 flex-1 rounded-2xl border-2 px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)] ${bubble}`}
                  >
                    <p className="ep-stat text-[11px] font-bold uppercase tracking-wider text-ep-blue">
                      {t.speaker}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-900">{t.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-sm border-4 border-black bg-gradient-to-br from-ep-yellow/30 via-white to-ep-blue/5 shadow-[6px_6px_0_0_#0a0a0a]">
        <div className="border-b-4 border-black bg-black px-6 py-4">
          <label htmlFor="ds-summary" className="text-base font-black uppercase tracking-wide text-white">
            Your summary
          </label>
          <p className="mt-1 text-sm font-medium text-white/80">
            Minimum {DIALOGUE_SUMMARY_MIN_WORDS} words · สรุปเป็นภาษาอังกฤษด้วยตัวเอง
          </p>
        </div>
        <div className="p-6">
          <textarea
            id="ds-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={12}
            className="w-full resize-y rounded-sm border-4 border-black bg-white/95 px-5 py-4 text-base leading-relaxed text-neutral-900 shadow-inner outline-none ring-0 transition-shadow placeholder:text-neutral-400 focus:border-ep-blue focus:shadow-[4px_4px_0_0_#004aad]"
            placeholder="Write your English summary here. Include the main problem, what the speakers disagree or agree on, and the outcome or next step…"
            spellCheck
          />
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-neutral-600">
                <span>Progress to minimum</span>
                <span className={meetsMin ? "text-emerald-700" : "text-neutral-500"}>
                  {wordCount} / {DIALOGUE_SUMMARY_MIN_WORDS} words
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-black bg-neutral-200/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    meetsMin ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-ep-blue to-sky-500"
                  }`}
                  style={{ width: `${wordProgressPct}%` }}
                />
              </div>
            </div>
            {error ? (
              <p className="text-sm font-bold text-red-700 sm:max-w-xs sm:text-right">{error}</p>
            ) : null}
          </div>
          <div className="mt-4">
            <VipAiFeedbackQuotaBanner />
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!meetsMin}
            className="group mt-6 w-full rounded-sm border-4 border-black bg-ep-blue py-4 text-base font-black uppercase tracking-[0.15em] text-white shadow-[5px_5px_0_0_#000] transition-all hover:-translate-y-0.5 hover:bg-[#003d94] hover:shadow-[6px_6px_0_0_#000] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-[5px_5px_0_0_#000]"
          >
            <span className="inline-flex items-center justify-center gap-2">
              Submit for grading
              <span className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </span>
          </button>
          <p className="mt-4 text-center text-xs text-neutral-500">
            Need AI grading? Ask your teacher or set <code className="ep-stat text-[11px]">GEMINI_API_KEY</code> in{" "}
            <code className="ep-stat text-[11px]">.env.local</code> for local development.
          </p>
        </div>
      </section>
    </div>
  );
}
