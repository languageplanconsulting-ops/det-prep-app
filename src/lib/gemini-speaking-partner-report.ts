import { SPEAKING_PARTNER_TURN_COUNT } from "@/lib/speaking-partner-constants";
import { findTextSpan } from "@/lib/find-text-span";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import { generateGradingJsonCompletion } from "@/lib/grading-llm-generate";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import { GEMINI_PRODUCTION_THAI_STYLE } from "@/lib/gemini-production-thai-style";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import type {
  InteractiveSpeakingRecapRow,
  InteractiveSpeakingTurnRecord,
} from "@/types/interactive-speaking";
import type {
  SpeakingPartnerAttemptReport,
  SpeakingPartnerGrammarFinding,
  SpeakingPartnerTransitionFinding,
  SpeakingPartnerVocabularyFinding,
} from "@/types/speaking-partner";
import type { ImprovementPoint, WritingCriterionReport } from "@/types/writing";
import type { SpeakingTranscriptHighlight } from "@/types/speaking";

const GRAMMAR_MAX_ITEMS = 20;
const VOCAB_MAX_ITEMS = 20;
const TRANSITION_MAX_ITEMS = 20;

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
    topicEn?: string;
    topicTh?: string;
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
      ...(b.topicEn?.trim() || b.topicTh?.trim()
        ? { topicEn: b.topicEn?.trim(), topicTh: b.topicTh?.trim() }
        : {}),
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
  const n = SPEAKING_PARTNER_TURN_COUNT;
  return `You are a warm, encouraging English conversation coach for Thai learners. The learner just had a free-topic spoken conversation (${n} turns: their own opening topic + ${n - 1} natural AI follow-ups) — this is NOT an exam, it's general fluency practice. Raw transcripts are from speech recognition and may lack punctuation.

WORKFLOW (mandatory):
1) For EACH turn, produce punctuatedAnswer: add capitals, full stops, commas, question marks. Do not invent ideas — only punctuate and lightly normalize.
2) Score ONLY using the ${n} punctuated answers together (coherence across the whole conversation matters).

3) conversationRecap: exactly ${n} objects (turnIndex 1..${n}). Each has highlights on THAT turn's punctuatedAnswer only — exactQuote must be a substring of that punctuatedAnswer. Mark strengths (isPositive true) and weaknesses (false).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) * 1.6, each subscore 0-100.

PUNCTUATION POLICY (mandatory): transcripts are from speech recognition — the learner SPOKE, not typed. Completely disregard punctuation, capitalization, sentence boundaries, and spelling when scoring — the transcript's exact spelling/casing was chosen by the speech-recognition engine, not the learner. Never raise or lower ANY subscore because of them, and never list a punctuation, capitalization, or spelling issue as a finding.

Task relevancy here means: did the learner engage naturally with their OWN chosen topic and elaborate on it (there is no external scenario to be "relevant" to — they picked the topic).

DETAILED FINDINGS (the main output of this report — be thorough, not just top offenders):
- grammarFindings: up to ${GRAMMAR_MAX_ITEMS} objects, one per distinct grammar mistake found across all turns. Each MUST have:
  - topicEn / topicTh: short name of the grammar rule (e.g. "Subject-verb agreement" / "การใช้ประธานกับกริยาให้ตรงกัน")
  - turnIndex: which turn (1..${n}) this came from
  - originalExcerpt: a VERBATIM substring of that turn's punctuatedAnswer containing the mistake
  - correctedExcerpt: the same excerpt, corrected
  - explanationTh: why, in simple Thai
  Do not repeat the exact same mistake many times if it's truly identical — but DO list each distinct occurrence if the error differs in content each time.
- vocabularyFindings: up to ${VOCAB_MAX_ITEMS} objects — word choices that could be upgraded to more natural/precise words. Each MUST have: turnIndex, topicEn/topicTh (e.g. "informal word choice", "repetition", "vague word"), originalWord, upgradedWord (a natural B1/B2 upgrade — not overly formal), meaningTh, exampleEn, exampleTh.
- transitionFindings: up to ${TRANSITION_MAX_ITEMS} objects — places where a transition/linking word would make the speech flow better. Each MUST have: turnIndex, topicEn/topicTh (e.g. "missing contrast connector", "no sequencing word"), locationExcerpt (a VERBATIM substring of that turn's punctuatedAnswer showing where the transition could go — the two adjacent ideas), suggestedTransitionEn (e.g. "however", "in addition", "as a result", "for example"), explanationTh (why this would help, in simple Thai).

All excerpt/locationExcerpt fields MUST be exact substrings of the relevant turn's punctuatedAnswer — never paraphrase or invent text that wasn't said.

Return ONLY valid JSON (no markdown).${GEMINI_PRODUCTION_THAI_STYLE}`;
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

export async function generateSpeakingPartnerReportWithGemini(params: {
  apiKey: string;
  anthropicApiKey?: string;
  openAiApiKey?: string;
  model?: string;
  attemptId: string;
  topicSeedEn: string;
  prepMinutes: number;
  turns: TurnInput[];
}): Promise<{ report: SpeakingPartnerAttemptReport; usage: GradingLlmUsage | null }> {
  const { apiKey, attemptId, topicSeedEn, prepMinutes, turns } = params;

  if (turns.length !== SPEAKING_PARTNER_TURN_COUNT) {
    throw new Error(`Expected exactly ${SPEAKING_PARTNER_TURN_COUNT} turns.`);
  }

  const modelName = params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const userPayload = JSON.stringify(
    {
      task: "speaking_partner_free_topic_conversation",
      topicSeedEn,
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
        grammarFindings: [{}],
        vocabularyFindings: [{}],
        transitionFindings: [{}],
      },
    },
    null,
    2,
  );

  const { text, usage } = await generateGradingJsonCompletion({
    model: modelName,
    keys: {
      geminiApiKey: apiKey,
      anthropicApiKey: params.anthropicApiKey,
      openAiApiKey: params.openAiApiKey,
    },
    systemInstruction: buildSystemInstruction(),
    userPayload,
    temperature: 0.35,
  });
  const raw = parseGeminiJsonObjectResponse(text);

  const g = clampPercent(raw.grammarScorePercent);
  const v = clampPercent(raw.vocabularyScorePercent);
  const c = clampPercent(raw.coherenceScorePercent);
  const t = clampPercent(raw.taskScorePercent);
  const score160 = to160(g, v, c, t);

  const punctuatedTurnsRaw = asArr(raw.punctuatedTurns);
  const turnRecords: InteractiveSpeakingTurnRecord[] = [];
  const conversationRecap: InteractiveSpeakingRecapRow[] = [];

  for (let i = 0; i < SPEAKING_PARTNER_TURN_COUNT; i++) {
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
        id: `sp-rh-${i}-${rowHighlights.length}-${attemptId.slice(0, 6)}`,
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

  function punctuatedFor(turnIndex: number): string {
    return turnRecords[turnIndex - 1]?.punctuatedTranscript ?? "";
  }

  const grammarFindings: SpeakingPartnerGrammarFinding[] = [];
  for (const item of asArr(raw.grammarFindings).slice(0, GRAMMAR_MAX_ITEMS)) {
    const o = item as Record<string, unknown>;
    const turnIndex = Number(o.turnIndex);
    if (!Number.isInteger(turnIndex) || turnIndex < 1 || turnIndex > SPEAKING_PARTNER_TURN_COUNT) continue;
    const originalExcerpt = String(o.originalExcerpt ?? "").trim();
    const correctedExcerpt = String(o.correctedExcerpt ?? "").trim();
    const explanationTh = String(o.explanationTh ?? "").trim();
    if (!originalExcerpt || !correctedExcerpt || !explanationTh) continue;
    if (!findTextSpan(punctuatedFor(turnIndex), originalExcerpt)) continue;
    grammarFindings.push({
      id: `sp-gf-${grammarFindings.length}-${attemptId.slice(0, 8)}`,
      turnIndex,
      topicEn: String(o.topicEn ?? "").trim() || "Grammar",
      topicTh: String(o.topicTh ?? "").trim() || "ไวยากรณ์",
      originalExcerpt,
      correctedExcerpt,
      explanationTh,
    });
  }

  const vocabularyFindings: SpeakingPartnerVocabularyFinding[] = [];
  for (const item of asArr(raw.vocabularyFindings).slice(0, VOCAB_MAX_ITEMS)) {
    const o = item as Record<string, unknown>;
    const turnIndex = Number(o.turnIndex);
    if (!Number.isInteger(turnIndex) || turnIndex < 1 || turnIndex > SPEAKING_PARTNER_TURN_COUNT) continue;
    const originalWord = String(o.originalWord ?? "").trim();
    const upgradedWord = String(o.upgradedWord ?? "").trim();
    const meaningTh = String(o.meaningTh ?? "").trim();
    if (!originalWord || !upgradedWord || !meaningTh) continue;
    vocabularyFindings.push({
      id: `sp-vf-${vocabularyFindings.length}-${attemptId.slice(0, 8)}`,
      turnIndex,
      topicEn: String(o.topicEn ?? "").trim() || undefined,
      topicTh: String(o.topicTh ?? "").trim() || undefined,
      originalWord,
      upgradedWord,
      meaningTh,
      exampleEn: String(o.exampleEn ?? "").trim() || undefined,
      exampleTh: String(o.exampleTh ?? "").trim() || undefined,
    });
  }

  const transitionFindings: SpeakingPartnerTransitionFinding[] = [];
  for (const item of asArr(raw.transitionFindings).slice(0, TRANSITION_MAX_ITEMS)) {
    const o = item as Record<string, unknown>;
    const turnIndex = Number(o.turnIndex);
    if (!Number.isInteger(turnIndex) || turnIndex < 1 || turnIndex > SPEAKING_PARTNER_TURN_COUNT) continue;
    const locationExcerpt = String(o.locationExcerpt ?? "").trim();
    const suggestedTransitionEn = String(o.suggestedTransitionEn ?? "").trim();
    const explanationTh = String(o.explanationTh ?? "").trim();
    if (!locationExcerpt || !suggestedTransitionEn || !explanationTh) continue;
    if (!findTextSpan(punctuatedFor(turnIndex), locationExcerpt)) continue;
    transitionFindings.push({
      id: `sp-tf-${transitionFindings.length}-${attemptId.slice(0, 8)}`,
      turnIndex,
      topicEn: String(o.topicEn ?? "").trim() || "Transition",
      topicTh: String(o.topicTh ?? "").trim() || "คำเชื่อมประโยค",
      locationExcerpt,
      suggestedTransitionEn,
      explanationTh,
    });
  }

  const grammar = criterion(
    "grammar",
    SPEAKING_RUBRIC_WEIGHTS.grammar,
    g,
    { en: String(raw.grammarSummaryEn ?? ""), th: String(raw.grammarSummaryTh ?? "") },
    grammarFindings.slice(0, 8).map((f) => ({
      en: `"${f.originalExcerpt}" → "${f.correctedExcerpt}"`,
      th: f.explanationTh,
      excerpt: f.originalExcerpt,
      suggestionEn: f.correctedExcerpt,
      topicEn: f.topicEn,
      topicTh: f.topicTh,
    })),
  );
  const vocabulary = criterion(
    "vocabulary",
    SPEAKING_RUBRIC_WEIGHTS.vocabulary,
    v,
    { en: String(raw.vocabularySummaryEn ?? ""), th: String(raw.vocabularySummaryTh ?? "") },
    vocabularyFindings.slice(0, 8).map((f) => ({
      en: `"${f.originalWord}" → "${f.upgradedWord}"`,
      th: f.meaningTh,
      suggestionEn: f.upgradedWord,
      topicEn: f.topicEn,
      topicTh: f.topicTh,
    })),
  );
  const coherence = criterion(
    "coherence",
    SPEAKING_RUBRIC_WEIGHTS.coherence,
    c,
    { en: String(raw.coherenceSummaryEn ?? ""), th: String(raw.coherenceSummaryTh ?? "") },
    transitionFindings.slice(0, 8).map((f) => ({
      en: `Consider adding "${f.suggestedTransitionEn}" here.`,
      th: f.explanationTh,
      excerpt: f.locationExcerpt,
      suggestionEn: f.suggestedTransitionEn,
      topicEn: f.topicEn,
      topicTh: f.topicTh,
    })),
  );
  const taskRelevancy = criterion(
    "task",
    SPEAKING_RUBRIC_WEIGHTS.taskRelevancy,
    t,
    { en: String(raw.taskSummaryEn ?? ""), th: String(raw.taskSummaryTh ?? "") },
    [],
  );

  let improvementPoints: ImprovementPoint[] = grammarFindings.slice(0, 5).map((f) => ({
    id: f.id,
    category: "general",
    en: `${f.topicEn}: "${f.originalExcerpt}" → "${f.correctedExcerpt}"`,
    th: f.explanationTh,
  }));
  if (improvementPoints.length < 2) {
    improvementPoints = [
      ...improvementPoints,
      {
        id: "sp-fallback",
        category: "general",
        en: "Try linking your ideas with words like however, also, or so — it makes speech sound more connected.",
        th: "ลองใช้คำเชื่อมอย่าง however, also หรือ so จะทำให้พูดต่อเนื่องขึ้น",
      },
    ];
  }

  const combinedRaw = turns.map((t) => t.transcript).join("\n\n");
  const normalized = combinedRaw.replace(/\s+/g, " ").trim();
  const combinedPunctuated = turnRecords.map((r) => r.punctuatedTranscript ?? r.transcript).join("\n\n");
  const wc = combinedPunctuated.split(/\s+/).filter(Boolean).length;

  const report: SpeakingPartnerAttemptReport = {
    kind: "speaking-partner",
    topicSeedEn,
    turns: turnRecords,
    conversationRecap,
    gradingSource: "gemini",
    attemptId,
    topicId: "speaking-partner",
    questionId: attemptId,
    topicTitleEn: "My Speaking Partner",
    topicTitleTh: "คุยฝึกพูดกับ AI",
    questionPromptEn: `Free-topic conversation — ${topicSeedEn}`,
    questionPromptTh: `บทสนทนาอิสระ — ${topicSeedEn}`,
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
    grammarFindings,
    vocabularyFindings,
    transitionFindings,
  };
  return { report, usage };
}
