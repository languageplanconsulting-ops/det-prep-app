import "server-only";

import { createHash } from "node:crypto";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Mock photo steps used to hotlink whatever host the admin pasted (postimg.cc,
 * unsplash, …). Free image hosts rate-limit and stall — a learner mid-mock then
 * stares at "Loading photo..." forever and burns the step timer on a blank box
 * (bug report 60ff3a3d, "picture not show"). So every external image is copied
 * once into our own public bucket and served from Supabase's CDN instead.
 */
export const MOCK_IMAGE_BUCKET = "mock-images";

const IMAGE_FIELDS = ["image_url", "imageUrl", "photo_url", "photoUrl", "img_url", "imgUrl"] as const;

/** Admins paste URLs by hand; a stray leading character is a real failure mode we've already seen. */
export function normalizeImageUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const match = /https?:\/\/.+$/i.exec(trimmed);
  return match ? match[0] : trimmed;
}

function isAlreadyMirrored(url: string): boolean {
  return url.includes(`/storage/v1/object/public/${MOCK_IMAGE_BUCKET}/`);
}

function extensionFor(url: string, contentType: string): string {
  const fromType = /image\/(png|jpeg|jpg|webp|gif|avif)/i.exec(contentType)?.[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;
  const fromPath = /\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i.exec(url)?.[1]?.toLowerCase();
  if (fromPath) return fromPath === "jpeg" ? "jpg" : fromPath;
  return "jpg";
}

async function fetchWithRetry(url: string, attempts = 3): Promise<{ body: Buffer; contentType: string }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    // postimg.cc regularly takes 20s+ under load, so be patient rather than fast-failing.
    const timeout = setTimeout(() => controller.abort(), 30_000);
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
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Could not download ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/**
 * Copies an external image into the public mock-images bucket and returns the
 * public URL. Idempotent: the storage path is derived from the source URL, so
 * re-saving a set costs one HEAD-ish existence check, not a re-download.
 * Returns the original URL unchanged when mirroring fails — a slow image still
 * beats no image.
 */
export async function mirrorMockImage(rawUrl: string): Promise<string> {
  const url = normalizeImageUrl(rawUrl);
  if (!url || !/^https?:\/\//i.test(url) || isAlreadyMirrored(url)) return url;

  const supabase = createServiceRoleSupabase();
  const hash = createHash("sha1").update(url).digest("hex");

  const { data: existing } = await supabase.storage
    .from(MOCK_IMAGE_BUCKET)
    .list("set-photos", { search: hash, limit: 1 });
  const hit = existing?.find((f) => f.name.startsWith(hash));
  if (hit) {
    return supabase.storage.from(MOCK_IMAGE_BUCKET).getPublicUrl(`set-photos/${hit.name}`).data.publicUrl;
  }

  try {
    const { body, contentType } = await fetchWithRetry(url);
    const path = `set-photos/${hash}.${extensionFor(url, contentType)}`;
    const { error } = await supabase.storage.from(MOCK_IMAGE_BUCKET).upload(path, body, {
      contentType: contentType || "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw error;
    return supabase.storage.from(MOCK_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error("[mirrorMockImage] falling back to source URL", url, err);
    return url;
  }
}

/** Rewrites every image field on a step's content in place-ish (returns a new object). */
export async function mirrorImagesInContent(
  content: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const next = { ...content };
  for (const field of IMAGE_FIELDS) {
    const raw = next[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    next[field] = await mirrorMockImage(raw);
  }
  return next;
}

/** Creates the public bucket if it isn't there yet (safe to call repeatedly). */
export async function ensureMockImageBucket(): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === MOCK_IMAGE_BUCKET)) return;
  await supabase.storage.createBucket(MOCK_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"],
  });
}
