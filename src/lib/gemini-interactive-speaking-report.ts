import { GoogleGenerativeAI } from "@google/generative-ai";
import { INTERACTIVE_SPEAKING_TURN_COUNT } from "@/lib/interactive-speaking-constants";
import { findTextSpan } from "@/lib/find-text-span";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import { GEMINI_PRODUCTION_THAI_STYLE } from "@/lib/gemini-production-thai-style";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import type {
  InteractiveSpeakingAttemptReport,
  InteractiveSpeakingKeyLearningQuote,
  InteractiveSpeakingRecapRow,
  InteractiveSpeakingTurnRecord,
} from "@/types/interactive-speaking";
import type { ImprovementPoint, WritingCriterionReport } from "@/types/writing";
import type { SpeakingTranscriptHighlight, SpeakingVocabularyUpgrade } from "@/types/speaking";

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
  const n = INTERACTIVE_SPEAKING_TURN_COUNT;
  return `You are an expert English examiner for Thai learners (DET-style "interactive speaking" — ${n} short turns).
The learner completed ${n} interview turns (one opening question plus AI follow-ups). Raw transcripts are from speech recognition and may lack punctuation.

WORKFLOW (mandatory):
1) For EACH turn, produce punctuatedAnswer: add capitals, full stops, commas, question marks. Do not invent ideas—only punctuate and lightly normalize.
2) Score ONLY using the ${n} punctuated answers together (coherence across the interview matters).

3) conversationRecap: exactly ${n} objects (turnIndex 1..${n}). Each has highlights on THAT turn's punctuatedAnswer only — exactQuote must be a substring of that punctuatedAnswer. Mark strengths (isPositive true) and weaknesses (false).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) * 1.6, each subscore 0-100.

Task relevancy: how well they engaged with each question and stayed on topic across the scenario.

vocabularyUpgradeSuggestions: up to 10 — originalWord, upgradedWord (B2/C1), meaningTh, exampleEn, exampleTh.

keyLearningQuotes: up to 10 objects. This replaces generic tips — each item MUST:
- turnIndex: 1..${n} (which turn the quote comes from)
- exactQuoteFromSpeech: copy-paste VERBATIM from that turn's rawTranscript in the input (same spelling/casing; a short phrase or full sentence the learner actually said)
- improvementEn / improvementTh: how to score higher on **speaking** — short, natural, conversational (NOT essay-style or overly formal). Focus on clarity, rhythm, fillers, word choice, simple grammar fixes that matter in speech.
- Across the WHOLE array, include optional idiom fields on exactly 1–3 items (not on every item): suggestedIdiomEn (common American idiomatic expression), suggestedIdiomMeaningTh, suggestedIdiomExampleEn (short natural spoken example). Other items omit these fields.

Return ONLY valid JSON (no markdown). Use issueEn/issueTh for breakdown issues.${GEMINI_PRODUCTION_THAI_STYLE}`;
}

type TurnInput = {
  turnIndex: number;
  questionEn: string;
  questionTh: string;
  transcript: string;
};

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export async function generateInteractiveSpeakingReportWithGemini(params: {
  apiKey: string;
  model?: string;
  attemptId: string;
  scenarioId: string;
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  prepMinutes: number;
  turns: TurnInput[];
}): Promise<InteractiveSpeakingAttemptReport> {
  const { apiKey, attemptId, scenarioId, scenarioTitleEn, scenarioTitleTh, prepMinutes, turns } =
    params;

  if (turns.length !== INTERACTIVE_SPEAKING_TURN_COUNT) {
    throw new Error(`Expected exactly ${INTERACTIVE_SPEAKING_TURN_COUNT} turns.`);
  }

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

  const userPayload = JSON.stringify(
    {
      task: "interactive_speaking_multi_turn",
      scenarioTitleEn,
      scenarioTitleTh,
      turns: turns.map((t) => ({
        turnIndex: t.turnIndex,
        questionEn: t.questionEn,
        questionTh: t.questionTh,
        rawTranscript: t.transcript,
      })),
      requiredJsonShape: {
        punctuatedTurns: [
          {
            turnIndex: "number",
            punctuatedAnswer: "string",
            recapHighlights: [
              { exactQuote: "string", isPositive: "boolean", noteEn: "string", noteTh: "string" },
            ],
          },
        ],
        grammarScorePercent: "number",
        vocabularyScorePercent: "number",
        coherenceScorePercent: "number",
        taskScorePercent: "number",
        grammarSummaryEn: "string",
        grammarSummaryTh: "string",
        vocabularySummaryEn: "string",
        vocabularySummaryTh: "string",
        coherenceSummaryEn: "string",
        coherenceSummaryTh: "string",
        taskSummaryEn: "string",
        taskSummaryTh: "string",
        grammarBreakdown: [{}],
        vocabularyBreakdown: [{}],
        coherenceBreakdown: [{}],
        taskBreakdown: [{}],
        keyLearningQuotes: [
          {
            turnIndex: "number",
            exactQuoteFromSpeech: "string",
            improvementEn: "string",
            improvementTh: "string",
            suggestedIdiomEn: "string (optional)",
            suggestedIdiomMeaningTh: "string (optional)",
            suggestedIdiomExampleEn: "string (optional)",
          },
        ],
        vocabularyUpgradeSuggestions: [{}],
      },
    },
    null,
    2,
  );

  const result = await model.generateContent(userPayload);
  const text = result.response.text();
  const raw = parseGeminiJsonObjectResponse(text);

  const g = clampPercent(raw.grammarScorePercent);
  const v = clampPercent(raw.vocabularyScorePercent);
  const c = clampPercent(raw.coherenceScorePercent);
  const t = clampPercent(raw.taskScorePercent);
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
    { en: String(raw.grammarSummaryEn ?? ""), th: String(raw.grammarSummaryTh ?? "") },
    mapBreak(raw.grammarBreakdown),
  );
  const vocabulary = criterion(
    "vocabulary",
    SPEAKING_RUBRIC_WEIGHTS.vocabulary,
    v,
    { en: String(raw.vocabularySummaryEn ?? ""), th: String(raw.vocabularySummaryTh ?? "") },
    mapBreak(raw.vocabularyBreakdown),
  );
  const coherence = criterion(
    "coherence",
    SPEAKING_RUBRIC_WEIGHTS.coherence,
    c,
    { en: String(raw.coherenceSummaryEn ?? ""), th: String(raw.coherenceSummaryTh ?? "") },
    mapBreak(raw.coherenceBreakdown),
  );
  const taskRelevancy = criterion(
    "task",
    SPEAKING_RUBRIC_WEIGHTS.taskRelevancy,
    t,
    { en: String(raw.taskSummaryEn ?? ""), th: String(raw.taskSummaryTh ?? "") },
    mapBreak(raw.taskBreakdown),
  );

  const vocabularyUpgradeSuggestions: SpeakingVocabularyUpgrade[] = asArr(raw.vocabularyUpgradeSuggestions)
    .slice(0, 10)
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      return {
        id: `is-vu-${i}-${attemptId.slice(0, 6)}`,
        originalWord: String(o?.originalWord ?? "").trim(),
        upgradedWord: String(o?.upgradedWord ?? "").trim(),
        meaningTh: String(o?.meaningTh ?? "").trim(),
        exampleEn: String(o?.exampleEn ?? "").trim(),
        exampleTh: String(o?.exampleTh ?? "").trim(),
      };
    })
    .filter((x) => x.originalWord.length > 0 && x.upgradedWord.length > 0);

  const keyLearningQuotes: InteractiveSpeakingKeyLearningQuote[] = [];
  for (const item of asArr(raw.keyLearningQuotes).slice(0, 10)) {
    const o = item as Record<string, unknown>;
    const turnIndex =
      typeof o.turnIndex === "number"
        ? o.turnIndex
        : typeof o.turnIndex === "string"
          ? Number.parseInt(o.turnIndex, 10)
          : NaN;
    if (
      !Number.isInteger(turnIndex) ||
      turnIndex < 1 ||
      turnIndex > INTERACTIVE_SPEAKING_TURN_COUNT
    ) {
      continue;
    }
    const srcTurn = turns[turnIndex - 1];
    if (!srcTurn) continue;
    const quoteRaw = String(o.exactQuoteFromSpeech ?? "").trim();
    const impEn = String(o.improvementEn ?? "").trim();
    const impTh = String(o.improvementTh ?? "").trim();
    if (!quoteRaw || !impEn || !impTh) continue;
    const hay = srcTurn.transcript.replace(/\s+/g, " ").trim();
    if (!findTextSpan(hay, quoteRaw) && !findTextSpan(srcTurn.transcript, quoteRaw)) {
      continue;
    }
    const idiomEn = String(o.suggestedIdiomEn ?? "").trim();
    const idiomMeaning = String(o.suggestedIdiomMeaningTh ?? "").trim();
    const idiomEx = String(o.suggestedIdiomExampleEn ?? "").trim();
    keyLearningQuotes.push({
      id: `is-kl-${keyLearningQuotes.length}-${attemptId.slice(0, 8)}`,
      turnIndex,
      exactQuoteFromSpeech: quoteRaw,
      improvementEn: impEn,
      improvementTh: impTh,
      ...(idiomEn && idiomMeaning
        ? {
            suggestedIdiomEn: idiomEn,
            suggestedIdiomMeaningTh: idiomMeaning,
            ...(idiomEx ? { suggestedIdiomExampleEn: idiomEx } : {}),
          }
        : {}),
    });
  }

  let keyLearningOut: InteractiveSpeakingKeyLearningQuote[] = keyLearningQuotes;
  if (keyLearningOut.length === 0) {
    const t0 = turns[0]?.transcript?.trim() ?? "";
    const excerpt = t0.length > 0 ? (t0.length > 160 ? `${t0.slice(0, 157)}…` : t0) : "—";
    keyLearningOut = [
      {
        id: `is-kl-fallback-${attemptId.slice(0, 8)}`,
        turnIndex: 1,
        exactQuoteFromSpeech: excerpt,
        improvementEn:
          "Keep answers structured: point → one short example → brief wrap-up. That sounds fluent in live speaking.",
        improvementTh:
          "ลองตอบแบบ ประเด็น → ตัวอย่างสั้นๆ → ปิดท้ายหนึ่งประโยค จะฟังเป็นธรรมชาติในการสอบพูด",
      },
    ];
  }

  let improvementPoints: ImprovementPoint[] = keyLearningOut.map((k) => ({
    id: k.id,
    category: "general",
    en: k.improvementEn,
    th: k.improvementTh,
  }));
  if (improvementPoints.length < 2) {
    improvementPoints = [
      ...improvementPoints,
      {
        id: "is-fallback-2",
        category: "general",
        en: "Vary sentence openings (e.g. Honestly…, Actually…) so you sound less repetitive under pressure.",
        th: "ลองเปลี่ยนต้นประโยคบ้าง (เช่น Honestly…, Actually…) จะไม่ซ้ำเวลาตื่นเวที",
      },
    ];
  }

  const punctuatedTurnsRaw = asArr(raw.punctuatedTurns);
  const turnRecords: InteractiveSpeakingTurnRecord[] = [];
  const conversationRecap: InteractiveSpeakingRecapRow[] = [];

  for (let i = 0; i < INTERACTIVE_SPEAKING_TURN_COUNT; i++) {
    const src = turns[i];
    const pt = punctuatedTurnsRaw[i] as Record<string, unknown> | undefined;
    const punctuatedAnswer =
      pt && typeof pt.punctuatedAnswer === "string" && pt.punctuatedAnswer.trim()
        ? pt.punctuatedAnswer.replace(/\s+/g, " ").trim()
        : src.transcript.replace(/\s+/g, " ").trim();

    turnRecords.push({
      turnIndex: src.turnIndex,
      questionEn: src.questionEn,
      questionTh: src.questionTh,
      transcript: src.transcript,
      punctuatedTranscript: punctuatedAnswer,
    });

    const rowHighlights: SpeakingTranscriptHighlight[] = [];
    for (const item of asArr(pt?.recapHighlights).slice(0, 12)) {
      const o = item as Record<string, unknown>;
      const quote = String(o?.exactQuote ?? "").trim();
      const span = findTextSpan(punctuatedAnswer, quote);
      if (!span) continue;
      rowHighlights.push({
        id: `is-rh-${i}-${rowHighlights.length}-${attemptId.slice(0, 6)}`,
        start: span.start,
        end: span.end,
        isPositive: Boolean(o?.isPositive),
        noteEn: String(o?.noteEn ?? "").trim(),
        noteTh: String(o?.noteTh ?? "").trim(),
      });
    }

    conversationRecap.push({
      turnIndex: src.turnIndex,
      questionEn: src.questionEn,
      questionTh: src.questionTh,
      answerPunctuated: punctuatedAnswer,
      highlights: rowHighlights,
    });
  }

  const combinedRaw = turns.map((t) => t.transcript).join("\n\n");
  const normalized = combinedRaw.replace(/\s+/g, " ").trim();
  const combinedPunctuated = turnRecords.map((r) => r.punctuatedTranscript ?? r.transcript).join("\n\n");
  const wc = combinedPunctuated.split(/\s+/).filter(Boolean).length;

  return {
    kind: "interactive-speaking",
    scenarioId,
    scenarioTitleEn,
    scenarioTitleTh,
    turns: turnRecords,
    conversationRecap,
    gradingSource: "gemini",
    attemptId,
    topicId: scenarioId,
    questionId: scenarioId,
    topicTitleEn: scenarioTitleEn,
    topicTitleTh: scenarioTitleTh,
    questionPromptEn: `Interactive speaking — ${scenarioTitleEn}`,
    questionPromptTh: `การพูดโต้ตอบ — ${scenarioTitleTh}`,
    prepMinutes,
    transcript: normalized,
    punctuatedTranscript: combinedPunctuated.replace(/\s+/g, " ").trim(),
    wordCount: wc,
    submittedAt: new Date().toISOString(),
    score160,
    grammar,
    vocabulary,
    coherence,
    taskRelevancy,
    improvementPoints,
    keyLearningQuotes: keyLearningOut,
    ...(vocabularyUpgradeSuggestions.length > 0 ? { vocabularyUpgradeSuggestions } : {}),
  };
}
