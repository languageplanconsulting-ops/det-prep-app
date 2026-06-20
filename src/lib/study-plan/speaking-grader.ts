// Speaking grader for the diagnostic.
// Flow: RAW transcript (browser Web Speech + Deepgram — NOT Gemini, which auto-corrects
// the student's grammar) → Gemini-lite extracts SIGNALS → our pure scoreSpeaking() decides
// the band. Gemini only punctuates internally for readability; it must NOT fix grammar.

import { generateGradingJsonCompletion, type GradingLlmKeys } from "@/lib/grading-llm-generate";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import { B1_COLLOCATIONS, B2_COLLOCATIONS } from "@/lib/study-plan/collocations";
import { scoreSpeaking, type SkillResult, type SpeakingAssessment } from "@/lib/study-plan/diagnostic.ts";

export const SPEAKING_PROMPT_EN = "Describe your favorite travel experience.";

export function buildSpeakingSystemInstruction(): string {
  return [
    "You analyze a spoken English answer from a Thai learner taking a placement test.",
    "You are given the RAW machine transcript of what they actually said. Add punctuation",
    "internally so you can read it, but DO NOT correct, rephrase, or fix their grammar — you",
    "must detect the mistakes they truly made, not an idealized version.",
    "",
    "Return ONLY a JSON object with exactly these keys:",
    '  "wordCount": integer — number of English words spoken',
    '  "presentTenseError": boolean — any present-tense / subject-verb agreement mistake',
    '  "pastTenseError": boolean — any past-tense mistake (e.g. wrong/missing -ed, wrong irregular)',
    '  "articleError": boolean — any a / an / the mistake (wrong or missing)',
    '  "basicVocabError": boolean — a common (A2/B1) word used incorrectly',
    '  "usesB2Vocab": boolean — uses clearly upper-intermediate vocabulary',
    '  "b1CollocationCount": integer — count of DISTINCT B1 collocations used correctly',
    '  "b2CollocationCount": integer — count of DISTINCT B2 collocations used correctly',
    "",
    "Count a collocation only if it appears (allowing normal inflection/tense). Recognized lists:",
    `B1: ${B1_COLLOCATIONS.join("; ")}`,
    `B2: ${B2_COLLOCATIONS.join("; ")}`,
    "Do not invent collocations outside these lists. No prose, no markdown — JSON only.",
  ].join("\n");
}

function bool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}
function int(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export function parseSpeakingAssessment(obj: Record<string, unknown>): SpeakingAssessment {
  return {
    wordCount: int(obj.wordCount),
    presentTenseError: bool(obj.presentTenseError),
    pastTenseError: bool(obj.pastTenseError),
    articleError: bool(obj.articleError),
    basicVocabError: bool(obj.basicVocabError),
    usesB2Vocab: bool(obj.usesB2Vocab),
    b1CollocationCount: int(obj.b1CollocationCount),
    b2CollocationCount: int(obj.b2CollocationCount),
  };
}

export async function gradeSpeakingForDiagnostic(opts: {
  transcript: string;
  model: string;
  keys: GradingLlmKeys;
}): Promise<{ assessment: SpeakingAssessment; result: SkillResult }> {
  const { text } = await generateGradingJsonCompletion({
    model: opts.model,
    keys: opts.keys,
    systemInstruction: buildSpeakingSystemInstruction(),
    userPayload: `Prompt: ${SPEAKING_PROMPT_EN}\n\nRAW transcript:\n${opts.transcript}`,
    temperature: 0.1,
  });
  const assessment = parseSpeakingAssessment(parseGeminiJsonObjectResponse(text));
  return { assessment, result: scoreSpeaking(assessment) };
}
