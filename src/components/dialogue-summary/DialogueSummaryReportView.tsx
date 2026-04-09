"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildDialogueSummaryReportNotebookFullBodies,
  buildDialogueSummaryReportNotebookPreview,
} from "@/lib/dialogue-summary-report-notebook";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { DialogueSummaryAnnotatedResponse } from "@/components/dialogue-summary/DialogueSummaryAnnotatedResponse";
import { DIALOGUE_SUMMARY_RUBRIC_WEIGHTS } from "@/lib/dialogue-summary-constants";
import { GRADING_BADGE_OFFLINE, GRADING_BADGE_PRIMARY } from "@/lib/report-branding";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import type { DialogueSummaryAttemptReport, DialogueSummaryCriterionReport } from "@/types/dialogue-summary";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";

function CriterionBlock({
  titleEn,
  titleTh,
  report,
  attemptId,
  suggestedPremade,
}: {
  titleEn: string;
  titleTh: string;
  report: DialogueSummaryCriterionReport;
  attemptId: string;
  suggestedPremade: SuggestedNotebookPremade;
}) {
  return (
    <BrutalPanel
      eyebrow={`${Math.round(report.scorePercent)}% · weight ${report.weight * 100}%`}
      title={titleEn}
    >
      <p className="-mt-2 mb-3 text-sm text-neutral-600">{titleTh}</p>
      <p className="text-sm font-medium text-neutral-800">{report.summary.en}</p>
      <p className="mt-2 text-sm text-neutral-600">{report.summary.th}</p>
      <p className="ep-stat mt-3 text-xs font-bold text-ep-blue">
        ≈ {report.pointsOn160} / 160 from this component
      </p>
      <ul className="mt-4 space-y-3">
        {report.breakdown.map((b) => (
          <li
            key={b.id}
            className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3 text-sm"
          >
            {b.excerpt ? (
              <p className="ep-stat mb-2 text-xs italic text-neutral-500">“{b.excerpt}”</p>
            ) : null}
            <p className="font-medium text-neutral-900">{b.en}</p>
            <p className="mt-1 text-neutral-600">{b.th}</p>
            <AddToNotebookButton
              attemptId={attemptId}
              suggestedPremade={suggestedPremade}
              entrySource="dialogue-summary"
              getPayload={() => ({
                titleEn,
                titleTh,
                bodyEn: b.en,
                bodyTh: b.th,
                excerpt: b.excerpt,
              })}
            />
          </li>
        ))}
      </ul>
    </BrutalPanel>
  );
}

export function DialogueSummaryReportView({
  report,
  listHref,
  roundHref,
}: {
  report: DialogueSummaryAttemptReport;
  listHref: string;
  roundHref: string;
}) {
  const router = useRouter();

  const scorePct = Math.min(100, Math.round((report.score160 / 160) * 100));

  return (
    <div className="relative mx-auto max-w-4xl space-y-8 pb-8">
      <div
        className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-gradient-to-b from-ep-blue/[0.08] via-transparent to-transparent"
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
          className="rounded-full border-2 border-black/20 bg-white/90 px-3 py-2 text-neutral-700 hover:border-black"
        >
          Round hub
        </Link>
        <Link
          href="/practice/listening/dialogue-summary"
          className="rounded-full border-2 border-black/20 bg-white/90 px-3 py-2 text-neutral-700 hover:border-black"
        >
          All rounds
        </Link>
      </nav>

      <header className="relative overflow-hidden rounded-sm border-4 border-black bg-white shadow-[6px_6px_0_0_#0a0a0a]">
        <div className="absolute inset-0 bg-gradient-to-br from-ep-yellow/30 via-white to-ep-blue/10" />
        <div className="relative border-b-4 border-black/10 bg-black px-6 py-4">
          <p className="ep-stat text-[11px] font-bold uppercase tracking-[0.35em] text-white/90">
            Dialogue summary · report
          </p>
        </div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-neutral-900 md:text-3xl">
                {report.titleEn}
              </h1>
              <p className="mt-2 text-base font-semibold text-neutral-600">{report.titleTh}</p>
              <p className="ep-stat mt-4 max-w-xl text-xs leading-relaxed text-neutral-600">
                Weights: relevancy {DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.relevancy * 100}% · grammar{" "}
                {DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.grammar * 100}% · flow {DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.flow * 100}% ·
                vocabulary {DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.vocabulary * 100}%
              </p>
              <p className="ep-stat mt-3 inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-800">
                {report.gradingSource === "gemini" ? GRADING_BADGE_PRIMARY : GRADING_BADGE_OFFLINE}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row lg:flex-col lg:items-end">
              <div
                className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-black p-1.5 shadow-[4px_4px_0_0_#000]"
                style={{
                  background: `conic-gradient(from -90deg, #004aad 0%, #004aad ${scorePct}%, #d4d4d8 ${scorePct}%)`,
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-black/30 bg-white text-neutral-900">
                  <span className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">Score</span>
                  <span className="ep-stat text-4xl font-black tabular-nums leading-none text-ep-blue">{report.score160}</span>
                  <span className="ep-stat mt-1 text-xs font-bold text-neutral-500">/ 160</span>
                </div>
              </div>
              <p className="ep-stat text-center text-[11px] font-bold uppercase text-neutral-500 lg:text-right">
                ≈ {scorePct}% of max
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 border-t-2 border-dashed border-black/15 pt-6">
            <button
              type="button"
              onClick={() => router.push(listHref)}
              className="rounded-sm border-2 border-black bg-white px-5 py-2.5 text-sm font-black uppercase tracking-wide shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5"
            >
              Try another set
            </button>
            <FullReportNotebookButton
              attemptId={report.attemptId}
              entrySource="dialogue-summary"
              className="rounded-sm border-2 border-black bg-ep-yellow px-5 py-2.5 text-sm font-black uppercase tracking-wide shadow-[3px_3px_0_0_#000] transition-transform hover:-translate-y-0.5"
              build={() => {
                const preview = buildDialogueSummaryReportNotebookPreview(report);
                const { fullBodyEn, fullBodyTh } =
                  buildDialogueSummaryReportNotebookFullBodies(report);
                return { ...preview, fullBodyEn, fullBodyTh };
              }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <CriterionBlock
          titleEn="Relevancy to the scenario"
          titleTh="ความเกี่ยวข้องกับสถานการณ์"
          report={report.relevancy}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
        <CriterionBlock
          titleEn="Grammar"
          titleTh="ไวยากรณ์"
          report={report.grammar}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
        />
        <CriterionBlock
          titleEn="Flow"
          titleTh="ความลื่นไหล / การเชื่อมประโยค"
          report={report.flow}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
        <CriterionBlock
          titleEn="Vocabulary"
          titleTh="คำศัพท์"
          report={report.vocabulary}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
        />
      </div>

      <BrutalPanel eyebrow="Up to 8" title="Key learning">
        <ul className="space-y-3">
          {report.improvementPoints.map((p) => (
            <li
              key={p.id}
              className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3 text-sm"
            >
              <p className="font-medium text-neutral-900">{p.en}</p>
              <p className="mt-1 text-neutral-600">{p.th}</p>
              <p className="ep-stat mt-1 text-[10px] font-bold uppercase text-neutral-500">{p.category}</p>
              <AddToNotebookButton
                attemptId={report.attemptId}
                suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                entrySource="dialogue-summary"
                getPayload={() => ({
                  titleEn: "Dialogue summary — key learning",
                  titleTh: "สรุปบทสนทนา — สิ่งที่ได้เรียนรู้",
                  bodyEn: p.en,
                  bodyTh: p.th,
                })}
                className="mt-2"
              />
            </li>
          ))}
        </ul>
      </BrutalPanel>

      <BrutalPanel eyebrow="Your writing" title="Annotated feedback">
        <DialogueSummaryAnnotatedResponse summary={report.summary} highlights={report.highlights} />
      </BrutalPanel>
    </div>
  );
}
