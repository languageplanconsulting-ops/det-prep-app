"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { AnnotatedEssay } from "@/components/writing/AnnotatedEssay";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  buildWritingReportNotebookFullBodies,
  buildWritingReportNotebookPreview,
} from "@/lib/writing-report-notebook";
import { GRADING_BADGE_OFFLINE, GRADING_BADGE_PRIMARY } from "@/lib/report-branding";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import { withStudyPackDefaults } from "@/lib/writing-report";
import { getTopicById } from "@/lib/writing-storage";
import type { SpeakingVocabularyUpgrade } from "@/types/speaking";
import type {
  StudySentenceSuggestion,
  StudyVocabularySuggestion,
  WritingAttemptReport,
  WritingCriterionReport,
} from "@/types/writing";
import type { SuggestedNotebookPremade } from "./AddToNotebookButton";

function CriterionBlock({
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

function StudySentenceRow({
  s,
  attemptId,
}: {
  s: StudySentenceSuggestion;
  attemptId: string;
}) {
  return (
    <li className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3 text-sm">
      <p className="font-medium text-neutral-900">{s.en}</p>
      <p className="mt-1 text-neutral-600">{s.th}</p>
      <AddToNotebookButton
        attemptId={attemptId}
        suggestedPremade="default"
        getPayload={() => ({
          titleEn: "Practice sentence",
          titleTh: "ประโยคฝึก",
          bodyEn: s.en,
          bodyTh: s.th,
        })}
        className="mt-2"
      />
    </li>
  );
}

function StudyVocabRow({
  v,
  attemptId,
}: {
  v: StudyVocabularySuggestion;
  attemptId: string;
}) {
  return (
    <li className="rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3 text-sm">
      <p className="font-bold text-neutral-900">
        {v.termEn}
        {v.termTh ? (
          <span className="ml-2 font-normal text-neutral-600">({v.termTh})</span>
        ) : null}
      </p>
      <p className="mt-1 text-neutral-800">{v.noteEn}</p>
      <p className="mt-1 text-neutral-600">{v.noteTh}</p>
      <AddToNotebookButton
        attemptId={attemptId}
        suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
        getPayload={() => ({
          titleEn: `Vocabulary: ${v.termEn}`,
          titleTh: `คำศัพท์: ${v.termTh || v.termEn}`,
          bodyEn: `${v.termEn} — ${v.noteEn}`,
          bodyTh: `${v.termTh || v.termEn} — ${v.noteTh}`,
        })}
        className="mt-2"
      />
    </li>
  );
}

export function WritingReportView({ report }: { report: WritingAttemptReport }) {
  const router = useRouter();
  const fullReport = useMemo(() => withStudyPackDefaults(report), [report]);
  const topic = useMemo(() => getTopicById(fullReport.topicId), [fullReport.topicId]);
  const roundBack = topic?.round ?? 1;
  const mainSubmission = (fullReport.punctuatedEssay ?? fullReport.essay).trim();
  const vocabUpgrades = fullReport.vocabularyUpgradeSuggestions;
  const showStudyVocabFallback =
    (!vocabUpgrades || vocabUpgrades.length === 0) &&
    (fullReport.studyVocabulary?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href={`/practice/production/read-and-write/round/${roundBack}`}
        className="text-sm font-bold text-ep-blue underline-offset-2 hover:underline"
      >
        ← Topics
      </Link>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Read & write report
        </p>
        <h1 className="mt-2 text-2xl font-black">{fullReport.topicTitleEn}</h1>
        <p className="text-sm text-neutral-600">{fullReport.topicTitleTh}</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-neutral-500">Score</p>
            <p className="ep-stat text-5xl font-black text-ep-blue">{fullReport.score160}</p>
            <p className="text-xs text-neutral-500">out of 160</p>
            <p className="ep-stat mt-2 inline-block border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {fullReport.gradingSource === "gemini" ? GRADING_BADGE_PRIMARY : GRADING_BADGE_OFFLINE}
            </p>
            {fullReport.taskPersonalExperienceBoostApplied ? (
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
            onClick={() =>
              router.push(`/practice/production/read-and-write/${fullReport.topicId}`)
            }
            className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
          >
            Try again
          </button>
          <FullReportNotebookButton
            attemptId={fullReport.attemptId}
            entrySource="writing-read-and-write"
            build={() => {
              const preview = buildWritingReportNotebookPreview(fullReport);
              const { fullBodyEn, fullBodyTh } =
                buildWritingReportNotebookFullBodies(fullReport);
              return { ...preview, fullBodyEn, fullBodyTh };
            }}
          />
        </div>
      </header>

      {topic ? (
        <BrutalPanel title="Prompt">
          <p className="text-sm font-medium text-neutral-900">{topic.promptEn}</p>
          <p className="mt-2 text-sm text-neutral-600">{topic.promptTh}</p>
          {(topic.followUps ?? []).length > 0 ? (
            <ul className="mt-4 space-y-3 border-t-2 border-dashed border-neutral-200 pt-4">
              {(topic.followUps ?? []).map((fu, i) => (
                <li key={`${topic.id}-fu-${i}`} className="text-sm">
                  <p className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                    Follow-up {i + 1}
                  </p>
                  <p className="mt-1 font-medium text-neutral-900">{fu.promptEn}</p>
                  <p className="mt-1 text-neutral-600">{fu.promptTh}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </BrutalPanel>
      ) : null}

      <BrutalPanel title="Your submission">
        <p className="ep-stat text-xs text-neutral-500">
          {fullReport.wordCount} words · prep {fullReport.prepMinutes} min · punctuated for
          feedback
        </p>

        <div className="mt-3 rounded-sm border-2 border-black bg-white p-3">
          <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Main question answer
          </p>
          {fullReport.mainSubmissionHighlights &&
          fullReport.mainSubmissionHighlights.length > 0 ? (
            <div className="mt-2 max-w-full overflow-x-auto">
              <SpeakingAnnotatedTranscript
                text={mainSubmission}
                highlights={fullReport.mainSubmissionHighlights}
              />
            </div>
          ) : fullReport.highlights && fullReport.highlights.length > 0 ? (
            <div className="mt-2">
              <AnnotatedEssay essay={mainSubmission} highlights={fullReport.highlights} />
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{mainSubmission}</p>
          )}
        </div>

        {fullReport.followUpResponses?.map((fu, i) => {
          const text = (fu.answerPunctuated ?? fu.answer).trim();
          const hi = fullReport.followUpSubmissionHighlights?.[i] ?? [];
          return (
            <div
              key={`${fullReport.attemptId}-fu-${i}`}
              className="mt-3 rounded-sm border-2 border-neutral-200 bg-neutral-50 p-3"
            >
              <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Follow-up {i + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{fu.promptEn}</p>
              <p className="mt-1 text-xs text-neutral-600">{fu.promptTh}</p>
              {hi.length > 0 ? (
                <div className="mt-2 max-w-full overflow-x-auto">
                  <SpeakingAnnotatedTranscript text={text} highlights={hi} />
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">{text}</p>
              )}
            </div>
          );
        })}
        <div className="relative z-[100] mt-4">
          <AddToNotebookButton
            attemptId={fullReport.attemptId}
            suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
            directSaveToProductionFeedback
            entrySource="writing-read-and-write"
            getPayload={() => ({
              titleEn: "Your submission (read & write)",
              titleTh: "ข้อความของคุณ (อ่านแล้วเขียน)",
              bodyEn: mainSubmission,
              bodyTh: "ข้อความที่ใช้ให้คะแนน (มีเครื่องหมายวรรคตอน)",
              excerpt:
                mainSubmission.length > 90 ? `${mainSubmission.slice(0, 90)}…` : mainSubmission,
            })}
          />
        </div>
      </BrutalPanel>

      {vocabUpgrades && vocabUpgrades.length > 0 ? (
        <SpeakingVocabularyUpgradePanel
          upgrades={vocabUpgrades as SpeakingVocabularyUpgrade[]}
          attemptId={fullReport.attemptId}
          entrySource="writing-read-and-write"
        />
      ) : null}

      {showStudyVocabFallback ? (
        <BrutalPanel eyebrow="Up to 10" title="Vocabulary suggestions">
          <p className="mb-3 text-xs text-neutral-600">
            Useful words and notes for this task. Add any item to the notebook (vocabulary
            suggested by default).
          </p>
          <ul className="space-y-3">
            {fullReport.studyVocabulary?.map((v) => (
              <StudyVocabRow key={v.id} v={v} attemptId={fullReport.attemptId} />
            ))}
          </ul>
        </BrutalPanel>
      ) : null}

      <BrutalPanel eyebrow="Up to 7" title="Sentence suggestions (bilingual)">
        <p className="mb-3 text-xs text-neutral-600">
          Practise these patterns, then save any line to your notebook — you choose the
          folder.
        </p>
        <ul className="space-y-3">
          {fullReport.studySentences?.map((s) => (
            <StudySentenceRow key={s.id} s={s} attemptId={fullReport.attemptId} />
          ))}
        </ul>
      </BrutalPanel>

      <div className="grid gap-4 md:grid-cols-2">
        <CriterionBlock
          title="Grammar"
          titleEn="Grammar (read & write)"
          titleTh="ไวยากรณ์ (อ่านแล้วเขียน)"
          report={fullReport.grammar}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
        />
        <CriterionBlock
          title="Vocabulary"
          titleEn="Vocabulary (read & write)"
          titleTh="คำศัพท์ (อ่านแล้วเขียน)"
          report={fullReport.vocabulary}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
        />
        <CriterionBlock
          title="Coherence"
          titleEn="Coherence (read & write)"
          titleTh="ความต่อเนื่อง (อ่านแล้วเขียน)"
          report={fullReport.coherence}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
        <CriterionBlock
          title="Task relevancy"
          titleEn="Task (read & write)"
          titleTh="โจทย์ (อ่านแล้วเขียน)"
          report={fullReport.taskRelevancy}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
        />
      </div>

      <BrutalPanel title="Key learning (bilingual)">
        <ul className="space-y-3">
          {fullReport.improvementPoints.map((p) => (
            <li key={p.id} className="rounded-sm border-2 border-black bg-white p-3 text-sm">
              <p className="font-bold">{p.en}</p>
              <p className="mt-1 text-neutral-600">{p.th}</p>
              <div className="relative z-10 mt-2">
                <AddToNotebookButton
                  entrySource="writing-read-and-write"
                  attemptId={fullReport.attemptId}
                  suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                  directSaveToProductionFeedback
                  className="border-ep-blue/30 bg-ep-yellow/80"
                  getPayload={() => ({
                    titleEn: "Key learning (read & write)",
                    titleTh: "สิ่งที่ได้เรียนรู้ (อ่านแล้วเขียน)",
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
        Task scoring uses your punctuated submission and the prompts above. Add lines to the
        notebook with the same categories as other production reports.
      </p>
    </div>
  );
}
