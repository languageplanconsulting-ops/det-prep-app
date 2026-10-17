import { NextResponse, type NextRequest } from "next/server";

import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { resolveGradingKeysFromRequest } from "@/lib/grading-request-keys";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { fetchTopicHistory, topicKeyFor } from "@/lib/production-weakness";
import {
  DRILL_DAILY_GENERATION_CAP,
  countRecentDrills,
  generateDrillContent,
  hashSentence,
  insertDrill,
  loadDrillBySentence,
  toDrillView,
} from "@/lib/weakness-drill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Opens (or resumes) the practice drill for one repeated mistake.
 * `{ unavailable: true }` means "show the report without a drill" — signed out,
 * not actually a repeat, table not deployed, daily cap hit, or the AI failed.
 * The drill is a bonus; no failure here may get in the way of the report.
 */
export async function POST(req: NextRequest) {
  const unavailable = (reason: string) => NextResponse.json({ unavailable: true, reason });
  try {
    const userId = await getOptionalAuthUserId(req);
    if (!userId) return unavailable("signed_out");

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const input = {
      topicEn: str(body?.topicEn, 120),
      topicTh: str(body?.topicTh, 160),
      wrong: str(body?.wrong, 400),
      betterEn: str(body?.betterEn, 400),
      noteTh: str(body?.noteTh, 600),
      noteEn: str(body?.noteEn, 600),
    };
    if (!input.wrong || (!input.topicEn && !input.topicTh)) return unavailable("bad_input");

    // Only a confirmed repeat gets a drill — keeps the reports light and the AI spend bounded.
    const repeats = await fetchTopicHistory({ userId, items: [input] });
    if (repeats.length === 0) return unavailable("not_a_repeat");

    const topicKey = topicKeyFor(input.topicEn, input.topicTh);
    const wrongHash = hashSentence(input.wrong);

    const existing = await loadDrillBySentence(userId, topicKey, wrongHash);
    if (existing) return NextResponse.json({ drill: toDrillView(existing) });

    if ((await countRecentDrills(userId)) >= DRILL_DAILY_GENERATION_CAP) return unavailable("daily_cap");

    const model = await resolveGeminiTextModel();
    const keys = resolveGradingKeysFromRequest(req, model);
    const gen = await generateDrillContent({ input, model, keys });
    if (gen.usage) {
      scheduleApiUsageLog({
        userId,
        operation: "weakness_drill",
        provider: gen.usage.provider,
        model: gen.usage.model,
        inputTokens: gen.usage.inputTokens,
        outputTokens: gen.usage.outputTokens,
        meta: { topicKey },
      });
    }
    const row = await insertDrill({
      userId,
      topicKey,
      topicEn: input.topicEn,
      topicTh: input.topicTh,
      wrongHash,
      gen,
    });
    return NextResponse.json({ drill: toDrillView(row) });
  } catch (e) {
    console.error("[weakness-drill/start]", e);
    return unavailable("error");
  }
}
