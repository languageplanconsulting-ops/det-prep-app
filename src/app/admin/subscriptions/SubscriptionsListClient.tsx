"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAdminToast } from "@/components/admin/AdminToast";
import { formatBahtFromSatang } from "@/lib/money-format";

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  tier: string;
  tier_expires_at: string | null;
  vip_granted_by_course: boolean;
  derivedStatus: string;
  paymentKind: string;
  totalPaidSatang: number;
  monthlyLabel: string;
  subscriptionStart: string | null;
  sessionCount: number;
  lastActiveAt: string | null;
  mockTestCount: number;
};

type Stats = {
  totalUsers: number;
  activePaid: number;
  tierBreakdown: { basic: number; premium: number; vip: number };
  mrrSatang: number;
  churnedThisMonth: number;
};

function initials(name: string | null, email: string) {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/);
    return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

function tierBadge(tier: string, course: boolean) {
  const base =
    "inline-flex items-center gap-1 rounded-[4px] border-2 border-black px-2 py-0.5 text-xs font-black uppercase";
  if (tier === "vip" && course) {
    return (
      <span className={`${base} bg-[#FFCC00] text-black`}>
        👑 VIP · Course
      </span>
    );
  }
  const map: Record<string, string> = {
    free: "bg-neutral-200 text-neutral-800",
    basic: "bg-[#004AAD] text-white",
    premium: "bg-green-600 text-white",
    vip: "bg-[#FFCC00] text-black",
  };
  return (
    <span className={`${base} ${map[tier] ?? map.free}`}>{tier}</span>
  );
}

function statusDot(s: string) {
  if (s === "active")
    return <span className="text-green-600">● Active / ใช้งาน</span>;
  if (s === "expired")
    return <span className="text-red-600">● Expired / หมดอายุ</span>;
  if (s === "cancelled")
    return <span className="text-neutral-500">● Cancelled / ยกเลิก</span>;
  return <span className="text-blue-600">● Free trial / ทดลอง</span>;
}

function expiryStyle(iso: string | null, course: boolean) {
  if (course && !iso) {
    return (
      <span className="font-bold text-green-700 ep-stat">∞ Never / ไม่หมด</span>
    );
  }
  if (!iso) return <span className="ep-stat">—</span>;
  const d = new Date(iso);
  const days = (d.getTime() - Date.now()) / (86400 * 1000);
  const expired = days < 0;
  let cls = "text-green-700";
  if (expired) cls = "text-red-600 line-through";
  else if (days < 7) cls = "text-red-600";
  else if (days <= 14) cls = "text-yellow-700";
  return (
    <span className={`ep-stat font-bold ${cls}`}>
      {d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </span>
  );
}

export function SubscriptionsListClient() {
  const { push } = useAdminToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [sort, setSort] = useState("newest");

  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
      });
      if (search.trim()) p.set("search", search.trim());
      if (tier !== "all") p.set("tier", tier);
      if (status !== "all") p.set("status", status);
      if (payment !== "all") p.set("payment", payment);
      const res = await fetch(`/api/admin/subscriptions?${p}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as {
        rows: Row[];
        total: number;
        stats: Stats;
      };
      setRows(data.rows);
      setTotal(data.total);
      setStats(data.stats);
    } catch {
      push({
        type: "error",
        titleEn: "Failed to load subscriptions.",
        titleTh: "โหลดรายการสมาชิกไม่สำเร็จ",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, tier, status, payment, sort, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = (type: string) => {
    window.open(`/api/admin/subscriptions/export?type=${type}`, "_blank");
    push({
      type: "info",
      titleEn: "CSV export started.",
      titleTh: "เริ่มส่งออก CSV แล้ว",
    });
  };

  const copyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    push({
      type: "success",
      titleEn: "User ID copied.",
      titleTh: "คัดลอก User ID แล้ว",
    });
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-black text-[#004AAD]"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Subscription Management
          </h1>
          <p className="ep-stat text-sm text-neutral-600">
            การจัดการการสมัครสมาชิก
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv("all")}
          className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          Export CSV / ส่งออก CSV
        </button>
      </header>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Total users / ผู้ใช้ทั้งหมด",
              stats.totalUsers,
              "All registered accounts",
              "neutral",
            ],
            [
              "Active paid / ชำระแล้วใช้งาน",
              stats.activePaid,
              `Basic: ${stats.tierBreakdown.basic} · Premium: ${stats.tierBreakdown.premium} · VIP: ${stats.tierBreakdown.vip}`,
              "blue",
            ],
            [
              "MRR (est.) / รายได้ต่อเดือน",
              formatBahtFromSatang(stats.mrrSatang),
              "This month / เดือนนี้",
              "mono",
            ],
            [
              "Churn (actions) / ยกเลิก",
              stats.churnedThisMonth,
              "Cancelled or expired / ยกเลิกหรือหมดอายุ",
              "red",
            ],
          ].map(([k, v, sub, tone]) => (
            <div
              key={String(k)}
              className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
            >
              <p className="text-xs font-bold uppercase text-neutral-600">
                {k}
              </p>
              <p
                className={`mt-2 text-3xl font-black ${
                  tone === "blue"
                    ? "text-[#004AAD]"
                    : tone === "red"
                      ? "text-red-600"
                      : "text-neutral-900"
                } ep-stat`}
              >
                {v as string | number}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{sub as string}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
          placeholder="Search by email, name or ID... / ค้นหา"
          className="w-full rounded-[4px] border-4 border-black px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["tier", "Tier", ["all", "free", "basic", "premium", "vip"]],
              ["status", "Status", ["all", "active", "expired", "cancelled", "vip_course", "trial"]],
              ["payment", "Payment", ["all", "stripe", "manual", "course_grant"]],
              ["sort", "Sort", ["newest", "oldest", "name", "tier", "expiry"]],
            ] as const
          ).map(([key, label, opts]) => (
            <label key={key} className="text-xs font-bold">
              {label}
              <select
                key={key}
                value={
                  key === "tier"
                    ? tier
                    : key === "status"
                      ? status
                      : key === "payment"
                        ? payment
                        : sort
                }
                onChange={(e) => {
                  if (key === "tier") setTier(e.target.value);
                  if (key === "status") setStatus(e.target.value);
                  if (key === "payment") setPayment(e.target.value);
                  if (key === "sort") setSort(e.target.value);
                  setPage(1);
                }}
                className="ml-1 rounded-[4px] border-2 border-black bg-white px-2 py-1 ep-stat"
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[4px] border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead className="bg-[#004AAD] text-white">
            <tr>
              {[
                "User",
                "User ID",
                "Tier",
                "Status",
                "Payment",
                "Amount",
                "Start",
                "Expiry",
                "Sessions",
                "Last active",
                "Actions",
              ].map((h) => (
                <th key={h} className="border-b-4 border-black px-2 py-2 text-xs font-black uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="p-6 text-center ep-stat">
                  Loading… / กำลังโหลด
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="odd:bg-neutral-50">
                  <td className="border-b-2 border-black px-2 py-2">
                    <Link
                      href={`/admin/subscriptions/${r.id}`}
                      className="flex items-center gap-2 font-bold text-[#004AAD] hover:underline"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#004AAD] text-xs font-black text-white">
                        {initials(r.full_name, r.email)}
                      </span>
                      <span>
                        {r.full_name ?? "—"}
                        <br />
                        <span className="text-xs font-normal text-neutral-500">
                          {r.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="border-b-2 border-black px-2 py-2">
                    <button
                      type="button"
                      onClick={() => copyId(r.id)}
                      className="ep-stat max-w-[140px] truncate text-xs text-left underline"
                    >
                      {r.id.slice(0, 8)}…
                    </button>
                  </td>
                  <td className="border-b-2 border-black px-2 py-2">
                    {tierBadge(r.tier, r.vip_granted_by_course)}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2 text-xs">
                    {statusDot(r.derivedStatus)}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2 text-xs">
                    {r.paymentKind === "stripe"
                      ? "Stripe"
                      : r.paymentKind === "course_grant"
                        ? "Course grant"
                        : r.paymentKind === "manual"
                          ? "Manual"
                          : "—"}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2">
                    <p className="ep-stat text-xs font-bold">{r.monthlyLabel}</p>
                    <p className="ep-stat text-[10px] text-neutral-500">
                      {formatBahtFromSatang(r.totalPaidSatang)} total
                    </p>
                  </td>
                  <td className="border-b-2 border-black px-2 py-2 ep-stat text-xs">
                    {r.subscriptionStart
                      ? new Date(r.subscriptionStart).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2">
                    {expiryStyle(r.tier_expires_at, r.vip_granted_by_course)}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2 ep-stat text-xs">
                    {r.sessionCount}
                  </td>
                  <td
                    className={`border-b-2 border-black px-2 py-2 ep-stat text-xs ${
                      r.lastActiveAt &&
                      Date.now() - new Date(r.lastActiveAt).getTime() >
                        14 * 86400 * 1000
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    {r.lastActiveAt
                      ? `${Math.floor(
                          (Date.now() - new Date(r.lastActiveAt).getTime()) /
                            (86400 * 1000),
                        )}d ago`
                      : "—"}
                  </td>
                  <td className="border-b-2 border-black px-2 py-2">
                    <details className="relative">
                      <summary className="cursor-pointer text-xs font-bold">
                        Menu ▾
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 min-w-[180px] rounded-[4px] border-4 border-black bg-white p-2 shadow-[4px_4px_0_0_#000]">
                        <Link
                          href={`/admin/subscriptions/${r.id}`}
                          className="block py-1 text-xs hover:underline"
                        >
                          View profile / ดูโปรไฟล์
                        </Link>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ep-stat text-sm text-neutral-600">
          Showing {from}–{to} of {total} users / แสดง {from}–{to} จาก {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-[4px] border-4 border-black bg-white px-3 py-1 text-sm font-bold shadow-[4px_4px_0_0_#000] disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-[4px] border-4 border-black bg-white px-3 py-1 text-sm font-bold shadow-[4px_4px_0_0_#000] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
