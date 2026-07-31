import Link from "next/link";
import { redirect } from "next/navigation";

import { CoursePlayerClient } from "@/components/course/CoursePlayerClient";
import { resolveCourseAccess, STUDENT_COURSE_ENABLED } from "@/lib/course-access";
import { getStudentCourse } from "@/lib/course-student-data";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

export default async function StudentCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/course/${slug}`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tier, tier_expires_at, vip_granted_by_course")
    .eq("id", user.id)
    .maybeSingle();

  const access = resolveCourseAccess(profile ?? null);

  if (!access.allowed) {
    return <LockedNotice reason={access.reason} />;
  }

  const course = await getStudentCourse(slug, user.id);
  if (!course) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black">ไม่พบคอร์สนี้</h1>
        <p className="mt-2 text-sm text-neutral-600">คอร์ส &ldquo;{slug}&rdquo; ยังไม่เปิดให้เรียน</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        {access.reason === "admin" && !STUDENT_COURSE_ENABLED && (
          <p className="ep-stat mb-3 inline-block border-2 border-black bg-[#FFCC00] px-2 py-1 text-xs font-black uppercase tracking-[0.15em]">
            พรีวิวสำหรับแอดมิน — นักเรียนยังเข้าไม่ได้
          </p>
        )}
        <h1 className="text-3xl font-black tracking-tight">{course.title}</h1>
        {course.description && (
          <p className="mt-2 text-sm text-neutral-600">{course.description}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 flex-1 border-2 border-black bg-white">
            <div
              className="h-full bg-[#FFCC00]"
              style={{ width: `${course.totals.progressPercent}%` }}
            />
          </div>
          <span
            className="shrink-0 text-sm font-black tabular-nums"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {course.totals.progressPercent}%
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          เรียนจบแล้ว {course.totals.completed} จาก {course.totals.lessons} บทเรียน
        </p>
      </header>

      <CoursePlayerClient course={course} initialLessonId={lessonParam ?? null} />
    </main>
  );
}

function LockedNotice({ reason }: { reason: "not_logged_in" | "not_released" | "needs_vip" }) {
  const copy =
    reason === "not_released"
      ? {
          title: "คอร์สนี้กำลังจะเปิดเร็ว ๆ นี้",
          body: "เรากำลังจัดเตรียมบทเรียนอยู่ อีกไม่นานจะเปิดให้เรียน",
        }
      : {
          title: "คอร์สนี้สำหรับสมาชิก VIP Fast Track",
          body: "อัปเกรดเป็น VIP เพื่อเข้าเรียนคอร์สนี้แบบเต็มรูปแบบ",
        };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="ep-brutal rounded-sm border-black bg-white p-8 text-center">
        <h1 className="text-2xl font-black tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-sm text-neutral-600">{copy.body}</p>
        {reason === "needs_vip" && (
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center rounded-[4px] border-4 border-black bg-[#FFCC00] px-5 py-2.5 font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            ดูแพ็กเกจ →
          </Link>
        )}
      </div>
    </main>
  );
}
