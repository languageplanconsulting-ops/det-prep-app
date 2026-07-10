import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  canAccessDifficulty,
  canAccessFeature,
  getUpgradeMessage,
  type Difficulty,
} from "@/lib/access-control";
import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import {
  listLaneSetNumbers,
  resolvePracticeSet,
  resolveReadingSet,
  resolveVocabSet,
  stripInlineAudioForApi,
} from "@/lib/practice-content/from-snapshot";
import { fetchPracticeContentSnapshot } from "@/lib/practice-content/server";
import type { PracticeSetQuery, PracticeSkillId } from "@/lib/practice-content/types";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";
import type { VocabRoundNum } from "@/types/vocab";
import { getSiteUrl } from "@/lib/site-metadata";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
function parseDifficulty(raw: string | undefined): Difficulty | null {
  return raw && (DIFFICULTIES as string[]).includes(raw) ? (raw as Difficulty) : null;
}

const SKILLS: PracticeSkillId[] = [
  "dictation",
  "fitb",
  "reading",
  "vocab",
  "realword",
  "conversation",
  "dialogue_summary",
];

function parseSkill(raw: string | null): PracticeSkillId | null {
  if (!raw) return null;
  return SKILLS.includes(raw as PracticeSkillId) ? (raw as PracticeSkillId) : null;
}

function withAudioUrls(payload: unknown, siteOrigin: string): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const row = payload as Record<string, unknown>;
  const out = stripInlineAudioForApi(row);
  if (typeof row.audioPath === "string" && row.audioPath.startsWith("/")) {
    return { ...out, audioUrl: `${siteOrigin}${row.audioPath}` };
  }
  return out;
}

export async function GET(request: Request) {
  const { user, supabase } = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const skill = parseSkill(url.searchParams.get("skill"));
  const round = Number(url.searchParams.get("round"));
  const set = Number(url.searchParams.get("set"));
  const difficulty = url.searchParams.get("difficulty") ?? undefined;
  const exam = url.searchParams.get("exam");
  const passage = url.searchParams.get("passage");
  const listOnly = url.searchParams.get("list") === "1";
  const metaOnly = url.searchParams.get("meta") === "1";

  if (!skill || !Number.isInteger(round) || round < 1) {
    return NextResponse.json(
      { error: "Query skill and round are required (set required unless list=1)" },
      { status: 400 },
    );
  }

  if (!listOnly && !metaOnly && (!Number.isInteger(set) || set < 1)) {
    return NextResponse.json({ error: "Query set is required" }, { status: 400 });
  }

  if (metaOnly && (!Number.isInteger(set) || set < 1)) {
    return NextResponse.json({ error: "Query set is required for meta" }, { status: 400 });
  }

  const adminAccess = await getAdminAccess();
  const profile = adminAccess.ok
    ? null
    : await readAuthoritativeProfile(user.id, supabase, "tier, tier_expires_at, vip_granted_by_course");
  const tier = adminAccess.ok
    ? "vip"
    : resolveEffectiveTierFromProfile({
        tier: profile?.tier,
        tier_expires_at: (profile?.tier_expires_at as string | null | undefined) ?? null,
        vip_granted_by_course: profile?.vip_granted_by_course === true,
      });

  const parsedDifficulty = parseDifficulty(difficulty);
  if (parsedDifficulty) {
    const difficultyAccess = canAccessDifficulty(tier, parsedDifficulty);
    if (!difficultyAccess.allowed) {
      return NextResponse.json(
        {
          error: `ระดับความยาก "${parsedDifficulty}" เปิดใช้ตั้งแต่แพ็กเกจ ${difficultyAccess.upgradeRequired} ขึ้นไป — อัปเกรดเพื่อฝึกระดับนี้`,
          upgradeRequired: difficultyAccess.upgradeRequired,
        },
        { status: 403 },
      );
    }
  }
  if (skill === "conversation" && !canAccessFeature(tier, "conversation")) {
    return NextResponse.json(
      { error: getUpgradeMessage(tier, "conversation") },
      { status: 403 },
    );
  }

  try {
    const { snapshot, updatedAt } = await fetchPracticeContentSnapshot(supabase);
    const siteOrigin = getSiteUrl().origin;

    if (listOnly) {
      const setNumbers = listLaneSetNumbers(snapshot, skill, round, difficulty);
      return NextResponse.json({ skill, round, difficulty: difficulty ?? null, setNumbers, updatedAt });
    }

    if (metaOnly) {
      let data: unknown = null;
      if (skill === "reading") {
        if (!difficulty) {
          return NextResponse.json({ error: "difficulty required for reading meta" }, { status: 400 });
        }
        data = resolveReadingSet(
          snapshot,
          round as ReadingRoundNum,
          difficulty as ReadingDifficulty,
          set,
        );
      } else if (skill === "vocab") {
        data = resolveVocabSet(snapshot, round as VocabRoundNum, set);
      } else if (skill === "fitb") {
        if (!difficulty) {
          return NextResponse.json({ error: "difficulty required for fitb meta" }, { status: 400 });
        }
        data = resolvePracticeSet(snapshot, {
          skill: "fitb",
          round,
          difficulty,
          set,
        });
      } else {
        return NextResponse.json({ error: "meta not supported for this skill" }, { status: 400 });
      }
      if (!data) {
        return NextResponse.json({ error: "Set not found" }, { status: 404 });
      }
      return NextResponse.json({
        skill,
        round,
        difficulty: difficulty ?? null,
        set,
        updatedAt,
        data,
      });
    }

    const query: PracticeSetQuery = {
      skill,
      round,
      difficulty,
      set,
      exam: exam ? Number(exam) : undefined,
      passage: passage ? Number(passage) : undefined,
    };

    const data = resolvePracticeSet(snapshot, query);
    if (!data) {
      return NextResponse.json({ error: "Set not found", skill, round, set }, { status: 404 });
    }

    const payload =
      skill === "dictation" || skill === "conversation"
        ? withAudioUrls(data, siteOrigin)
        : data;

    return NextResponse.json({
      skill,
      round,
      difficulty: difficulty ?? null,
      set,
      exam: query.exam ?? null,
      passage: query.passage ?? null,
      updatedAt,
      data: payload,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to resolve practice set";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
