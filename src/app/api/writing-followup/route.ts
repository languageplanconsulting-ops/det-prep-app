import { NextResponse } from "next/server";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import {
  WRITING_FOLLOWUP_MODEL,
  fallbackWritingFollowUp,
  generateWritingFollowUp,
} from "@/lib/gemini-writing-followup";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import type { WritingTopic } from "@/types/writing";

export const maxDuration = 60;

/**
 * Interactive Writing step 2: returns the follow-up question shown after the learner submits the
 * 5-minute response. Never fails the task — if the model is unavailable it answers with the topic's
 * authored follow-up or a generic same-topic one (`source: "fallback"`). Not charged: the credit is
 * spent once, when the whole response is graded by /api/writing-report.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const topic = body?.topic as WritingTopic | undefined;
  const essay = typeof body?.essay === "string" ? body.essay : "";
  if (!topic || typeof topic.promptEn !== "string" || typeof topic.titleEn !== "string") {
    return NextResponse.json({ error: "topic object invalid" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY?.trim() || req.headers.get("x-gemini-api-key")?.trim();
  if (!key) {
    return NextResponse.json({ ...fallbackWritingFollowUp(topic), source: "fallback" });
  }
  try {
    const userId = await getOptionalAuthUserId(req);
    const { usage, ...prompt } = await generateWritingFollowUp({ apiKey: key, topic, essay });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "writing_followup_question",
        provider: "gemini",
        model: usage.model ?? WRITING_FOLLOWUP_MODEL,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        meta: { topicId: topic.id },
      });
    }
    return NextResponse.json({ ...prompt, source: "ai" });
  } catch (e) {
    console.error("[writing-followup]", e);
    return NextResponse.json({ ...fallbackWritingFollowUp(topic), source: "fallback" });
  }
}
