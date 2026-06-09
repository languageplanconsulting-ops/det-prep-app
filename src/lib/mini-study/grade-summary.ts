import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";

const SYSTEM = `You are an English writing tutor for Thai students preparing for the Duolingo English Test.
The student is asked to write a 3-sentence summary of an English conversation.

Grading rules:
- The summary MUST use present simple tense throughout (e.g. "The student talks", NOT "The student talked").
- It must be complete sentences (no bullet points / fragments).
- It must cover: WHO+WHY, WHAT was discussed, and the OUTCOME.
- Style points like elegance do NOT matter — only correctness.

You return strictly JSON with this shape (no markdown, no extra prose):
{
  "grammarMistakes": [ { "wrong": "...", "fix": "...", "reasonTh": "<short Thai explanation>" }, ... ],
  "vocabMistakes":   [ { "wrong": "...", "fix": "...", "reasonTh": "<short Thai explanation>" }, ... ],
  "revised": "<the student's summary with grammar mistakes corrected, vocabulary unchanged unless completely wrong>",
  "weaknessesTh": "<a single Thai paragraph (max 3 sentences) summarizing the patterns of grammar mistakes — phrased as 'จุดอ่อนของคุณคือ...' or 'คุณยังต้องระวัง...'>"
}

If there are no grammar mistakes, return grammarMistakes as [].
If there are no vocabulary mistakes, return vocabMistakes as [].
If everything is perfect, weaknessesTh should be a short Thai congratulations like "ไม่มีจุดอ่อนที่ชัดเจน — เขียนได้ดีมาก".
Be strict about tense — past tense in a conversation summary is always a mistake.`;

export type SummaryGradeMistake = {
  wrong: string;
  fix: string;
  reasonTh: string;
};

export type SummaryGradeResult = {
  grammarMistakes: SummaryGradeMistake[];
  vocabMistakes: SummaryGradeMistake[];
  revised: string;
  weaknessesTh: string;
};

export async function gradeConversationSummary(params: {
  apiKey: string;
  conversation: { speaker: string; text: string }[];
  summary: string;
}): Promise<SummaryGradeResult> {
  const { apiKey, conversation, summary } = params;
  if (!apiKey) throw new Error("Gemini API key missing");
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const payload = JSON.stringify(
    {
      conversation: conversation.map((c, i) => ({
        turn: i + 1,
        speaker: c.speaker,
        text: c.text,
      })),
      studentSummary: summary,
    },
    null,
    2,
  );

  const result = await model.generateContent(
    `Grade this student's 3-sentence summary of the conversation.\n\n${payload}`,
  );
  const text = result.response.text();
  const raw = parseGeminiJsonObjectResponse(text) as Record<string, unknown>;

  const grammarMistakes = normalizeMistakeArray(raw.grammarMistakes);
  const vocabMistakes = normalizeMistakeArray(raw.vocabMistakes);
  const revised = typeof raw.revised === "string" ? raw.revised.trim() : "";
  const weaknessesTh = typeof raw.weaknessesTh === "string" ? raw.weaknessesTh.trim() : "";

  return {
    grammarMistakes,
    vocabMistakes,
    revised: revised || summary,
    weaknessesTh: weaknessesTh || "ไม่มีจุดอ่อนที่ชัดเจน",
  };
}

function normalizeMistakeArray(v: unknown): SummaryGradeMistake[] {
  if (!Array.isArray(v)) return [];
  const out: SummaryGradeMistake[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const wrong = typeof o.wrong === "string" ? o.wrong : "";
    const fix = typeof o.fix === "string" ? o.fix : "";
    const reasonTh = typeof o.reasonTh === "string" ? o.reasonTh : "";
    if (wrong && fix) out.push({ wrong, fix, reasonTh });
  }
  return out;
}
