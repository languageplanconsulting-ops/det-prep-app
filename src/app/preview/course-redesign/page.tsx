import { CoursePlanClient } from "@/components/course/CoursePlanClient";
import { PlacementRunner } from "@/components/course/PlacementRunner";
import { DrillPreview } from "@/app/preview/course-redesign/DrillPreview";
import type { StudentChapter, StudentCourse, StudentLesson } from "@/lib/course-student-data";
import type { WeeklyScore } from "@/lib/course-plan/weekly-scores";
import type { TaskWeakness } from "@/lib/study-plan/weakness-vector";

/**
 * The real /course UI, running on fixture data.
 *
 * /course sits behind the middleware session gate, so the only way to look at
 * the planner without a live VIP account is to mount the same component with a
 * stand-in course. Everything here is fake except the component tree — the
 * tabs, the session runner, the bonus round and the calendar are the shipping
 * ones, so this is a genuine render check rather than a mock-up.
 *
 * No writes reach the server: `hasUser` is false, which is what tells
 * CoursePlanClient to stay on localStorage.
 */
export const dynamic = "force-dynamic";

function PreviewBar() {
  return (
    <p className="bg-slate-900 px-4 py-2 text-center text-[13px] font-semibold text-white">
      พรีวิวหน้าคอร์ส · ข้อมูลตัวอย่าง ไม่ใช่คะแนนจริง และไม่บันทึกอะไรขึ้นระบบ
    </p>
  );
}

let lessonSeq = 0;
function lesson(title: string, taskType: string | null, level: string | null, minutes: number): StudentLesson {
  lessonSeq += 1;
  return {
    id: `preview-lesson-${lessonSeq}`,
    title,
    position: lessonSeq,
    taskType,
    level,
    // No Bunny guid — the session shows its "คลิปนี้กำลังจัดทำอยู่" state instead
    // of trying to stream something that does not exist.
    bunnyVideoGuid: null,
    durationSeconds: minutes * 60,
    freePreview: false,
    completed: false,
    watchedSeconds: 0,
    downloads: [],
  };
}

let chapterSeq = 0;
function chapter(title: string, studyBlock: string, lessons: StudentLesson[]): StudentChapter {
  chapterSeq += 1;
  return {
    id: `preview-chapter-${chapterSeq}`,
    title,
    position: chapterSeq,
    studyBlock,
    lessons,
    progressPercent: 0,
  };
}

const PREVIEW_COURSE: StudentCourse = {
  id: "preview-course",
  slug: "duolingo-fast-track",
  title: "Duolingo Fast Track (พรีวิว)",
  description: "ข้อมูลตัวอย่างสำหรับดูหน้าตาเท่านั้น",
  chapters: [
    chapter("เขียนบรรยายภาพ", "production", [
      lesson("เขียนบรรยายภาพ · พื้นฐาน", "write_about_photo", "easy", 8),
      lesson("เขียนบรรยายภาพ · ระดับกลาง", "write_about_photo", "medium", 9),
    ]),
    chapter("พูดบรรยายภาพ", "production", [
      lesson("พูดบรรยายภาพ · พื้นฐาน", "speak_about_photo", "easy", 7),
    ]),
    chapter("เขียนตามคำบอก", "comprehension", [
      lesson("เขียนตามคำบอก · จับเสียงท้ายคำ", "dictation", "easy", 6),
      lesson("เขียนตามคำบอก · ประโยคยาว", "dictation", "medium", 8),
    ]),
    chapter("เติมคำในช่องว่าง", "literacy", [
      lesson("เติมคำในช่องว่าง · ไวยากรณ์ที่ออกบ่อย", "fill_in_blanks", "easy", 7),
    ]),
    chapter("อ่านจับใจความ", "comprehension", [
      lesson("อ่านจับใจความ · หาคำตอบให้ไว", "reading_comprehension", "easy", 9),
    ]),
    chapter("สนทนาโต้ตอบ", "conversation", [
      lesson("สนทนาโต้ตอบ · เทคนิคตอบให้ตรงคำถาม", "interactive_speaking", "easy", 10),
    ]),
  ],
  totals: { lessons: 8, completed: 0, progressPercent: 0 },
};

/** A learner mid-way: strong at reading, weak at speaking. */
const PREVIEW_WEEKLY: WeeklyScore[] = [
  { taskType: "speak_about_photo", score160: 82, basis: "this_week", attempts: 3, deltaVsPrevWeek: 6, at: null },
  { taskType: "interactive_speaking", score160: 90, basis: "this_week", attempts: 2, deltaVsPrevWeek: -4, at: null },
  { taskType: "write_about_photo", score160: 104, basis: "last_week", attempts: 4, deltaVsPrevWeek: 9, at: null },
  { taskType: "dictation", score160: 112, basis: "this_week", attempts: 6, deltaVsPrevWeek: 3, at: null },
  { taskType: "fill_in_blanks", score160: 121, basis: "this_week", attempts: 5, deltaVsPrevWeek: 0, at: null },
  { taskType: "reading_comprehension", score160: 134, basis: "latest", attempts: 0, deltaVsPrevWeek: null, at: null },
];

const PREVIEW_WEAKNESS: TaskWeakness[] = PREVIEW_WEEKLY.map((w) => ({
  taskType: w.taskType,
  score160: w.score160,
  weight: 0.2,
  priority: (160 - w.score160) * 0.2,
  source: "mock",
  at: "2026-01-01T00:00:00.000Z",
  isWeak: w.score160 < 120,
}));

export default async function CourseRedesignPreview({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; drill?: string }>;
}) {
  const todayIso = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const { step, drill } = await searchParams;

  // ?step=placement shows what a brand-new learner meets first.
  if (step === "placement") {
    return (
      <>
        <PreviewBar />
        <PlacementRunner initialPlacements={[]} />
      </>
    );
  }

  // ?drill=<exerciseKey> opens one drill straight away. Reaching a given
  // exercise through the plan means finishing everything before it, which makes
  // checking a single drill's photo or hints far more work than it should be.
  if (drill) {
    return (
      <>
        <PreviewBar />
        <div className="mx-auto max-w-2xl p-4">
          <DrillPreview exerciseKey={drill} />
        </div>
      </>
    );
  }

  return (
    <>
      <PreviewBar />
      {/* hasUser so the score breakdown and rung ladder render, syncEnabled off
          so an admin with a live session cannot write this demo progress onto
          their own course_plan_settings row. */}
      <CoursePlanClient
        course={PREVIEW_COURSE}
        weakness={PREVIEW_WEAKNESS}
        weekly={PREVIEW_WEEKLY}
        hasUser
        syncEnabled={false}
        accessReason="vip"
        studentCourseEnabled
        todayIso={todayIso}
      />
    </>
  );
}
