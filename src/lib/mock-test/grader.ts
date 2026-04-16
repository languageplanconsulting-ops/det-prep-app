import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { generateGradingJsonCompletion } from "@/lib/grading-llm-generate";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { GRADING_TEACHER_TONE } from "@/lib/gemini-production-thai-style";

export type GraderResult = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
};

const SYSTEM = `You are an expert DET examiner. Score the following response on a scale of 0–10.
Evaluate: content relevance (3pts), language accuracy (3pts),
fluency and coherence (2pts), vocabulary range (2pts).
Return JSON only: { "score": number, "feedback": string, "strengths": string[], "improvements": string[] }
${GRADING_TEACHER_TONE}`;

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
  log?: { userId: string | null },
): Promise<GraderResult> {
  const prompt = `${taskDescription}\n\nStudent response:\n${studentResponse}`;
  const modelName = await resolveGeminiTextModel();
  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  try {
    const { text, usage } = await generateGradingJsonCompletion({
      model: modelName,
      keys: { geminiApiKey: geminiKey, anthropicApiKey: anthropicKey, openAiApiKey: openAiKey },
      systemInstruction: SYSTEM,
      userPayload: `${prompt}\n\nRespond with JSON only.`,
      temperature: 0.2,
    });
    const parsed = parseJson(text);
    if (parsed && usage) {
      scheduleApiUsageLog({
        userId: log?.userId ?? null,
        operation: "mock_test_open_grade",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }
    if (parsed) return parsed;
  } catch {
    /* fall through */
  }

  return {
    score: 6,
    feedback:
      "AI grading unavailable (missing or invalid API keys for the selected model). Placeholder score.",
    strengths: [],
    improvements: [
      "Configure GEMINI_API_KEY for Gemini grading, or ANTHROPIC_API_KEY when admin selects Claude.",
    ],
  };
}

export async function generateInsightSummary(
  subscores: { literacy: number; comprehension: number; conversation: number; production: number },
  log?: { userId: string | null },
): Promise<{ bullets: { en: string; th: string }[] }> {
  const fallback = {
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

  const modelName = await resolveGeminiTextModel();
  const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  try {
    const { text, usage } = await generateGradingJsonCompletion({
      model: modelName,
      keys: { geminiApiKey: geminiKey, anthropicApiKey: anthropicKey, openAiApiKey: openAiKey },
      systemInstruction:
        "You write short bilingual study tips. Return JSON only." + GRADING_TEACHER_TONE,
      userPayload: `Subscores (0-160): literacy ${subscores.literacy}, comprehension ${subscores.comprehension}, conversation ${subscores.conversation}, production ${subscores.production}.
Return JSON only: { "bullets": [ { "en": string, "th": string } ] } with exactly 3 items: strongest skill, weakest skill + action, one grammar/vocab tip.
Thai lines: supportive teacher tone; you may end a Thai line with ครับ only when it sounds natural.`,
      temperature: 0.35,
    });
    const j = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    if (typeof j === "object" && Array.isArray(j.bullets)) {
      if (usage) {
        scheduleApiUsageLog({
          userId: log?.userId ?? null,
          operation: "mock_test_insight_summary",
          provider: usage.provider,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });
      }
      return { bullets: j.bullets.slice(0, 3) };
    }
  } catch {
    /* fallthrough */
  }

  return fallback;
}
