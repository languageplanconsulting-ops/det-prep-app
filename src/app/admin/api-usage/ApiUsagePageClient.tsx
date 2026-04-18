"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";

type SummaryRow = {
  userId: string;
  email: string;
  estimatedTotalThb: number;
  estimatedTotalUsd: number;
  events: number;
  byOperationThb: Record<string, number>;
};

type SummaryResponse = {
  days: number;
  since: string;
  rowCount: number;
  capped: boolean;
  byUser: SummaryRow[];
  anonymous: {
    estimatedTotalThb: number;
    estimatedTotalUsd: number;
    events: number;
    byOperationThb: Record<string, number>;
  } | null;
  envHint: { thbPerUsd: string; note: string };
};

export function ApiUsagePageClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/api-usage/summary?days=${days}`, {
        credentials: "same-origin",
      });
      const j = (await res.json()) as SummaryResponse & { error?: string };
      if (!res.ok) {
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setData(j);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const grandThb =
    data != null
      ? data.byUser.reduce((a, r) => a + r.estimatedTotalThb, 0) +
        (data.anonymous?.estimatedTotalThb ?? 0)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#004AAD]">API usage (estimated THB)</h1>
          <p className="mt-1 text-xs text-neutral-600">
            Per signed-in learner when cookies are sent; anonymous bucket if the session was missing.
            Tune rates with env vars (see <code className="font-mono">api-usage-log.ts</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={`${mt.border} bg-neutral-100 px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
        >
          Refresh
        </button>
      </div>

      <div className={`${mt.border} ${mt.shadow} flex flex-wrap items-end gap-4 bg-white p-4`}>
        <label className="flex flex-col text-xs font-bold">
          Window (days)
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={`${mt.border} mt-1 bg-white px-2 py-1.5 text-sm shadow-[2px_2px_0_0_#000]`}
          >
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
            <option value={180}>180</option>
          </select>
        </label>
        {data ? (
          <p className="text-xs text-neutral-600">
            Loaded <span className="font-mono font-bold">{data.rowCount}</span> events
            {data.capped ? " (cap reached — raise MAX_ROWS or narrow window)" : ""} since{" "}
            <span className="font-mono">{new Date(data.since).toLocaleDateString()}</span>
          </p>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-neutral-600">Loading…</p> : null}
      {err ? (
        <p className="text-sm font-bold text-red-700">
          {err}
          {err.includes("Forbidden") ? (
            <span className="mt-1 block font-normal text-neutral-600">
              Sign in with a profile admin account or use the simple admin cookie where supported.
            </span>
          ) : null}
        </p>
      ) : null}

      {data && !loading ? (
        <>
          <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
            <p className="font-bold">Grand total (window)</p>
            <p className="mt-2 font-mono text-2xl text-[#004AAD]">
              ฿{grandThb.toFixed(2)} <span className="text-sm text-neutral-600">THB estimated</span>
            </p>
            <p className="mt-2 text-xs text-neutral-600">{data.envHint.note}</p>
            <p className="mt-1 text-xs text-neutral-600">
              THB/USD setting: <span className="font-mono">{data.envHint.thbPerUsd}</span>
            </p>
          </div>

          {data.anonymous && data.anonymous.events > 0 ? (
            <div className={`${mt.border} ${mt.shadow} bg-amber-50 p-4`}>
              <p className="font-bold">Unsigned or unknown session</p>
              <p className="mt-1 font-mono text-lg">
                ฿{data.anonymous.estimatedTotalThb.toFixed(2)} · {data.anonymous.events} events
              </p>
            </div>
          ) : null}

          <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
            <p className="font-bold">By member</p>
            <div className="mt-4 max-h-[min(70vh,720px)] overflow-auto rounded-sm border-2 border-neutral-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b-4 border-black bg-[#FFCC00]/40">
                  <tr>
                    <th className="p-2 font-black">Member</th>
                    <th className="p-2 text-right font-black">Events</th>
                    <th className="p-2 text-right font-black">฿ THB (est.)</th>
                    <th className="p-2 text-right font-black">USD (est.)</th>
                    <th className="p-2 font-black">Top operations (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byUser.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-neutral-500">
                        No logged usage in this window. Run the app against Supabase with migration 012
                        applied and ensure SUPABASE_SERVICE_ROLE_KEY is set on the server.
                      </td>
                    </tr>
                  ) : (
                    data.byUser.map((row) => {
                      const topOps = Object.entries(row.byOperationThb)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ฿${v.toFixed(2)}`)
                        .join(" · ");
                      return (
                        <tr key={row.userId} className="border-b border-neutral-200">
                          <td className="p-2">
                            <Link
                              href={`/admin/subscriptions/${row.userId}`}
                              className="font-semibold text-[#004AAD] underline decoration-2 underline-offset-2"
                            >
                              {row.email}
                            </Link>
                          </td>
                          <td className="p-2 text-right font-mono">{row.events}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            ฿{row.estimatedTotalThb.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-mono text-neutral-700">
                            ${row.estimatedTotalUsd.toFixed(4)}
                          </td>
                          <td className="p-2 text-[10px] text-neutral-700">{topOps || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <p className="text-xs text-neutral-600">
        <Link href="/admin" className="font-bold text-[#004AAD] underline">
          ← Admin home
        </Link>
      </p>
    </div>
  );
}
