import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import { DIALOGUE_SUMMARY_RUBRIC_WEIGHTS } from "@/lib/dialogue-summary-constants";
import type {
  DialogueSummaryAttemptReport,
  DialogueSummaryCriterionReport,
  DialogueSummaryExam,
  DialogueSummaryHighlight,
  DialogueSummaryHighlightType,
  DialogueSummaryImprovementPoint,
} from "@/types/dialogue-summary";

function clampPercent(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x)) return 50;
  return Math.min(100, Math.max(0, Math.round(x)));
}

function to160(r: number, g: number, f: number, v: number): number {
  const sum =
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.relevancy * r +
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.grammar * g +
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.flow * f +
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.vocabulary * v;
  return Math.round(sum * 1.6);
}

function pointsOn160(weight: number, scorePercent: number): number {
  return Math.round(scorePercent * weight * 1.6 * 10) / 10;
}

function findQuoteSpan(text: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim();
  if (!q) return null;
  let i = text.indexOf(q);
  if (i >= 0) return { start: i, end: i + q.length };
  const e2 = text.replace(/\u00a0/g, " ");
  const q2 = q.replace(/\u00a0/g, " ");
  i = e2.indexOf(q2);
  if (i >= 0) return { start: i, end: i + q2.length };
  return null;
}

function criterion(
  id: DialogueSummaryCriterionReport["id"],
  weight: number,
  scorePercent: number,
  summary: { en: string; th: string },
  breakdown: { en: string; th: string; excerpt?: string }[],
): DialogueSummaryCriterionReport {
  return {
    id,
    weight,
    scorePercent,
    pointsOn160: pointsOn160(weight, scorePercent),
    summary,
    breakdown: breakdown.map((b, idx) => ({
      id: `${id}-b${idx + 1}`,
      en: b.en,
      th: b.th,
      excerpt: b.excerpt,
    })),
  };
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

const HIGHLIGHT_TYPES = new Set<DialogueSummaryHighlightType>(["grammar", "flow", "vocabulary"]);

function buildSystemInstruction(): string {
  return `You are an expert English examiner for Thai learners (DET-style dialogue summary task).
The learner read a scenario (5 sentences) and a dialogue (~10 turns), then wrote a summary in English.

Score on four criteria (each 0–100 percent). Total score out of 160 is computed as:
(relevancy*0.25 + grammar*0.3 + flow*0.2 + vocabulary*0.25) * 1.6, rounded to integer.

Rubric anchors (use to calibrate percents, then output percents 0–100):

RELEVANCY TO THE SCENARIO (25% of 160 = max 40 points):
- Excellent (85–100%): Fully answers the prompt, highly relevant, clear development, no drift.
- Good (70–84%): Mostly relevant, minor drifting, enough support.
- Adequate (50–69%): Partly answers, somewhat thin or repetitive.
- Weak (25–49%): Limited relevance, incomplete, vague.
- Very weak (0–24%): Off-topic, memorized, or nearly no meaningful response.

GRAMMAR (30% of 160 = max 48 points):
- Excellent (85–100%): Strong grammatical control, very few errors, errors do not affect meaning.
- Good (69–84%): Some errors, but overall accurate and controlled.
- Adequate (50–68%): Frequent errors, but meaning usually clear; misuse of conjunctions.
- Weak (25–49%): Persistent grammar problems, meaning sometimes unclear, subject–verb agreement issues.
- Very weak (0–24%): Severe errors, very limited sentence control.

FLOW (20% of 160 = max 32 points):
- Excellent (85–100%): Smooth, logical, easy to follow, well connected; uses at least one transitional word appropriately.
- Good (69–84%): Mostly smooth, organization clear, but did not use a transitional word (or weak transition).
- Adequate (50–68%): Noticeable pauses or uneven organization; wrong transitional word or punctuation; run-on sentences.
- Weak (25–49%): Frequent hesitation, fragmented ideas.
- Very weak (0–24%): Hard to follow, disconnected, very broken delivery.

VOCABULARY (25% of 160 = max 40 points):
- Excellent (85–100%): Wide range, accurate choice, flexible paraphrasing.
- Good (69–84%): Good range, mostly accurate, some repetition.
- Adequate (50–69%): Limited range but understandable.
- Weak (25–49%): Basic vocabulary only, repetitive, awkward word choice.
- Very weak (0–24%): Very limited vocabulary, hard to express meaning.

Return ONLY valid JSON (no markdown).

Highlights: type must be exactly "grammar", "flow", or "vocabulary" (for colors: grammar=issues/strengths in grammar, flow=organization/connectors, vocabulary=word choice).
exactQuote MUST be copied verbatim from the learner's summary (contiguous substring) so it can be found with indexOf.

For each highlight, isPositive true = strength; false = weakness.

Provide up to 8 improvement points (bilingual EN/TH). Categories: relevancy, grammar, flow, vocabulary, general.

All user-facing strings: both English and Thai (_En / _Th suffixes in JSON keys as specified).`;
}

function buildUserPayload(exam: DialogueSummaryExam, summary: string): string {
  return JSON.stringify(
    {
      task: "grade_dialogue_summary",
      titleEn: exam.titleEn,
      titleTh: exam.titleTh,
      scenarioSentences: exam.scenarioSentences,
      dialogue: exam.dialogue,
      learnerSummary: summary,
      requiredJsonShape: {
        relevancyScorePercent: "number 0-100",
        grammarScorePercent: "number 0-100",
        flowScorePercent: "number 0-100",
        vocabularyScorePercent: "number 0-100",
        relevancySummaryEn: "string",
        relevancySummaryTh: "string",
        grammarSummaryEn: "string",
        grammarSummaryTh: "string",
        flowSummaryEn: "string",
        flowSummaryTh: "string",
        vocabularySummaryEn: "string",
        vocabularySummaryTh: "string",
        relevancyBreakdown: [{ en: "string", th: "string", excerpt: "optional" }],
        grammarBreakdown: [{ en: "string", th: "string", excerpt: "optional" }],
        flowBreakdown: [{ en: "string", th: "string", excerpt: "optional" }],
        vocabularyBreakdown: [{ en: "string", th: "string", excerpt: "optional" }],
        improvementPoints: [
          { en: "string", th: "string", category: "relevancy|grammar|flow|vocabulary|general" },
        ],
        highlights: [
          {
            exactQuote: "string verbatim from learner summary",
            type: "grammar|flow|vocabulary",
            isPositive: "boolean",
            headlineEn: "string",
            headlineTh: "string",
            scoreLineEn: "string",
            scoreLineTh: "string",
            fixEn: "string optional if isPositive false",
            fixTh: "string optional",
            noteEn: "string",
            noteTh: "string",
          },
        ],
      },
    },
    null,
    2,
  );
}

export async function generateDialogueSummaryReportWithGemini(params: {
  apiKey: string;
  model?: string;
  attemptId: string;
  exam: DialogueSummaryExam;
  summary: string;
  submittedAt: string;
  wordCount: number;
}): Promise<DialogueSummaryAttemptReport> {
  const { apiKey, attemptId, exam, summary, submittedAt, wordCount } = params;
  const modelName = params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(),
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(buildUserPayload(exam, summary));
  const text = result.response.text();
  const raw = parseGeminiJsonObjectResponse(text);

  const rel = clampPercent(raw.relevancyScorePercent);
  const gram = clampPercent(raw.grammarScorePercent);
  const flow = clampPercent(raw.flowScorePercent);
  const voc = clampPercent(raw.vocabularyScorePercent);
  const score160 =
    typeof raw.score160 === "number" && raw.score160 >= 0 && raw.score160 <= 160
      ? Math.round(raw.score160)
      : to160(rel, gram, flow, voc);

  const relevancy = criterion(
    "relevancy",
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.relevancy,
    rel,
    {
      en: String(raw.relevancySummaryEn ?? ""),
      th: String(raw.relevancySummaryTh ?? ""),
    },
    asArr(raw.relevancyBreakdown)
      .slice(0, 5)
      .map((b) => {
        const o = b as Record<string, unknown>;
        return {
          en: String(o?.en ?? ""),
          th: String(o?.th ?? ""),
          excerpt: o?.excerpt ? String(o.excerpt) : undefined,
        };
      }),
  );

  const grammar = criterion(
    "grammar",
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.grammar,
    gram,
    {
      en: String(raw.grammarSummaryEn ?? ""),
      th: String(raw.grammarSummaryTh ?? ""),
    },
    asArr(raw.grammarBreakdown)
      .slice(0, 5)
      .map((b) => {
        const o = b as Record<string, unknown>;
        return {
          en: String(o?.en ?? ""),
          th: String(o?.th ?? ""),
          excerpt: o?.excerpt ? String(o.excerpt) : undefined,
        };
      }),
  );

  const flowCr = criterion(
    "flow",
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.flow,
    flow,
    {
      en: String(raw.flowSummaryEn ?? ""),
      th: String(raw.flowSummaryTh ?? ""),
    },
    asArr(raw.flowBreakdown)
      .slice(0, 5)
      .map((b) => {
        const o = b as Record<string, unknown>;
        return {
          en: String(o?.en ?? ""),
          th: String(o?.th ?? ""),
          excerpt: o?.excerpt ? String(o.excerpt) : undefined,
        };
      }),
  );

  const vocabulary = criterion(
    "vocabulary",
    DIALOGUE_SUMMARY_RUBRIC_WEIGHTS.vocabulary,
    voc,
    {
      en: String(raw.vocabularySummaryEn ?? ""),
      th: String(raw.vocabularySummaryTh ?? ""),
    },
    asArr(raw.vocabularyBreakdown)
      .slice(0, 5)
      .map((b) => {
        const o = b as Record<string, unknown>;
        return {
          en: String(o?.en ?? ""),
          th: String(o?.th ?? ""),
          excerpt: o?.excerpt ? String(o.excerpt) : undefined,
        };
      }),
  );

  const improvementPoints: DialogueSummaryImprovementPoint[] = asArr(raw.improvementPoints)
    .slice(0, 8)
    .map((p, i) => {
      const o = p as Record<string, unknown>;
      const cat = String(o?.category ?? "general");
      const category: DialogueSummaryImprovementPoint["category"] =
        cat === "relevancy" || cat === "grammar" || cat === "flow" || cat === "vocabulary" || cat === "general"
          ? cat
          : "general";
      return {
        id: `imp-${i}`,
        en: String(o?.en ?? ""),
        th: String(o?.th ?? ""),
        category,
      };
    });

  const highlights: DialogueSummaryHighlight[] = [];
  for (let i = 0; i < asArr(raw.highlights).length; i++) {
    const h = asArr(raw.highlights)[i] as Record<string, unknown>;
    const typeRaw = String(h?.type ?? "grammar");
    const type: DialogueSummaryHighlightType = HIGHLIGHT_TYPES.has(typeRaw as DialogueSummaryHighlightType)
      ? (typeRaw as DialogueSummaryHighlightType)
      : "grammar";
    const quote = String(h?.exactQuote ?? "");
    const span = findQuoteSpan(summary, quote);
    if (!span) continue;
    highlights.push({
      start: span.start,
      end: span.end,
      type,
      isPositive: h?.isPositive === true,
      noteEn: String(h?.noteEn ?? ""),
      noteTh: String(h?.noteTh ?? ""),
      headlineEn: h?.headlineEn ? String(h.headlineEn) : undefined,
      headlineTh: h?.headlineTh ? String(h.headlineTh) : undefined,
      scoreLineEn: h?.scoreLineEn ? String(h.scoreLineEn) : undefined,
      scoreLineTh: h?.scoreLineTh ? String(h.scoreLineTh) : undefined,
      fixEn: h?.fixEn ? String(h.fixEn) : undefined,
      fixTh: h?.fixTh ? String(h.fixTh) : undefined,
    });
  }

  return {
    gradingSource: "gemini",
    attemptId,
    examId: exam.id,
    titleEn: exam.titleEn,
    titleTh: exam.titleTh,
    round: exam.round,
    difficulty: exam.difficulty,
    setNumber: exam.setNumber,
    summary,
    wordCount,
    submittedAt,
    score160,
    relevancy,
    grammar,
    flow: flowCr,
    vocabulary,
    improvementPoints,
    highlights,
  };
}
