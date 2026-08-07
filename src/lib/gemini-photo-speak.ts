import { findTextSpan } from "@/lib/find-text-span";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import { generateGradingJsonObject } from "@/lib/grading-llm-generate";
import type { CriterionToPerfect, ImprovementPoint, WritingCriterionReport } from "@/types/writing";
import {
  COHERENCE_RUBRIC_PROMPT,
  TO_PERFECT_JSON_SHAPE,
  mapCriterionToPerfect,
  taskRubricPrompt,
  toPerfectRulePrompt,
} from "@/lib/speaking-rubric-prompt";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import type { SpeakingTranscriptHighlight, SpeakingVocabularyUpgrade } from "@/types/speaking";
import { GEMINI_PRODUCTION_THAI_STYLE } from "@/lib/gemini-production-thai-style";
import {
  coherenceTransitionPenaltyPercent,
  detectGrammarStructureIssues,
  detectGrammarPunctuationIssues,
  detectTransitionMisuseIssues,
  grammarStructurePenaltyPercent,
  grammarPunctuationPenaltyPercent,
} from "@/lib/production-writing-penalties";
import { SPEAKING_RUBRIC_WEIGHTS } from "@/lib/speaking-report";
import {
  parseScoreRungLadder,
  scoreRungJsonShape,
  scoreRungRulePrompt,
} from "@/lib/score-rung-prompt";

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
  toPerfect?: CriterionToPerfect,
): WritingCriterionReport {
  return {
    id,
    weight,
    scorePercent,
    pointsOn160: pointsOn160(scorePercent, weight),
    summary,
    ...(scorePercent < 100 && toPerfect ? { toPerfect } : {}),
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

function buildSystemInstruction(
  originHub?: "speak-about-photo" | "write-about-photo",
  targetVocabulary?: string[],
  /** Word budget for the score rungs; 0 disables them. */
  learnerWordCount = 0,
): string {
  // Rungs are a WRITING feature: they rewrite text the learner typed. A
  // speak-about-photo answer was spoken, so handing back a polished paragraph
  // to "say next time" teaches the wrong thing.
  const rungRules =
    originHub === "write-about-photo"
      ? scoreRungRulePrompt({
          learnerWordCount,
          weights: SPEAKING_RUBRIC_WEIGHTS,
          textLabel: "answer",
        })
      : "";
  const writingPenaltyRules =
    originHub === "write-about-photo"
      ? `

Hard scoring rules for write-about-photo (mandatory):
- If the learner misuses a transition / linker, subtract 35 points from coherenceScorePercent.
- For punctuation mistakes in grammar, subtract 10 points each, capped at 25 total.
- If the learner uses no passive voice anywhere in the answer, subtract 10 points from grammarScorePercent.
- If the learner uses no complex sentence signal anywhere in the answer (for example: subordinating conjunction, relative clause such as which/who/where, an -ing opener, or a comma-based sentence pattern), subtract 10 points from grammarScorePercent.
- When either penalty applies, mention it clearly in the relevant breakdown.`
      : "";

  const speechPunctuationRules =
    originHub === "speak-about-photo"
      ? `

CRITICAL — speak-about-photo input handling:
- The raw transcript came from SPEECH recognition. The learner spoke aloud; they did NOT type. Speech recognition output has NO punctuation, NO capitalization, NO sentence boundaries, and its spelling/casing choices are the ASR engine's, not the learner's.
- This is EXPECTED behavior, not a learner mistake. You MUST add all punctuation yourself in step 1 below.
- DO NOT penalize the learner for any missing or wrong punctuation, capitalization, or spelling in the raw transcript. These issues should NEVER appear in grammarBreakdown for speak-about-photo. Grade as if the punctuatedTranscript YOU produced is what the learner intended.
- Capitalization, full stops, commas, question marks, spelling: 100% your responsibility, not the learner's. Zero penalty for any of these applies to speaking input.
- Spoken self-correction: if the learner hesitates, repeats, or restarts but then repairs to a CORRECT form, do NOT deduct for the hesitation or the repair itself — treat the corrected form as what they meant. Only deduct when the FINAL repaired form is still wrong.`
      : "";

  const targetVocabularyRules =
    targetVocabulary && targetVocabulary.length > 0
      ? `

TARGET VOCABULARY LIST (a narrow EXCEPTION to normal vocabulary grading, not a replacement for it): the learner was shown this exact word list before answering: ${targetVocabulary.join(", ")}.
- If the learner already used a word from this list correctly (any inflection, e.g. "crowded"/"crowds"), that ONE word is already the target-level choice — do NOT flag it in vocabularyBreakdown or vocabularyUpgradeSuggestions, and do NOT propose a further "better" synonym for that specific word. Treat it as correct, full credit.
- This exception covers ONLY words that are literally on the list above. It does NOT limit or soften feedback anywhere else. For every other word or phrase in the answer — plain/everyday words, weak collocations, wrong word choice, or even good advanced vocabulary that just isn't on this particular list — grade and suggest improvements exactly as you normally would, with the same thoroughness as if no list existed. Do not hold back a genuine vocabularyBreakdown item or vocabularyUpgradeSuggestion just because a target list is in play.
- When a spot in the answer clearly calls for one of the list's words and the learner used something weaker there, prefer suggesting the matching list word. Everywhere else, suggest whatever genuinely improves the answer — you are not limited to this list.
- Do not penalize vocabularyScorePercent for failing to use every word on the list — one or two used naturally and correctly is enough for full credit on that specific front; score the rest of the vocabulary normally.`
      : "";

  return `You are an expert English examiner for Thai learners (DET-style "speak about a photo").
The learner saw an image (URL provided for context only — you cannot see pixels; rely on prompt + keyword tags + transcript). The raw transcript is from speech recognition and may lack punctuation.${speechPunctuationRules}

WORKFLOW (mandatory):
1) Produce punctuatedTranscript: add capitals, full stops, commas, and question marks. Do not invent new ideas—only punctuate and lightly normalize spacing.
2) Score ONLY using punctuatedTranscript (all excerpts must be exact substrings of punctuatedTranscript).

Score four criteria with weights: grammar 30%, vocabulary 25%, coherence 25%, task relevancy 20%.
Total 0-160 = (0.3*G + 0.25*V + 0.25*C + 0.2*T) * 1.6, each subscore 0-100.

${COHERENCE_RUBRIC_PROMPT}

${toPerfectRulePrompt("punctuatedTranscript", true)}

For EACH criterion summary, include (A) brief assessment and (B) a line starting with "How to improve your [grammar/vocabulary/coherence/task] score:" plus a concrete action tied to THIS learner's wording.

Breakdowns (EVERY item MUST have): excerpt (exact quote), issueEn/issueTh (spoken-language focus — never punctuation/capitalization/spelling), suggestionEn/suggestionTh — MANDATORY on every single item, the FULL corrected version of the excerpt (a real rewritten sentence or phrase), never just abstract advice with no example shown. If you cannot write a concrete corrected version, do not include that breakdown item at all. For vocabulary, suggest better words or collocations when possible${targetVocabulary && targetVocabulary.length > 0 ? " — but see the TARGET VOCABULARY LIST rule below first: it overrides this for any word already on that list" : ""}. grammarBreakdown items ONLY: also include grammarTopicTh — a SHORT Thai name of the grammar rule/topic this fix is about, leading with "การใช้…" where natural (e.g. "การใช้ if I were", "Past simple", "Subject–verb agreement"). It must lead the fix so the learner knows which rule to revise. Keep it under ~6 words.

Priority for feedback:
- Prioritize grammar corrections first, then vocabulary upgrades.
- grammarBreakdown should contain up to 8 concrete fixes where possible.
- Keep grammar suggestions natural and score-focused, not overly formal.

${taskRubricPrompt("the answer addresses the photo prompt AND the keyword tags given for this photo")}

Task score boost: output taskScorePercent as BASE (0–100). Set taskPersonalExperienceBoost true for authentic personal OR hypothetical personal experience ("If I were…", "I would…", etc.). Server adds +10 to task (cap 100)—note in taskSummary.

vocabularyUpgradeSuggestions: up to 8 — originalWord, upgradedWord (B2/C1), meaningTh, exampleEn, exampleTh.${targetVocabulary && targetVocabulary.length > 0 ? " Skip any word the learner already picked from the TARGET VOCABULARY LIST — do not suggest replacing it." : ""}

transcriptHighlights: up to 18 — exactQuote from punctuatedTranscript, isPositive, noteEn, noteTh.

Improvement points: each MUST quote an exact phrase from punctuatedTranscript and give a specific fix.

Grammar bands: ~30% A1–A2 issues; ~50% B1–B2; ~70% clean; ~90% ≥1 complex structure; 100% ≥3 complex structures.

Return ONLY valid JSON (no markdown). Use issueEn/issueTh for breakdown issues.${writingPenaltyRules}${targetVocabularyRules}${rungRules}${GEMINI_PRODUCTION_THAI_STYLE}`;
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
  wantScoreRungs: boolean,
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
            grammarTopicTh: "string — short Thai grammar topic that leads the fix, e.g. การใช้ if I were",
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
        toPerfect: TO_PERFECT_JSON_SHAPE,
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
        ...(wantScoreRungs ? scoreRungJsonShape() : {}),
      },
    },
    null,
    2,
  );
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
  /** Words the learner was already shown (course hint panel) — see buildSystemInstruction's TARGET VOCABULARY LIST rule. */
  targetVocabulary?: string[];
  prepMinutes: number;
  transcript: string;
  originHub?: "speak-about-photo" | "write-about-photo";
  /** Wall-clock deadline for internal retries (Date.now() ms). */
  deadlineAt?: number;
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
    targetVocabulary,
    prepMinutes,
    transcript,
    originHub,
  } = params;

  const modelName =
    params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const { raw, usage } = await generateGradingJsonObject({
    model: modelName,
    keys: {
      geminiApiKey: apiKey,
      anthropicApiKey: params.anthropicApiKey,
      openAiApiKey: params.openAiApiKey,
    },
    systemInstruction: buildSystemInstruction(
      originHub,
      targetVocabulary,
      countWords(transcript),
    ),
    userPayload: buildUserPayload(
      titleEn,
      titleTh,
      promptEn,
      promptTh,
      imageUrl,
      taskKeywords,
      prepMinutes,
      transcript,
      originHub === "write-about-photo",
    ),
    temperature: 0.35,
    operation: "photo_speak_report",
    deadlineAt: params.deadlineAt,
  });

  const grammarPunctuationIssues =
    originHub === "write-about-photo" ? detectGrammarPunctuationIssues(transcript) : [];
  const grammarStructureIssues =
    originHub === "write-about-photo" ? detectGrammarStructureIssues(transcript) : [];
  const transitionIssues =
    originHub === "write-about-photo" ? detectTransitionMisuseIssues(transcript) : [];
  const g = Math.max(
    0,
    clampPercent(raw.grammarScorePercent) -
      (originHub === "write-about-photo"
        ? grammarPunctuationPenaltyPercent(transcript) + grammarStructurePenaltyPercent(transcript)
        : 0),
  );
  const v = clampPercent(raw.vocabularyScorePercent);
  const c = Math.max(
    0,
    clampPercent(raw.coherenceScorePercent) -
      (originHub === "write-about-photo" ? coherenceTransitionPenaltyPercent(transcript) : 0),
  );
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
        const topicEn = o?.grammarTopicEn != null ? String(o.grammarTopicEn).trim() : "";
        const topicTh = o?.grammarTopicTh != null ? String(o.grammarTopicTh).trim() : "";
        return {
          en: issueEn,
          th: issueTh,
          excerpt: o?.excerpt ? String(o.excerpt) : undefined,
          ...(sugEn || sugTh
            ? { suggestionEn: sugEn || undefined, suggestionTh: sugTh || undefined }
            : {}),
          ...(topicEn || topicTh ? { topicEn: topicEn || undefined, topicTh: topicTh || undefined } : {}),
        };
      });

  const grammarBreakdown = mapBreak(raw.grammarBreakdown);
  if (originHub === "write-about-photo" && grammarPunctuationIssues.length > 0) {
    grammarBreakdown.unshift({
      en: `Punctuation errors reduce grammar here (-10% each, max -25%). ${grammarPunctuationIssues[0]?.reasonEn ?? ""}`.trim(),
      th: `จุดวรรคตอนผิดทำให้คะแนน grammar ลดลง (-10% ต่อครั้ง สูงสุด -25%). ${grammarPunctuationIssues[0]?.reasonTh ?? ""}`.trim(),
      excerpt: grammarPunctuationIssues[0]?.excerpt,
    });
  }
  if (originHub === "write-about-photo" && grammarStructureIssues.length > 0) {
    for (const issue of [...grammarStructureIssues].reverse()) {
      grammarBreakdown.unshift({
        en: issue.reasonEn,
        th: issue.reasonTh,
        excerpt: issue.excerpt,
        suggestionEn: issue.suggestionEn,
        suggestionTh: issue.suggestionTh,
      });
    }
  }

  const coherenceBreakdown = mapBreak(raw.coherenceBreakdown);
  if (originHub === "write-about-photo" && transitionIssues.length > 0) {
    coherenceBreakdown.unshift({
      en: `Transition use is hurting coherence here (-35%). ${transitionIssues[0]?.reasonEn ?? ""}`.trim(),
      th: `การใช้คำเชื่อมจุดนี้ทำให้คะแนน coherence ลดลง (-35%). ${transitionIssues[0]?.reasonTh ?? ""}`.trim(),
      excerpt: transitionIssues[0]?.excerpt,
    });
  }

  const toPerfectRaw = (raw.toPerfect ?? {}) as Record<string, unknown>;

  const grammar = criterion(
    "grammar",
    SPEAKING_RUBRIC_WEIGHTS.grammar,
    g,
    {
      en: String(raw.grammarSummaryEn ?? ""),
      th: String(raw.grammarSummaryTh ?? ""),
    },
    grammarBreakdown,
    mapCriterionToPerfect("grammar", toPerfectRaw.grammar),
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
    mapCriterionToPerfect("vocabulary", toPerfectRaw.vocabulary),
  );

  const coherence = criterion(
    "coherence",
    SPEAKING_RUBRIC_WEIGHTS.coherence,
    c,
    {
      en: String(raw.coherenceSummaryEn ?? ""),
      th: String(raw.coherenceSummaryTh ?? ""),
    },
    coherenceBreakdown,
    mapCriterionToPerfect("coherence", toPerfectRaw.coherence),
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
    mapCriterionToPerfect("task", toPerfectRaw.task),
  );

  const normalized = transcript.replace(/\s+/g, " ").trim();
  const punctuatedRaw =
    typeof raw.punctuatedTranscript === "string" && raw.punctuatedTranscript.trim()
      ? raw.punctuatedTranscript.replace(/\s+/g, " ").trim()
      : normalized;
  const wc = countWords(punctuatedRaw);

  // Write-about-photo only — rungs rewrite typed text, not speech.
  const scoreRungs =
    originHub === "write-about-photo"
      ? parseScoreRungLadder(raw.scoreRungs, {
          attemptId,
          currentScore160: score160,
          learnerWordCount: wc,
        })
      : null;

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
    ...(scoreRungs ? { scoreRungs } : {}),
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
