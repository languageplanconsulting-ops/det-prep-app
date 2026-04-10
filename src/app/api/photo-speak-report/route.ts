import { NextResponse } from "next/server";
import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";

export const maxDuration = 120;

export async function POST(req: Request) {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  const fromHeader = req.headers.get("x-gemini-api-key")?.trim();
  const key = fromEnv || fromHeader;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No Gemini key. Set GEMINI_API_KEY in .env.local (or your server environment).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const attemptId = o.attemptId;
  const transcript = o.transcript;
  const prepMinutes = o.prepMinutes;
  const itemId = o.itemId;
  const titleEn = o.titleEn;
  const titleTh = o.titleTh;
  const promptEn = o.promptEn;
  const promptTh = o.promptTh;
  const imageUrl = o.imageUrl;
  const keywords = o.keywords;
  const originHubRaw = o.originHub;
  const originHub =
    originHubRaw === "write-about-photo"
      ? ("write-about-photo" as const)
      : originHubRaw === "speak-about-photo"
        ? ("speak-about-photo" as const)
        : undefined;

  if (typeof attemptId !== "string" || !attemptId) {
    return NextResponse.json({ error: "attemptId required" }, { status: 400 });
  }
  if (typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript must be a string" }, { status: 400 });
  }
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) {
    return NextResponse.json(
      { error: "Transcript too short — speak at least ~15 words." },
      { status: 400 },
    );
  }
  if (typeof prepMinutes !== "number" || prepMinutes < 0 || prepMinutes > 60) {
    return NextResponse.json({ error: "prepMinutes invalid" }, { status: 400 });
  }
  if (typeof itemId !== "string" || typeof titleEn !== "string" || typeof promptEn !== "string") {
    return NextResponse.json(
      { error: "itemId, titleEn, and promptEn required" },
      { status: 400 },
    );
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  const taskKeywords = Array.isArray(keywords)
    ? keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  try {
    const model = await resolveGeminiTextModel();
    const report = await generatePhotoSpeakReportWithGemini({
      apiKey: key,
      model,
      attemptId,
      itemId,
      titleEn,
      titleTh: typeof titleTh === "string" ? titleTh : "",
      promptEn,
      promptTh: typeof promptTh === "string" ? promptTh : "",
      imageUrl: imageUrl.trim(),
      taskKeywords,
      prepMinutes,
      transcript,
      originHub,
    });
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    console.error("[photo-speak-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
