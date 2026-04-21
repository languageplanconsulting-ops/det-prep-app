import { findTextSpan } from "@/lib/find-text-span";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import { generateGradingJsonCompletion } from "@/lib/grading-llm-generate";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import type { ImprovementPoint, WritingCriterionReport } from "@/types/writing";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import type { SpeakingTranscriptHighlight, SpeakingVocabularyUpgrade } from "@/types/speaking";
import { GEMINI_PRODUCTION_THAI_STYLE } from "@/lib/gemini-production-thai-style";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";

function pointsOn160(percent: number, weight: number): number {
  return Math.round(percent * weight * 1.6 * 10) / 10;
}

function to160(g: number, v: number, c: number, t: number): number {
  const sum =
    SPEAKING_RUBRIC_WEIGHTS.grammar * g +
    SPEAKING_RUBRIC_WEIGHTS.vocabulary * v +
    SPEAKING_RUBRIC_WEIGHTS.coherence * c +
    SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * t;
  return Math.round(sum * 1.6);
}

function clampPercent(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x)) return 50;
  return Math.min(100, Math.max(0, Math.round(x)));
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
  return `You are an expert English examiner for Thai learners (DET-style "speak about a photo").
The learner saw an image (URL provided for context only — you cannot see pixels; rely on prompt + keyword tags + transcript). The raw transcript is from speech recognition and may lack punctuation.

WORKFLOW (mandatory):
1) Produce punctuatedTranscript: add capitals, full stops, commas, and question marks. Do not invent new ideas—only punctuate and lightly normalize spacing.
2) Score ONLY using punctuatedTranscript (all excerpts must be exact substrings of punctuatedTranscript).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) * 1.6, each subscore 0-100.

For EACH criterion summary, include (A) brief assessment and (B) a line starting with "How to improve your [grammar/vocabulary/coherence/task] score:" plus a concrete action tied to THIS learner's wording.

Breakdowns: excerpt (exact quote), issueEn/issueTh, suggestionEn/suggestionTh with concrete corrections. For vocabulary, suggest better words or collocations when possible.

Priority for feedback:
- Prioritize grammar corrections first, then vocabulary upgrades.
- grammarBreakdown should contain up to 8 concrete fixes where possible.
- Keep grammar suggestions natural and score-focused, not overly formal.

Task relevancy: weight whether the learner addresses the photo prompt AND keyword tags.

Task score boost: output taskScorePercent as BASE (0–100). Set taskPersonalExperienceBoost true for authentic personal OR hypothetical personal experience ("If I were…", "I would…", etc.). Server adds +10 to task (cap 100)—note in taskSummary.

vocabularyUpgradeSuggestions: up to 8 — originalWord, upgradedWord (B2/C1), meaningTh, exampleEn, exampleTh.

transcriptHighlights: up to 18 — exactQuote from punctuatedTranscript, isPositive, noteEn, noteTh.

Improvement points: each MUST quote an exact phrase from punctuatedTranscript and give a specific fix.

Grammar bands: ~30% A1–A2 issues; ~50% B1–B2; ~70% clean; ~90% ≥1 complex structure; 100% ≥3 complex structures.

Return ONLY valid JSON (no markdown). Use issueEn/issueTh for breakdown issues.${GEMINI_PRODUCTION_THAI_STYLE}`;
}

function buildUserPayload(
  titleEn: string,
  titleTh: string,
  promptEn: string,
  promptTh: string,
  imageUrl: string,
  keywordTags: string[],
  prepMinutes: number,
  transcript: string,
): string {
  return JSON.stringify(
    {
      task: "analyze_photo_speak_response",
      titleEn,
      titleTh,
      promptEn,
      promptTh,
      imageUrl,
      keywordTags,
      prepMinutes,
      transcript,
      requiredJsonShape: {
        punctuatedTranscript: "string",
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
        vocabularyBreakdown: [
          {
            excerpt: "string",
            issueEn: "string",
            issueTh: "string",
            suggestionEn: "string",
            suggestionTh: "string",
          },
        ],
        coherenceBreakdown: [
          {
            excerpt: "string",
            issueEn: "string",
            issueTh: "string",
            suggestionEn: "string",
            suggestionTh: "string",
          },
        ],
        taskBreakdown: [
          {
            excerpt: "string",
            issueEn: "string",
            issueTh: "string",
            suggestionEn: "string",
            suggestionTh: "string",
          },
        ],
        improvementPoints: [
          { en: "string", th: "string", category: "grammar|vocabulary|coherence|task|general" },
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
        transcriptHighlights: [
          {
            exactQuote: "string",
            isPositive: "boolean",
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

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export async function generatePhotoSpeakReportWithGemini(params: {
  apiKey: string;
  anthropicApiKey?: string;
  openAiApiKey?: string;
  model?: string;
  attemptId: string;
  itemId: string;
  titleEn: string;
  titleTh: string;
  promptEn: string;
  promptTh: string;
  imageUrl: string;
  taskKeywords: string[];
  prepMinutes: number;
  transcript: string;
  originHub?: "speak-about-photo" | "write-about-photo";
}): Promise<{ report: PhotoSpeakAttemptReport; usage: GradingLlmUsage | null }> {
  const {
    apiKey,
    attemptId,
    itemId,
    titleEn,
    titleTh,
    promptEn,
    promptTh,
    imageUrl,
    taskKeywords,
    prepMinutes,
    transcript,
    originHub,
  } = params;

  const modelName =
    params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const { text, usage } = await generateGradingJsonCompletion({
    model: modelName,
    keys: {
      geminiApiKey: apiKey,
      anthropicApiKey: params.anthropicApiKey,
      openAiApiKey: params.openAiApiKey,
    },
    systemInstruction: buildSystemInstruction(),
    userPayload: buildUserPayload(
      titleEn,
      titleTh,
      promptEn,
      promptTh,
      imageUrl,
      taskKeywords,
      prepMinutes,
      transcript,
    ),
    temperature: 0.35,
  });
  const raw = parseGeminiJsonObjectResponse(text);

  const g = clampPercent(raw.grammarScorePercent);
  const v = clampPercent(raw.vocabularyScorePercent);
  const c = clampPercent(raw.coherenceScorePercent);
  let t = clampPercent(raw.taskScorePercent);
  const boost = Boolean(raw.taskPersonalExperienceBoost);
  if (boost) {
    t = Math.min(100, t + 10);
  }
  const score160 = to160(g, v, c, t);

  const mapBreak = (arr: unknown) =>
    asArr(arr)
      .slice(0, 8)
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

  const grammar = criterion(
    "grammar",
    SPEAKING_RUBRIC_WEIGHTS.grammar,
    g,
    {
      en: String(raw.grammarSummaryEn ?? ""),
      th: String(raw.grammarSummaryTh ?? ""),
    },
    mapBreak(raw.grammarBreakdown),
  );

  const vocabulary = criterion(
    "vocabulary",
    SPEAKING_RUBRIC_WEIGHTS.vocabulary,
    v,
    {
      en: String(raw.vocabularySummaryEn ?? ""),
      th: String(raw.vocabularySummaryTh ?? ""),
    },
    mapBreak(raw.vocabularyBreakdown),
  );

  const coherence = criterion(
    "coherence",
    SPEAKING_RUBRIC_WEIGHTS.coherence,
    c,
    {
      en: String(raw.coherenceSummaryEn ?? ""),
      th: String(raw.coherenceSummaryTh ?? ""),
    },
    mapBreak(raw.coherenceBreakdown),
  );

  const taskRelevancy = criterion(
    "task",
    SPEAKING_RUBRIC_WEIGHTS.taskRelevancy,
    t,
    {
      en: String(raw.taskSummaryEn ?? ""),
      th: String(raw.taskSummaryTh ?? ""),
    },
    mapBreak(raw.taskBreakdown),
  );

  const normalized = transcript.replace(/\s+/g, " ").trim();
  const punctuatedRaw =
    typeof raw.punctuatedTranscript === "string" && raw.punctuatedTranscript.trim()
      ? raw.punctuatedTranscript.replace(/\s+/g, " ").trim()
      : normalized;
  const wc = punctuatedRaw.split(/\s+/).filter(Boolean).length;

  const vocabularyUpgradeSuggestions: SpeakingVocabularyUpgrade[] = asArr(raw.vocabularyUpgradeSuggestions)
    .slice(0, 8)
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      return {
        id: `ph-vu-${i}-${attemptId.slice(0, 6)}`,
        originalWord: String(o?.originalWord ?? "").trim(),
        upgradedWord: String(o?.upgradedWord ?? "").trim(),
        meaningTh: String(o?.meaningTh ?? "").trim(),
        exampleEn: String(o?.exampleEn ?? "").trim(),
        exampleTh: String(o?.exampleTh ?? "").trim(),
      };
    })
    .filter((x) => x.originalWord.length > 0 && x.upgradedWord.length > 0);

  const transcriptHighlights: SpeakingTranscriptHighlight[] = [];
  for (const item of asArr(raw.transcriptHighlights).slice(0, 18)) {
    const o = item as Record<string, unknown>;
    const quote = String(o?.exactQuote ?? "").trim();
    const span = findTextSpan(punctuatedRaw, quote);
    if (!span) continue;
    transcriptHighlights.push({
      id: `ph-th-${transcriptHighlights.length}-${attemptId.slice(0, 6)}`,
      start: span.start,
      end: span.end,
      isPositive: Boolean(o?.isPositive),
      noteEn: String(o?.noteEn ?? "").trim(),
      noteTh: String(o?.noteTh ?? "").trim(),
    });
  }

  const improvementPoints: ImprovementPoint[] = asArr(raw.improvementPoints)
    .slice(0, 8)
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
        id: `ph-imp-${i}-${attemptId.slice(0, 8)}`,
        en: String(o?.en ?? ""),
        th: String(o?.th ?? ""),
        category,
      };
    });

  const report: PhotoSpeakAttemptReport = {
    kind: "photo-speak",
    imageUrl,
    taskKeywords,
    ...(originHub ? { originHub } : {}),
    gradingSource: "gemini",
    attemptId,
    topicId: itemId,
    questionId: itemId,
    topicTitleEn: titleEn,
    topicTitleTh: titleTh,
    questionPromptEn: promptEn,
    questionPromptTh: promptTh,
    prepMinutes,
    transcript: normalized,
    punctuatedTranscript: punctuatedRaw,
    wordCount: wc,
    submittedAt: new Date().toISOString(),
    score160,
    grammar,
    vocabulary,
    coherence,
    taskRelevancy,
    taskPersonalExperienceBoostApplied: boost,
    ...(vocabularyUpgradeSuggestions.length > 0 ? { vocabularyUpgradeSuggestions } : {}),
    ...(transcriptHighlights.length > 0 ? { transcriptHighlights } : {}),
    improvementPoints:
      improvementPoints.length >= 2
        ? improvementPoints
        : [
            ...improvementPoints,
            {
              id: "ph-fallback",
              category: "general",
              en: "Name one detail from the photo prompt and one keyword (e.g. city, people) in your next take.",
              th: "รอบหน้าพูดถึงรายละเอียดจากคำถามและคีย์เวิร์ดหนึ่งคำ",
            },
          ],
  };
  return { report, usage };
}
