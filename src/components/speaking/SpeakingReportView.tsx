"use client";

import { useRouter } from "next/navigation";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { ProductionReportLandingHero } from "@/components/production/ProductionReportLandingHero";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingFullReportNotebookButton } from "@/components/speaking/SpeakingFullReportNotebookButton";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
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
  uiLocale = "en",
}: {
  title: string;
  titleEn: string;
  titleTh: string;
  report: WritingCriterionReport;
  attemptId: string;
  suggestedPremade: SuggestedNotebookPremade;
  uiLocale?: "en" | "th";
}) {
  const th = uiLocale === "th";
  const panelTitle = th ? titleTh : title;
  const eyebrow = th
    ? `${Math.round(report.scorePercent)}% · น้ำหนัก ${report.weight * 100}%`
    : `${Math.round(report.scorePercent)}% · weight ${report.weight * 100}%`;

  return (
    <BrutalPanel variant="elevated" eyebrow={eyebrow} title={panelTitle}>
      {th ? (
        <p className="text-sm text-neutral-800">{report.summary.th}</p>
      ) : (
        <>
          <p className="text-sm font-medium text-neutral-800">{report.summary.en}</p>
          <p className="mt-2 text-sm text-neutral-600">{report.summary.th}</p>
        </>
      )}
      <p className="ep-stat mt-3 text-xs font-bold text-ep-blue">
        {th
          ? `≈ ${report.pointsOn160} / 160 จากเกณฑ์นี้`
          : `≈ ${report.pointsOn160} / 160 from this criterion`}
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
              {th ? "ประเด็น" : "Issue"}
            </p>
            {th ? (
              <p className="font-medium text-neutral-900">{b.th?.trim() ? b.th : b.en}</p>
            ) : (
              <>
                <p className="font-medium text-neutral-900">{b.en}</p>
                <p className="mt-1 text-neutral-600">{b.th}</p>
              </>
            )}
            {b.suggestionEn?.trim() || b.suggestionTh?.trim() ? (
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <p className="ep-stat text-[10px] font-bold uppercase tracking-wide text-ep-blue">
                  {th ? "คำแนะนำ" : "Suggestion"}
                </p>
                {th ? (
                  <p className="mt-1 text-neutral-800">
                    {(b.suggestionTh?.trim() ? b.suggestionTh : b.suggestionEn) ?? ""}
                  </p>
                ) : (
                  <>
                    {b.suggestionEn?.trim() ? (
                      <p className="mt-1 font-medium text-neutral-900">{b.suggestionEn}</p>
                    ) : null}
                    {b.suggestionTh?.trim() ? (
                      <p className="mt-1 text-neutral-600">{b.suggestionTh}</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            <div className="relative z-10 mt-2">
              <AddToNotebookButton
                entrySource="speaking-read-and-speak"
                attemptId={attemptId}
                suggestedPremade={suggestedPremade}
                uiLocale={uiLocale}
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

  const uiLocale = "th" as const;
  const rubricTh = (
    <>
      น้ำหนักเกณฑ์: ไวยากรณ์ {SPEAKING_RUBRIC_WEIGHTS.grammar * 100}% · คำศัพท์{" "}
      {SPEAKING_RUBRIC_WEIGHTS.vocabulary * 100}% · ความต่อเนื่อง{" "}
      {SPEAKING_RUBRIC_WEIGHTS.coherence * 100}% · การตอบโจทย์{" "}
      {SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * 100}%
    </>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ProductionReportLandingHero
        locale="th"
        backHref="/practice/production/read-and-speak"
        backLabel="← รอบฝึก"
        eyebrow="รายงาน · อ่านแล้วพูด"
        titleEn={report.topicTitleEn}
        titleTh={report.topicTitleTh}
        score160={report.score160}
        gradingBadgeText={
          report.gradingSource === "gemini"
            ? "ฐานข้อมูล 4 ปี ของ English Plan"
            : "ให้คะแนนแบบสาธิต (ออฟไลน์)"
        }
        rubricLine={rubricTh}
        taskBoostSlot={
          report.taskPersonalExperienceBoostApplied ? (
            <p className="ep-stat max-w-2xl text-xs font-bold text-emerald-800">
              เกณฑ์การตอบโจทย์รับน้ำหนัก +10% เมื่อเล่าประสบการณ์ส่วนตัวหรือสมมติในลักษณะประสบการณ์ส่วนตัว
              (สูงสุด 100%)
            </p>
          ) : undefined
        }
      >
        <button
          type="button"
          onClick={() => router.push(roundTopicHref)}
          className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
        >
          ทำอีกครั้ง
        </button>
        <SpeakingFullReportNotebookButton report={report} uiLocale={uiLocale} />
      </ProductionReportLandingHero>

      <section className="border-y-4 border-black">
        <div className={`${LANDING_PAGE_GRID_BG} py-8 sm:py-10`}>
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
      <BrutalPanel variant="elevated" title="คำถามของคุณ">
        <p className="text-sm font-medium text-neutral-900">
          {report.questionPromptTh?.trim() ? report.questionPromptTh : report.questionPromptEn}
        </p>
      </BrutalPanel>

      <BrutalPanel variant="elevated" title="บทพูดของคุณ">
        <p className="ep-stat text-xs text-neutral-500">
          {report.wordCount} คำ · เตรียม {report.prepMinutes} นาที · จัดวรรคตอนเพื่อให้ข้อเสนอแนะ
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
            uiLocale={uiLocale}
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
        uiLocale={uiLocale}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <SpeakingCriterionBlock
          title="Grammar"
          titleEn="Grammar (speaking)"
          titleTh="ไวยากรณ์ (การพูด)"
          report={report.grammar}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
          uiLocale={uiLocale}
        />
        <SpeakingCriterionBlock
          title="Vocabulary"
          titleEn="Vocabulary (speaking)"
          titleTh="คำศัพท์ (การพูด)"
          report={report.vocabulary}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
          uiLocale={uiLocale}
        />
        <SpeakingCriterionBlock
          title="Coherence"
          titleEn="Coherence (speaking)"
          titleTh="ความต่อเนื่อง (การพูด)"
          report={report.coherence}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          uiLocale={uiLocale}
        />
        <SpeakingCriterionBlock
          title="Task relevancy"
          titleEn="Task (speaking)"
          titleTh="โจทย์ (การพูด)"
          report={report.taskRelevancy}
          attemptId={report.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          uiLocale={uiLocale}
        />
      </div>

      <BrutalPanel variant="elevated" title="สิ่งที่ได้เรียนรู้">
        <ul className="space-y-3">
          {report.improvementPoints.map((p) => (
            <li
              key={p.id}
              className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
            >
              <p className="font-bold text-neutral-900">{p.th?.trim() ? p.th : p.en}</p>
              <div className="relative z-10 mt-2">
                <AddToNotebookButton
                  entrySource="speaking-read-and-speak"
                  attemptId={report.attemptId}
                  suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                  directSaveToProductionFeedback
                  className="border-ep-blue/30 bg-ep-yellow/80"
                  uiLocale={uiLocale}
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
          </div>
        </div>
      </section>

      <section className="bg-[#fafafa] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-neutral-500">
            ข้อเสนอแนะอิงบทพูดที่จัดวรรคตอนแล้วและฐานข้อมูลให้คะแนนของ English Plan
            บันทึกประเด็นลงสมุดได้ด้วยหมวดเดียวกับรายงานการเขียน
          </p>
        </div>
      </section>
    </div>
  );
}
