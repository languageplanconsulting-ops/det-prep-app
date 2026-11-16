import { GoogleGenerativeAI } from "@google/generative-ai";
import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import type { WritingFollowUpPrompt, WritingTopic } from "@/types/writing";

/**
 * DET "Interactive Writing" (live on the real test since 2 April 2024, replacing Read, Then Write):
 * the learner writes for 5 minutes, and only AFTER submitting sees one follow-up question on the
 * same topic, which they answer in 3 more minutes. Observed real follow-up (freelance-artist prompt):
 * "Explore how being a freelance artist could influence the development of artistic skills. Do you
 * think this career option is beneficial for skill growth? Explain your thoughts."
 *
 * The real follow-up stays on the prompt's topic but opens a NEW angle the first answer did not have
 * to cover, so the learner extends rather than repeats.
 */
export const WRITING_FOLLOWUP_MODEL = "gemini-3.1-flash-lite";

const SYSTEM = `You write the follow-up question for the Duolingo English Test "Interactive Writing" task.

The learner has just written a 5-minute response to the main prompt. They now get ONE follow-up question and 3 minutes to answer it.

Rules:
- Stay on the SAME topic as the main prompt. Never switch topic.
- Open ONE new angle the main prompt did not ask for: an effect on a related area, the other side, a specific group of people, the future, a condition ("If…, would…?"), a challenge, or a concrete example. Prefer an angle the learner's response did NOT already cover.
- Keep it SHORT, like the real test: 18–30 words, never more than 32. One question (or one short setup sentence + one question), then optionally a 2–4 word closer such as "Explain your thoughts." or "Why or why not?".
- Plain, clear English at B1–B2 level. No numbering, no labels, no lists of examples.
- Do NOT judge or mention the learner's writing.

Real examples of the length and style to copy:
- "Explore how being a freelance artist could influence the development of artistic skills. Do you think this career option is beneficial for skill growth? Explain your thoughts."
- "Can you think of a situation where humor might not be appropriate or could be misunderstood? Explain your thoughts."
- "What potential challenges could arise from using the device you imagined? Discuss how you might address them."

Return ONLY valid JSON: {"promptEn":"...","promptTh":"..."}
promptTh = a natural Thai translation of the same follow-up (for display under the English).`;

/** Real follow-ups run ~19–33 words (DET practice test + published samples); longer ones get one retry. */
export const WRITING_FOLLOWUP_MAX_WORDS = 34;

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Used when the model is unavailable, so the task never blocks the learner. */
export function fallbackWritingFollowUp(topic: WritingTopic): WritingFollowUpPrompt {
  const authored = topic.followUps?.find((f) => f.promptEn.trim());
  if (authored) return authored;
  return {
    promptEn:
      "What is the strongest argument against your opinion on this topic, and how would you respond to it? Explain your thoughts.",
    promptTh: "ข้อโต้แย้งที่หนักแน่นที่สุดต่อความเห็นของคุณในหัวข้อนี้คืออะไร และคุณจะตอบกลับอย่างไร อธิบายความคิดของคุณ",
  };
}

export async function generateWritingFollowUp(params: {
  apiKey: string;
  topic: WritingTopic;
  essay: string;
  model?: string;
}): Promise<WritingFollowUpPrompt & { usage: GradingLlmUsage | null }> {
  const modelName = params.model ?? WRITING_FOLLOWUP_MODEL;
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM,
    generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
  });
  const payload = JSON.stringify(
    {
      topicTitleEn: params.topic.titleEn,
      mainPromptEn: params.topic.promptEn,
      // Enough to see which angles are already covered; the full essay is not needed.
      learnerResponse: params.essay.slice(0, 2500),
    },
    null,
    2,
  );
  let usage: GradingLlmUsage | null = null;
  let last = { promptEn: "", promptTh: "" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const ask =
      attempt === 0
        ? `Write the follow-up question.\n\n${payload}`
        : `Your last follow-up had ${countWords(last.promptEn)} words, which is too long. Write a new one of 18–30 words.\n\n${payload}`;
    const result = await model.generateContent(ask);
    usage = readGeminiUsageFromResponse(result.response, modelName) ?? usage;
    const raw = parseGeminiJsonObjectResponse(result.response.text());
    last = { promptEn: String(raw.promptEn ?? "").trim(), promptTh: String(raw.promptTh ?? "").trim() };
    const n = countWords(last.promptEn);
    if (n >= 8 && n <= WRITING_FOLLOWUP_MAX_WORDS) {
      return { promptEn: last.promptEn, promptTh: last.promptTh || last.promptEn, usage };
    }
  }
  throw new Error(`Model returned an unusable follow-up (${countWords(last.promptEn)} words).`);
}
