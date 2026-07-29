#!/usr/bin/env node
/**
 * Seed courses/course_chapters/course_lessons from the completed Thinkific->Bunny
 * migration map. Idempotent: relies on the unique indexes in migration 038
 * (courses.source+source_course_id, chapters/lessons .+source_*_id) so re-running
 * after a partial failure upserts rather than duplicating.
 *
 *   node scripts/seed-duolingo-course.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local,
 * and migration 038_courses.sql already applied to the target DB.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MAP_PATH = "/Users/ongjui/Downloads/duolingo-fast-track-migration/lesson-video-map.json";
const COURSE_SLUG = "duolingo-fast-track";

async function loadEnv() {
  const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = { ...process.env };
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return env;
}

/** '0:16:10' -> 970 seconds. Some lessons have no duration recorded. */
function parseDuration(dur) {
  if (!dur) return null;
  const parts = dur.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/** Full GUIDs are 36 chars; a couple of lessons only have an 8-char prefix
 *  from a hand-reconciled map-write crash. Resolve those against Bunny by title. */
async function resolveShortGuids(env, lessons) {
  const short = lessons.filter((l) => l.bunnyGuid && l.bunnyGuid.length < 36);
  if (short.length === 0) return;

  const res = await fetch(
    `https://video.bunnycdn.com/library/${env.BUNNY_STREAM_LIBRARY}/videos?page=1&itemsPerPage=100`,
    { headers: { AccessKey: env.BUNNY_STREAM_KEY, accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Bunny list failed: ${res.status}`);
  const body = await res.json();

  for (const lesson of short) {
    const match = body.items.find((v) => v.guid.startsWith(lesson.bunnyGuid));
    if (!match) throw new Error(`Could not resolve short guid "${lesson.bunnyGuid}" for lesson "${lesson.title}"`);
    lesson.bunnyGuid = match.guid;
    console.log(`  resolved short guid ${lesson.bunnyGuid.slice(0, 8)}... -> full for "${lesson.title.slice(0, 40)}"`);
  }
}

async function main() {
  const env = await loadEnv();
  const map = JSON.parse(await readFile(MAP_PATH, "utf8"));

  const missing = map.lessons.filter((l) => l.video && !l.migrated);
  if (missing.length > 0) {
    throw new Error(`${missing.length} lessons with video are not migrated yet — aborting seed.`);
  }

  await resolveShortGuids(env, map.lessons);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .upsert(
      {
        slug: COURSE_SLUG,
        title: map.course,
        source: "thinkific",
        source_course_id: map.thinkificCourseId,
        status: "draft",
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (courseErr) throw new Error(`courses upsert: ${courseErr.message}`);
  console.log(`Course "${map.course}" -> ${course.id}`);

  // Group lessons by chapter, preserving the original scrape order for position.
  const chapterOrder = [];
  const byChapter = new Map();
  for (const lesson of map.lessons) {
    if (!byChapter.has(lesson.ch)) {
      byChapter.set(lesson.ch, []);
      chapterOrder.push(lesson.ch);
    }
    byChapter.get(lesson.ch).push(lesson);
  }

  let chapterCount = 0;
  let lessonCount = 0;

  for (const [ci, chapterTitle] of chapterOrder.entries()) {
    const lessons = byChapter.get(chapterTitle);
    // source_chapter_id isn't in the map; the chapter's own first lesson id is
    // stable across re-runs and unique per chapter, so it doubles as one.
    const sourceChapterId = `ch-${lessons[0].id}`;

    const { data: chapterRow, error: chErr } = await supabase
      .from("course_chapters")
      .upsert(
        {
          course_id: course.id,
          title: chapterTitle,
          position: ci,
          source_chapter_id: sourceChapterId,
        },
        { onConflict: "course_id,source_chapter_id" },
      )
      .select("id")
      .single();
    if (chErr) throw new Error(`chapter upsert (${chapterTitle}): ${chErr.message}`);
    chapterCount += 1;

    for (const [li, lesson] of lessons.entries()) {
      const kind = lesson.video ? "video" : "text";
      const { error: lErr } = await supabase.from("course_lessons").upsert(
        {
          chapter_id: chapterRow.id,
          title: lesson.title,
          position: li,
          source_lesson_id: lesson.id,
          kind,
          bunny_video_guid: lesson.bunnyGuid ?? null,
          duration_seconds: parseDuration(lesson.dur),
          free_preview: Boolean(lesson.freePreview),
          status: lesson.status === "draft" ? "draft" : "published",
          migration_status: lesson.migrated ? "done" : lesson.noVideo ? "skipped" : "pending",
        },
        { onConflict: "chapter_id,source_lesson_id" },
      );
      if (lErr) throw new Error(`lesson upsert (${lesson.title}): ${lErr.message}`);
      lessonCount += 1;
    }
  }

  console.log(`Seeded ${chapterCount} chapters / ${lessonCount} lessons.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
