"use client";

import { useRouter } from "next/navigation";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";
import {
  buildPhotoSpeakReportNotebookFullBodies,
  buildPhotoSpeakReportNotebookPreview,
} from "@/lib/photo-speak-report-notebook";
import { ProductionReportLandingHero } from "@/components/production/ProductionReportLandingHero";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import { GRADING_BADGE_OFFLINE, GRADING_BADGE_PRIMARY } from "@/lib/report-branding";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import { getWriteAboutPhotoRoundForItemId } from "@/lib/write-about-photo-storage";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import type { NotebookEntry, WritingCriterionReport } from "@/types/writing";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";

function photoReportNav(report: PhotoSpeakAttemptReport) {
  const isWrite = report.originHub === "write-about-photo";
  const itemRound = getWriteAboutPhotoRoundForItemId(report.topicId);
  const writeRound = isWrite ? itemRound : undefined;
  const speakRound = !isWrite ? itemRound : undefined;
  const hub = isWrite
    ? writeRound !== undefined
      ? `/practice/production/write-about-photo/round/${writeRound}`
      : "/practice/production/write-about-photo"
    : speakRound !== undefined
      ? `/practice/production/speak-about-photo/round/${speakRound}`
      : "/practice/production/speak-about-photo";
  const sessionPath = (topicId: string) =>
    isWrite
      ? `/practice/production/write-about-photo/${topicId}`
      : `/practice/production/speak-about-photo/${topicId}`;
  const notebookSource: NotebookEntry["source"] = isWrite
    ? "write-about-photo"
    : "speak-about-photo";
  return {
    isWrite,
    hub,
    sessionPath,
    notebookSource,
    eyebrow: isWrite ? "Write about photo — report" : "Speak about photo — report",
    backLabel: isWrite ? "← Round & photos" : "← Round & photos",
    critEn: isWrite ? "photo write" : "photo speak",
    critTh: isWrite ? "เขียน/พูดจากภาพ" : "พูดจากภาพ",
  };
}

function PhotoCriterionBlock({
  title,
  titleEn,
  titleTh,
  report,
  attemptId,
  suggestedPremade,
  entrySource,
}: {
  title: string;
  titleEn: string;
  titleTh: string;
  report: WritingCriterionReport;
  attemptId: string;
  suggestedPremade: SuggestedNotebookPremade;
  entrySource: NotebookEntry["source"];
}) {
  return (
    <BrutalPanel
      variant="elevated"
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
            className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
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
                entrySource={entrySource}
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

export function PhotoSpeakReportView({ report }: { report: PhotoSpeakAttemptReport }) {
  const router = useRouter();
  const nav = photoReportNav(report);
  const submission = (report.punctuatedTranscript ?? report.transcript).trim();

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ProductionReportLandingHero
        backHref={nav.hub}
        backLabel={nav.backLabel}
        eyebrow={nav.eyebrow}
        titleEn={report.topicTitleEn}
        titleTh={report.topicTitleTh}
        score160={report.score160}
        gradingBadgeText={
          report.gradingSource === "gemini" ? GRADING_BADGE_PRIMARY : GRADING_BADGE_OFFLINE
        }
        rubricLine={
          <>
            Rubric weights: grammar {SPEAKING_RUBRIC_WEIGHTS.grammar * 100}% · vocabulary{" "}
            {SPEAKING_RUBRIC_WEIGHTS.vocabulary * 100}% · coherence{" "}
            {SPEAKING_RUBRIC_WEIGHTS.coherence * 100}% · task{" "}
            {SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * 100}%.
          </>
        }
        taskBoostSlot={
          report.taskPersonalExperienceBoostApplied ? (
            <p className="ep-stat max-w-2xl text-xs font-bold text-emerald-800">
              Task relevancy includes +10% for personal or hypothetical personal experience (max
              100%).
            </p>
          ) : undefined
        }
      >
        <button
          type="button"
          onClick={() => router.push(nav.sessionPath(report.topicId))}
          className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
        >
          Try again
        </button>
        <FullReportNotebookButton
          attemptId={report.attemptId}
          entrySource={nav.notebookSource}
          build={() => {
            const preview = buildPhotoSpeakReportNotebookPreview(report);
            const { fullBodyEn, fullBodyTh } =
              buildPhotoSpeakReportNotebookFullBodies(report);
            return { ...preview, fullBodyEn, fullBodyTh };
          }}
        />
      </ProductionReportLandingHero>

      <section className="border-y-4 border-black bg-white">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BrutalPanel variant="elevated" title="Photo">
        <div className="overflow-hidden rounded-sm border-2 border-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.imageUrl}
            alt=""
            className="max-h-80 w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        {report.taskKeywords.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {report.taskKeywords.map((k) => (
              <span
                key={k}
                className="rounded-sm border-2 border-neutral-300 bg-neutral-100 px-2 py-0.5 ep-stat text-xs font-bold"
              >
                {k}
              </span>
            ))}
          </div>
        ) : null}
      </BrutalPanel>

      <BrutalPanel variant="elevated" title="Prompt">
        <p className="text-sm font-medium text-neutral-900">{report.questionPromptEn}</p>
        <p className="mt-2 text-sm text-neutral-600">{report.questionPromptTh}</p>
      </BrutalPanel>

      <BrutalPanel variant="elevated" title="Your submission">
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
            entrySource={nav.notebookSource}
            attemptId={report.attemptId}
            suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
            directSaveToProductionFeedback
            getPayload={() => ({
              titleEn: nav.isWrite ? "Your submission (photo write)" : "Your submission (photo speak)",
              titleTh: nav.isWrite ? "ข้อความของคุณ (เขียนเกี่ยวกับภาพ)" : "ข้อความของคุณ (พูดจากภาพ)",
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
        entrySource={nav.notebookSource}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PhotoCriterionBlock
          title="Grammar"
          titleEn={`Grammar (${nav.critEn})`}
          titleTh={`ไวยากรณ์ (${nav.critTh})`}
          report={report.grammar}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
          entrySource={nav.notebookSource}
        />
        <PhotoCriterionBlock
          title="Vocabulary"
          titleEn={`Vocabulary (${nav.critEn})`}
          titleTh={`คำศัพท์ (${nav.critTh})`}
          report={report.vocabulary}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
          entrySource={nav.notebookSource}
        />
        <PhotoCriterionBlock
          title="Coherence"
          titleEn={`Coherence (${nav.critEn})`}
          titleTh={`ความต่อเนื่อง (${nav.critTh})`}
          report={report.coherence}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          entrySource={nav.notebookSource}
        />
        <PhotoCriterionBlock
          title="Task relevancy"
          titleEn={`Task (${nav.critEn})`}
          titleTh={`โจทย์ (${nav.critTh})`}
          report={report.taskRelevancy}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          entrySource={nav.notebookSource}
        />
      </div>

      <BrutalPanel variant="elevated" title="Key learning (bilingual)">
        <ul className="space-y-3">
          {report.improvementPoints.map((p) => (
            <li
              key={p.id}
              className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
            >
              <p className="font-bold">{p.en}</p>
              <p className="mt-1 text-neutral-600">{p.th}</p>
              <div className="relative z-10 mt-2">
                <AddToNotebookButton
                  entrySource={nav.notebookSource}
                  attemptId={report.attemptId}
                  suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                  directSaveToProductionFeedback
                  className="border-ep-blue/30 bg-ep-yellow/80"
                  getPayload={() => ({
                    titleEn: nav.isWrite ? "Key learning (photo write)" : "Key learning (photo speak)",
                    titleTh: nav.isWrite ? "สิ่งที่ได้เรียนรู้ (เขียนเกี่ยวกับภาพ)" : "สิ่งที่ได้เรียนรู้ (พูดจากภาพ)",
                    bodyEn: p.en,
                    bodyTh: p.th,
                  })}
                />
              </div>
            </li>
          ))}
        </ul>
      </BrutalPanel>
        </div>
      </section>

      <section className="bg-[#fafafa] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-neutral-500">
            Task scoring uses your punctuated submission plus keyword tags. Add lines to the notebook
            with the same categories as other production reports.
          </p>
        </div>
      </section>
    </div>
  );
}
