import Link from "next/link";

import { CoursePlanClient } from "@/components/course/CoursePlanClient";
import { PlacementRunner } from "@/components/course/PlacementRunner";
import { getAdminAccess } from "@/lib/admin-auth";
import { resolveCourseAccess, STUDENT_COURSE_ENABLED } from "@/lib/course-access";
import {
  AI_GRADED_PLACEMENT_TASKS,
  OBJECTIVE_PLACEMENT_TASKS,
} from "@/lib/course-plan/placement";
import {
  computeWeeklyScores,
  fetchSkillPlacements,
  type PlacementResult,
  type WeeklyScore,
} from "@/lib/course-plan/weekly-scores";
import { getStudentCourse, type StudentCourse } from "@/lib/course-student-data";
import { computeTaskWeaknessVector, type TaskWeakness } from "@/lib/study-plan/weakness-vector";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

const PLACEMENT_TASK_COUNT = OBJECTIVE_PLACEMENT_TASKS.length + AI_GRADED_PLACEMENT_TASKS.length;

export const dynamic = "force-dynamic";

const COURSE_SLUG = "duolingo-fast-track";

/**
 * Course home — plan settings, study blocks, and the drag-and-drop planner.
 *
 * Open to admins (code or role) and to VIP students once STUDENT_COURSE_ENABLED.
 * Real Supabase sessions are required for bank sync, redeem scores, and plan save.
 */
export default async function CourseHomePage() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = await getAdminAccess();
  let accessReason: "admin" | "vip" | null = admin.ok ? "admin" : null;

  if (!accessReason && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, tier, tier_expires_at, vip_granted_by_course")
      .eq("id", user.id)
      .maybeSingle();
    const access = resolveCourseAccess(profile ?? null);
    if (access.allowed) accessReason = access.reason;
    else return <LockedNotice reason={access.reason} />;
  } else if (!accessReason) {
    return <LockedNotice reason="not_logged_in" />;
  }

  let course: StudentCourse | null = null;
  let weakness: TaskWeakness[] = [];
  let weekly: WeeklyScore[] = [];
  let placements: PlacementResult[] = [];

  if (user) {
    const [c, w, p] = await Promise.all([
      getStudentCourse(COURSE_SLUG, user.id).catch(() => null),
      computeTaskWeaknessVector(user.id).catch(() => [] as TaskWeakness[]),
      fetchSkillPlacements(user.id).catch(() => [] as PlacementResult[]),
    ]);
    course = c;
    weakness = w;
    placements = p;
    weekly = await computeWeeklyScores(user.id, w, p).catch(() => [] as WeeklyScore[]);
  } else {
    // Admin-code preview has no user — still load the published course shell.
    course = await getStudentCourse(COURSE_SLUG, "00000000-0000-0000-0000-000000000000").catch(
      () => null,
    );
  }

  const todayIso = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  // Force the placement flow only while there's no real score history at all — once the
  // learner has actually practiced (weekly/weakness populate), stop gating on it even if a
  // few of the 12 skills never got placed; those quietly default to easy elsewhere instead
  // of blocking the course. Below the full count (not just ">0") so leaving mid-way still
  // resumes into PlacementRunner next visit, rather than dropping the remaining skills.
  const needsPlacement =
    Boolean(user) &&
    weekly.length === 0 &&
    weakness.length === 0 &&
    placements.length < PLACEMENT_TASK_COUNT;

  if (needsPlacement) {
    return <PlacementRunner initialPlacements={placements} />;
  }

  return (
    <CoursePlanClient
      course={course}
      weakness={weakness}
      weekly={weekly}
      hasUser={Boolean(user)}
      accessReason={accessReason}
      studentCourseEnabled={STUDENT_COURSE_ENABLED}
      todayIso={todayIso}
    />
  );
}

function LockedNotice({
  reason,
}: {
  reason: "not_logged_in" | "not_released" | "needs_vip";
}) {
  const copy =
    reason === "not_logged_in"
      ? {
          title: "เข้าสู่ระบบเพื่อเปิดคอร์ส",
          body: "ล็อกอินด้วยบัญชีจริงเพื่อซิงก์คลังข้อสอบ คะแนน และแผนเรียน",
          href: `/login?redirect=${encodeURIComponent("/course")}`,
          cta: "ไปหน้าเข้าสู่ระบบ",
        }
      : reason === "not_released"
        ? {
            title: "หน้านี้ยังไม่เปิด",
            body: "หน้าคอร์สยังอยู่ระหว่างเตรียมเปิด — ตอนนี้เข้าได้เฉพาะแอดมิน",
            href: "/practice",
            cta: "ไปหน้าฝึกข้อสอบ",
          }
        : {
            title: "คอร์สนี้สำหรับสมาชิก VIP Fast Track",
            body: "อัปเกรดเป็น VIP เพื่อเข้าเรียนคอร์สนี้แบบเต็มรูปแบบ",
            href: "/pricing",
            cta: "ดูแพ็กเกจ →",
          };

  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-5xl">🔒</p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{copy.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{copy.body}</p>
      <Link
        href={copy.href}
        className="mt-6 inline-block rounded-full bg-[#004AAD] px-7 py-4 text-base font-extrabold text-white"
      >
        {copy.cta}
      </Link>
    </main>
  );
}
