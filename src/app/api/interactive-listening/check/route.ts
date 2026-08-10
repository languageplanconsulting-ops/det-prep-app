import { NextResponse } from "next/server";
import { generateGradingJsonObject } from "@/lib/grading-llm-generate";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";

/**
 * Judges typed comprehension answers in Interactive Listening.
 *
 * The client grades locally first (exact match, listed variants, content-word overlap) and only
 * sends what that rejected — so a learner who types the expected wording never touches this route,
 * and a set costs at most one request no matter how many blanks it has.
 *
 * This exists because the real task accepts meaning, not wording. A learner who hears "I'm thinking
 * about graduate school" and types "study more" has understood; strict matching would mark it wrong
 * and teach them to guess at phrasing instead of listening. Anything this route cannot decide falls
 * back to the local verdict on the client, so grading still works with no key and no network.
 */
export const maxDuration = 30;

type Item = { id: number; question: string; reference: string; answer: string };

function isItem(v: unknown): v is Item {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.question === "string" &&
    typeof o.reference === "string" &&
    typeof o.answer === "string"
  );
}

const SYSTEM = `You mark short answers for an English listening exercise for Thai learners.

For each item you get the question, the reference answer, and what the learner typed.
Mark it CORRECT when the learner's answer means the same thing as the reference answer.

Be generous about form, strict about meaning:
- accept different wording, synonyms, shorter answers, missing articles, minor spelling slips
- accept an answer that names the same thing at a different level of detail
  ("graduate school" for "go to graduate school", "design" for "a graphic designer")
- reject an answer that names something else, contradicts the reference, or is so vague
  it would fit any passage ("something", "a job", "study")
- ignore capitalisation and punctuation entirely
- an empty or nonsense answer is incorrect

Reply with JSON only:
{"results":[{"id":<number>,"ok":<true|false>,"whyTh":"<one short Thai sentence, only when ok is false>"}]}
whyTh explains to a Thai learner why their answer does not match. Keep it under 20 Thai words.`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = (body as { items?: unknown })?.items;
  const items = Array.isArray(raw) ? raw.filter(isItem).slice(0, 12) : [];
  if (!items.length) return NextResponse.json({ results: [] });

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const keys = resolveGradingKeysFromRequest(req, model);

  try {
    const { raw: out } = await generateGradingJsonObject({
      model,
      keys: {
        geminiApiKey: keys.geminiApiKey,
        anthropicApiKey: keys.anthropicApiKey,
        openAiApiKey: keys.openAiApiKey,
      },
      systemInstruction: SYSTEM,
      userPayload: JSON.stringify({ items }),
      temperature: 0,
      operation: "interactive_listening_check",
    });

    const results = Array.isArray((out as { results?: unknown }).results)
      ? ((out as { results: unknown[] }).results
          .map((r) => {
            const o = r as Record<string, unknown>;
            return typeof o?.id === "number" && typeof o?.ok === "boolean"
              ? { id: o.id, ok: o.ok, whyTh: typeof o.whyTh === "string" ? o.whyTh : "" }
              : null;
          })
          .filter(Boolean) as { id: number; ok: boolean; whyTh: string }[])
      : [];

    return NextResponse.json({ results });
  } catch (err) {
    // Never block the learner: the client keeps its local verdict when this fails.
    return NextResponse.json(
      { results: [], error: normalizeGradingErrorMessage(err) },
      { status: 200 },
    );
  }
}
