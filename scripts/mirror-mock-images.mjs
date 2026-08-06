#!/usr/bin/env node
/**
 * Backfill: copy every hotlinked mock-test photo into our own public
 * `mock-images` bucket and rewrite the DB rows to point at it.
 *
 * Why: fixed mock sets stored whatever URL the admin pasted — mostly
 * i.postimg.cc, a free host that rate-limits hard (20-25s stalls or outright
 * connection failures under load). Learners mid-mock got a permanent
 * "Loading photo..." spinner and wrote answers like "picture not show".
 *
 * Idempotent — already-mirrored URLs are skipped, so it is safe to re-run
 * (and worth re-running after any new set is uploaded by hand).
 *
 *   node scripts/mirror-mock-images.mjs            # mirror + write to DB
 *   node scripts/mirror-mock-images.mjs --dry-run  # report only
 */
import { createHash } from "node:crypto";
import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "mock-images";
const IMAGE_FIELDS = ["image_url", "imageUrl", "photo_url", "photoUrl", "img_url", "imgUrl"];
const PHOTO_TASKS = ["write_about_photo", "speak_about_photo"];
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i < 1 || line.trim().startsWith("#")) continue;
      const key = line.slice(0, i).trim();
      if (process.env[key]) continue;
      process.env[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/** Admins paste by hand — one row in production literally began "zhttps://". */
function normalizeImageUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const match = /https?:\/\/.+$/i.exec(trimmed);
  return match ? match[0] : trimmed;
}

function isMirrored(url) {
  return url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

function extensionFor(url, contentType) {
  const fromType = /image\/(png|jpeg|jpg|webp|gif|avif)/i.exec(contentType || "")?.[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;
  const fromPath = /\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i.exec(url)?.[1]?.toLowerCase();
  if (fromPath) return fromPath === "jpeg" ? "jpg" : fromPath;
  return "jpg";
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EnglishPlanBot/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") ?? "";
      const body = Buffer.from(await res.arrayBuffer());
      if (body.byteLength === 0) throw new Error("empty body");
      return { body, contentType };
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`download failed: ${lastError?.message ?? lastError}`);
}

async function ensureBucket() {
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"],
  });
  if (error) throw new Error(`createBucket: ${error.message}`);
  console.log(`created public bucket ${BUCKET}`);
}

const memo = new Map();

async function mirror(url) {
  if (memo.has(url)) return memo.get(url);
  const hash = createHash("sha1").update(url).digest("hex");

  const { data: existing } = await supabase.storage.from(BUCKET).list("set-photos", { search: hash, limit: 1 });
  const hit = existing?.find((f) => f.name.startsWith(hash));
  if (hit) {
    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(`set-photos/${hit.name}`).data.publicUrl;
    memo.set(url, publicUrl);
    return publicUrl;
  }

  const { body, contentType } = await fetchWithRetry(url);
  const path = `set-photos/${hash}.${extensionFor(url, contentType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: contentType || "image/jpeg",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`upload: ${error.message}`);
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  memo.set(url, publicUrl);
  console.log(`  ↑ ${(body.byteLength / 1024).toFixed(0)}KB → ${path}`);
  return publicUrl;
}

async function main() {
  if (!DRY_RUN) await ensureBucket();

  const { data: items, error } = await supabase
    .from("mock_fixed_set_items")
    .select("id,set_id,step_index,task_type,content")
    .in("task_type", PHOTO_TASKS)
    .order("set_id")
    .order("step_index");
  if (error) throw new Error(error.message);

  let changed = 0;
  let skipped = 0;
  const failures = [];

  for (const item of items ?? []) {
    const content = { ...(item.content ?? {}) };
    let dirty = false;

    for (const field of IMAGE_FIELDS) {
      const raw = content[field];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const url = normalizeImageUrl(raw);
      if (!/^https?:\/\//i.test(url)) continue;

      if (isMirrored(url)) {
        if (url !== raw) {
          content[field] = url;
          dirty = true;
        }
        continue;
      }

      console.log(`step ${item.step_index} (${item.task_type}) ${url}`);
      if (DRY_RUN) {
        skipped += 1;
        continue;
      }
      try {
        content[field] = await mirror(url);
        dirty = true;
      } catch (err) {
        console.error(`  ✗ ${err.message}`);
        failures.push({ id: item.id, step: item.step_index, url, reason: err.message });
      }
    }

    if (dirty && !DRY_RUN) {
      const { error: updErr } = await supabase
        .from("mock_fixed_set_items")
        .update({ content })
        .eq("id", item.id);
      if (updErr) {
        failures.push({ id: item.id, step: item.step_index, url: "-", reason: `update: ${updErr.message}` });
      } else {
        changed += 1;
      }
    } else if (!dirty) {
      skipped += 1;
    }
  }

  console.log(`\nphoto steps: ${items?.length ?? 0} · rewritten: ${changed} · already fine: ${skipped}`);
  if (failures.length) {
    console.log(`\ncould not mirror ${failures.length}:`);
    for (const f of failures) console.log(`  step ${f.step} ${f.url} — ${f.reason}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
