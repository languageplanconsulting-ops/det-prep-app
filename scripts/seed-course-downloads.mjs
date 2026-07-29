#!/usr/bin/env node
/**
 * Upload the downloaded lesson PDFs to Supabase Storage and link them to lessons.
 *
 *   node scripts/seed-course-downloads.mjs
 *
 * Requires migration 040 applied, and seed-duolingo-course.mjs already run so
 * course_lessons rows exist (matched by source_lesson_id = Thinkific content id).
 * Idempotent: re-running skips files already uploaded and re-links cleanly.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const DIR = "/Users/ongjui/Downloads/duolingo-fast-track-migration";
const MANIFEST = path.join(DIR, "duolingo-pdf-manifest.tsv");
const PDF_DIR = path.join(DIR, "pdfs");
const BUCKET = "course-downloads";

async function loadEnv() {
  const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const env = { ...process.env };
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars in .env.local");
  }
  return env;
}

/** Mirrors fetch-pdfs.sh: local files are prefixed with sha1(url)[0..8]. */
function urlHash(url) {
  return createHash("sha1").update(url).digest("hex").slice(0, 8);
}

async function main() {
  const env = await loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const rows = (await readFile(MANIFEST, "utf8"))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [lessonSourceId, label, url, size] = line.split("\t");
      return { lessonSourceId, label, url, size: size ? Number(size) : null };
    });

  const localFiles = await readdir(PDF_DIR);
  const byHash = new Map();
  for (const f of localFiles) {
    byHash.set(f.slice(0, 8), f);
  }

  // 1. Upload each unique file once.
  const uniqueUrls = [...new Set(rows.map((r) => r.url))];
  const downloadIdByUrl = new Map();
  let uploaded = 0;
  let reused = 0;

  for (const url of uniqueUrls) {
    const hash = urlHash(url);
    const local = byHash.get(hash);
    if (!local) {
      console.warn(`  no local file for ${url.slice(0, 70)} — run fetch-pdfs.sh first`);
      continue;
    }
    const storagePath = `duolingo-fast-track/${local}`;

    const { data: existing } = await supabase
      .from("course_downloads")
      .select("id")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existing) {
      downloadIdByUrl.set(url, existing.id);
      reused += 1;
      continue;
    }

    const bytes = await readFile(path.join(PDF_DIR, local));
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`storage upload (${local}): ${upErr.message}`);

    const meta = rows.find((r) => r.url === url);
    const { data: inserted, error: insErr } = await supabase
      .from("course_downloads")
      .insert({
        storage_path: storagePath,
        file_name: local.slice(9),
        mime: "application/pdf",
        file_size: meta?.size ?? bytes.length,
        source_url: url,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(`course_downloads insert (${local}): ${insErr.message}`);

    downloadIdByUrl.set(url, inserted.id);
    uploaded += 1;
    console.log(`  uploaded ${local.slice(9).slice(0, 55)}`);
  }

  // 2. Link files to lessons (a file can be attached to several lessons).
  const positionByLesson = new Map();
  let linked = 0;
  let missingLessons = 0;

  for (const row of rows) {
    const downloadId = downloadIdByUrl.get(row.url);
    if (!downloadId) continue;

    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("source_lesson_id", row.lessonSourceId)
      .maybeSingle();

    if (!lesson) {
      missingLessons += 1;
      continue;
    }

    const pos = positionByLesson.get(lesson.id) ?? 0;
    positionByLesson.set(lesson.id, pos + 1);

    const { error: linkErr } = await supabase.from("course_lesson_downloads").upsert(
      { lesson_id: lesson.id, download_id: downloadId, label: row.label, position: pos },
      { onConflict: "lesson_id,download_id" },
    );
    if (linkErr) throw new Error(`link (${row.label}): ${linkErr.message}`);
    linked += 1;
  }

  console.log(`\nFiles: ${uploaded} uploaded, ${reused} already present.`);
  console.log(`Links: ${linked} lesson attachments.`);
  if (missingLessons > 0) {
    console.warn(`${missingLessons} rows had no matching lesson — run seed-duolingo-course.mjs first.`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
