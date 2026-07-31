import Link from "next/link";

import { CoursePlanClient } from "@/components/course/CoursePlanClient";
import { getAdminAccess } from "@/lib/admin-auth";
import { computeWeeklyScores, type WeeklyScore } from "@/lib/course-plan/weekly-scores";
import { getStudentCourse, type StudentCourse } from "@/lib/course-student-data";
import { computeTaskWeaknessVector, type TaskWeakness } from "@/lib/study-plan/weakness-vector";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

const COURSE_SLUG = "duolingo-fast-track";

/**
 * Course home — plan settings, study blocks, and the drag-and-drop planner.
 *
 * ADMIN ONLY for now, matching the student course player which is gated behind
 * STUDENT_COURSE_ENABLED until launch. Gate here is getAdminAccess(), so both
 * the simple-admin cookie and a profiles.role = 'admin' session get in.
 */
export default async function CourseHomePage() {
  const auth = await getAdminAccess();
  if (!auth.ok) return <LockedNotice />;

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let course: StudentCourse | null = null;
  let weakness: TaskWeakness[] = [];
  let weekly: WeeklyScore[] = [];

  if (user) {
    // All three degrade to empty rather than breaking the page: a simple-admin
    // session has no Supabase user, and a fresh account has no assessments.
    const [c, w] = await Promise.all([
      getStudentCourse(COURSE_SLUG, user.id).catch(() => null),
      computeTaskWeaknessVector(user.id).catch(() => [] as TaskWeakness[]),
    ]);
    course = c;
    weakness = w;
    weekly = await computeWeeklyScores(user.id, w).catch(() => [] as WeeklyScore[]);
  } else {
    course = await getStudentCourse(COURSE_SLUG, "00000000-0000-0000-0000-000000000000").catch(
      () => null,
    );
  }

  return (
    <CoursePlanClient
      course={course}
      weakness={weakness}
      weekly={weekly}
      hasUser={Boolean(user)}
      todayIso={new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)}
    />
  );
}

function LockedNotice() {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-5xl">🔒</p>
      <h1 className="mt-4 text-2xl font-black text-slate-900">หน้านี้ยังไม่เปิด</h1>
      <p className="mt-2 text-sm text-slate-600">
        หน้าคอร์สยังอยู่ระหว่างเตรียมเปิด — ตอนนี้เข้าได้เฉพาะแอดมิน
      </p>
      <Link
        href="/practice"
        className="mt-6 inline-block rounded-full bg-[#004AAD] px-6 py-3 text-sm font-black text-white"
      >
        ไปหน้าฝึกข้อสอบ
      </Link>
    </main>
  );
}
