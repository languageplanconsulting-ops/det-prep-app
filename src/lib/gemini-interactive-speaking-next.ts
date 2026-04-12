import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  INTERACTIVE_SPEAKING_NEXT_QUESTION_GEMINI_MODEL,
  INTERACTIVE_SPEAKING_TURN_COUNT,
} from "@/lib/interactive-speaking-constants";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";

const SYSTEM = `You generate the next interview question for an English speaking exam (Thai learners, DET-style).

Rules:
- Stay on the SAME topic as the scenario title and starter question. Never change topic.
- Ask follow-ups that: ask to explain, ask for reasons, ask for an example, ask for more detail, ask how they feel, ask for reflection, compare two things, or ask about the future.
- The question must be SHORT and CLEAR. Avoid complex or academic wording.
- Output ONLY the question in English. No explanations, no numbering, no labels like "Question:".
- The learner has about 30–40 seconds to answer.
- The question must logically follow what they said in previous turns.

Additional intelligence:
- If the last answer was vague → ask for clarification or a concrete example.
- If they gave a strong opinion → probe slightly (polite challenge or "what about the other side?").
- If they mentioned a situation → ask to expand on that situation.
- If the answer was very short or simple → ask a simpler, easier next question.
- If the answer was detailed → ask one deeper follow-up.

Return ONLY valid JSON: {"questionEn":"...","questionTh":"..."}
questionTh = natural Thai translation of the same question (for display).`;

export type NextQuestionHistoryItem = {
  questionEn: string;
  answerTranscript: string;
};

export async function generateInteractiveSpeakingNextQuestion(params: {
  apiKey: string;
  model?: string;
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  starterQuestionEn: string;
  starterQuestionTh: string;
  /** Completed turns before the one we are generating (length 1–5). */
  history: NextQuestionHistoryItem[];
  /** Next turn number (2…TURN_COUNT). */
  nextTurnNumber: number;
}): Promise<{ questionEn: string; questionTh: string }> {
  const {
    apiKey,
    scenarioTitleEn,
    scenarioTitleTh,
    starterQuestionEn,
    starterQuestionTh,
    history,
    nextTurnNumber,
  } = params;

  const modelName = params.model ?? INTERACTIVE_SPEAKING_NEXT_QUESTION_GEMINI_MODEL;
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
      scenarioTitleEn,
      scenarioTitleTh,
      starterQuestionEn,
      starterQuestionTh,
      nextTurnNumber,
      conversationSoFar: history.map((h, i) => ({
        turn: i + 1,
        interviewerQuestion: h.questionEn,
        learnerAnswer: h.answerTranscript,
      })),
    },
    null,
    2,
  );

  const result = await model.generateContent(
    `Produce the interviewer question for turn ${nextTurnNumber} of ${INTERACTIVE_SPEAKING_TURN_COUNT}.\n\nContext:\n${payload}`,
  );
  const text = result.response.text();
  const raw = parseGeminiJsonObjectResponse(text);
  const questionEn = String(raw.questionEn ?? "").trim();
  const questionTh = String(raw.questionTh ?? "").trim();
  if (!questionEn) {
    throw new Error("Model returned empty questionEn.");
  }
  return {
    questionEn,
    questionTh: questionTh || questionEn,
  };
}
