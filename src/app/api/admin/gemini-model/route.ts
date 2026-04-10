import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  DEFAULT_GEMINI_TEXT_MODEL,
  GEMINI_TEXT_MODEL_OPTIONS,
} from "@/lib/gemini-text-models";
import {
  persistGeminiTextModel,
  resolveGeminiTextModelWithMeta,
} from "@/lib/gemini-model-resolve";

function buildOptions(effectiveModel: string) {
  const options = [...GEMINI_TEXT_MODEL_OPTIONS];
  if (!options.some((o) => o.id === effectiveModel)) {
    options.unshift({
      id: effectiveModel,
      label: `${effectiveModel} (custom / env)`,
    });
  }
  return options;
}

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meta = await resolveGeminiTextModelWithMeta();
  return NextResponse.json({
    ...meta,
    options: buildOptions(meta.effectiveModel),
    fallbackDefault: DEFAULT_GEMINI_TEXT_MODEL,
  });
}

export async function POST(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }
  const modelRaw = (body as Record<string, unknown>).model;
  if (typeof modelRaw !== "string" || !modelRaw.trim()) {
    return NextResponse.json({ error: "model string required" }, { status: 400 });
  }

  const result = await persistGeminiTextModel(modelRaw);
  if (!result.ok) {
    const badId = /unknown|unsupported/i.test(result.message);
    return NextResponse.json({ error: result.message }, { status: badId ? 400 : 503 });
  }

  const meta = await resolveGeminiTextModelWithMeta();
  return NextResponse.json({
    ok: true,
    ...meta,
    options: buildOptions(meta.effectiveModel),
    fallbackDefault: DEFAULT_GEMINI_TEXT_MODEL,
  });
}
