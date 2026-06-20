"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  CountRow,
  SessionJourney,
  UserBehaviorSnapshot,
} from "@/lib/admin-user-behavior-data";

const WINDOWS = [7, 14, 30, 90] as const;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[6px] border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
      <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-neutral-900">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div> : null}
    </div>
  );
}

function BarList({
  title,
  hint,
  rows,
  showVisitors = true,
}: {
  title: string;
  hint?: string;
  rows: CountRow[];
  showVisitors?: boolean;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div className="rounded-[6px] border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide">{title}</h3>
        {hint ? <span className="text-[11px] text-neutral-400">{hint}</span> : null}
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-400">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.key} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-neutral-800" title={r.label}>
                  {r.label || r.key}
                </span>
                <span className="shrink-0 font-mono text-neutral-600">
                  {r.count}
                  {showVisitors ? (
                    <span className="text-neutral-400"> · {r.visitors}👤</span>
                  ) : null}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-black"
                  style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function JourneyRow({ j }: { j: SessionJourney }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[6px] border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs"
      >
        <span
          className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${
            j.isSignedIn ? "bg-amber-200" : "bg-neutral-200"
          }`}
        >
          {j.isSignedIn ? "FREE USER" : "ANON"}
        </span>
        <span className="font-mono text-neutral-500">{j.visitorId.slice(0, 14)}…</span>
        <span className="text-neutral-600">{j.events} events · {j.pages} pages</span>
        {j.device ? <span className="text-neutral-400">{j.device}</span> : null}
        <span className="ml-auto truncate text-neutral-500" title={j.lastPath ?? ""}>
          ↳ {j.lastPath ?? "—"}
        </span>
        <span className="shrink-0 text-neutral-400">{fmtTime(j.lastAt)}</span>
      </button>
      {open ? (
        <div className="border-t-2 border-black/10 px-3 py-2 text-[11px]">
          <div className="text-neutral-400">
            {fmtTime(j.firstAt)} → {fmtTime(j.lastAt)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {j.trail.length === 0 ? (
              <span className="text-neutral-400">No page views recorded.</span>
            ) : (
              j.trail.map((p, i) => (
                <span key={`${p}-${i}`} className="flex items-center gap-1">
                  <span className="rounded-[3px] bg-neutral-100 px-1.5 py-0.5 font-mono">{p}</span>
                  {i < j.trail.length - 1 ? <span className="text-neutral-300">→</span> : null}
                </span>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UserBehaviorClient() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [data, setData] = useState<UserBehaviorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-behavior?days=${windowDays}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData((await res.json()) as UserBehaviorSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">User behavior</h1>
          <p className="mt-1 text-sm text-neutral-500">
            What non-converted visitors (free + anonymous) click, view, and where they drop off.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`rounded-[4px] border-2 border-black px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000] ${
                days === w ? "bg-[#FFCC00]" : "bg-white hover:bg-ep-yellow/30"
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-500">Loading…</p>
      ) : error ? (
        <div className="mt-6 rounded-[6px] border-2 border-rose-500 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : !data ? null : !data.deployed ? (
        <div className="mt-6 rounded-[6px] border-2 border-black bg-amber-50 p-4 text-sm shadow-[3px_3px_0_0_#000]">
          <strong className="font-extrabold">Tracking table not deployed yet.</strong>
          <p className="mt-1 text-neutral-700">
            Run <code className="rounded bg-neutral-200 px-1">supabase/manual_run_user_activity_events.sql</code>{" "}
            in the Supabase SQL editor, then events will start flowing from free &amp; anonymous visitors.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card label="Visitors" value={data.totals.visitors} sub={`${data.windowDays}d`} />
            <Card label="Free users" value={data.totals.signedInFree} sub="signed in, unpaid" />
            <Card label="Anonymous" value={data.totals.anonymous} sub="logged out" />
            <Card label="Events" value={data.totals.events} />
            <Card label="Page views" value={data.totals.pageViews} />
            <Card label="Clicks" value={data.totals.clicks} />
          </div>

          {data.totals.events === 0 ? (
            <p className="mt-6 text-sm text-neutral-500">
              No events captured in this window yet. Browse the app as a logged-out or free user to generate some.
            </p>
          ) : (
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <BarList title="Top pages" hint="views · visitors" rows={data.topPages} />
                <BarList title="Most-clicked elements" hint="clicks · visitors" rows={data.topClicks} />
                <BarList
                  title="Key events (tagged)"
                  hint="paywall / upgrade / custom"
                  rows={data.namedEvents}
                />
                <BarList
                  title="Drop-off pages"
                  hint="last page before leaving"
                  rows={data.dropOffPages}
                />
              </div>

              {data.deviceBreakdown.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.deviceBreakdown.map((d) => (
                    <span
                      key={d.device}
                      className="rounded-[4px] border-2 border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000]"
                    >
                      {d.device}: {d.count}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6">
                <h2 className="text-lg font-extrabold tracking-tight">Recent journeys</h2>
                <p className="mb-3 text-xs text-neutral-500">
                  Click a row to expand the page trail. Newest first.
                </p>
                <div className="space-y-2">
                  {data.recentJourneys.map((j, i) => (
                    <JourneyRow key={`${j.visitorId}-${i}`} j={j} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
