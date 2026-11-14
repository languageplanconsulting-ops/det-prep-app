import { NextResponse } from "next/server";

import { fetchPracticeContentSnapshot } from "@/lib/practice-content/server";
import { listWritingTopics } from "@/lib/practice-content/writing-topics";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

/**
 * Read-and-write (essay) topics for the mobile app, which can't pull the whole
 * content-bank snapshot the web client caches. `?round=N` filters to one round;
 * `?id=` returns a single topic. Accepts the web cookie session or a mobile Bearer token.
 */
export async function GET(request: Request) {
  const { user, supabase } = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const roundRaw = url.searchParams.get("round");
  const round = roundRaw ? Number(roundRaw) : undefined;

  try {
    const { snapshot, updatedAt } = await fetchPracticeContentSnapshot(supabase);

    if (id) {
      const topic = listWritingTopics(snapshot).find((t) => t.id === id);
      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }
      return NextResponse.json({ updatedAt, topic });
    }

    const validRound = Number.isInteger(round) && round! >= 1 ? round : undefined;
    const topics = listWritingTopics(snapshot, validRound);
    return NextResponse.json({ updatedAt, round: validRound ?? null, topics });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load writing topics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
