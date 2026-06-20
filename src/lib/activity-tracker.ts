"use client";

/**
 * Client-side behavioural tracker for NON-CONVERTED users.
 *
 * Buffers events and flushes them in batches to /api/track via `navigator.sendBeacon`
 * (with a keepalive `fetch` fallback) so we never block navigation or lose events on unload.
 *
 * The SERVER decides whether to persist (it drops paid users); this layer only decides whether
 * to *send* — we suppress admins / preview mode locally to keep the data clean and save requests.
 */

const ANON_KEY = "ep_anon_id";
const SESSION_KEY = "ep_session_id";
const FLUSH_INTERVAL_MS = 8000;
const MAX_BUFFER = 20;

export type TrackEvent = {
  eventName: string;
  path?: string | null;
  targetLabel?: string | null;
  targetKey?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string | null;
};

let buffer: TrackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = false;

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

/** Turn tracking on/off. Called by the provider once it knows the user isn't paid/admin. */
export function setTrackingEnabled(value: boolean): void {
  enabled = value;
  if (!value) {
    buffer = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
}

export function isTrackingEnabled(): boolean {
  return enabled;
}

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/** Send whatever is buffered. `useBeacon` for unload paths. */
export function flush(useBeacon = false): void {
  if (typeof window === "undefined") return;
  if (buffer.length === 0) return;

  const payload = {
    anonId: getAnonId(),
    sessionId: getSessionId(),
    referrer: document.referrer || null,
    events: buffer,
  };
  buffer = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const body = JSON.stringify(payload);
  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    /* telemetry is best-effort */
  });
}

/** Queue an event. No-op when tracking is disabled. */
export function track(eventName: string, props: Partial<Omit<TrackEvent, "eventName">> = {}): void {
  if (!enabled || typeof window === "undefined") return;
  if (!eventName) return;
  buffer.push({
    eventName,
    path: props.path ?? window.location.pathname,
    targetLabel: props.targetLabel ?? null,
    targetKey: props.targetKey ?? null,
    metadata: props.metadata ?? null,
    occurredAt: new Date().toISOString(),
  });
  if (buffer.length >= MAX_BUFFER) {
    flush();
  } else {
    scheduleFlush();
  }
}
