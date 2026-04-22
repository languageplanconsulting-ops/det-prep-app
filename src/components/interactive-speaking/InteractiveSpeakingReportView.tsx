"use client";

import { useRouter } from "next/navigation";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { ProductionReportLandingHero } from "@/components/production/ProductionReportLandingHero";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { SpeakingAnnotatedTranscript } from "@/components/speaking/SpeakingAnnotatedTranscript";
import { SpeakingVocabularyUpgradePanel } from "@/components/speaking/SpeakingVocabularyUpgradePanel";
import { GrammarFixesPanel, type GrammarFixItem } from "@/components/reports/GrammarFixesPanel";
import { InteractiveSpeakingFullReportNotebookButton } from "@/components/interactive-speaking/InteractiveSpeakingFullReportNotebookButton";
import { resolveGrammarFixDisplay } from "@/lib/grammar-fix-display";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import { INTERACTIVE_SPEAKING_TURN_COUNT } from "@/lib/interactive-speaking-constants";
import { GRADING_BADGE_OFFLINE, GRADING_BADGE_PRIMARY } from "@/lib/report-branding";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";
import type { WritingCriterionReport } from "@/types/writing";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";

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
                entrySource="interactive-speaking"
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

export function InteractiveSpeakingReportView({
  report,
}: {
  report: InteractiveSpeakingAttemptReport;
}) {
  const router = useRouter();
  const entrySource = "interactive-speaking" as const;
  const keyLearningItems = report.keyLearningQuotes?.length
    ? report.keyLearningQuotes
    : null;
  const grammarFixes: GrammarFixItem[] = report.grammar.breakdown
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
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <ProductionReportLandingHero
        backHref="/practice/production/interactive-speaking"
        backLabel="← Scenarios"
        eyebrow="Interactive speaking — report"
        titleEn={report.scenarioTitleEn}
        titleTh={report.scenarioTitleTh}
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
      >
        <button
          type="button"
          onClick={() => router.push(`/practice/production/interactive-speaking/${report.scenarioId}`)}
          className="border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
        >
          Try again
        </button>
        <InteractiveSpeakingFullReportNotebookButton report={report} />
      </ProductionReportLandingHero>

      <section className="border-y-4 border-black">
        <div className={`${LANDING_PAGE_GRID_BG} py-8 sm:py-10`}>
          <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6">
            <BrutalPanel variant="elevated" title="Conversation recap">
              <p className="mb-4 text-xs text-neutral-600">
                Hover highlighted spans in your answers: green = strength, amber = focus area.
              </p>
              <ul className="space-y-6">
                {report.conversationRecap.map((row) => (
                  <li
                    key={row.turnIndex}
                    className="rounded-sm border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
                  >
                    <p className="ep-stat text-[10px] font-bold uppercase text-ep-blue">
                      Turn {row.turnIndex}
                    </p>
                    <p className="mt-1 text-sm font-bold text-neutral-900">{row.questionEn}</p>
                    <p className="text-xs text-neutral-600">{row.questionTh}</p>
                    <div className="mt-3 max-w-full overflow-x-auto border-t border-dashed border-neutral-200 pt-3">
                      {row.highlights.length > 0 ? (
                        <SpeakingAnnotatedTranscript
                          text={row.answerPunctuated}
                          highlights={row.highlights}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-neutral-900">
                          {row.answerPunctuated}
                        </p>
                      )}
                    </div>
                    <div className="relative z-10 mt-3">
                      <AddToNotebookButton
                        entrySource={entrySource}
                        attemptId={report.attemptId}
                        suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                        getPayload={() => ({
                          titleEn: `Turn ${row.turnIndex} — interactive speaking`,
                          titleTh: `เทิร์น ${row.turnIndex} — การพูดโต้ตอบ`,
                          bodyEn: `${row.questionEn}\n\n${row.answerPunctuated}`,
                          bodyTh: `${row.questionTh}\n\n${row.answerPunctuated}`,
                          excerpt: row.answerPunctuated.slice(0, 120),
                        })}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </BrutalPanel>

            <SpeakingVocabularyUpgradePanel
              upgrades={report.vocabularyUpgradeSuggestions ?? []}
              attemptId={report.attemptId}
              entrySource={entrySource}
              uiLocale="th"
              maxItems={8}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <CriterionBlock
                title="Grammar"
                titleEn="Grammar (interactive speaking)"
                titleTh="ไวยากรณ์ (การพูดโต้ตอบ)"
                report={report.grammar}
                attemptId={report.attemptId}
                suggestedPremade={NOTEBOOK_BUILTIN.grammar}
              />
              <CriterionBlock
                title="Vocabulary"
                titleEn="Vocabulary (interactive speaking)"
                titleTh="คำศัพท์ (การพูดโต้ตอบ)"
                report={report.vocabulary}
                attemptId={report.attemptId}
                suggestedPremade={NOTEBOOK_BUILTIN.vocabulary}
              />
              <CriterionBlock
                title="Coherence"
                titleEn="Coherence (interactive speaking)"
                titleTh="ความต่อเนื่อง (การพูดโต้ตอบ)"
                report={report.coherence}
                attemptId={report.attemptId}
                suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
              />
              <CriterionBlock
                title="Task relevancy"
                titleEn="Task (interactive speaking)"
                titleTh="โจทย์ (การพูดโต้ตอบ)"
                report={report.taskRelevancy}
                attemptId={report.attemptId}
                suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
              />
            </div>

            <BrutalPanel variant="elevated" title="Key learning (from your speech)">
              <p className="mb-4 text-xs text-neutral-600">
                Each tip starts from something you actually said. Suggestions are for{" "}
                <strong>spoken</strong> English (natural and simple — not essay-style). Some rows include a common
                American idiom you could try.
              </p>
              <ul className="space-y-4">
                {keyLearningItems
                  ? keyLearningItems.map((k) => (
                      <li
                        key={k.id}
                        className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
                      >
                        <p className="ep-stat text-[10px] font-bold uppercase text-ep-blue">
                          Turn {k.turnIndex} · your words
                        </p>
                        <p className="mt-2 border-l-4 border-ep-yellow pl-3 ep-stat text-sm italic text-neutral-900">
                          “{k.exactQuoteFromSpeech}”
                        </p>
                        <p className="mt-3 font-medium text-neutral-900">{k.improvementEn}</p>
                        <p className="mt-1 text-neutral-600">{k.improvementTh}</p>
                        {k.suggestedIdiomEn?.trim() && k.suggestedIdiomMeaningTh?.trim() ? (
                          <div className="mt-3 rounded-sm border border-dashed border-ep-blue/40 bg-white p-2">
                            <p className="ep-stat text-[10px] font-bold uppercase text-ep-blue">
                              American idiom (try in speech)
                            </p>
                            <p className="mt-1 font-semibold text-neutral-900">{k.suggestedIdiomEn}</p>
                            <p className="text-xs text-neutral-600">{k.suggestedIdiomMeaningTh}</p>
                            {k.suggestedIdiomExampleEn?.trim() ? (
                              <p className="mt-1 text-xs italic text-neutral-700">
                                e.g. {k.suggestedIdiomExampleEn}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="relative z-10 mt-3">
                          <AddToNotebookButton
                            entrySource={entrySource}
                            attemptId={report.attemptId}
                            suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                            directSaveToProductionFeedback
                            className="border-ep-blue/30 bg-ep-yellow/80"
                            getPayload={() => ({
                              titleEn: `Key learning — turn ${k.turnIndex}`,
                              titleTh: `สิ่งที่ได้เรียนรู้ — เทิร์น ${k.turnIndex}`,
                              bodyEn: `"${k.exactQuoteFromSpeech}"\n\n${k.improvementEn}${
                                k.suggestedIdiomEn ? `\n\nIdiom: ${k.suggestedIdiomEn}` : ""
                              }`,
                              bodyTh: k.improvementTh,
                            })}
                          />
                        </div>
                      </li>
                    ))
                  : report.improvementPoints.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
                      >
                        <p className="font-bold">{p.en}</p>
                        <p className="mt-1 text-neutral-600">{p.th}</p>
                      </li>
                    ))}
              </ul>
            </BrutalPanel>
            <GrammarFixesPanel
              items={grammarFixes}
              attemptId={report.attemptId}
              entrySource="interactive-speaking"
              titleEn="Grammar fixes (interactive speaking)"
              titleTh="จุดแก้ไวยากรณ์ (การพูดโต้ตอบ)"
              maxItems={8}
            />
          </div>
        </div>
      </section>

      <section className="bg-[#fafafa] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-neutral-500">
            Scoring uses all {INTERACTIVE_SPEAKING_TURN_COUNT} answers together. Save recap lines or key-learning
            tips to your notebook like other production reports.
          </p>
        </div>
      </section>
    </div>
  );
}
