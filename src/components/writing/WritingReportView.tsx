"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { AnnotatedEssay } from "@/components/writing/AnnotatedEssay";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";
import { ProductionReportLandingHero } from "@/components/production/ProductionReportLandingHero";
import { AiRewardBonusNotice } from "@/components/production/AiRewardBonusNotice";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { GrammarFixesPanel, type GrammarFixItem } from "@/components/reports/GrammarFixesPanel";
import {
  buildWritingReportNotebookFullBodies,
  buildWritingReportNotebookPreview,
} from "@/lib/writing-report-notebook";
import { resolveGrammarFixDisplay } from "@/lib/grammar-fix-display";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
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

function StudySentenceRow({
  s,
  attemptId,
  uiLocale = "en",
}: {
  s: StudySentenceSuggestion;
  attemptId: string;
  uiLocale?: "en" | "th";
}) {
  const th = uiLocale === "th";
  return (
    <li className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]">
      {th ? (
        <p className="font-medium text-neutral-900">{s.th?.trim() ? s.th : s.en}</p>
      ) : (
        <>
          <p className="font-medium text-neutral-900">{s.en}</p>
          <p className="mt-1 text-neutral-600">{s.th}</p>
        </>
      )}
      <AddToNotebookButton
        attemptId={attemptId}
        suggestedPremade="default"
        uiLocale={uiLocale}
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
  uiLocale = "en",
}: {
  v: StudyVocabularySuggestion;
  attemptId: string;
  uiLocale?: "en" | "th";
}) {
  const th = uiLocale === "th";
  return (
    <li className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]">
      <p className="font-bold text-neutral-900">
        {th ? v.termTh?.trim() || v.termEn : v.termEn}
        {!th && v.termTh ? (
          <span className="ml-2 font-normal text-neutral-600">({v.termTh})</span>
        ) : null}
      </p>
      {th ? (
        <p className="mt-1 text-neutral-800">{v.noteTh?.trim() ? v.noteTh : v.noteEn}</p>
      ) : (
        <>
          <p className="mt-1 text-neutral-800">{v.noteEn}</p>
          <p className="mt-1 text-neutral-600">{v.noteTh}</p>
        </>
      )}
      <AddToNotebookButton
        attemptId={attemptId}
        suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
        uiLocale={uiLocale}
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

  const uiLocale = "th" as const;
  const rubricTh = (
    <>
      น้ำหนักเกณฑ์: ไวยากรณ์ {SPEAKING_RUBRIC_WEIGHTS.grammar * 100}% · คำศัพท์{" "}
      {SPEAKING_RUBRIC_WEIGHTS.vocabulary * 100}% · ความต่อเนื่อง{" "}
      {SPEAKING_RUBRIC_WEIGHTS.coherence * 100}% · การตอบโจทย์{" "}
      {SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * 100}%
    </>
  );
  const grammarFixes: GrammarFixItem[] = fullReport.grammar.breakdown
    .map((b) => {
      const display = resolveGrammarFixDisplay({
        excerpt: b.excerpt,
        suggestionEn: b.suggestionEn,
        suggestionTh: b.suggestionTh,
        noteEn: b.en,
        noteTh: b.th,
      });
      return {
        id: b.id,
        wrong: display.wrong,
        betterEn: display.betterEn,
        betterTh: display.betterTh,
        noteEn: b.en,
        noteTh: b.th,
      };
    })
    .filter((x) => x.wrong && (x.betterEn || x.betterTh))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ProductionReportLandingHero
        locale="th"
        backHref={`/practice/production/read-and-write/round/${roundBack}`}
        backLabel="← หัวข้อ"
        eyebrow="รายงาน · อ่านแล้วเขียน"
        titleEn={fullReport.topicTitleEn}
        titleTh={fullReport.topicTitleTh}
        score160={fullReport.score160}
        gradingBadgeText={
          fullReport.gradingSource === "gemini"
            ? "ฐานข้อมูล 4 ปี ของ English Plan"
            : "ให้คะแนนแบบสาธิต (ออฟไลน์)"
        }
        rubricLine={rubricTh}
        taskBoostSlot={
          fullReport.taskPersonalExperienceBoostApplied ? (
            <p className="ep-stat max-w-2xl text-xs font-bold text-emerald-800">
              เกณฑ์การตอบโจทย์รับน้ำหนัก +10% เมื่อเล่าประสบการณ์ส่วนตัวหรือสมมติในลักษณะประสบการณ์ส่วนตัว
              (สูงสุด 100%)
            </p>
          ) : undefined
        }
      >
        <button
          type="button"
          onClick={() =>
            router.push(`/practice/production/read-and-write/${fullReport.topicId}?redeem=1`)
          }
          className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
        >
          ทำอีกครั้ง
        </button>
        <FullReportNotebookButton
          attemptId={fullReport.attemptId}
          entrySource="writing-read-and-write"
          uiLocale={uiLocale}
          build={() => {
            const preview = buildWritingReportNotebookPreview(fullReport);
            const { fullBodyEn, fullBodyTh } =
              buildWritingReportNotebookFullBodies(fullReport);
            return { ...preview, fullBodyEn, fullBodyTh };
          }}
        />
      </ProductionReportLandingHero>

      <section className="border-y-4 border-black">
        <div className={`${LANDING_PAGE_GRID_BG} py-8 sm:py-10`}>
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
      <AiRewardBonusNotice reward={fullReport.rewardBonus} />
      {topic ? (
        <BrutalPanel variant="elevated" title="โจทย์">
          <p className="text-sm font-medium text-neutral-900">
            {topic.promptTh?.trim() ? topic.promptTh : topic.promptEn}
          </p>
          {(topic.followUps ?? []).length > 0 ? (
            <ul className="mt-4 space-y-3 border-t-2 border-dashed border-neutral-200 pt-4">
              {(topic.followUps ?? []).map((fu, i) => (
                <li key={`${topic.id}-fu-${i}`} className="text-sm">
                  <p className="ep-stat text-[10px] font-bold uppercase text-neutral-500">
                    คำถามเสริม {i + 1}
                  </p>
                  <p className="mt-1 font-medium text-neutral-900">
                    {fu.promptTh?.trim() ? fu.promptTh : fu.promptEn}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </BrutalPanel>
      ) : null}

      <BrutalPanel variant="elevated" title="ข้อความของคุณ">
        <p className="ep-stat text-xs text-neutral-500">
          {fullReport.wordCount} คำ · เตรียม {fullReport.prepMinutes} นาที ·
          จัดวรรคตอนเพื่อให้ข้อเสนอแนะ
        </p>

        <div className="mt-3 rounded-sm border-2 border-black bg-white p-3">
          <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            คำตอบข้อหลัก
          </p>
          {fullReport.mainSubmissionHighlights &&
          fullReport.mainSubmissionHighlights.length > 0 ? (
            <div className="mt-2 max-w-full overflow-x-auto">
              <SpeakingAnnotatedTranscript
                text={mainSubmission}
                highlights={fullReport.mainSubmissionHighlights}
                writingReport={fullReport}
                attemptId={fullReport.attemptId}
                uiLocale={uiLocale}
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
              className="mt-3 rounded-sm border-2 border-black bg-[#fafafa] p-3 shadow-[2px_2px_0_0_#000]"
            >
              <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                คำถามเสริม {i + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {fu.promptTh?.trim() ? fu.promptTh : fu.promptEn}
              </p>
              {hi.length > 0 ? (
                <div className="mt-2 max-w-full overflow-x-auto">
                  <SpeakingAnnotatedTranscript
                    text={text}
                    highlights={hi}
                    writingReport={fullReport}
                    attemptId={fullReport.attemptId}
                    uiLocale={uiLocale}
                  />
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
            uiLocale={uiLocale}
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
          uiLocale={uiLocale}
          maxItems={8}
        />
      ) : null}

      {showStudyVocabFallback ? (
        <BrutalPanel variant="elevated" eyebrow="สูงสุด 10 คำ" title="แนะนำคำศัพท์">
          <p className="mb-3 text-xs text-neutral-600">
            คำและโน้ตที่เกี่ยวข้องกับโจทย์นี้ กดเพิ่มในสมุดได้ทุกรายการ (ค่าเริ่มต้นเป็นหมวดคำศัพท์)
          </p>
          <ul className="space-y-3">
            {fullReport.studyVocabulary?.map((v) => (
              <StudyVocabRow
                key={v.id}
                v={v}
                attemptId={fullReport.attemptId}
                uiLocale={uiLocale}
              />
            ))}
          </ul>
        </BrutalPanel>
      ) : null}

      <BrutalPanel variant="elevated" eyebrow="สูงสุด 7 ประโยค" title="ประโยคฝึกแนะนำ">
        <p className="mb-3 text-xs text-neutral-600">
          ฝึกรูปแบบเหล่านี้ แล้วบันทึกบรรทัดใดก็ได้ลงสมุด — เลือกโฟลเดอร์เองได้
        </p>
        <ul className="space-y-3">
          {fullReport.studySentences?.map((s) => (
            <StudySentenceRow
              key={s.id}
              s={s}
              attemptId={fullReport.attemptId}
              uiLocale={uiLocale}
            />
          ))}
        </ul>
      </BrutalPanel>

      <div className="grid gap-5 md:grid-cols-2">
        <CriterionBlock
          title="Grammar"
          titleEn="Grammar (read & write)"
          titleTh="ไวยากรณ์ (อ่านแล้วเขียน)"
          report={fullReport.grammar}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.grammar}
          uiLocale={uiLocale}
        />
        <CriterionBlock
          title="Vocabulary"
          titleEn="Vocabulary (read & write)"
          titleTh="คำศัพท์ (อ่านแล้วเขียน)"
          report={fullReport.vocabulary}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
          uiLocale={uiLocale}
        />
        <CriterionBlock
          title="Coherence"
          titleEn="Coherence (read & write)"
          titleTh="ความต่อเนื่อง (อ่านแล้วเขียน)"
          report={fullReport.coherence}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          uiLocale={uiLocale}
        />
        <CriterionBlock
          title="Task relevancy"
          titleEn="Task (read & write)"
          titleTh="โจทย์ (อ่านแล้วเขียน)"
          report={fullReport.taskRelevancy}
          attemptId={fullReport.attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          uiLocale={uiLocale}
        />
      </div>

      <BrutalPanel variant="elevated" title="สิ่งที่ได้เรียนรู้">
        <ul className="space-y-3">
          {fullReport.improvementPoints.map((p) => (
            <li
              key={p.id}
              className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
            >
              <p className="font-bold text-neutral-900">{p.th?.trim() ? p.th : p.en}</p>
              <div className="relative z-10 mt-2">
                <AddToNotebookButton
                  entrySource="writing-read-and-write"
                  attemptId={fullReport.attemptId}
                  suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                  directSaveToProductionFeedback
                  className="border-ep-blue/30 bg-ep-yellow/80"
                  uiLocale={uiLocale}
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
      <GrammarFixesPanel
        items={grammarFixes}
        attemptId={fullReport.attemptId}
        entrySource="writing-read-and-write"
        titleEn="Grammar fixes (read & write)"
        titleTh="จุดแก้ไวยากรณ์ (อ่านแล้วเขียน)"
        maxItems={8}
      />
          </div>
        </div>
      </section>

      <section className="bg-[#fafafa] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-neutral-500">
            การให้คะแนนอิงข้อความที่จัดวรรคตอนแล้วและโจทย์ด้านบน
            บันทึกประเด็นลงสมุดได้ด้วยหมวดเดียวกับรายงาน production อื่น
          </p>
        </div>
      </section>
    </div>
  );
}
