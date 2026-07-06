import { GoogleGenerativeAI } from "@google/generative-ai";
import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import {
  SPEAKING_PARTNER_NEXT_QUESTION_GEMINI_MODEL,
  SPEAKING_PARTNER_TURN_COUNT,
} from "@/lib/speaking-partner-constants";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

const SYSTEM = `You are a friendly conversation partner helping a Thai learner practice free-topic spoken English. The learner picked their own topic — there is no scenario or exam script.

Rules:
- Bounce off what they just said. Ask a natural follow-up a friend would ask in a real conversation, not an exam interviewer.
- NEVER use scenario/roleplay framing ("Imagine you are…", "In this situation…"). This is a real, casual chat about a topic the learner chose.
- The question must be SHORT and CLEAR. Avoid complex or academic wording.
- Output ONLY the question in English. No explanations, no numbering, no labels like "Question:".
- The learner has about 60 seconds to answer.
- The question must logically follow what they said in previous turns, staying on their chosen topic (or a natural tangent from it — real conversations wander a little).

Additional intelligence:
- If the last answer was vague → ask for clarification or a concrete example.
- If they gave a strong opinion → probe slightly (polite challenge or "what about the other side?").
- If they mentioned a situation → ask to expand on that situation.
- If the answer was very short or simple → ask a simpler, easier next question.
- If the answer was detailed → ask one deeper follow-up.

Return ONLY valid JSON: {"questionEn":"...","questionTh":"..."}
questionTh = natural Thai translation of the same question (for display).`;

export type SpeakingPartnerNextHistoryItem = {
  questionEn: string;
  answerTranscript: string;
};

export async function generateSpeakingPartnerNextQuestion(params: {
  apiKey: string;
  model?: string;
  topicSeedEn: string;
  /** Completed turns before the one we are generating (length 1–5). */
  history: SpeakingPartnerNextHistoryItem[];
  /** Next turn number (2…TURN_COUNT). */
  nextTurnNumber: number;
}): Promise<{ questionEn: string; questionTh: string; usage: GradingLlmUsage | null }> {
  const { apiKey, topicSeedEn, history, nextTurnNumber } = params;

  const modelName = params.model ?? SPEAKING_PARTNER_NEXT_QUESTION_GEMINI_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM,
    generationConfig: {
      temperature: 0.55,
      responseMimeType: "application/json",
    },
  });

  const payload = JSON.stringify(
    {
      topicSeedEn,
      nextTurnNumber,
      conversationSoFar: history.map((h, i) => ({
        turn: i + 1,
        partnerQuestion: h.questionEn,
        learnerAnswer: h.answerTranscript,
      })),
    },
    null,
    2,
  );

  const result = await model.generateContent(
    `Produce the conversation partner's question for turn ${nextTurnNumber} of ${SPEAKING_PARTNER_TURN_COUNT}.\n\nContext:\n${payload}`,
  );
  const text = result.response.text();
  const usage = readGeminiUsageFromResponse(result.response, modelName);
  const raw = parseGeminiJsonObjectResponse(text);
  const questionEn = String(raw.questionEn ?? "").trim();
  const questionTh = String(raw.questionTh ?? "").trim();
  if (!questionEn) {
    throw new Error("Model returned empty questionEn.");
  }
  return {
    questionEn,
    questionTh: questionTh || questionEn,
    usage,
  };
}
