import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type CourseDownloadRow = {
  id: string;
  label: string;
  fileName: string;
  fileSize: number | null;
  storagePath: string;
};

export type CourseLessonRow = {
  id: string;
  title: string;
  position: number;
  kind: "video" | "text" | "quiz" | "download" | "other";
  bunnyVideoGuid: string | null;
  durationSeconds: number | null;
  freePreview: boolean;
  status: "draft" | "published";
  migrationStatus: "pending" | "uploading" | "done" | "failed" | "skipped";
  migrationError: string | null;
  downloads: CourseDownloadRow[];
  /** Completed / total student progress for this lesson. */
  completedCount: number;
};

export type CourseChapterRow = {
  id: string;
  title: string;
  position: number;
  /** DET block from migration 043. Null = inferred from the title. */
  studyBlock: string | null;
  lessons: CourseLessonRow[];
  /** 0-100, share of this chapter's lessons completed by enrolled students. */
  progressPercent: number;
};

export type CourseSnapshot = {
  /** False when migration 038 hasn't been applied to this environment yet. */
  deployed: boolean;
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  chapters: CourseChapterRow[];
  totals: {
    chapters: number;
    lessons: number;
    withVideo: number;
    pending: number;
    failed: number;
  };
};

type RawLesson = {
  id: string;
  chapter_id: string;
  title: string;
  position: number;
  kind: CourseLessonRow["kind"];
  bunny_video_guid: string | null;
  duration_seconds: number | null;
  free_preview: boolean;
  status: CourseLessonRow["status"];
  migration_status: CourseLessonRow["migrationStatus"];
  migration_error: string | null;
};

/**
 * The migration hasn't been deployed to this environment yet. PostgREST reports
 * this as PGRST205 ("Could not find the table ... in the schema cache") rather
 * than surfacing Postgres' own 42P01, so both have to be matched.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /schema cache/i.test(error.message ?? "")
  );
}

type SupabaseClient = ReturnType<typeof createServiceRoleSupabase>;

/** Handouts per lesson. Migration 040 may not be deployed yet, so a missing
 *  table degrades to "no downloads" rather than breaking the whole page. */
async function fetchDownloads(
  supabase: SupabaseClient,
  lessonIds: string[],
): Promise<Map<string, CourseDownloadRow[]>> {
  const out = new Map<string, CourseDownloadRow[]>();
  if (lessonIds.length === 0) return out;

  const { data, error } = await supabase
    .from("course_lesson_downloads")
    .select("lesson_id, label, position, course_downloads(id, file_name, file_size, storage_path)")
    .in("lesson_id", lessonIds)
    .order("position", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return out;
    throw new Error(`[admin-course] downloads lookup failed: ${error.message}`);
  }

  type Row = {
    lesson_id: string;
    label: string | null;
    course_downloads: {
      id: string;
      file_name: string;
      file_size: number | null;
      storage_path: string;
    } | null;
  };

  for (const row of (data ?? []) as unknown as Row[]) {
    const file = row.course_downloads;
    if (!file) continue;
    const list = out.get(row.lesson_id) ?? [];
    list.push({
      id: file.id,
      label: row.label ?? file.file_name,
      fileName: file.file_name,
      fileSize: file.file_size,
      storagePath: file.storage_path,
    });
    out.set(row.lesson_id, list);
  }
  return out;
}

/** How many students have completed each lesson. Migration 039 may not be
 *  deployed yet; treat a missing table as "no progress recorded". */
async function fetchCompletionCounts(
  supabase: SupabaseClient,
  lessonIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (lessonIds.length === 0) return out;

  const { data, error } = await supabase
    .from("course_lesson_progress")
    .select("lesson_id")
    .eq("status", "completed")
    .in("lesson_id", lessonIds);

  if (error) {
    if (isMissingTable(error)) return out;
    throw new Error(`[admin-course] progress lookup failed: ${error.message}`);
  }

  for (const row of (data ?? []) as { lesson_id: string }[]) {
    out.set(row.lesson_id, (out.get(row.lesson_id) ?? 0) + 1);
  }
  return out;
}

export async function getCourseSnapshot(slug: string): Promise<CourseSnapshot | null> {
  const supabase = createServiceRoleSupabase();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title, description, status")
    .eq("slug", slug)
    .maybeSingle();

  if (courseError) {
    if (isMissingTable(courseError)) {
      return {
        deployed: false,
        id: "",
        slug,
        title: slug,
        description: null,
        status: "draft",
        chapters: [],
        totals: { chapters: 0, lessons: 0, withVideo: 0, pending: 0, failed: 0 },
      };
    }
    throw new Error(`[admin-course] course lookup failed: ${courseError.message}`);
  }
  if (!course) return null;

  const { data: chaptersRaw, error: chaptersError } = await supabase
    .from("course_chapters")
    .select("id, title, position, study_block")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  // Migration 043 may not be deployed — retry without the column instead of
  // failing the whole admin page.
  let chapters = chaptersRaw as
    | { id: string; title: string; position: number; study_block?: string | null }[]
    | null;
  if (chaptersError) {
    const missingColumn =
      /study_block/.test(chaptersError.message) || chaptersError.code === "42703";
    if (!missingColumn) {
      throw new Error(`[admin-course] chapter lookup failed: ${chaptersError.message}`);
    }
    const retry = await supabase
      .from("course_chapters")
      .select("id, title, position")
      .eq("course_id", course.id)
      .order("position", { ascending: true });
    if (retry.error) {
      throw new Error(`[admin-course] chapter lookup failed: ${retry.error.message}`);
    }
    chapters = retry.data;
  }

  const chapterIds = (chapters ?? []).map((c) => c.id);
  let lessons: RawLesson[] = [];
  if (chapterIds.length > 0) {
    const { data, error } = await supabase
      .from("course_lessons")
      .select(
        "id, chapter_id, title, position, kind, bunny_video_guid, duration_seconds, free_preview, status, migration_status, migration_error",
      )
      .in("chapter_id", chapterIds)
      .order("position", { ascending: true });
    if (error) {
      throw new Error(`[admin-course] lesson lookup failed: ${error.message}`);
    }
    lessons = (data ?? []) as RawLesson[];
  }

  const lessonIds = lessons.map((l) => l.id);
  const downloadsByLesson = await fetchDownloads(supabase, lessonIds);
  const completedByLesson = await fetchCompletionCounts(supabase, lessonIds);

  const byChapter = new Map<string, CourseLessonRow[]>();
  for (const l of lessons) {
    const list = byChapter.get(l.chapter_id) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      position: l.position,
      kind: l.kind,
      bunnyVideoGuid: l.bunny_video_guid,
      durationSeconds: l.duration_seconds,
      freePreview: l.free_preview,
      status: l.status,
      migrationStatus: l.migration_status,
      migrationError: l.migration_error,
      downloads: downloadsByLesson.get(l.id) ?? [],
      completedCount: completedByLesson.get(l.id) ?? 0,
    });
    byChapter.set(l.chapter_id, list);
  }

  const shaped: CourseChapterRow[] = (chapters ?? []).map((c) => {
    const chapterLessons = byChapter.get(c.id) ?? [];
    const completed = chapterLessons.filter((l) => l.completedCount > 0).length;
    return {
      id: c.id,
      title: c.title,
      position: c.position,
      studyBlock: c.study_block ?? null,
      lessons: chapterLessons,
      progressPercent:
        chapterLessons.length === 0 ? 0 : Math.round((completed / chapterLessons.length) * 100),
    };
  });

  const all = shaped.flatMap((c) => c.lessons);

  return {
    deployed: true,
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    status: course.status,
    chapters: shaped,
    totals: {
      chapters: shaped.length,
      lessons: all.length,
      withVideo: all.filter((l) => l.bunnyVideoGuid).length,
      pending: all.filter((l) => l.migrationStatus === "pending").length,
      failed: all.filter((l) => l.migrationStatus === "failed").length,
    },
  };
}
