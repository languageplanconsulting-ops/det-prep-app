import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type StudentLesson = {
  id: string;
  title: string;
  position: number;
  bunnyVideoGuid: string | null;
  durationSeconds: number | null;
  freePreview: boolean;
  completed: boolean;
  watchedSeconds: number;
  downloads: Array<{ id: string; label: string; fileSize: number | null }>;
};

export type StudentChapter = {
  id: string;
  title: string;
  position: number;
  lessons: StudentLesson[];
  /** 0-100 for THIS student. */
  progressPercent: number;
};

export type StudentCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  chapters: StudentChapter[];
  totals: { lessons: number; completed: number; progressPercent: number };
};

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "")
  );
}

/**
 * The course as one student sees it: published lessons only, with that
 * student's own completion state folded in.
 */
export async function getStudentCourse(
  slug: string,
  userId: string | null,
): Promise<StudentCourse | null> {
  const supabase = createServiceRoleSupabase();

  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("id, slug, title, description")
    .eq("slug", slug)
    .maybeSingle();
  if (courseErr) {
    if (isMissingTable(courseErr)) return null;
    throw new Error(`[course-student] course lookup failed: ${courseErr.message}`);
  }
  if (!course) return null;

  const { data: chapters, error: chErr } = await supabase
    .from("course_chapters")
    .select("id, title, position")
    .eq("course_id", course.id)
    .order("position", { ascending: true });
  if (chErr) throw new Error(`[course-student] chapters failed: ${chErr.message}`);

  const chapterIds = (chapters ?? []).map((c) => c.id);
  if (chapterIds.length === 0) {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      chapters: [],
      totals: { lessons: 0, completed: 0, progressPercent: 0 },
    };
  }

  // Students never see draft lessons, or lessons whose video never migrated.
  const { data: lessons, error: lErr } = await supabase
    .from("course_lessons")
    .select("id, chapter_id, title, position, bunny_video_guid, duration_seconds, free_preview")
    .in("chapter_id", chapterIds)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (lErr) throw new Error(`[course-student] lessons failed: ${lErr.message}`);

  const lessonIds = (lessons ?? []).map((l) => l.id);

  // Handouts.
  const downloadsByLesson = new Map<string, StudentLesson["downloads"]>();
  if (lessonIds.length > 0) {
    const { data: dl, error: dlErr } = await supabase
      .from("course_lesson_downloads")
      .select("lesson_id, label, position, course_downloads(id, file_name, file_size)")
      .in("lesson_id", lessonIds)
      .order("position", { ascending: true });
    if (dlErr && !isMissingTable(dlErr)) {
      throw new Error(`[course-student] downloads failed: ${dlErr.message}`);
    }
    type Row = {
      lesson_id: string;
      label: string | null;
      course_downloads: { id: string; file_name: string; file_size: number | null } | null;
    };
    for (const row of (dl ?? []) as unknown as Row[]) {
      const f = row.course_downloads;
      if (!f) continue;
      const list = downloadsByLesson.get(row.lesson_id) ?? [];
      list.push({ id: f.id, label: row.label ?? f.file_name, fileSize: f.file_size });
      downloadsByLesson.set(row.lesson_id, list);
    }
  }

  // This student's progress only.
  const progressByLesson = new Map<string, { completed: boolean; watched: number }>();
  if (userId && lessonIds.length > 0) {
    const { data: pr, error: prErr } = await supabase
      .from("course_lesson_progress")
      .select("lesson_id, status, watched_seconds")
      .eq("user_id", userId)
      .in("lesson_id", lessonIds);
    if (prErr && !isMissingTable(prErr)) {
      throw new Error(`[course-student] progress failed: ${prErr.message}`);
    }
    for (const row of (pr ?? []) as {
      lesson_id: string;
      status: string;
      watched_seconds: number;
    }[]) {
      progressByLesson.set(row.lesson_id, {
        completed: row.status === "completed",
        watched: row.watched_seconds ?? 0,
      });
    }
  }

  const byChapter = new Map<string, StudentLesson[]>();
  for (const l of lessons ?? []) {
    const p = progressByLesson.get(l.id);
    const list = byChapter.get(l.chapter_id) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      position: l.position,
      bunnyVideoGuid: l.bunny_video_guid,
      durationSeconds: l.duration_seconds,
      freePreview: l.free_preview,
      completed: p?.completed ?? false,
      watchedSeconds: p?.watched ?? 0,
      downloads: downloadsByLesson.get(l.id) ?? [],
    });
    byChapter.set(l.chapter_id, list);
  }

  const shaped: StudentChapter[] = (chapters ?? [])
    .map((c) => {
      const ls = byChapter.get(c.id) ?? [];
      const done = ls.filter((l) => l.completed).length;
      return {
        id: c.id,
        title: c.title,
        position: c.position,
        lessons: ls,
        progressPercent: ls.length === 0 ? 0 : Math.round((done / ls.length) * 100),
      };
    })
    // Hide chapters that ended up with no student-visible lessons.
    .filter((c) => c.lessons.length > 0);

  const all = shaped.flatMap((c) => c.lessons);
  const completed = all.filter((l) => l.completed).length;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    chapters: shaped,
    totals: {
      lessons: all.length,
      completed,
      progressPercent: all.length === 0 ? 0 : Math.round((completed / all.length) * 100),
    },
  };
}
