import { NextResponse } from "next/server";

import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { normalizeGradingErrorMessage } from "@/lib/grading-error-message";
import { gradeSpeakingForDiagnostic } from "@/lib/study-plan/speaking-grader";

export const maxDuration = 60;

// POST { transcript: string } — RAW transcript from browser Web Speech + Deepgram.
// Returns the extracted signals + the scored speaking SkillResult.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const transcript = (body as Record<string, unknown> | null)?.transcript;
  if (typeof transcript !== "string" || transcript.trim().split(/\s+/).filter(Boolean).length < 15) {
    return NextResponse.json(
      { error: "transcript must be a string of at least ~15 words (check the mic and language)." },
      { status: 400 },
    );
  }

  try {
    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const { assessment, result } = await gradeSpeakingForDiagnostic({ transcript, model, keys });
    return NextResponse.json({ assessment, result });
  } catch (err) {
    return NextResponse.json({ error: normalizeGradingErrorMessage(err) }, { status: 502 });
  }
}
