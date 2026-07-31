import "server-only";

import { resolveCourseAccess } from "@/lib/course-access";
import { getStudentCourse } from "@/lib/course-student-data";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { COURSE_HREF, weaknessResourceFor } from "@/lib/study-plan/weakness-resources";
import {
  computeTaskWeaknessVector,
  type TaskWeakness,
} from "@/lib/study-plan/weakness-vector";
import {
  TASK_TYPE_TO_DAILY_SKILL,
  type DailySkillPriority,
  type DailyTier,
} from "@/lib/study-plan/daily-plan";

/**
 * Personal-plan "extras" — the typed non-exam items a personalized calendar day
 * carries alongside its exam skill groups: the course VIDEO to watch, the
 * บทเรียน lesson bank to learn from, the AI-graded practice to spend a credit
 * on, and the diagnosis to (re)take. Advisory layer: extras never affect the
 * day-completion contract (that stays "every exam group satisfied"), so the
 * month grid, /daily/range, and streaks are untouched.
 *
 * Persona behavior (docs/study-plan/personalized-calendar-design.md Part 3):
 *  - no assessment yet  → the only extra is "take the free mini diagnosis"
 *  - balanced-low (≥5 weak tasks) → course walks front-to-back from chapter 1
 *  - focused weakness   → course walks that task's chapter(s); orientation
 *    chapter 1 is prepended for a student who has watched nothing yet
 *  - stale assessment (>30 days) → re-diagnosis nudge
 */

/**
 * Bangkok "today" as a calendar date — the same offset every other day-bucketing
 * path in the study plan uses.
 */
export function bangkokToday(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Weakness priorities per daily skill, weakest first — the single definition
 * shared by /api/study-plan/daily and /daily/range so the day sheet and the
 * month grid can never disagree about a virtual day's items.
 */
export function dailyPrioritiesFromVector(vector: TaskWeakness[]): {
  priorities: DailySkillPriority;
  focus: { taskType: string; source: TaskWeakness["source"] } | null;
} {
  const priorities: DailySkillPriority = {};
  let focus: { taskType: string; source: TaskWeakness["source"] } | null = null;
  for (const t of vector) {
    if (!t.isWeak) continue;
    const skill = TASK_TYPE_TO_DAILY_SKILL[t.taskType];
    if (!skill || priorities[skill] !== undefined) continue;
    priorities[skill] = t.priority;
    if (!focus) focus = { taskType: t.taskType, source: t.source };
  }
  return { priorities, focus };
}

/**
 * Personalization applies to TODAY and FUTURE virtual days only.
 *
 * Past virtual days must keep the base sequence: their completion is derived by
 * re-deriving items on every read, so reshaping a past day would retroactively
 * change what "done" meant that day and could flip an already-complete day back
 * to incomplete when the learner's weakness profile later changes.
 */
export function shouldPersonalizeDate(date: string, today = bangkokToday()): boolean {
  return date >= today;
}

export type DayExtraKind = "video" | "lesson" | "ai_practice" | "diagnosis";

export type DayExtra = {
  kind: DayExtraKind;
  emoji: string;
  title: string;
  subtitle?: string;
  href: string;
  /** Rough minutes, for the day-sheet label. */
  minutes: number;
  done: boolean;
  /** True when the resource exists but this user's tier can't open it yet (upsell chip). */
  locked?: boolean;
};

const COURSE_SLUG = "duolingo-fast-track";

/**
 * Course chapters that teach each task type, as 1-based human chapter numbers.
 * Resolved against `chapter.position` (which the seeder writes 0-based, so
 * chapter N has position N-1) — NEVER against the array index, because
 * getStudentCourse() drops chapters with no published lessons and would shift
 * every later chapter down.
 */
const TASK_COURSE_CHAPTERS: Record<string, number[]> = {
  dictation: [10],
  fill_in_blanks: [6],
  real_english_word: [9, 15],
  vocabulary_reading: [15],
  reading_comprehension: [12],
  write_about_photo: [2],
  read_and_write: [7, 8],
  speak_about_photo: [3],
  read_then_speak: [4, 11],
  interactive_speaking: [5],
  interactive_conversation_mcq: [13],
  interactive_listening: [13],
  conversation_summary: [13],
  summarize_conversation: [13],
};

/** Task types whose practice burns an AI credit (one shared monthly pool). */
const AI_TASK_TYPES = new Set([
  "write_about_photo",
  "read_and_write",
  "speak_about_photo",
  "read_then_speak",
  "interactive_speaking",
  "conversation_summary",
  "summarize_conversation",
]);

const BALANCED_LOW_WEAK_COUNT = 5;
const STALE_ASSESSMENT_DAYS = 30;
/** AI practice is suggested on these Bangkok weekdays (Mon/Thu) to pace credits. */
const AI_PRACTICE_WEEKDAYS = new Set([1, 4]);

/**
 * Weekday (0=Sun) of a YYYY-MM-DD that is ALREADY a Bangkok calendar date —
 * so it must be read as a plain date, not converted. Parsing it as +07:00 and
 * calling getUTCDay() would shift back into the previous UTC day and return
 * the wrong weekday for every date.
 */
function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

function hasAssessment(vector: TaskWeakness[]): boolean {
  return vector.some((t) => t.source === "mock" || t.source === "mini");
}

function latestAssessmentAt(vector: TaskWeakness[]): string | null {
  let latest: string | null = null;
  for (const t of vector) {
    if (t.source === "attempts") continue;
    if (!latest || t.at > latest) latest = t.at;
  }
  return latest;
}

const DIAGNOSIS_EXTRA_FIRST: DayExtra = {
  kind: "diagnosis",
  emoji: "🧭",
  title: "ทำ Mini Diagnosis หาจุดอ่อนก่อน (ฟรี ~25 นาที)",
  subtitle: "พอรู้จุดอ่อนแล้ว ปฏิทินจะจัดตารางเน้นจุดอ่อนให้อัตโนมัติ",
  href: "/mini-diagnosis/start",
  minutes: 25,
  done: false,
};

/**
 * Compute this date's typed extras for one user. Read-only; every source that
 * is missing (course tables not deployed, no profile, no weakness signal)
 * degrades to "fewer extras", never an error.
 */
export async function computeDayExtras({
  userId,
  date,
  tier,
  vector: vectorInput,
}: {
  userId: string;
  date: string;
  tier: DailyTier;
  /** Pass the caller's already-computed vector to avoid recomputing it (3 queries). */
  vector?: TaskWeakness[];
}): Promise<DayExtra[]> {
  // Extras are forward-looking suggestions ("watch this next"), so they only
  // apply to today and future days — a past day is a record, not a to-do list.
  const today = bangkokToday();
  if (date < today) return [];

  const vector =
    vectorInput ?? (await computeTaskWeaknessVector(userId).catch(() => [] as TaskWeakness[]));

  if (!hasAssessment(vector)) {
    return [DIAGNOSIS_EXTRA_FIRST];
  }

  // One profile read for BOTH gates below. Course access is the Fast Track VIP
  // grant, so a student who can open the course is VIP and has ample AI credits;
  // it is the free tier (1 lifetime credit) that must not be sent into a wall.
  const profile = await readProfile(userId);
  const courseLocked = !resolveCourseAccess(profile).allowed;
  const isFree = resolveEffectiveTierFromProfile(profile ?? { tier: "free" }) === "free";

  const extras: DayExtra[] = [];
  const weak = vector.filter((t) => t.isWeak);
  const balancedLow = weak.length >= BALANCED_LOW_WEAK_COUNT;

  // ---- stale-assessment nudge -------------------------------------------------
  const lastAt = latestAssessmentAt(vector);
  if (lastAt) {
    // Age is measured against TODAY, not the viewed date — otherwise every day
    // far enough in the future would permanently show a "re-test" nudge.
    const ageDays = (Date.parse(`${today}T00:00:00Z`) - Date.parse(lastAt)) / 86_400_000;
    if (ageDays > STALE_ASSESSMENT_DAYS) {
      extras.push({
        kind: "diagnosis",
        emoji: "🧭",
        title: "อัปเดตจุดอ่อน — ทำ Mini Diagnosis อีกครั้ง",
        subtitle: `ผลล่าสุดของคุณเก่ากว่า ${STALE_ASSESSMENT_DAYS} วันแล้ว`,
        href: "/mini-diagnosis/start",
        minutes: 25,
        done: false,
      });
    }
  }

  // ---- video (course) — only on days with room for it (tier >= 20) -----------
  if (tier >= 20) {
    const video = await pickNextVideo(userId, weak, balancedLow, courseLocked).catch(() => null);
    if (video) extras.push(video);
  }

  // ---- lesson bank for the top weakness --------------------------------------
  const lessonFocus = weak.find((t) => weaknessResourceFor(t.taskType)?.lessonHref);
  if (lessonFocus) {
    const res = weaknessResourceFor(lessonFocus.taskType)!;
    extras.push({
      kind: "lesson",
      emoji: "📘",
      title: `บทเรียน ${res.labelTh}`,
      subtitle: "ฟรี · ด่านถัดไปของคุณปลดล็อกไว้แล้ว",
      href: res.lessonHref!,
      minutes: 5,
      done: false,
    });
  }

  // ---- AI-graded practice, paced to ~2 credits/week --------------------------
  if (AI_PRACTICE_WEEKDAYS.has(weekdayOf(date))) {
    const aiFocus = weak.find(
      (t) => AI_TASK_TYPES.has(t.taskType) && weaknessResourceFor(t.taskType)?.practiceHref,
    );
    if (aiFocus) {
      const res = weaknessResourceFor(aiFocus.taskType)!;
      extras.push({
        kind: "ai_practice",
        emoji: "🤖",
        title: `ฝึก ${res.labelTh} พร้อมรีวิวจาก AI`,
        subtitle: isFree
          ? "แพลนฟรีมีเครดิต AI 1 ครั้ง — อัปเกรดเพื่อฝึกได้ต่อเนื่อง"
          : "ใช้ 1 เครดิต AI · แนะนำสัปดาห์ละ ~2 ครั้ง",
        href: isFree ? "/pricing" : res.practiceHref!,
        minutes: 10,
        done: false,
        locked: isFree,
      });
    }
  }

  return extras;
}

/**
 * The next unwatched published course video along this student's chapter walk:
 * balanced-low students walk chapters front-to-back; focused students walk the
 * chapters mapped to their weak tasks (weakest first), with the orientation
 * chapter prepended when they have watched nothing at all.
 */
async function pickNextVideo(
  userId: string,
  weak: TaskWeakness[],
  balancedLow: boolean,
  locked: boolean,
): Promise<DayExtra | null> {
  const course = await getStudentCourse(COURSE_SLUG, userId);
  if (!course || !course.chapters.length) return null;

  // Chapter N ⇒ position N-1. Chapters missing from this map were filtered out
  // for having no published lessons, and are simply skipped by the walk.
  const byChapterNumber = new Map<number, (typeof course.chapters)[number]>();
  for (const c of course.chapters) byChapterNumber.set(c.position + 1, c);

  let walk: number[];
  if (balancedLow) {
    walk = course.chapters.map((c) => c.position + 1).sort((a, b) => a - b);
  } else {
    const seen = new Set<number>();
    walk = [];
    if (course.totals.completed === 0) {
      walk.push(1);
      seen.add(1);
    }
    for (const t of weak) {
      for (const ch of TASK_COURSE_CHAPTERS[t.taskType] ?? []) {
        if (!seen.has(ch)) {
          walk.push(ch);
          seen.add(ch);
        }
      }
    }
    if (!walk.length) return null;
  }

  for (const chNumber of walk) {
    const chapter = byChapterNumber.get(chNumber);
    if (!chapter) continue;
    const lesson = chapter.lessons.find((l) => !l.completed && l.bunnyVideoGuid);
    if (!lesson) continue;

    return {
      kind: "video",
      emoji: "🎬",
      title: lesson.title,
      subtitle: chapter.title,
      // Locked = no Fast Track VIP yet: send them to pricing, not a gate page.
      href: locked ? "/pricing" : `${COURSE_HREF}?lesson=${lesson.id}`,
      minutes: lesson.durationSeconds ? Math.max(1, Math.round(lesson.durationSeconds / 60)) : 15,
      done: false,
      locked,
    };
  }
  return null;
}

type ProfileRow = {
  role?: string | null;
  tier: unknown;
  tier_expires_at?: string | null;
  vip_granted_by_course?: boolean | null;
};

async function readProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("role, tier, tier_expires_at, vip_granted_by_course")
      .eq("id", userId)
      .maybeSingle();
    return (data ?? null) as ProfileRow | null;
  } catch {
    return null;
  }
}
