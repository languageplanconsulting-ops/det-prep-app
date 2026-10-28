import { NextResponse, type NextRequest } from "next/server";

import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { fetchTopicHistory } from "@/lib/production-weakness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS = 10;

/**
 * How many times this learner has repeated each grammar mistake in a report.
 * POST because the topics come from the report on screen, not from the URL.
 * Anything unauthenticated or malformed returns an empty list — the report
 * simply shows no repeat badges.
 */
export async function POST(req: NextRequest) {
  const userId = await getOptionalAuthUserId(req);
  if (!userId) return NextResponse.json({ history: [] });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ history: [] });
  }
  const raw = (body as { items?: unknown })?.items;
  if (!Array.isArray(raw)) return NextResponse.json({ history: [] });

  const items = raw.slice(0, MAX_ITEMS).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      topicEn: typeof o.topicEn === "string" ? o.topicEn : "",
      topicTh: typeof o.topicTh === "string" ? o.topicTh : "",
      wrong: typeof o.wrong === "string" ? o.wrong : "",
    };
  });

  const history = await fetchTopicHistory({ userId, items });
  return NextResponse.json({ history });
}
