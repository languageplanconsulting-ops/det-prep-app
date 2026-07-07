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
  aiPlanRemaining: number;
  aiAddonRemaining: number;
  aiTotalRemaining: number;
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
  if (s === "unsynced" || s === "cancelled")
    return (
      <span
        className="text-amber-600"
        title="Stripe customer ID present but tier is free. The webhook may have missed an async PromptPay confirmation. Open this user and click 'Re-sync from Stripe' to repair."
      >
        ⚠ Unsynced / ต้องดึง Stripe
      </span>
    );
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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

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

  const updateTier = async (row: Row, nextTier: string) => {
    setSavingId(row.id);
    try {
      const res = await fetch(`/api/admin/subscriptions/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: nextTier,
          reason: "Updated from subscriptions list",
          tier_expires_at: nextTier === "free" ? null : row.tier_expires_at,
          vip_granted_by_course: nextTier === "vip" ? row.vip_granted_by_course : false,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not update plan");
      }

      setRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                tier: nextTier,
                vip_granted_by_course: nextTier === "vip" ? item.vip_granted_by_course : false,
              }
            : item,
        ),
      );
      push({
        type: "success",
        titleEn: `Plan updated to ${nextTier}.`,
        titleTh: `อัปเดตแพลนเป็น ${nextTier} แล้ว`,
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn: e instanceof Error ? e.message : "Failed to update plan.",
        titleTh: "อัปเดตแพลนไม่สำเร็จ",
      });
    } finally {
      setSavingId(null);
    }
  };

  const repairMissingExpiry = async () => {
    if (repairing) return;
    const ok = window.confirm(
      "Find all paid users (basic/premium/vip) whose tier_expires_at is missing, then back-fill 30 days from their last payment, reset their AI counters, and clear lifetime_ai_used. Proceed?",
    );
    if (!ok) return;
    setRepairing(true);
    try {
      const res = await fetch("/api/admin/subscriptions/repair-missing-expiry", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Repair failed");
      const count = Array.isArray(json.repaired) ? json.repaired.length : 0;
      push({
        type: "success",
        titleEn:
          count === 0
            ? "No broken users found — all paid users have valid expiry."
            : `Repaired ${count} user${count === 1 ? "" : "s"}.`,
        titleTh:
          count === 0
            ? "ไม่พบผู้ใช้ที่ต้องซ่อม"
            : `ซ่อมแซมผู้ใช้แล้ว ${count} คน`,
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn: e instanceof Error ? e.message : "Repair failed.",
        titleTh: "ซ่อมแซมไม่สำเร็จ",
      });
    } finally {
      setRepairing(false);
    }
  };

  const syncAllUnsynced = async () => {
    if (syncingAll) return;
    const ok = window.confirm(
      "Scan all 'Unsynced' users (free tier + Stripe customer ID + no paid expiry) and pull their payment status from Stripe. This may take 30–60 seconds depending on how many users are stuck.\n\nProceed? / ดำเนินการต่อ?",
    );
    if (!ok) return;
    setSyncingAll(true);
    try {
      const res = await fetch("/api/admin/subscriptions/bulk-stripe-resync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      });
      const json = await res.json() as { fixed?: number; scanned?: number; skippedNoPaidSession?: number; errors?: number; error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Bulk sync failed");
      const { fixed = 0, scanned = 0, skippedNoPaidSession = 0, errors: errs = 0 } = json;
      push({
        type: fixed > 0 ? "success" : "info",
        titleEn:
          fixed > 0
            ? `Fixed ${fixed} of ${scanned} unsynced user${fixed === 1 ? "" : "s"}.${skippedNoPaidSession > 0 ? ` ${skippedNoPaidSession} had no paid Stripe session.` : ""}${errs > 0 ? ` ${errs} error${errs === 1 ? "" : "s"}.` : ""}`
            : `Scanned ${scanned} users — none had a paid Stripe session yet.`,
        titleTh:
          fixed > 0
            ? `แก้ไขแล้ว ${fixed} จาก ${scanned} คน`
            : `สแกน ${scanned} คนแล้ว — ไม่พบการชำระเงิน`,
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn: e instanceof Error ? e.message : "Bulk sync failed.",
        titleTh: "ซิงค์ไม่สำเร็จ",
      });
    } finally {
      setSyncingAll(false);
    }
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={repairMissingExpiry}
            disabled={repairing}
            className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {repairing
              ? "Repairing… / กำลังซ่อม…"
              : "Repair missing expiries / ซ่อมวันหมดอายุ"}
          </button>
          <button
            type="button"
            onClick={() => void syncAllUnsynced()}
            disabled={syncingAll}
            className="rounded-[4px] border-4 border-black bg-amber-400 px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingAll
              ? "Syncing… / กำลังซิงค์…"
              : "⚠ Sync All Unsynced / ซิงค์ทั้งหมด"}
          </button>
          <button
            type="button"
            onClick={() => exportCsv("all")}
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Export CSV / ส่งออก CSV
          </button>
        </div>
      </header>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Total users / ผู้ใช้ทั้งหมด",
              stats.totalUsers,
              "All registered accounts (free + paid)",
              "neutral",
            ],
            [
              "Active paid / ชำระแล้วใช้งาน",
              stats.activePaid,
              `Free users visible too · Basic: ${stats.tierBreakdown.basic} · Premium: ${stats.tierBreakdown.premium} · VIP: ${stats.tierBreakdown.vip}`,
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
              ["status", "Status", ["all", "active", "expired", "unsynced", "vip_course", "trial"]],
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
                "AI left",
                "Last active",
                "Manual plan",
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
                <td colSpan={13} className="p-6 text-center ep-stat">
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
                  <td className="border-b-2 border-black px-2 py-2">
                    <p className="ep-stat text-xs font-black text-[#004AAD]">
                      {Number.isFinite(r.aiTotalRemaining)
                        ? r.aiTotalRemaining
                        : "∞"}
                    </p>
                    <p className="ep-stat text-[10px] text-neutral-500">
                      plan {Number.isFinite(r.aiPlanRemaining) ? r.aiPlanRemaining : "∞"} + addon {r.aiAddonRemaining}
                    </p>
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
                    <select
                      value={r.tier}
                      disabled={savingId === r.id}
                      onChange={(e) => void updateTier(r, e.target.value)}
                      className="rounded-[4px] border-2 border-black bg-white px-2 py-1 text-xs font-bold uppercase"
                    >
                      {["free", "basic", "premium", "vip"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] font-bold text-neutral-500">
                      {savingId === r.id ? "Saving…" : "Change directly here"}
                    </p>
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
