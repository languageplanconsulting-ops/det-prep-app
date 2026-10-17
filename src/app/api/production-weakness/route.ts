import { NextResponse, type NextRequest } from "next/server";

import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { fetchPersistentTopics, type ProductionSkill } from "@/lib/production-weakness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The grammar habits to warn this learner about before they start a production
 * exercise. Signed-out learners, learners with no confirmed pattern, and an
 * undeployed table all return the same empty list — the caller shows nothing.
 */
export async function GET(req: NextRequest) {
  const skillParam = req.nextUrl.searchParams.get("skill");
  const skill: ProductionSkill | null =
    skillParam === "writing" || skillParam === "speaking" ? skillParam : null;
  if (!skill) {
    return NextResponse.json({ error: "skill must be writing or speaking" }, { status: 400 });
  }

  const userId = await getOptionalAuthUserId(req);
  if (!userId) return NextResponse.json({ topics: [] });

  const topics = await fetchPersistentTopics({ userId, skill });
  return NextResponse.json({ topics });
}
