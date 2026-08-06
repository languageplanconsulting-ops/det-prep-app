import "server-only";

import { mirrorMockImage, ensureMockImageBucket } from "@/lib/mock-test/mirror-image";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Content self-heal: find media a learner would fail to load, and fix what can
 * be fixed without a human.
 *
 * Bug report 60ff3a3d is the shape this exists for — mock photos hotlinked to a
 * free image host that started stalling, so a paying learner sat on "Loading
 * photo..." through a graded step and we only found out because she wrote in.
 * The repair (copy the image onto our own storage) is mechanical and safe, so
 * there is no reason for a customer to be the one who notices.
 *
 * Images get repaired automatically. Audio can't be re-sourced mechanically, so
 * broken audio is reported for a human instead of silently "fixed".
 */

const IMAGE_FIELDS = ["image_url", "imageUrl", "photo_url", "photoUrl", "img_url", "imgUrl"] as const;
const AUDIO_FIELDS = ["audio_url", "scenario_audio_url"] as const;

/** Anything slower than this is treated as broken — a mock step is timed. */
const SLOW_MS = 6_000;
const TIMEOUT_MS = 15_000;

export type MediaProblem = {
  area: string;
  ref: string;
  url: string;
  reason: string;
  repairedTo?: string;
};

export type ContentHealthReport = {
  startedAt: string;
  finishedAt: string;
  scanned: number;
  healthy: number;
  repaired: MediaProblem[];
  unrepaired: MediaProblem[];
};

function isSelfHosted(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  return Boolean(base) && url.startsWith(base);
}

async function probe(url: string): Promise<{ ok: boolean; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    // Read the body: a host can answer headers fast and then stall on bytes,
    // which is exactly how the postimg failures presented.
    const buf = await res.arrayBuffer();
    const elapsed = Date.now() - startedAt;
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (buf.byteLength === 0) return { ok: false, reason: "empty response" };
    if (elapsed > SLOW_MS) return { ok: false, reason: `too slow (${elapsed}ms)` };
    return { ok: true, reason: "" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? `${err.name}: ${err.message}` : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

function collectUrls(
  content: Record<string, unknown>,
  fields: readonly string[],
): Array<{ field: string; url: string }> {
  const out: Array<{ field: string; url: string }> = [];
  for (const field of fields) {
    const raw = content[field];
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    // data: URLs are inlined TTS — nothing to fetch, nothing to rot.
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ field, url });
  }
  return out;
}

/** Mock photo + audio steps. Photos self-heal; audio is reported only. */
async function checkMockSetItems(repair: boolean, report: ContentHealthReport): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("mock_fixed_set_items")
    .select("id,set_id,step_index,task_type,content");
  if (error) {
    report.unrepaired.push({ area: "mock_fixed_set_items", ref: "-", url: "-", reason: error.message });
    return;
  }

  for (const item of data ?? []) {
    const content = { ...((item.content ?? {}) as Record<string, unknown>) };
    const ref = `set ${item.set_id} · step ${item.step_index} (${item.task_type})`;
    let dirty = false;

    for (const { field, url } of collectUrls(content, IMAGE_FIELDS)) {
      report.scanned += 1;
      // An external host is a latent outage even while it happens to answer —
      // pull it in-house on sight rather than waiting for it to fail.
      const external = !isSelfHosted(url);
      const result = external ? { ok: false, reason: "external host" } : await probe(url);
      if (result.ok) {
        report.healthy += 1;
        continue;
      }
      if (!repair) {
        report.unrepaired.push({ area: "mock photo", ref, url, reason: result.reason });
        continue;
      }
      const mirrored = await mirrorMockImage(url);
      if (mirrored && mirrored !== url && isSelfHosted(mirrored)) {
        content[field] = mirrored;
        dirty = true;
        report.repaired.push({ area: "mock photo", ref, url, reason: result.reason, repairedTo: mirrored });
      } else {
        report.unrepaired.push({ area: "mock photo", ref, url, reason: `${result.reason}; mirror failed` });
      }
    }

    for (const { url } of collectUrls(content, AUDIO_FIELDS)) {
      report.scanned += 1;
      const result = await probe(url);
      if (result.ok) report.healthy += 1;
      // Audio can't be regenerated safely from here — a human decides.
      else report.unrepaired.push({ area: "mock audio", ref, url, reason: result.reason });
    }

    if (dirty) {
      const { error: updErr } = await supabase
        .from("mock_fixed_set_items")
        .update({ content })
        .eq("id", item.id);
      if (updErr) {
        report.unrepaired.push({ area: "mock photo", ref, url: "-", reason: `db update: ${updErr.message}` });
      }
    }
  }
}

/** Practice "speak about photo" bank — same hotlink exposure as the mock sets. */
async function checkPhotoSpeakItems(repair: boolean, report: ContentHealthReport): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("photo_speak_items")
    .select("id,image_url,is_active")
    .eq("is_active", true);
  if (error) {
    report.unrepaired.push({ area: "photo_speak_items", ref: "-", url: "-", reason: error.message });
    return;
  }

  for (const item of data ?? []) {
    const url = String(item.image_url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    report.scanned += 1;
    const result = isSelfHosted(url) ? await probe(url) : { ok: false, reason: "external host" };
    if (result.ok) {
      report.healthy += 1;
      continue;
    }
    const ref = `photo_speak_items ${item.id}`;
    if (!repair) {
      report.unrepaired.push({ area: "practice photo", ref, url, reason: result.reason });
      continue;
    }
    const mirrored = await mirrorMockImage(url);
    if (mirrored && mirrored !== url && isSelfHosted(mirrored)) {
      const { error: updErr } = await supabase
        .from("photo_speak_items")
        .update({ image_url: mirrored })
        .eq("id", item.id);
      if (updErr) {
        report.unrepaired.push({ area: "practice photo", ref, url, reason: `db update: ${updErr.message}` });
      } else {
        report.repaired.push({ area: "practice photo", ref, url, reason: result.reason, repairedTo: mirrored });
      }
    } else {
      report.unrepaired.push({ area: "practice photo", ref, url, reason: `${result.reason}; mirror failed` });
    }
  }
}

export async function runContentHealthCheck(
  options: { repair?: boolean } = {},
): Promise<ContentHealthReport> {
  const repair = options.repair !== false;
  const report: ContentHealthReport = {
    startedAt: new Date().toISOString(),
    finishedAt: "",
    scanned: 0,
    healthy: 0,
    repaired: [],
    unrepaired: [],
  };

  if (repair) {
    try {
      await ensureMockImageBucket();
    } catch (err) {
      report.unrepaired.push({
        area: "storage",
        ref: "mock-images bucket",
        url: "-",
        reason: err instanceof Error ? err.message : "bucket unavailable",
      });
    }
  }

  await checkMockSetItems(repair, report);
  await checkPhotoSpeakItems(repair, report);

  report.finishedAt = new Date().toISOString();
  return report;
}

/**
 * Bug reports still open that plausibly describe what we just repaired, so the
 * summary can tell the admin exactly who is owed a "this is fixed now" reply.
 */
export async function openReportsAboutMedia(): Promise<
  Array<{ id: string; reporterEmail: string; subject: string; createdAt: string }>
> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("bug_reports")
    .select("id,reporter_email,subject,details,status,created_at")
    .in("status", ["open", "investigating"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];

  const keywords = ["image", "photo", "picture", "รูป", "ภาพ", "audio", "เสียง", "load", "โหลด"];
  return (data ?? [])
    .filter((r) => {
      const haystack = `${r.subject ?? ""} ${r.details ?? ""}`.toLowerCase();
      return keywords.some((k) => haystack.includes(k));
    })
    .map((r) => ({
      id: r.id as string,
      reporterEmail: r.reporter_email as string,
      subject: r.subject as string,
      createdAt: r.created_at as string,
    }));
}
