import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Aggregations for the admin "User behavior" dashboard. Reads raw rows from
 * `user_activity_events` (non-converted traffic only) and rolls them up in JS.
 *
 * Sized for the current scale (tens of users). If the table grows large, push these
 * aggregations down into SQL RPCs instead of fetching rows.
 */

type RawEvent = {
  user_id: string | null;
  anon_id: string | null;
  session_id: string | null;
  tier: string | null;
  event_name: string;
  path: string | null;
  target_label: string | null;
  target_key: string | null;
  metadata: Record<string, unknown> | null;
  device: string | null;
  created_at: string;
};

export type CountRow = { key: string; label: string; count: number; visitors: number };

export type SessionJourney = {
  visitorId: string;
  isSignedIn: boolean;
  tier: string;
  device: string | null;
  events: number;
  pages: number;
  firstAt: string;
  lastAt: string;
  lastPath: string | null;
  trail: string[];
};

export type UserBehaviorSnapshot = {
  deployed: boolean;
  windowDays: number;
  totals: {
    events: number;
    visitors: number;
    signedInFree: number;
    anonymous: number;
    pageViews: number;
    clicks: number;
  };
  topPages: CountRow[];
  topClicks: CountRow[];
  namedEvents: CountRow[];
  dropOffPages: CountRow[];
  deviceBreakdown: Array<{ device: string; count: number }>;
  recentJourneys: SessionJourney[];
};

const MAX_ROWS = 8000;

function visitorKey(e: RawEvent): string {
  return e.user_id ? `u:${e.user_id}` : `a:${e.anon_id ?? "unknown"}`;
}

function bump(
  map: Map<string, { label: string; count: number; visitors: Set<string> }>,
  key: string,
  label: string,
  visitor: string,
) {
  const cur = map.get(key);
  if (cur) {
    cur.count += 1;
    cur.visitors.add(visitor);
  } else {
    map.set(key, { label, count: 1, visitors: new Set([visitor]) });
  }
}

function toRows(
  map: Map<string, { label: string; count: number; visitors: Set<string> }>,
  limit: number,
): CountRow[] {
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, label: v.label, count: v.count, visitors: v.visitors.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchUserBehaviorData(windowDays = 30): Promise<UserBehaviorSnapshot> {
  const supabase = createServiceRoleSupabase();
  const since = new Date(Date.now() - windowDays * 86400 * 1000).toISOString();

  const { data, error } = await supabase
    .from("user_activity_events")
    .select(
      "user_id, anon_id, session_id, tier, event_name, path, target_label, target_key, metadata, device, created_at",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  if (error) {
    const notDeployed = /Could not find the table|does not exist|relation .* does not exist/i.test(
      error.message,
    );
    if (notDeployed) {
      return emptySnapshot(windowDays, false);
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RawEvent[];
  if (rows.length === 0) return emptySnapshot(windowDays, true);

  const visitors = new Set<string>();
  const signedIn = new Set<string>();
  const anon = new Set<string>();
  let pageViews = 0;
  let clicks = 0;

  const pages = new Map<string, { label: string; count: number; visitors: Set<string> }>();
  const clickMap = new Map<string, { label: string; count: number; visitors: Set<string> }>();
  const named = new Map<string, { label: string; count: number; visitors: Set<string> }>();
  const devices = new Map<string, number>();

  // session_id → ordered events, for journeys + drop-off.
  const sessions = new Map<string, RawEvent[]>();

  for (const e of rows) {
    const visitor = visitorKey(e);
    visitors.add(visitor);
    if (e.user_id) signedIn.add(visitor);
    else anon.add(visitor);

    if (e.device) devices.set(e.device, (devices.get(e.device) ?? 0) + 1);

    if (e.event_name === "page_view") {
      pageViews += 1;
      bump(pages, e.path ?? "(unknown)", e.path ?? "(unknown)", visitor);
    } else if (e.event_name === "click") {
      clicks += 1;
      const key = e.target_key ?? "(click)";
      const label = e.target_label ? `${e.target_label}` : key;
      bump(clickMap, `${key}`, `${label}`, visitor);
    } else {
      // Named / tagged conversion-point events (paywall_view, upgrade_click, etc.).
      bump(named, e.event_name, e.event_name, visitor);
    }

    const sk = e.session_id ?? visitor;
    const arr = sessions.get(sk);
    if (arr) arr.push(e);
    else sessions.set(sk, [e]);
  }

  // Drop-off: the last page each session landed on before leaving.
  const dropOff = new Map<string, { label: string; count: number; visitors: Set<string> }>();
  const journeys: SessionJourney[] = [];
  for (const [, evs] of sessions) {
    const pageEvs = evs.filter((e) => e.event_name === "page_view" && e.path);
    const last = evs[evs.length - 1];
    const lastPath = pageEvs.length ? pageEvs[pageEvs.length - 1].path : last.path;
    if (lastPath) bump(dropOff, lastPath, lastPath, visitorKey(last));

    journeys.push({
      visitorId: visitorKey(last),
      isSignedIn: Boolean(last.user_id),
      tier: last.tier ?? "free",
      device: last.device,
      events: evs.length,
      pages: pageEvs.length,
      firstAt: evs[0].created_at,
      lastAt: last.created_at,
      lastPath: lastPath ?? null,
      trail: pageEvs.map((e) => e.path as string).slice(-12),
    });
  }

  journeys.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return {
    deployed: true,
    windowDays,
    totals: {
      events: rows.length,
      visitors: visitors.size,
      signedInFree: signedIn.size,
      anonymous: anon.size,
      pageViews,
      clicks,
    },
    topPages: toRows(pages, 20),
    topClicks: toRows(clickMap, 25),
    namedEvents: toRows(named, 20),
    dropOffPages: toRows(dropOff, 15),
    deviceBreakdown: Array.from(devices.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count),
    recentJourneys: journeys.slice(0, 40),
  };
}

function emptySnapshot(windowDays: number, deployed: boolean): UserBehaviorSnapshot {
  return {
    deployed,
    windowDays,
    totals: { events: 0, visitors: 0, signedInFree: 0, anonymous: 0, pageViews: 0, clicks: 0 },
    topPages: [],
    topClicks: [],
    namedEvents: [],
    dropOffPages: [],
    deviceBreakdown: [],
    recentJourneys: [],
  };
}
