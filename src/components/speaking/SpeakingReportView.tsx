"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingFullReportNotebookButton } from "@/components/speaking/SpeakingFullReportNotebookButton";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import { GRADING_BADGE_OFFLINE, GRADING_BADGE_PRIMARY } from "@/lib/report-branding";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import type { SpeakingAttemptReport } from "@/types/speaking";
import type { WritingCriterionReport } from "@/types/writing";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";

function SpeakingCriterionBlock({
  title,
  titleEn,
  titleTh,
  report,
  attemptId,
  suggestedPremade,
}: {
  title: string;
  titleEn: string;
  titleTh: string;
  report: WritingCriterionReport;
  attemptId: string;
  suggestedPremade: SuggestedNotebookPremade;
}) {
  return (
    <BrutalPanel
      eyebrow={`${Math.round(report.scorePercent)}% · weight ${report.weight * 100}%`}
      title={title}
    >
      <p className="text-sm font-medium text-neutral-800">{report.summary.en}</p>
      <p className="mt-2 text-sm text-neutral-600">{report.summary.th}</p>
      <p className="ep-stat mt-3 text-xs font-bold text-ep-blue">
        ≈ {report.pointsOn160} / 160 from this criterion
      </p>
      <ul className="mt-4 space-y-3">
        {report.breakdown.map((b) => (
          <li
            key={b.id}
            className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3 text-sm"
          >
            {b.excerpt ? (
              <p className="ep-stat mb-2 text-xs italic text-neutral-700">“{b.excerpt}”</p>
            ) : null}
            <p className="ep-stat text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              Issue
            </p>
            <p className="font-medium text-neutral-900">{b.en}</p>
            <p className="mt-1 text-neutral-600">{b.th}</p>
            {b.suggestionEn?.trim() || b.suggestionTh?.trim() ? (
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <p className="ep-stat text-[10px] font-bold uppercase tracking-wide text-ep-blue">
                  Suggestion
                </p>
                {b.suggestionEn?.trim() ? (
                  <p className="mt-1 font-medium text-neutral-900">{b.suggestionEn}</p>
                ) : null}
                {b.suggestionTh?.trim() ? (
                  <p className="mt-1 text-neutral-600">{b.suggestionTh}</p>
                ) : null}
              </div>
            ) : null}
            <div className="relative z-10 mt-2">
              <AddToNotebookButton
                entrySource="speaking-read-and-speak"
                attemptId={attemptId}
                suggestedPremade={suggestedPremade}
                getPayload={() => ({
                  titleEn,
                  titleTh,
                  bodyEn: b.en,
                  bodyTh: b.th,
                  excerpt: b.excerpt,
                })}
              />
            </div>
          </li>
        ))}
      </ul>
    </BrutalPanel>
  );
}

export function SpeakingReportView({ report }: { report: SpeakingAttemptReport }) {
  const router = useRouter();
  const submission = (report.punctuatedTranscript ?? report.transcript).trim();
  const speakRound = report.speakingRound ?? 1;
  const roundTopicHref = `/practice/production/read-and-speak/round/${speakRound}/${report.topicId}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/practice/production/read-and-speak"
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Rounds
      </Link>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Read, then speak — report
        </p>
        <h1 className="mt-2 text-2xl font-black">{report.topicTitleEn}</h1>
        <p className="text-sm text-neutral-600">{report.topicTitleTh}</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-neutral-500">Score</p>
            <p className="ep-stat text-5xl font-black text-ep-blue">{report.score160}</p>
            <p className="text-xs text-neutral-500">out of 160</p>
            <p className="ep-stat mt-2 inline-block border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {report.gradingSource === "gemini" ? GRADING_BADGE_PRIMARY : GRADING_BADGE_OFFLINE}
            </p>
            {report.taskPersonalExperienceBoostApplied ? (
              <p className="ep-stat mt-2 max-w-md text-xs font-bold text-emerald-800">
                Task relevancy includes +10% for personal or hypothetical personal experience (max
                100%).
              </p>
            ) : null}
          </div>
          <p className="ep-stat text-xs text-neutral-600">
            grammar {SPEAKING_RUBRIC_WEIGHTS.grammar * 100}% · vocab{" "}
            {SPEAKING_RUBRIC_WEIGHTS.vocabulary * 100}% · coherence{" "}
            {SPEAKING_RUBRIC_WEIGHTS.coherence * 100}% · task{" "}
            {SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * 100}%
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(roundTopicHref)}
            className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
          >
            Try again
          </button>
          <SpeakingFullReportNotebookButton report={report} />
        </div>
      </header>

      <BrutalPanel title="Your question">
        <p className="text-sm font-medium text-neutral-900">{report.questionPromptEn}</p>
        <p className="mt-2 text-sm text-neutral-600">{report.questionPromptTh}</p>
      </BrutalPanel>

      <BrutalPanel title="Your submission">
        <p className="ep-stat text-xs text-neutral-500">
          {report.wordCount} words · prep {report.prepMinutes} min · punctuated for feedback
        </p>
        {report.transcriptHighlights && report.transcriptHighlights.length > 0 ? (
          <div className="relative isolate z-0 mt-3 max-w-full overflow-x-auto">
            <SpeakingAnnotatedTranscript
              text={submission}
              highlights={report.transcriptHighlights}
            />
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-900">{submission}</p>
        )}
        <div className="relative z-[100] mt-4">
          <AddToNotebookButton
            entrySource="speaking-read-and-speak"
            attemptId={report.attemptId}
            suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
            directSaveToProductionFeedback
            getPayload={() => ({
              titleEn: "Your submission (speaking)",
              titleTh: "บทพูดของคุณ",
              bodyEn: submission,
              bodyTh: "ข้อความที่ใช้ให้คะแนน (มีเครื่องหมายวรรคตอน)",
              excerpt:
                submission.length > 90 ? `${submission.slice(0, 90)}…` : submission,
            })}
          />
        </div>
      </BrutalPanel>

      <SpeakingVocabularyUpgradePanel
        upgrades={report.vocabularyUpgradeSuggestions ?? []}
        attemptId={report.attemptId}
        entrySource="speaking-read-and-speak"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SpeakingCriterionBlock
          title="Grammar"
          titleEn="Grammar (speaking)"
          titleTh="ไวยากรณ์ (การพูด)"
          report={report.grammar}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
        />
        <SpeakingCriterionBlock
          title="Vocabulary"
          titleEn="Vocabulary (speaking)"
          titleTh="คำศัพท์ (การพูด)"
          report={report.vocabulary}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
        />
        <SpeakingCriterionBlock
          title="Coherence"
          titleEn="Coherence (speaking)"
          titleTh="ความต่อเนื่อง (การพูด)"
          report={report.coherence}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
        <SpeakingCriterionBlock
          title="Task relevancy"
          titleEn="Task (speaking)"
          titleTh="โจทย์ (การพูด)"
          report={report.taskRelevancy}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
      </div>

      <BrutalPanel title="Key learning (bilingual)">
        <ul className="space-y-3">
          {report.improvementPoints.map((p) => (
            <li key={p.id} className="rounded-sm border-2 border-black bg-white p-3 text-sm">
              <p className="font-bold">{p.en}</p>
              <p className="mt-1 text-neutral-600">{p.th}</p>
              <div className="relative z-10 mt-2">
                <AddToNotebookButton
                  entrySource="speaking-read-and-speak"
                  attemptId={report.attemptId}
                  suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                  directSaveToProductionFeedback
                  className="border-ep-blue/30 bg-ep-yellow/80"
                  getPayload={() => ({
                    titleEn: "Key learning (speaking)",
                    titleTh: "สิ่งที่ได้เรียนรู้ (การพูด)",
                    bodyEn: p.en,
                    bodyTh: p.th,
                  })}
                />
              </div>
            </li>
          ))}
        </ul>
      </BrutalPanel>

      <p className="text-xs text-neutral-500">
        Feedback uses your punctuated submission and English Plan&apos;s scoring database. Save any
        line to the notebook with the same categories as writing reports.
      </p>
    </div>
  );
}
