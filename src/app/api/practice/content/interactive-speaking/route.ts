import { NextResponse } from "next/server";

import {
  getInteractiveSpeakingScenario,
  listInteractiveSpeakingScenarios,
} from "@/lib/practice-content/interactive-speaking";
import { fetchPracticeContentSnapshot } from "@/lib/practice-content/server";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

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
      const scenario = getInteractiveSpeakingScenario(snapshot, id);
      if (!scenario) {
        return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
      }
      return NextResponse.json({ updatedAt, scenario });
    }

    const scenarios = listInteractiveSpeakingScenarios(
      snapshot,
      Number.isInteger(round) && round! >= 1 ? round : undefined,
    );
    return NextResponse.json({
      updatedAt,
      round: round ?? null,
      scenarios,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load scenarios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
