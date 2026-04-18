import { findTextSpan } from "@/lib/find-text-span";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import { generateGradingJsonCompletion } from "@/lib/grading-llm-generate";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import type { ImprovementPoint, WritingCriterionReport } from "@/types/writing";
import type {
  SpeakingAttemptReport,
  SpeakingRoundNum,
  SpeakingTranscriptHighlight,
  SpeakingVocabularyUpgrade,
} from "@/types/speaking";
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
  return `You are an expert English examiner for Thai learners (spoken DET-style production task).
The learner read a prompt and spoke. You receive a raw ASR transcript (may lack punctuation).

WORKFLOW (mandatory):
1) Keep the transcript RAW. Do NOT add punctuation, capitalization, or sentence-boundary corrections.
2) Return punctuatedTranscript exactly equal to the raw transcript input (same wording/content).
3) Score ONLY using the raw transcript text (all excerpts and quotes must be exact substrings of the raw transcript).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) * 1.6, each subscore 0-100.

For EACH criterion summary (grammarSummaryEn/Th, etc.), include TWO parts:
(A) One-sentence assessment.
(B) A line starting with "How to improve your [grammar/vocabulary/coherence/task] score:" followed by a concrete action tied to THIS learner's wording (not generic advice).

Breakdown items (grammarBreakdown, vocabularyBreakdown, coherenceBreakdown, taskBreakdown):
- excerpt: exact short quote from the raw transcript (use quotation marks in JSON string only).
- issueEn / issueTh: what is wrong (bilingual).
- suggestionEn / suggestionTh: a concrete correction or better wording (bilingual)—for vocabulary, name 1–3 better words or collocations when possible.

Improvement points: up to 10. Each MUST quote an exact phrase from the raw transcript (e.g. "In your phrase '…', …") and give a specific fix—not generic tips.

Apply band targets when choosing percentages (same as before):

Grammar: ~30% A1–A2 issues; ~50% B1–B2 subord/tense; ~70% no clear mistakes; ~90% ≥1 complex structure correct; 100% ≥3 complex structures correct.

Vocabulary: C1/B2 used well vs mistakes vs thin range (see standard DET bands).

Coherence: transitions + referencing vs run-ons vs none.

Task relevancy: personal on-topic vs generalized vs off-topic.

IMPORTANT — task score boost:
- Output taskScorePercent as your BASE task score (0–100) before any personal bonus.
- Set taskPersonalExperienceBoost to true if the learner uses (a) authentic personal experience OR (b) hypothetical personal experience (e.g. "If I were…", "I would…", "Imagine I…", "In my experience…"). The grading system adds +10 to the task percentage (cap 100) when this is true—mention that bonus briefly in taskSummaryEn/Th.

Vocabulary upgrade suggestions (separate from criterion breakdown):
- vocabularyUpgradeSuggestions: up to 10 items. Each: originalWord (exact word/phrase as used in raw transcript), upgradedWord (B2/C1 alternative), meaningTh (Thai gloss), exampleEn, exampleTh (short example sentence using upgradedWord).

Transcript highlights (for interactive hover on punctuated text):
- transcriptHighlights: up to 18 items. Each: exactQuote (verbatim substring of raw transcript), isPositive (true=strength, false=weakness), noteEn, noteTh (short tooltip, one line each). Cover grammar, vocabulary, coherence, and task where useful. No overlapping quotes if possible.

Return ONLY valid JSON (no markdown). Use issueEn/issueTh (not "en"/"th") for breakdown issue lines.${GEMINI_PRODUCTION_THAI_STYLE}`;
}

function buildUserPayload(
  topicTitleEn: string,
  topicTitleTh: string,
  questionEn: string,
  questionTh: string,
  prepMinutes: number,
  transcript: string,
): string {
  return JSON.stringify(
    {
      task: "analyze_spoken_response",
      topicTitleEn,
      topicTitleTh,
      questionEn,
      questionTh,
      prepMinutes,
      transcript,
      requiredJsonShape: {
        punctuatedTranscript: "string — MUST be exactly the same as the raw transcript input (no punctuation rewrite)",
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
            excerpt: "string exact from raw transcript",
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
        taskPersonalExperienceBoost:
          "boolean — true if authentic personal OR hypothetical personal experience; server adds +10 to base task % (cap 100)",
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
            exactQuote: "string verbatim from raw transcript",
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

export async function generateSpeakingReportWithGemini(params: {
  apiKey: string;
  anthropicApiKey?: string;
  openAiApiKey?: string;
  model?: string;
  attemptId: string;
  topicId: string;
  topicTitleEn: string;
  topicTitleTh: string;
  questionId: string;
  questionPromptEn: string;
  questionPromptTh: string;
  prepMinutes: number;
  transcript: string;
  speakingRound?: SpeakingRoundNum;
}): Promise<{ report: SpeakingAttemptReport; usage: GradingLlmUsage | null }> {
  const {
    apiKey,
    attemptId,
    topicId,
    topicTitleEn,
    topicTitleTh,
    questionId,
    questionPromptEn,
    questionPromptTh,
    prepMinutes,
    transcript,
    speakingRound = 1,
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
      topicTitleEn,
      topicTitleTh,
      questionPromptEn,
      questionPromptTh,
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
    .slice(0, 10)
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      return {
        id: `sp-vu-${i}-${attemptId.slice(0, 6)}`,
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
      id: `sp-th-${transcriptHighlights.length}-${attemptId.slice(0, 6)}`,
      start: span.start,
      end: span.end,
      isPositive: Boolean(o?.isPositive),
      noteEn: String(o?.noteEn ?? "").trim(),
      noteTh: String(o?.noteTh ?? "").trim(),
    });
  }

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
        id: `sp-imp-${i}-${attemptId.slice(0, 8)}`,
        en: String(o?.en ?? ""),
        th: String(o?.th ?? ""),
        category,
      };
    });

  const report: SpeakingAttemptReport = {
    gradingSource: "gemini",
    attemptId,
    topicId,
    speakingRound,
    questionId,
    topicTitleEn,
    topicTitleTh,
    questionPromptEn,
    questionPromptTh,
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
              id: "sp-fallback",
              category: "general",
              en: "Practice one more take focusing on one personal example from the prompt.",
              th: "ลองอีกรอบ โฟกัสตัวอย่างส่วนตัวหนึ่งอย่างจากคำถาม",
            },
          ],
  };
  return { report, usage };
}
