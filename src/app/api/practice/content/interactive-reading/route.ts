import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { canAccessDifficulty, type Difficulty } from "@/lib/access-control";
import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
import type { IrSet } from "@/lib/interactive-reading";
import { wordKey } from "@/lib/interactive-reading-explain";
import { IR_GLOSS_TH } from "@/lib/interactive-reading-gloss-data";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { pickReadingExamIrSet } from "@/lib/reading-exam-ir-pick";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

/**
 * GET /api/practice/content/interactive-reading?round=&difficulty=&set=&exam=
 *
 * The one Interactive Reading passage a reading-exam slot opens — picked with the SAME function the
 * web exam page uses (`pickReadingExamIrSet`), so the app and the site run the same text for the
 * same round/difficulty/set/exam and synced scores line up. The bank is compiled into the site, so
 * this never reads the content snapshot.
 *
 * Auth and tier gating mirror /api/practice/content/set: a cookie session (web), a Bearer token
 * (the app), or an admin code; difficulty is gated by plan exactly as the set route gates it.
 *
 * `gloss` is the slice of the feedback bar's Thai glossary that this passage can surface, so the app
 * can explain keywords without shipping the whole table.
 */

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function setGloss(set: IrSet): Record<string, string> {
  const texts: string[] = [
    ...set.paragraphs,
    ...set.blanks.flatMap((b) => [b.answer, ...b.options]),
    ...[...set.gap, ...set.idea, ...set.title].flatMap((o) => [o.text, o.clueEn ?? ""]),
    ...set.highlights.flatMap((h) => [h.questionEn, h.answer, h.clueEn ?? ""]),
  ];
  const out: Record<string, string> = {};
  for (const t of texts) {
    for (const raw of t.split(/\s+/)) {
      const plain = raw.replace(/[^A-Za-z']/g, "");
      if (!plain) continue;
      for (const k of [plain.toLowerCase(), wordKey(plain)]) {
        const g = IR_GLOSS_TH[k];
        if (g) out[k] = g;
      }
    }
  }
  return out;
}

export async function GET(request: Request) {
  const { user, supabase } = await getRequestAuthUser(request);
  const adminAccess = await getAdminAccess(request);
  if (!user && !adminAccess.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const round = Number(url.searchParams.get("round"));
  const setNumber = Number(url.searchParams.get("set"));
  const examNumber = Number(url.searchParams.get("exam"));
  const difficultyRaw = url.searchParams.get("difficulty") ?? "";
  const difficulty = (DIFFICULTIES as string[]).includes(difficultyRaw) ? (difficultyRaw as Difficulty) : null;

  if (
    !difficulty ||
    !Number.isInteger(round) ||
    round < 1 ||
    !Number.isInteger(setNumber) ||
    setNumber < 1 ||
    !Number.isInteger(examNumber) ||
    examNumber < 1
  ) {
    return NextResponse.json(
      { error: "Query round, difficulty (easy|medium|hard), set and exam are required" },
      { status: 400 },
    );
  }

  const profile =
    adminAccess.ok || !user
      ? null
      : await readAuthoritativeProfile(user.id, supabase, "tier, tier_expires_at, vip_granted_by_course");
  const tier = adminAccess.ok
    ? "vip"
    : resolveEffectiveTierFromProfile({
        tier: profile?.tier,
        tier_expires_at: (profile?.tier_expires_at as string | null | undefined) ?? null,
        vip_granted_by_course: profile?.vip_granted_by_course === true,
      });
  const difficultyAccess = canAccessDifficulty(tier, difficulty);
  if (!difficultyAccess.allowed) {
    return NextResponse.json(
      {
        error: `ระดับความยาก "${difficulty}" เปิดใช้ตั้งแต่แพ็กเกจ ${difficultyAccess.upgradeRequired} ขึ้นไป — อัปเกรดเพื่อฝึกระดับนี้`,
        upgradeRequired: difficultyAccess.upgradeRequired,
      },
      { status: 403 },
    );
  }

  const set = pickReadingExamIrSet({ round, difficulty, setNumber, examNumber });
  if (!set) {
    return NextResponse.json({ error: "No passage for this level yet" }, { status: 404 });
  }

  return NextResponse.json({
    round,
    difficulty,
    set: setNumber,
    exam: examNumber,
    data: set,
    gloss: setGloss(set),
  });
}
