#!/usr/bin/env node
/**
 * Migrate a Thinkific course (structure + videos) into Supabase + Bunny Stream.
 *
 *   node scripts/thinkific-to-bunny.mjs --probe     # read-only: what does the API expose?
 *   node scripts/thinkific-to-bunny.mjs --seed      # write course/chapter/lesson rows only
 *   node scripts/thinkific-to-bunny.mjs --videos    # migrate video bytes (resumable)
 *
 * Credentials come from .env.local — never from argv, so they stay out of shell history:
 *   THINKIFIC_API_KEY, THINKIFIC_SUBDOMAIN, BUNNY_STREAM_LIBRARY, BUNNY_STREAM_KEY
 *
 * Video strategy, in order of preference:
 *   1. Bunny "fetch by URL" — Bunny pulls the file itself. No local disk, no ffmpeg.
 *   2. Stream-through — download to a temp file, PUT to Bunny, delete immediately.
 *      Only ever one file on disk at a time, so a 600-lesson course needs ~1 video
 *      worth of free space rather than the whole library.
 *
 * Resumability: every lesson carries migration_status. Anything already 'done' is
 * skipped, so re-running after a crash costs nothing.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";

const COURSE_SLUG = "duolingo-fast-track";
const THINKIFIC_COURSE_ID = "2158471";
const API = "https://api.thinkific.com/api/public/v1";
const BUNNY_API = "https://video.bunnycdn.com";

// ---------------------------------------------------------------- env

async function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  let raw = "";
  try {
    raw = await readFile(envPath, "utf8");
  } catch {
    throw new Error(`Missing ${envPath} — see the README block at the top of this script.`);
  }
  const env = { ...process.env };
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const missing = [
    "THINKIFIC_API_KEY",
    "THINKIFIC_SUBDOMAIN",
    "BUNNY_STREAM_LIBRARY",
    "BUNNY_STREAM_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((k) => !env[k] || env[k].startsWith("paste_"));
  if (missing.length) {
    throw new Error(`Missing/placeholder env vars in .env.local: ${missing.join(", ")}`);
  }
  return env;
}

// ---------------------------------------------------------------- thinkific

function thinkificHeaders(env) {
  return {
    "X-Auth-API-Key": env.THINKIFIC_API_KEY,
    "X-Auth-Subdomain": env.THINKIFIC_SUBDOMAIN,
    "Content-Type": "application/json",
  };
}

async function tGet(env, pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: thinkificHeaders(env) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Thinkific GET ${pathname} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/** Walk Thinkific's paginated list endpoints. */
async function tGetAll(env, pathname) {
  const items = [];
  let page = 1;
  for (;;) {
    const sep = pathname.includes("?") ? "&" : "?";
    const body = await tGet(env, `${pathname}${sep}page=${page}&limit=100`);
    items.push(...(body.items ?? []));
    const meta = body.meta?.pagination;
    if (!meta || page >= (meta.total_pages ?? 1)) break;
    page += 1;
  }
  return items;
}

// ---------------------------------------------------------------- bunny

function bunnyHeaders(env, extra = {}) {
  return { AccessKey: env.BUNNY_STREAM_KEY, accept: "application/json", ...extra };
}

async function bunnyCreateVideo(env, title) {
  const res = await fetch(`${BUNNY_API}/library/${env.BUNNY_STREAM_LIBRARY}/videos`, {
    method: "POST",
    headers: bunnyHeaders(env, { "Content-Type": "application/json" }),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny create → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.guid;
}

/** Ask Bunny to pull the source itself. Returns true on success. */
async function bunnyFetchByUrl(env, guid, sourceUrl) {
  const res = await fetch(
    `${BUNNY_API}/library/${env.BUNNY_STREAM_LIBRARY}/videos/${guid}/fetch`,
    {
      method: "POST",
      headers: bunnyHeaders(env, { "Content-Type": "application/json" }),
      body: JSON.stringify({ url: sourceUrl }),
    },
  );
  return res.ok;
}

async function bunnyUploadFile(env, guid, filePath) {
  const { size } = await stat(filePath);
  const file = await readFile(filePath);
  const res = await fetch(`${BUNNY_API}/library/${env.BUNNY_STREAM_LIBRARY}/videos/${guid}`, {
    method: "PUT",
    headers: bunnyHeaders(env, { "Content-Type": "application/octet-stream", "Content-Length": String(size) }),
    body: file,
  });
  if (!res.ok) throw new Error(`Bunny upload → ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// ---------------------------------------------------------------- probe

/**
 * The whole migration hinges on whether the API hands back a downloadable source
 * URL for a video. Find out cheaply, before writing anything.
 */
async function probe(env) {
  console.log(`\nProbing Thinkific API as subdomain "${env.THINKIFIC_SUBDOMAIN}"…\n`);

  const course = await tGet(env, `/courses/${THINKIFIC_COURSE_ID}`);
  console.log(`Course: ${course.name} (id ${course.id}, slug ${course.slug})`);

  const chapters = await tGetAll(env, `/courses/${THINKIFIC_COURSE_ID}/chapters`);
  console.log(`Chapters: ${chapters.length}`);

  let firstVideoContent = null;
  let lessonCount = 0;
  for (const ch of chapters) {
    const contents = await tGetAll(env, `/chapters/${ch.id}/contents`);
    lessonCount += contents.length;
    if (!firstVideoContent) {
      firstVideoContent = contents.find((c) => c.contentable_type === "Video");
    }
  }
  console.log(`Lessons: ${lessonCount}`);

  if (!firstVideoContent) {
    console.log("\nNo Video contents found — nothing to migrate.");
    return;
  }

  console.log(`\nSample video content #${firstVideoContent.id} (${firstVideoContent.name}):`);
  console.log(JSON.stringify(firstVideoContent, null, 2).slice(0, 1500));

  // The critical question: does any endpoint expose a source/download URL?
  for (const p of [
    `/videos/${firstVideoContent.contentable_id}`,
    `/contents/${firstVideoContent.id}`,
  ]) {
    try {
      const body = await tGet(env, p);
      const blob = JSON.stringify(body);
      const urls = [...blob.matchAll(/"(https?:\/\/[^"]+\.(?:mp4|mov|m3u8)[^"]*)"/g)].map((m) => m[1]);
      console.log(`\n${p} → keys: ${Object.keys(body).join(", ")}`);
      console.log(urls.length ? `  SOURCE URLS FOUND:\n   ${urls.join("\n   ")}` : "  (no direct media URL in payload)");
    } catch (err) {
      console.log(`\n${p} → ${err.message}`);
    }
  }

  console.log(
    "\nIf a source URL appeared above, --videos can run with zero local disk (Bunny fetch).\n" +
      "If not, Thinkific does not expose the file over the public API and the migration\n" +
      "needs the per-lesson 'Make this video downloadable' setting instead.",
  );
}

// ---------------------------------------------------------------- seed

async function seed(env, supabase) {
  const course = await tGet(env, `/courses/${THINKIFIC_COURSE_ID}`);
  const { data: courseRow, error: courseErr } = await supabase
    .from("courses")
    .upsert(
      {
        slug: COURSE_SLUG,
        title: course.name,
        description: course.description ?? null,
        source: "thinkific",
        source_course_id: String(course.id),
        status: "draft",
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (courseErr) throw new Error(`courses upsert: ${courseErr.message}`);

  const chapters = await tGetAll(env, `/courses/${THINKIFIC_COURSE_ID}/chapters`);
  let lessons = 0;

  for (const [ci, ch] of chapters.entries()) {
    const { data: chapterRow, error: chErr } = await supabase
      .from("course_chapters")
      .upsert(
        {
          course_id: courseRow.id,
          title: ch.name,
          position: ci,
          source_chapter_id: String(ch.id),
        },
        { onConflict: "course_id,source_chapter_id" },
      )
      .select("id")
      .single();
    if (chErr) throw new Error(`chapter upsert (${ch.name}): ${chErr.message}`);

    const contents = await tGetAll(env, `/chapters/${ch.id}/contents`);
    for (const [li, content] of contents.entries()) {
      const kind =
        content.contentable_type === "Video"
          ? "video"
          : content.contentable_type === "Quiz"
            ? "quiz"
            : content.contentable_type === "Download"
              ? "download"
              : content.contentable_type === "HtmlItem" || content.contentable_type === "Text"
                ? "text"
                : "other";

      const { error: lErr } = await supabase.from("course_lessons").upsert(
        {
          chapter_id: chapterRow.id,
          title: content.name,
          position: li,
          source_lesson_id: String(content.id),
          kind,
          free_preview: Boolean(content.free),
          status: "draft",
          // Non-video lessons have no bytes to move.
          migration_status: kind === "video" ? "pending" : "skipped",
        },
        { onConflict: "chapter_id,source_lesson_id" },
      );
      if (lErr) throw new Error(`lesson upsert (${content.name}): ${lErr.message}`);
      lessons += 1;
    }
  }

  console.log(`Seeded ${chapters.length} chapters / ${lessons} lessons for "${course.name}".`);
}

// ---------------------------------------------------------------- videos

/** Pull whatever source URL Thinkific will give us for a content item. */
async function resolveSourceUrl(env, sourceLessonId) {
  const content = await tGet(env, `/contents/${sourceLessonId}`).catch(() => null);
  const candidates = [];
  for (const body of [content]) {
    if (!body) continue;
    const blob = JSON.stringify(body);
    candidates.push(...[...blob.matchAll(/"(https?:\/\/[^"]+\.(?:mp4|mov|m3u8)[^"]*)"/g)].map((m) => m[1]));
  }
  return candidates[0] ?? null;
}

async function migrateVideos(env, supabase) {
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", COURSE_SLUG)
    .single();
  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("id")
    .eq("course_id", course.id);
  const chapterIds = chapters.map((c) => c.id);

  const { data: pending, error } = await supabase
    .from("course_lessons")
    .select("id, title, source_lesson_id")
    .in("chapter_id", chapterIds)
    .eq("kind", "video")
    .in("migration_status", ["pending", "failed"])
    .order("position");
  if (error) throw new Error(`lesson fetch: ${error.message}`);

  console.log(`${pending.length} video lessons to migrate.\n`);

  for (const [i, lesson] of pending.entries()) {
    const tag = `[${i + 1}/${pending.length}] ${lesson.title.slice(0, 50)}`;
    let tmpFile = null;
    try {
      await supabase
        .from("course_lessons")
        .update({ migration_status: "uploading", migration_error: null })
        .eq("id", lesson.id);

      const sourceUrl = await resolveSourceUrl(env, lesson.source_lesson_id);
      if (!sourceUrl) throw new Error("no source URL exposed by Thinkific API");

      const guid = await bunnyCreateVideo(env, lesson.title);

      // Preferred path: Bunny pulls it. Costs us zero disk.
      const fetched = await bunnyFetchByUrl(env, guid, sourceUrl);

      if (!fetched) {
        // Fallback: stream through this machine, one file at a time.
        tmpFile = path.join(os.tmpdir(), `thinkific-${lesson.source_lesson_id}.mp4`);
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`source download → ${res.status}`);
        await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpFile));
        await bunnyUploadFile(env, guid, tmpFile);
        await rm(tmpFile, { force: true });
        tmpFile = null;
      }

      await supabase
        .from("course_lessons")
        .update({ bunny_video_guid: guid, migration_status: "done", migration_error: null })
        .eq("id", lesson.id);
      console.log(`${tag} → ${fetched ? "fetched by Bunny" : "streamed"} (${guid})`);
    } catch (err) {
      if (tmpFile) await rm(tmpFile, { force: true }).catch(() => {});
      await supabase
        .from("course_lessons")
        .update({ migration_status: "failed", migration_error: String(err.message).slice(0, 400) })
        .eq("id", lesson.id);
      console.error(`${tag} → FAILED: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------- main

const mode = process.argv[2] ?? "--probe";
const env = await loadEnv();

if (mode === "--probe") {
  await probe(env);
} else {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  if (mode === "--seed") await seed(env, supabase);
  else if (mode === "--videos") await migrateVideos(env, supabase);
  else {
    console.error(`Unknown mode "${mode}". Use --probe, --seed or --videos.`);
    process.exit(1);
  }
}
