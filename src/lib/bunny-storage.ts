import "server-only";

/**
 * Bunny Storage (plain object storage + CDN) — distinct from Bunny Stream,
 * which the course-video feature uses (scripts/thinkific-to-bunny.mjs) and
 * which transcodes every upload as a video. Storage has no transcoding: a
 * flat PUT/GET/DELETE by path within a storage zone, billed as GB stored +
 * CDN egress. That's the right product for many small speech-audio clips.
 *
 * Env:
 *   BUNNY_STORAGE_ZONE       storage zone name
 *   BUNNY_STORAGE_KEY        zone's read/write AccessKey (Storage → FTP & API Access)
 *   BUNNY_STORAGE_HOST       region endpoint, default storage.bunnycdn.com
 *                            (use e.g. ny.storage.bunnycdn.com / sg.storage.bunnycdn.com
 *                            to match the zone's region for lower latency)
 *
 * No pull-zone/public CDN hostname is required or used here: these are real
 * student voice recordings, so the zone stays private and every read goes
 * through this server-side AccessKey call rather than a public CDN URL.
 */

function config() {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const key = process.env.BUNNY_STORAGE_KEY?.trim();
  const host = process.env.BUNNY_STORAGE_HOST?.trim() || "storage.bunnycdn.com";
  if (!zone || !key) return null;
  return { zone, key, host };
}

export function isBunnyStorageConfigured(): boolean {
  return config() !== null;
}

function urlFor(host: string, zone: string, path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://${host}/${zone}/${cleanPath}`;
}

/** Uploads a buffer to `path` within the storage zone. Returns the path stored (not a public URL). */
export async function bunnyStorageUpload(
  path: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const cfg = config();
  if (!cfg) throw new Error("Bunny Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_KEY)");

  const res = await fetch(urlFor(cfg.host, cfg.zone, path), {
    method: "PUT",
    headers: {
      AccessKey: cfg.key,
      "Content-Type": contentType,
      "Content-Length": String(data.byteLength),
    },
    body: new Uint8Array(data),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bunny Storage upload failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return path;
}

/** Reads a file back out of the storage zone (for admin review — never expose this path publicly). */
export async function bunnyStorageDownload(path: string): Promise<Buffer> {
  const cfg = config();
  if (!cfg) throw new Error("Bunny Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_KEY)");

  const res = await fetch(urlFor(cfg.host, cfg.zone, path), {
    method: "GET",
    headers: { AccessKey: cfg.key },
  });
  if (!res.ok) {
    throw new Error(`Bunny Storage download failed (${res.status}) for ${path}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function bunnyStorageDelete(path: string): Promise<void> {
  const cfg = config();
  if (!cfg) throw new Error("Bunny Storage is not configured (BUNNY_STORAGE_ZONE/BUNNY_STORAGE_KEY)");

  const res = await fetch(urlFor(cfg.host, cfg.zone, path), {
    method: "DELETE",
    headers: { AccessKey: cfg.key },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Bunny Storage delete failed (${res.status}) for ${path}`);
  }
}

function extensionForMime(mimeType: string): string {
  const base = mimeType.split(";")[0]!.trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
  };
  return map[base] ?? "bin";
}

/** Builds `speech-recordings/{userId or "anon"}/{yyyy}/{mm}/{uuid}.{ext}`. */
export function buildSpeechRecordingPath(userId: string | null, mimeType: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionForMime(mimeType);
  const id = crypto.randomUUID();
  return `speech-recordings/${userId ?? "anon"}/${yyyy}/${mm}/${id}.${ext}`;
}
