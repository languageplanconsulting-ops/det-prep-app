import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";

export type GraderResult = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
};

const SYSTEM = `You are an expert DET examiner. Score the following response on a scale of 0–10.
Evaluate: content relevance (3pts), language accuracy (3pts),
fluency and coherence (2pts), vocabulary range (2pts).
Return JSON only: { "score": number, "feedback": string, "strengths": string[], "improvements": string[] }`;

function parseJson(raw: string): GraderResult | null {
  try {
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    if (typeof json.score !== "number") return null;
    return {
      score: Math.max(0, Math.min(10, json.score)),
      feedback: String(json.feedback ?? ""),
      strengths: Array.isArray(json.strengths) ? json.strengths.map(String) : [],
      improvements: Array.isArray(json.improvements)
        ? json.improvements.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export async function gradeDetResponse(
  studentResponse: string,
  taskDescription: string,
): Promise<GraderResult> {
  const prompt = `${taskDescription}\n\nStudent response:\n${studentResponse}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const msg = await client.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        msg.content[0]?.type === "text" ? msg.content[0].text : "";
      const parsed = parseJson(text);
      if (parsed) return parsed;
    } catch {
      /* fall through to Gemini */
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return {
      score: 6,
      feedback: "AI grading unavailable (missing API keys). Placeholder score.",
      strengths: [],
      improvements: ["Configure ANTHROPIC_API_KEY or GEMINI_API_KEY"],
    };
  }

  const gen = new GoogleGenerativeAI(geminiKey);
  const modelName = await resolveGeminiTextModel();
  const model = gen.getGenerativeModel({ model: modelName });
  const res = await model.generateContent(
    `${SYSTEM}\n\n${prompt}\n\nRespond with JSON only.`,
  );
  const text = res.response.text();
  const parsed = parseJson(text);
  if (parsed) return parsed;

  return {
    score: 5,
    feedback: "Could not parse AI response.",
    strengths: [],
    improvements: [],
  };
}

export async function generateInsightSummary(
  subscores: { literacy: number; comprehension: number; conversation: number; production: number },
): Promise<{ bullets: { en: string; th: string }[] }> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return {
      bullets: [
        {
          en: "Keep practicing all four skills weekly.",
          th: "ฝึกทุกทักษะสัปดาห์ละครั้ง",
        },
        {
          en: "Review mistakes in your notebook.",
          th: "ทบทวนข้อผิดพลาดในสมุดโน้ต",
        },
        {
          en: "Take another mock test in a few days.",
          th: "ทำแบบทดสอบอีกครั้งในอีกไม่กี่วัน",
        },
      ],
    };
  }

  const gen = new GoogleGenerativeAI(geminiKey);
  const modelName = await resolveGeminiTextModel();
  const model = gen.getGenerativeModel({ model: modelName });
  const res = await model.generateContent(
    `Subscores (0-160): literacy ${subscores.literacy}, comprehension ${subscores.comprehension}, conversation ${subscores.conversation}, production ${subscores.production}.
Return JSON only: { "bullets": [ { "en": string, "th": string } ] } with exactly 3 items: strongest skill, weakest skill + action, one grammar/vocab tip.`,
  );
  const text = res.response.text();
  try {
    const j = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    if (typeof j === "object" && Array.isArray(j.bullets)) {
      return { bullets: j.bullets.slice(0, 3) };
    }
  } catch {
    /* fallthrough */
  }
  return {
    bullets: [
      { en: "Balanced practice improves all skills.", th: "การฝึกอย่างสมดุลช่วยพัฒนาทุกทักษะ" },
      { en: "Focus on your lowest subscore next.", th: "โฟกัสทักษะที่คะแนนต่ำสุดก่อน" },
      { en: "Use EnglishPlan practice modules daily.", th: "ใช้โมดูลฝึกบน EnglishPlan ทุกวัน" },
    ],
  };
}
