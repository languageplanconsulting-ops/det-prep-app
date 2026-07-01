"use client";

import { useEffect, useMemo, useState } from "react";

type FreeUserRow = {
  userId: string;
  email: string;
  name: string | null;
  tier: string;
  signedUpAt: string | null;
  tookTest: boolean;
  testCount: number;
  bestTotal: number | null;
  lastTestAt: string | null;
  weakestSkill: string | null;
  levelLabel: string | null;
  tests: Array<{ sessionId: string; total: number; createdAt: string }>;
  converted: boolean;
  activityEvents: number;
  lastActiveAt: string | null;
  bucket: "converted" | "test_no_convert" | "registered_no_test";
};

type Snapshot = {
  behaviorDeployed: boolean;
  generatedAt: string;
  summary: {
    totalRegistered: number;
    tookTest: number;
    tookTestPct: number;
    converted: number;
    convertedPct: number;
    registeredNoTest: number;
    testNoConvert: number;
    avgTestTotal: number | null;
  };
  funnel: Array<{ stage: string; value: number }>;
  users: FreeUserRow[];
};

type Filter = "all" | "registered_no_test" | "test_no_convert" | "converted";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function daysAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d <= 0) return "วันนี้";
  if (d === 1) return "เมื่อวาน";
  return `${d} วันก่อน`;
}

const BUCKET_BADGE: Record<FreeUserRow["bucket"], { label: string; cls: string }> = {
  converted: { label: "จ่ายแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  test_no_convert: { label: "ทำเทสต์ ยังไม่จ่าย", cls: "bg-amber-100 text-amber-700" },
  registered_no_test: { label: "ยังไม่ทำเทสต์", cls: "bg-rose-100 text-rose-700" },
};

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-black ${tone ?? "text-gray-900"}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

export function FreeUserFunnelClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/free-user-funnel")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Snapshot) => {
        if (active) setData(d);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.users.filter((u) => {
      if (filter !== "all" && u.bucket !== filter) return false;
      if (q && !u.email.toLowerCase().includes(q) && !(u.name ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, filter, query]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-sm text-red-700">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-gray-500">กำลังโหลด…</div>;
  }

  const s = data.summary;
  const maxFunnel = Math.max(...data.funnel.map((f) => f.value), 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Free users · ใครทำ Mini Test แล้วบ้าง</h1>
        <p className="mt-1 text-sm text-gray-500">
          ตามรอยผู้ใช้ฟรีตั้งแต่ลงทะเบียน → ทำ Mini Test → จ่ายเงิน เพื่อดูว่าหลุดตรงไหน
        </p>
      </header>

      {/* summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ลงทะเบียน" value={String(s.totalRegistered)} />
        <Stat
          label="ทำ Mini Test"
          value={String(s.tookTest)}
          sub={`${s.tookTestPct}% ของทั้งหมด`}
          tone="text-[#004AAD]"
        />
        <Stat
          label="จ่ายเงิน"
          value={String(s.converted)}
          sub={`${s.convertedPct}% ของทั้งหมด`}
          tone="text-emerald-600"
        />
        <Stat label="ยังไม่ทำเทสต์" value={String(s.registeredNoTest)} tone="text-rose-600" />
        <Stat label="ทำเทสต์ ไม่จ่าย" value={String(s.testNoConvert)} tone="text-amber-600" />
        <Stat label="คะแนนเฉลี่ย" value={s.avgTestTotal !== null ? String(s.avgTestTotal) : "—"} />
      </div>

      {/* funnel bars */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold text-gray-700">Funnel</p>
        <div className="space-y-2.5">
          {data.funnel.map((f, i) => {
            const pct = Math.round((f.value / maxFunnel) * 100);
            const ofTotal = s.totalRegistered ? Math.round((f.value / s.totalRegistered) * 100) : 0;
            const color = i === 0 ? "bg-gray-400" : i === 1 ? "bg-[#004AAD]" : "bg-emerald-500";
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-gray-600">{f.stage}</span>
                <div className="h-7 flex-1 overflow-hidden rounded-lg bg-gray-100">
                  <div
                    className={`flex h-full items-center justify-end rounded-lg px-2 ${color}`}
                    style={{ width: `${Math.max(pct, 6)}%` }}
                  >
                    <span className="font-mono text-xs font-bold text-white">{f.value}</span>
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-xs text-gray-400">
                  {ofTotal}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!data.behaviorDeployed ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ ตาราง <code>user_activity_events</code> ยังไม่ถูกติดตั้งบน DB จริง — คอลัมน์ &quot;กิจกรรม&quot;
          จะเป็น 0 จนกว่าจะรัน <code>supabase/manual_run_user_activity_events.sql</code>
        </div>
      ) : null}

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "ทั้งหมด"],
            ["registered_no_test", "ยังไม่ทำเทสต์"],
            ["test_no_convert", "ทำเทสต์ ไม่จ่าย"],
            ["converted", "จ่ายแล้ว"],
          ] as Array<[Filter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === key
                ? "border-[#004AAD] bg-[#004AAD] text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาอีเมล/ชื่อ…"
          className="ml-auto w-48 rounded-full border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#004AAD]"
        />
      </div>

      {/* table */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">ผู้ใช้</th>
              <th className="px-3 py-3 font-semibold">ลงทะเบียน</th>
              <th className="px-3 py-3 font-semibold">สถานะ</th>
              <th className="px-3 py-3 text-center font-semibold">Mini Test · คลิกดูรายงาน</th>
              <th className="px-3 py-3 text-right font-semibold">คะแนนดีสุด</th>
              <th className="px-3 py-3 font-semibold">จุดอ่อน</th>
              <th className="px-3 py-3 text-right font-semibold">กิจกรรม</th>
              <th className="px-3 py-3 font-semibold">ใช้งานล่าสุด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((u) => {
              const badge = BUCKET_BADGE[u.bucket];
              return (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.email}</div>
                    {u.name ? <div className="text-xs text-gray-400">{u.name}</div> : null}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{fmtDate(u.signedUpAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.tests.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {u.tests.map((t, i) => (
                          <a
                            key={t.sessionId}
                            href={`/mini-diagnosis/results/${t.sessionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`เปิดรายงานฉบับเต็ม · ${fmtDate(t.createdAt)} · ${t.total} คะแนน`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#004AAD]/30 bg-[#004AAD]/5 px-2 py-0.5 font-mono text-xs font-semibold text-[#004AAD] transition hover:bg-[#004AAD] hover:text-white"
                          >
                            {u.tests.length > 1 ? `#${u.tests.length - i} ` : ""}
                            {t.total}
                            <span aria-hidden>↗</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-gray-800">
                    {u.bestTotal !== null ? u.bestTotal : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{u.weakestSkill ?? "—"}</td>
                  <td className="px-3 py-3 text-right font-mono text-gray-600">
                    {u.activityEvents > 0 ? u.activityEvents : "—"}
                  </td>
                  <td className="px-3 py-3 text-gray-500">{daysAgo(u.lastActiveAt ?? u.lastTestAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                  ไม่พบผู้ใช้ตามเงื่อนไข
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        อัปเดต {fmtDate(data.generatedAt)} · แสดง {rows.length} จาก {data.users.length} ผู้ใช้
      </p>
    </div>
  );
}
