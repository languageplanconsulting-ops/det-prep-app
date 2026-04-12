import { GoogleGenerativeAI } from "@google/generative-ai";
import { findTextSpan } from "@/lib/find-text-span";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import type {
  ImprovementPoint,
  StudySentenceSuggestion,
  StudyVocabularySuggestion,
  WritingAttemptReport,
  WritingCriterionReport,
  WritingSubmissionHighlight,
  WritingTopic,
  WritingVocabularyUpgrade,
} from "@/types/writing";
import { GEMINI_PRODUCTION_THAI_STYLE } from "@/lib/gemini-production-thai-style";
import {
  WRITING_RUBRIC_WEIGHTS,
  buildLocalStudyPack,
} from "@/lib/writing-report";

function pointsOn160(percent: number, weight: number): number {
  return Math.round(percent * weight * 1.6 * 10) / 10;
}

function to160(g: number, v: number, c: number, t: number): number {
  const sum =
    WRITING_RUBRIC_WEIGHTS.grammar * g +
    WRITING_RUBRIC_WEIGHTS.vocabulary * v +
    WRITING_RUBRIC_WEIGHTS.coherence * c +
    WRITING_RUBRIC_WEIGHTS.taskRelevancy * t;
  return Math.round(sum * 1.6);
}

function clampPercent(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x)) return 50;
  return Math.min(100, Math.max(0, Math.round(x)));
}

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function criterion(
  id: string,
  weight: number,
  scorePercent: number,
  summary: { en: string; th: string },
  breakdown: {
    en: string;
    th: string;
    excerpt?: string;
    suggestionEn?: string;
    suggestionTh?: string;
  }[],
): WritingCriterionReport {
  return {
    id,
    weight,
    scorePercent,
    pointsOn160: pointsOn160(scorePercent, weight),
    summary,
    breakdown: breakdown.map((b, idx) => ({
      id: `${id}-b${idx + 1}`,
      en: b.en,
      th: b.th,
      excerpt: b.excerpt,
      ...(b.suggestionEn?.trim() || b.suggestionTh?.trim()
        ? {
            suggestionEn: b.suggestionEn?.trim(),
            suggestionTh: b.suggestionTh?.trim(),
          }
        : {}),
    })),
  };
}

function buildSystemInstruction(): string {
  return `You are an expert English examiner for Thai learners (DET-style writing — same rubric and report shape as our write-about-photo writing tasks).
The learner typed their answers. Raw text may lack proper punctuation, capitals, or paragraph breaks.

WORKFLOW (mandatory):
1) Punctuate the MAIN essay only → punctuatedMainEssay: capitals, full stops, commas, question marks, paragraph breaks where natural. Do NOT change meaning or add ideas—only punctuation and light spacing.
2) For EACH follow-up answer (if any), punctuate separately → punctuatedFollowUpAnswers array in the SAME order as the raw follow-ups. Same rules.
3) Score ONLY using the punctuated versions. All breakdown excerpts (exact quotes) must be exact contiguous substrings of the punctuated text for the relevant part (main or that follow-up).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) × 1.6, each subscore 0-100.

For EACH criterion summary, include (A) brief assessment and (B) a line starting with "How to improve your [grammar/vocabulary/coherence/task] score:" plus a concrete action tied to THIS learner's wording.

Breakdown items: use issueEn, issueTh. excerpt = exact short quote from the relevant punctuated section. suggestionEn / suggestionTh = concrete fix (bilingual).

Grammar bands: ~30% A1–A2 issues; ~50% B1–B2; ~70% clean; ~90% ≥1 complex structure; 100% ≥3 complex structures.

Task relevancy: weight whether the learner addresses the main prompt and any follow-ups.

Task score boost: output taskScorePercent as BASE (0–100). Set taskPersonalExperienceBoost true for authentic personal OR hypothetical personal experience ("If I were…", "I would…", etc.). The grading system adds +10 to the task percentage (cap 100) when this is true—mention that bonus briefly in taskSummaryEn/Th.

vocabularyUpgradeSuggestions: up to 10 — originalWord, upgradedWord (B2/C1), meaningTh, exampleEn, exampleTh.

Submission highlights (for hover UI):
- submissionHighlights: up to 20 items. Each: target = "main" OR "followUp0" / "followUp1" / "followUp2", exactQuote = verbatim from that section's punctuated text, isPositive, noteEn, noteTh.

Improvement points: each MUST quote an exact phrase from the learner's punctuated text and give a specific fix. Up to 10; category grammar|vocabulary|coherence|task|general.

studySentences (max 7), studyVocabulary (max 10): bilingual revision tied to this submission.

Return ONLY valid JSON (no markdown).${GEMINI_PRODUCTION_THAI_STYLE}`;
}

function buildUserPayload(
  topic: WritingTopic,
  mainEssayRaw: string,
  followUpRaw: string[],
  prepMinutes: number,
): string {
  const fus = topic.followUps ?? [];
  const sections = fus.map((p, i) => ({
    index: i,
    promptEn: p.promptEn,
    promptTh: p.promptTh,
    learnerAnswerRaw: followUpRaw[i] ?? "",
  }));
  return JSON.stringify(
    {
      task: "analyze_typed_writing",
      topicTitleEn: topic.titleEn,
      topicTitleTh: topic.titleTh,
      mainPromptEn: topic.promptEn,
      mainPromptTh: topic.promptTh,
      prepMinutes,
      mainEssayRaw,
      followUpSections: sections,
      requiredJsonShape: {
        punctuatedMainEssay: "string",
        punctuatedFollowUpAnswers: "string[] same length as follow-up sections (may be empty strings)",
        grammarScorePercent: "number 0-100",
        vocabularyScorePercent: "number 0-100",
        coherenceScorePercent: "number 0-100",
        taskScorePercent: "number 0-100",
        grammarSummaryEn: "string",
        grammarSummaryTh: "string",
        vocabularySummaryEn: "string",
        vocabularySummaryTh: "string",
        coherenceSummaryEn: "string",
        coherenceSummaryTh: "string",
        taskSummaryEn: "string",
        taskSummaryTh: "string",
        grammarBreakdown: [
          {
            excerpt: "string",
            issueEn: "string",
            issueTh: "string",
            suggestionEn: "string",
            suggestionTh: "string",
          },
        ],
        vocabularyBreakdown: "same shape",
        coherenceBreakdown: "same shape",
        taskBreakdown: "same shape",
        improvementPoints: [
          { en: "string", th: "string", category: "grammar|vocabulary|coherence|task|general" },
        ],
        submissionHighlights: [
          {
            target: "main | followUp0 | followUp1 | followUp2",
            exactQuote: "string",
            isPositive: "boolean",
            noteEn: "string",
            noteTh: "string",
          },
        ],
        studySentences: [{ en: "string", th: "string" }],
        studyVocabulary: [
          { termEn: "string", termTh: "string", noteEn: "string", noteTh: "string" },
        ],
        taskPersonalExperienceBoost: "boolean",
        vocabularyUpgradeSuggestions: [
          {
            originalWord: "string",
            upgradedWord: "string",
            meaningTh: "string",
            exampleEn: "string",
            exampleTh: "string",
          },
        ],
      },
    },
    null,
    2,
  );
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function mapBreak(arr: unknown): {
  en: string;
  th: string;
  excerpt?: string;
  suggestionEn?: string;
  suggestionTh?: string;
}[] {
  return asArr(arr)
    .slice(0, 5)
    .map((b) => {
      const o = b as Record<string, unknown>;
      const issueEn = String(o?.issueEn ?? o?.en ?? "");
      const issueTh = String(o?.issueTh ?? o?.th ?? "");
      const sugEn = o?.suggestionEn != null ? String(o.suggestionEn).trim() : "";
      const sugTh = o?.suggestionTh != null ? String(o.suggestionTh).trim() : "";
      return {
        en: issueEn,
        th: issueTh,
        excerpt: o?.excerpt ? String(o.excerpt) : undefined,
        ...(sugEn || sugTh
          ? { suggestionEn: sugEn || undefined, suggestionTh: sugTh || undefined }
          : {}),
      };
    });
}

function mapGeminiStudySentences(
  raw: unknown,
  idPrefix: string,
): StudySentenceSuggestion[] {
  return asArr(raw)
    .slice(0, 7)
    .map((s, i) => {
      const o = s as Record<string, unknown>;
      return {
        id: `${idPrefix}-ss-${i}`,
        en: String(o?.en ?? "").trim(),
        th: String(o?.th ?? "").trim(),
      };
    })
    .filter((x) => x.en.length > 0 || x.th.length > 0);
}

function mapGeminiStudyVocabulary(
  raw: unknown,
  idPrefix: string,
): StudyVocabularySuggestion[] {
  return asArr(raw)
    .slice(0, 10)
    .map((s, i) => {
      const o = s as Record<string, unknown>;
      return {
        id: `${idPrefix}-sv-${i}`,
        termEn: String(o?.termEn ?? o?.wordEn ?? "").trim(),
        termTh: String(o?.termTh ?? o?.wordTh ?? "").trim(),
        noteEn: String(o?.noteEn ?? "").trim(),
        noteTh: String(o?.noteTh ?? "").trim(),
      };
    })
    .filter((x) => x.termEn.length > 0 || x.noteEn.length > 0);
}

function resolveHighlightTarget(
  target: string,
  punctuatedMain: string,
  punctuatedFollowUps: string[],
): string | null {
  const t = target.trim();
  if (t === "main") return punctuatedMain;
  const m = /^followUp(\d+)$/i.exec(t);
  if (m) {
    const i = Number.parseInt(m[1], 10);
    if (i >= 0 && i < punctuatedFollowUps.length) return punctuatedFollowUps[i] ?? "";
  }
  return null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function generateWritingReportWithGemini(params: {
  apiKey: string;
  model?: string;
  attemptId: string;
  topic: WritingTopic;
  essay: string;
  followUpAnswers?: string[];
  prepMinutes: number;
}): Promise<WritingAttemptReport> {
  const { apiKey, attemptId, topic, essay, prepMinutes } = params;
  const followUps = topic.followUps ?? [];
  const followUpRaw =
    params.followUpAnswers ??
    followUps.map(() => "");

  const modelName =
    params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(),
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(
    buildUserPayload(topic, essay, followUpRaw, prepMinutes),
  );
  const text = result.response.text();
  const raw = parseGeminiJsonObjectResponse(text);

  const g = clampPercent(raw.grammarScorePercent);
  const v = clampPercent(raw.vocabularyScorePercent);
  const c = clampPercent(raw.coherenceScorePercent);
  let tScore = clampPercent(raw.taskScorePercent);
  const boost = Boolean(raw.taskPersonalExperienceBoost);
  if (boost) {
    tScore = Math.min(100, tScore + 10);
  }
  const score160 =
    typeof raw.score160 === "number" && raw.score160 >= 0 && raw.score160 <= 160
      ? Math.round(raw.score160)
      : to160(g, v, c, tScore);

  const vocabularyUpgrades: WritingVocabularyUpgrade[] = asArr(raw.vocabularyUpgradeSuggestions)
    .slice(0, 10)
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      return {
        id: `rw-vu-${i}-${attemptId.slice(0, 6)}`,
        originalWord: String(o?.originalWord ?? "").trim(),
        upgradedWord: String(o?.upgradedWord ?? "").trim(),
        meaningTh: String(o?.meaningTh ?? "").trim(),
        exampleEn: String(o?.exampleEn ?? "").trim(),
        exampleTh: String(o?.exampleTh ?? "").trim(),
      };
    })
    .filter((x) => x.originalWord.length > 0 && x.upgradedWord.length > 0);

  const grammar = criterion(
    "grammar",
    WRITING_RUBRIC_WEIGHTS.grammar,
    g,
    {
      en: String(raw.grammarSummaryEn ?? ""),
      th: String(raw.grammarSummaryTh ?? ""),
    },
    mapBreak(raw.grammarBreakdown),
  );

  const vocabulary = criterion(
    "vocabulary",
    WRITING_RUBRIC_WEIGHTS.vocabulary,
    v,
    {
      en: String(raw.vocabularySummaryEn ?? ""),
      th: String(raw.vocabularySummaryTh ?? ""),
    },
    mapBreak(raw.vocabularyBreakdown),
  );

  const coherence = criterion(
    "coherence",
    WRITING_RUBRIC_WEIGHTS.coherence,
    c,
    {
      en: String(raw.coherenceSummaryEn ?? ""),
      th: String(raw.coherenceSummaryTh ?? ""),
    },
    mapBreak(raw.coherenceBreakdown),
  );

  const taskRelevancy = criterion(
    "task",
    WRITING_RUBRIC_WEIGHTS.taskRelevancy,
    tScore,
    {
      en: String(raw.taskSummaryEn ?? ""),
      th: String(raw.taskSummaryTh ?? ""),
    },
    mapBreak(raw.taskBreakdown),
  );

  const improvementPoints: ImprovementPoint[] = asArr(raw.improvementPoints)
    .slice(0, 10)
    .map((p, i) => {
      const o = p as Record<string, unknown>;
      const cat = o?.category;
      const category: ImprovementPoint["category"] =
        cat === "grammar" ||
        cat === "vocabulary" ||
        cat === "coherence" ||
        cat === "task" ||
        cat === "general"
          ? cat
          : "general";
      return {
        id: `imp-${i}-${attemptId.slice(0, 8)}`,
        en: String(o?.en ?? ""),
        th: String(o?.th ?? ""),
        category,
      };
    });

  let punctuatedMain =
    typeof raw.punctuatedMainEssay === "string" && raw.punctuatedMainEssay.trim()
      ? normalizeSpaces(raw.punctuatedMainEssay)
      : normalizeSpaces(essay);

  const rawFuArr = asArr(raw.punctuatedFollowUpAnswers);
  const punctuatedFollowUps: string[] = followUps.map((_, i) => {
    const fromModel = rawFuArr[i];
    if (typeof fromModel === "string" && fromModel.trim()) {
      return normalizeSpaces(fromModel);
    }
    return normalizeSpaces(followUpRaw[i] ?? "");
  });

  const mainHighlights: WritingSubmissionHighlight[] = [];
  const followUpHighlights: WritingSubmissionHighlight[][] = followUps.map(() => []);

  let hi = 0;
  for (const item of asArr(raw.submissionHighlights).slice(0, 22)) {
    const o = item as Record<string, unknown>;
    const targetStr = String(o?.target ?? "main").trim();
    const sectionText = resolveHighlightTarget(
      targetStr,
      punctuatedMain,
      punctuatedFollowUps,
    );
    if (sectionText == null) continue;
    const quote = String(o?.exactQuote ?? "").trim();
    const span = findTextSpan(sectionText, quote);
    if (!span) continue;
    const hl: WritingSubmissionHighlight = {
      id: `wr-th-${hi++}-${attemptId.slice(0, 6)}`,
      start: span.start,
      end: span.end,
      isPositive: Boolean(o?.isPositive),
      noteEn: String(o?.noteEn ?? "").trim(),
      noteTh: String(o?.noteTh ?? "").trim(),
    };
    if (targetStr === "main") {
      mainHighlights.push(hl);
    } else {
      const m = /^followUp(\d+)$/i.exec(targetStr);
      if (m) {
        const idx = Number.parseInt(m[1], 10);
        if (idx >= 0 && idx < followUpHighlights.length) {
          followUpHighlights[idx].push(hl);
        }
      }
    }
  }

  const wc =
    countWords(punctuatedMain) +
    punctuatedFollowUps.reduce((a, s) => a + countWords(s), 0);

  const idPrefix = attemptId.slice(0, 8);
  let studySentences = mapGeminiStudySentences(raw.studySentences, idPrefix);
  let studyVocabulary = mapGeminiStudyVocabulary(raw.studyVocabulary, idPrefix);
  const studyBody = [punctuatedMain, ...punctuatedFollowUps].filter(Boolean).join("\n\n");
  const localPack = buildLocalStudyPack(topic.titleEn, topic.titleTh, studyBody);
  if (studySentences.length === 0) studySentences = localPack.studySentences;
  if (studyVocabulary.length === 0) studyVocabulary = localPack.studyVocabulary;

  const followUpResponses =
    followUps.length > 0
      ? followUps.map((p, i) => ({
          promptEn: p.promptEn,
          promptTh: p.promptTh,
          answer: (followUpRaw[i] ?? "").trim(),
          answerPunctuated: punctuatedFollowUps[i] ?? "",
        }))
      : undefined;

  const hasSectionHighlights =
    mainHighlights.length > 0 || followUpHighlights.some((a) => a.length > 0);

  return {
    gradingSource: "gemini" as const,
    attemptId,
    topicId: topic.id,
    topicTitleEn: topic.titleEn,
    topicTitleTh: topic.titleTh,
    prepMinutes,
    essay: essay.trim(),
    ...(followUpResponses ? { followUpResponses } : {}),
    punctuatedEssay: punctuatedMain,
    ...(hasSectionHighlights
      ? {
          mainSubmissionHighlights: mainHighlights,
          ...(followUps.length > 0 ? { followUpSubmissionHighlights: followUpHighlights } : {}),
        }
      : {}),
    wordCount: wc,
    submittedAt: new Date().toISOString(),
    score160,
    grammar,
    vocabulary,
    coherence,
    taskRelevancy,
    improvementPoints:
      improvementPoints.length >= 2
        ? improvementPoints
        : [
            ...improvementPoints,
            {
              id: "imp-fallback",
              category: "general",
              en: "Next time, add one more specific example tied to the exact wording of the prompt.",
              th: "ครั้งหน้าเพิ่มตัวอย่างเฉพาะที่ผูกกับคำถามอีกหนึ่งจุด",
            },
          ],
    highlights: [],
    studySentences,
    studyVocabulary,
    ...(boost ? { taskPersonalExperienceBoostApplied: true } : {}),
    ...(vocabularyUpgrades.length > 0 ? { vocabularyUpgradeSuggestions: vocabularyUpgrades } : {}),
  };
}
