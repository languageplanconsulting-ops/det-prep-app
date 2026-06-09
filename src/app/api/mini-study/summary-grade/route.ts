import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { gradeConversationSummary } from "@/lib/mini-study/grade-summary";

export const maxDuration = 60;

export async function POST(req: Request) {
  // Admin gate — matches the rest of the app (DB role OR admin-code cookie).
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
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
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const conversationRaw = o.conversation;
  if (!summary) {
    return NextResponse.json({ error: "summary required" }, { status: 400 });
  }
  if (!Array.isArray(conversationRaw)) {
    return NextResponse.json({ error: "conversation array required" }, { status: 400 });
  }
  const conversation = conversationRaw
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const x = c as Record<string, unknown>;
      const speaker = typeof x.speaker === "string" ? x.speaker : "";
      const text = typeof x.text === "string" ? x.text : "";
      return speaker && text ? { speaker, text } : null;
    })
    .filter((c): c is { speaker: string; text: string } => c !== null);

  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    req.headers.get("x-gemini-api-key")?.trim() ||
    "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await gradeConversationSummary({
      apiKey,
      conversation,
      summary,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Grading failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
