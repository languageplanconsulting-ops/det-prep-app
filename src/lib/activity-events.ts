import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Fine-grained behavioural telemetry for NON-CONVERTED users (free tier + anonymous).
 * Append-only; aggregated by the admin "User behavior" dashboard. See migration 027.
 *
 * Paid users are filtered out at ingest (see /api/track) — this table is only ever meant to
 * answer "why don't free/anonymous visitors convert?".
 */

export type ActivityDevice = "mobile" | "tablet" | "desktop";

export type ActivityEventInput = {
  /** 'page_view' | 'click' | 'paywall_view' | 'upgrade_click' | custom names. */
  eventName: string;
  /** Pathname only (no query string). */
  path?: string | null;
  targetLabel?: string | null;
  targetKey?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Client-reported event time (ISO); falls back to DB now() if absent/invalid. */
  occurredAt?: string | null;
};

export type ActivityIngestContext = {
  userId: string | null;
  anonId: string | null;
  sessionId: string | null;
  tier: string;
  referrer: string | null;
  device: ActivityDevice | null;
};

const MAX_EVENTS_PER_BATCH = 50;
const MAX_LABEL_LEN = 200;
const MAX_KEY_LEN = 200;
const MAX_PATH_LEN = 512;

function clamp(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Strip query/hash so we never persist tokens or PII that rides in the URL. */
function sanitizePath(value: string | null | undefined): string | null {
  const raw = clamp(value, MAX_PATH_LEN);
  if (!raw) return null;
  const noQuery = raw.split(/[?#]/)[0];
  return noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
}

function sanitizeMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (count >= 25) break;
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      out[key] = value.length > 500 ? value.slice(0, 500) : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
    count += 1;
  }
  return out;
}

export function deviceFromUserAgent(ua: string | null | undefined): ActivityDevice | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  return "desktop";
}

/**
 * Persist a batch of client-reported events. Identity/tier come from `ctx` (server-resolved),
 * never from the request body. Returns how many rows were written.
 */
export async function recordActivityEvents(
  events: ActivityEventInput[],
  ctx: ActivityIngestContext,
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const trimmed = (Array.isArray(events) ? events : []).slice(0, MAX_EVENTS_PER_BATCH);
  if (trimmed.length === 0) return { ok: true, inserted: 0 };

  const rows = trimmed
    .filter((e) => e && typeof e.eventName === "string" && e.eventName.trim())
    .map((e) => {
      const occurred =
        e.occurredAt && Number.isFinite(new Date(e.occurredAt).getTime())
          ? new Date(e.occurredAt).toISOString()
          : null;
      return {
        user_id: ctx.userId,
        anon_id: clamp(ctx.anonId, 100),
        session_id: clamp(ctx.sessionId, 100),
        tier: ctx.tier,
        event_name: clamp(e.eventName, 80),
        path: sanitizePath(e.path),
        target_label: clamp(e.targetLabel, MAX_LABEL_LEN),
        target_key: clamp(e.targetKey, MAX_KEY_LEN),
        metadata: sanitizeMetadata(e.metadata),
        referrer: clamp(ctx.referrer, MAX_PATH_LEN),
        device: ctx.device,
        ...(occurred ? { created_at: occurred } : {}),
      };
    });

  if (rows.length === 0) return { ok: true, inserted: 0 };

  const supabase = createServiceRoleSupabase();
  const { error } = await supabase.from("user_activity_events").insert(rows);
  if (error) {
    // Table-not-deployed is the common case before the migration is run — log once, don't throw.
    console.error("[activity-events] insert failed", error.message);
    return { ok: false, inserted: 0, error: error.message };
  }
  return { ok: true, inserted: rows.length };
}
