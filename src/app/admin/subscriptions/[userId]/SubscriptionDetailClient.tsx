"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog";
import { useAdminToast } from "@/components/admin/AdminToast";
import {
  extractReportCard,
  extractSubmissionCard,
} from "@/lib/admin-study-activity-format";
import { formatBahtFromSatang } from "@/lib/money-format";

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("th-TH");
}

function endOfCurrentWeekIso(now = new Date()): string {
  const next = new Date(now);
  const day = next.getDay();
  const daysUntilSunday = (7 - day) % 7;
  next.setDate(next.getDate() + daysUntilSunday);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

function endOfCurrentMonthIso(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
}

function addExactDaysIso(days: number, now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

function getExpiryPreview(args: {
  mode: string;
  customExpiry: string;
  exactDays: string;
}): string | null {
  const now = new Date();
  if (args.mode === "7d") return addExactDaysIso(7, now);
  if (args.mode === "week_end") return endOfCurrentWeekIso(now);
  if (args.mode === "month_end") return endOfCurrentMonthIso(now);
  if (args.mode === "days") {
    const days = Math.max(1, Math.round(Number(args.exactDays || 0)));
    if (!Number.isFinite(days) || days <= 0) return null;
    return addExactDaysIso(days, now);
  }
  if (args.mode === "custom") {
    if (!args.customExpiry.trim()) return null;
    const parsed = new Date(args.customExpiry);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  return null;
}

function notebookPayloadLine(payload: unknown): {
  source: string;
  title: string;
  preview: string;
} {
  if (!payload || typeof payload !== "object") {
    return { source: "—", title: "—", preview: "" };
  }
  const p = payload as Record<string, unknown>;
  const source = typeof p.source === "string" ? p.source : "—";
  const titleEn = typeof p.titleEn === "string" ? p.titleEn : "";
  const titleTh = typeof p.titleTh === "string" ? p.titleTh : "";
  const title = [titleEn, titleTh].filter(Boolean).join(" / ") || "—";
  const bodyEn = typeof p.bodyEn === "string" ? p.bodyEn : "";
  const bodyTh = typeof p.bodyTh === "string" ? p.bodyTh : "";
  const preview = [bodyEn, bodyTh].join("\n").trim().slice(0, 500);
  return { source, title, preview };
}

export function SubscriptionDetailClient() {
  const params = useParams();
  const userId = params.userId as string;
  const { push } = useAdminToast();

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameEdit, setNameEdit] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [dialog, setDialog] = useState<{
    kind: "tier" | "revoke" | "extend" | "stripe" | "vip" | null;
    reason: string;
  }>({ kind: null, reason: "" });
  const [expandedStudySessionId, setExpandedStudySessionId] = useState<string | null>(null);
  const [tierSel, setTierSel] = useState("free");
  const [expiryLocal, setExpiryLocal] = useState("");
  const [aiUsedEdit, setAiUsedEdit] = useState("0");
  const [lifetimeAiUsedEdit, setLifetimeAiUsedEdit] = useState(false);
  const [weeklyLeftNowEdit, setWeeklyLeftNowEdit] = useState("0");
  const [monthlyLeftNowEdit, setMonthlyLeftNowEdit] = useState("0");
  const [grantCredits, setGrantCredits] = useState("1");
  const [grantExpiryMode, setGrantExpiryMode] = useState("7d");
  const [grantCustomExpiry, setGrantCustomExpiry] = useState("");
  const [grantExactDays, setGrantExactDays] = useState("7");
  const [grantMockCredits, setGrantMockCredits] = useState("1");
  const [grantMockExpiryMode, setGrantMockExpiryMode] = useState("week_end");
  const [grantMockCustomExpiry, setGrantMockCustomExpiry] = useState("");
  const [grantMockExactDays, setGrantMockExactDays] = useState("7");
  const [aiSaving, setAiSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fail");
      const j = (await res.json()) as Record<string, unknown>;
      setData(j);
      const p = j.profile as Record<string, unknown>;
      setNameEdit((p.full_name as string) ?? "");
      setTierSel((p.tier as string) ?? "free");
    } catch {
      push({
        type: "error",
        titleEn: "Could not load user.",
        titleTh: "โหลดผู้ใช้ไม่สำเร็จ",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.profile) return;
    const p = data.profile as Record<string, unknown>;
    setExpiryLocal(isoToDatetimeLocalValue(p.tier_expires_at as string | null | undefined));
  }, [data]);

  useEffect(() => {
    if (!data?.aiQuota) return;
    const aiQuota = data.aiQuota as Record<string, unknown>;
    setAiUsedEdit(String(aiQuota.monthlyUsed ?? 0));
    setLifetimeAiUsedEdit(aiQuota.lifetimeAiUsed === true);
    setWeeklyLeftNowEdit(String(aiQuota.learnerFacingRemaining ?? 0));
    setMonthlyLeftNowEdit(String(aiQuota.learnerMonthlyRemaining ?? 0));
  }, [data]);

  const profile = (data?.profile ?? {}) as Record<string, unknown>;
  const study = (data?.study ?? {}) as Record<string, unknown>;
  const weekly = (study.weeklyMinutes as number[]) ?? [0, 0, 0, 0];
  const chartData = weekly.map((v, i) => ({ week: `W${i + 1}`, minutes: v }));
  const notebookEntries = (data?.notebookEntries ?? []) as Record<string, unknown>[];
  const notebookSync = (data?.notebookSync ?? []) as Record<string, unknown>[];
  const mockTestScores = (data?.mockTestScores ?? []) as Record<string, unknown>[];
  const studySessionScores = (data?.studySessionScores ?? []) as Record<string, unknown>[];
  const aiQuota = (data?.aiQuota ?? {}) as Record<string, unknown>;
  const mockQuota = (data?.mockQuota ?? {}) as Record<string, unknown>;
  const feedbackCredits = (aiQuota.feedbackCredits ?? []) as Record<string, unknown>[];
  const mockCredits = (mockQuota.mockCredits ?? []) as Record<string, unknown>[];
  const learnerExtraExpiry =
    feedbackCredits
      .map((row) => (typeof row.expires_at === "string" ? row.expires_at : null))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
  const aiExpiryPreview = getExpiryPreview({
    mode: grantExpiryMode,
    customExpiry: grantCustomExpiry,
    exactDays: grantExactDays,
  });
  const mockExpiryPreview = getExpiryPreview({
    mode: grantMockExpiryMode,
    customExpiry: grantMockCustomExpiry,
    exactDays: grantMockExactDays,
  });

  const saveName = async () => {
    const res = await fetch(`/api/admin/subscriptions/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ full_name: nameEdit, reason: "Name edit" }),
    });
    if (!res.ok) {
      push({ type: "error", titleEn: "Update failed", titleTh: "ไม่สำเร็จ" });
      return;
    }
    push({ type: "success", titleEn: "Name updated.", titleTh: "อัปเดตชื่อแล้ว" });
    void load();
  };

  const saveMembershipExpiry = async (clear: boolean) => {
    if (!clear && !expiryLocal.trim()) {
      push({
        type: "error",
        titleEn: "Choose a date/time or use Clear expiry.",
        titleTh: "เลือกวันและเวลา หรือกดล้างวันหมดอายุ",
      });
      return;
    }
    const tier_expires_at = clear
      ? null
      : expiryLocal.trim()
        ? new Date(expiryLocal).toISOString()
        : null;
    const res = await fetch(`/api/admin/subscriptions/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        tier_expires_at,
        reason: clear
          ? "Admin cleared membership expiry"
          : "Admin set membership expiry",
      }),
    });
    if (!res.ok) {
      push({ type: "error", titleEn: "Could not save expiry.", titleTh: "บันทึกวันหมดอายุไม่สำเร็จ" });
      return;
    }
    push({ type: "success", titleEn: "Expiry updated.", titleTh: "อัปเดตวันหมดอายุแล้ว" });
    void load();
  };

  const postNote = async () => {
    const res = await fetch(`/api/admin/subscriptions/${userId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ note: noteText }),
    });
    if (!res.ok) return;
    setNoteText("");
    setNoteOpen(false);
    void load();
  };

  const saveAiMonthlyState = async () => {
    setAiSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ai_credits_used: Math.max(0, Math.round(Number(aiUsedEdit || 0))),
          lifetime_ai_used: lifetimeAiUsedEdit,
          reason: "Admin updated AI quota state",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not update AI quota");
      }
      push({
        type: "success",
        titleEn: "AI quota state updated.",
        titleTh: "อัปเดตสถานะโควตา AI แล้ว",
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn: e instanceof Error ? e.message : "Could not update AI quota",
        titleTh: "อัปเดตโควตา AI ไม่สำเร็จ",
      });
    } finally {
      setAiSaving(false);
    }
  };

  const saveVisibleVipQuota = async () => {
    setAiSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}/ai-credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "set_visible_quota",
          weeklyLeftNow: Math.max(0, Math.round(Number(weeklyLeftNowEdit || 0))),
          monthlyLeftNow: Math.max(0, Math.round(Number(monthlyLeftNowEdit || 0))),
          reason: "Admin set exact visible VIP AI quota",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not save visible quota");
      }
      push({
        type: "success",
        titleEn: "Visible VIP AI quota updated.",
        titleTh: "อัปเดตโควตา AI ที่ผู้เรียนเห็นแล้ว",
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn: e instanceof Error ? e.message : "Could not save visible quota",
        titleTh: "บันทึกโควตา AI ที่ผู้เรียนเห็นไม่สำเร็จ",
      });
    } finally {
      setAiSaving(false);
    }
  };

  const grantExtraCredits = async (kind: "feedback" | "mock") => {
    setAiSaving(true);
    try {
      const creditsValue = kind === "feedback" ? grantCredits : grantMockCredits;
      const expiryMode = kind === "feedback" ? grantExpiryMode : grantMockExpiryMode;
      const customExpiry = kind === "feedback" ? grantCustomExpiry : grantMockCustomExpiry;
      const exactDays = kind === "feedback" ? grantExactDays : grantMockExactDays;
      const body: Record<string, unknown> = {
        kind,
        credits: Math.max(0, Math.round(Number(creditsValue || 0))),
        expiryMode,
        reason: kind === "feedback" ? "Admin manual AI credit grant" : "Admin manual mock credit grant",
      };
      if (expiryMode === "days") {
        body.days = Math.max(1, Math.round(Number(exactDays || 0)));
      }
      if (expiryMode === "custom" && customExpiry.trim()) {
        body.expires_at = new Date(customExpiry).toISOString();
      }
      const res = await fetch(`/api/admin/subscriptions/${userId}/ai-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not grant AI credits");
      }
      push({
        type: "success",
        titleEn: kind === "feedback" ? "AI credits granted." : "Mock credits granted.",
        titleTh: kind === "feedback" ? "เพิ่มเครดิต AI แล้ว" : "เพิ่มสิทธิ์ Mock แล้ว",
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn:
          e instanceof Error
            ? e.message
            : kind === "feedback"
              ? "Could not grant AI credits"
              : "Could not grant mock credits",
        titleTh: kind === "feedback" ? "เพิ่มเครดิต AI ไม่สำเร็จ" : "เพิ่มสิทธิ์ Mock ไม่สำเร็จ",
      });
    } finally {
      setAiSaving(false);
    }
  };

  const saveExtraCreditRow = async (kind: "feedback" | "mock", row: Record<string, unknown>) => {
    const grantedInput = window.prompt(
      "Set granted credits / กำหนดเครดิตทั้งหมด",
      String(row.credits_granted ?? 0),
    );
    if (grantedInput == null) return;
    const usedInput = window.prompt(
      "Set used credits / กำหนดเครดิตที่ใช้ไป",
      String(row.credits_used ?? 0),
    );
    if (usedInput == null) return;
    const expiryInput = window.prompt(
      "Set expiry ISO/date-time, or leave empty for no expiry / ตั้งวันหมดอายุ หรือปล่อยว่าง",
      typeof row.expires_at === "string" ? row.expires_at : "",
    );
    setAiSaving(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}/ai-credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind,
          creditId: row.id,
          credits_granted: Math.max(0, Math.round(Number(grantedInput || 0))),
          credits_used: Math.max(0, Math.round(Number(usedInput || 0))),
          expires_at: expiryInput?.trim() ? new Date(expiryInput).toISOString() : null,
          reason: kind === "feedback" ? "Admin edited AI credit row" : "Admin edited mock credit row",
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          json.error ??
            (kind === "feedback" ? "Could not edit AI credit row" : "Could not edit mock credit row"),
        );
      }
      push({
        type: "success",
        titleEn: kind === "feedback" ? "AI credit row updated." : "Mock credit row updated.",
        titleTh: kind === "feedback" ? "อัปเดตแถวเครดิต AI แล้ว" : "อัปเดตแถวสิทธิ์ Mock แล้ว",
      });
      void load();
    } catch (e) {
      push({
        type: "error",
        titleEn:
          e instanceof Error
            ? e.message
            : kind === "feedback"
              ? "Could not edit AI credit row"
              : "Could not edit mock credit row",
        titleTh: kind === "feedback" ? "แก้ไขเครดิต AI ไม่สำเร็จ" : "แก้ไขสิทธิ์ Mock ไม่สำเร็จ",
      });
    } finally {
      setAiSaving(false);
    }
  };

  const runAction = async () => {
    const reason = dialog.reason.trim();
    if (!reason) return;
    if (dialog.kind === "revoke") {
      await fetch(`/api/admin/subscriptions/${userId}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
        credentials: "include",
      });
    } else if (dialog.kind === "extend") {
      await fetch(`/api/admin/subscriptions/${userId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ days: 30, reason }),
      });
    } else if (dialog.kind === "stripe") {
      await fetch(`/api/admin/subscriptions/${userId}/stripe-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
    } else if (dialog.kind === "vip") {
      await fetch(`/api/admin/subscriptions/${userId}/grant-vip-course`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, notes: reason }),
      });
    } else if (dialog.kind === "tier") {
      await fetch(`/api/admin/subscriptions/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier: tierSel, reason }),
      });
    }
    setDialog({ kind: null, reason: "" });
    push({ type: "success", titleEn: "Action completed.", titleTh: "ดำเนินการแล้ว" });
    void load();
  };

  if (loading || !data) {
    return (
      <p className="ep-stat text-neutral-600">
        Loading… / กำลังโหลด
      </p>
    );
  }

  const payments = (data.payments ?? []) as Record<string, unknown>[];
  const notes = (data.notes ?? []) as Record<string, unknown>[];
  const actions = (data.adminActions ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/subscriptions"
        className="ep-stat text-sm font-bold text-[#004AAD] underline"
      >
        ← Back to list / กลับรายการ
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Identity / ข้อมูลตัวตน</h2>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-[#004AAD] text-2xl font-black text-white">
                {(profile.email as string)?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={nameEdit}
                    onChange={(e) => setNameEdit(e.target.value)}
                    className="flex-1 rounded-[4px] border-4 border-black px-2 py-1 ep-stat text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveName()}
                    className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-2 py-1 text-xs font-black"
                  >
                    Save / บันทึก
                  </button>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {profile.email as string}
                </p>
                <p className="ep-stat mt-1 text-xs">
                  ID: {userId}{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void navigator.clipboard.writeText(userId)}
                  >
                    Copy
                  </button>
                </p>
                <p className="ep-stat mt-2 text-xs text-neutral-600">
                  Member since / สมาชิกตั้งแต่:{" "}
                  {profile.created_at
                    ? new Date(profile.created_at as string).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Subscription / แพ็กเกจ</h2>
            <p className="mt-2 ep-stat text-2xl font-bold">
              Tier: {String(profile.tier)}
            </p>
            {profile.vip_granted_by_course ? (
              <p className="mt-2 text-sm font-bold">
                👑 VIP via Course Enrollment / VIP จากคอร์ส
              </p>
            ) : null}
            <p className="ep-stat mt-2 text-xs">
              Expires / หมดอายุ:{" "}
              {profile.tier_expires_at
                ? new Date(
                    profile.tier_expires_at as string,
                  ).toLocaleString()
                : "∞ course VIP"}
            </p>
            <div className="mt-3 flex flex-col gap-2 border-t-2 border-neutral-200 pt-3">
              <p className="text-xs font-bold">Set expiry / กำหนดวันหมดอายุ</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  Date &amp; time (local) / วันและเวลา
                  <input
                    type="datetime-local"
                    value={expiryLocal}
                    onChange={(e) => setExpiryLocal(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveMembershipExpiry(false)}
                  className="rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-xs font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
                >
                  Save date / บันทึกวัน
                </button>
                <button
                  type="button"
                  onClick={() => void saveMembershipExpiry(true)}
                  className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                >
                  Clear expiry / ล้างวันหมดอายุ
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Clears stored expiry (Stripe or course VIP may still control access separately). /
                ล้างวันที่บันทึกไว้ (สิทธิ์ Stripe หรือ VIP คอร์สอาจยังมีผลแยก)
              </p>
            </div>
            <p className="ep-stat mt-1 text-xs">
              Stripe customer: {String(profile.stripe_customer_id ?? "—")}
            </p>
            <p className="ep-stat mt-1 text-xs break-all">
              Stripe sub: {String(profile.stripe_subscription_id ?? "—")}
            </p>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Quick actions / การดำเนินการ</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                id="tier-select"
                className="rounded-[4px] border-4 border-black bg-white px-2 py-2 ep-stat text-sm"
                value={tierSel}
                onChange={(e) => setTierSel(e.target.value)}
              >
                {["free", "basic", "premium", "vip"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setDialog({ kind: "tier", reason: "" })
                }
                className="rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-xs font-black text-white shadow-[4px_4px_0_0_#000]"
              >
                Change tier / เปลี่ยน tier
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "extend", reason: "" })}
                className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
              >
                Extend 30d / ต่อ 30 วัน
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "revoke", reason: "" })}
                className="rounded-[4px] border-4 border-black bg-red-600 px-3 py-2 text-xs font-black text-white shadow-[4px_4px_0_0_#000]"
              >
                Revoke / ยกเลิกสิทธิ์
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!profile.vip_granted_by_course ? (
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "vip", reason: "" })}
                  className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                >
                  Grant VIP course / ให้ VIP คอร์ส
                </button>
              ) : null}
              {profile.stripe_subscription_id ? (
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "stripe", reason: "" })}
                  className="rounded-[4px] border-4 border-black bg-neutral-200 px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                >
                  Cancel Stripe / ยกเลิก Stripe
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  void fetch(`/api/admin/subscriptions/${userId}/send-email`, {
                    method: "POST",
                    credentials: "include",
                  }).then(() =>
                    push({
                      type: "info",
                      titleEn: "Email logged (stub).",
                      titleTh: "บันทึกอีเมล (จำลอง)",
                    }),
                  )
                }
                className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
              >
                Send email (log) / ส่งอีเมล
              </button>
            </div>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">AI quota / โควตา AI</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["Weekly left now / เหลือรอบสัปดาห์ตอนนี้", `${String(aiQuota.learnerFacingRemaining ?? 0)} / ${String(aiQuota.learnerFacingLimit ?? 0)}`],
                ["Weekly used now / ใช้ไปแล้วรอบนี้", String(aiQuota.learnerFacingUsed ?? 0)],
                ["Weekly renew / รีเซ็ตรอบสัปดาห์", aiQuota.learnerFacingRenewsAt ? formatAdminDateTime(String(aiQuota.learnerFacingRenewsAt)) : "—"],
                ["Monthly left now / เหลือรอบเดือนตอนนี้", String(aiQuota.learnerMonthlyRemaining ?? 0)],
                ["Monthly/package renew / รอบแพ็กเกจรายเดือน", profile.tier_expires_at ? formatAdminDateTime(String(profile.tier_expires_at)) : "No expiry / ไม่หมดอายุ"],
                ["Total visible now / คงเหลือที่เห็นรวม", String(Number(aiQuota.learnerFacingRemaining ?? 0) + Number(aiQuota.learnerMonthlyRemaining ?? 0))],
                [
                  "Monthly extra expiry / เครดิตรายเดือนหมดอายุเร็วสุด",
                  aiQuota.learnerMonthlyRenewsAt
                    ? formatAdminDateTime(String(aiQuota.learnerMonthlyRenewsAt))
                    : "—",
                ],
              ].map(([k, v]) => (
                <div
                  key={String(k)}
                  className="rounded-[4px] border-2 border-black bg-neutral-50 p-3"
                >
                  <p className="text-[10px] font-bold uppercase text-neutral-600">{k}</p>
                  <p className="ep-stat mt-1 text-lg font-black text-[#004AAD]">{v}</p>
                </div>
              ))}
            </div>

            {(aiQuota.effectiveTier ?? "free") === "vip" ? (
              <div className="mt-4 border-t-2 border-neutral-200 pt-4">
                <p className="text-sm font-black">Set exact learner view / ตั้งค่าตามที่ผู้เรียนเห็นจริง</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Weekly left now / เหลือรอบสัปดาห์ตอนนี้
                    <input
                      value={weeklyLeftNowEdit}
                      onChange={(e) => setWeeklyLeftNowEdit(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                      inputMode="numeric"
                    />
                  </label>
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Monthly left now / เหลือรอบเดือนตอนนี้
                    <input
                      value={monthlyLeftNowEdit}
                      onChange={(e) => setMonthlyLeftNowEdit(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                      inputMode="numeric"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveVisibleVipQuota()}
                    disabled={aiSaving}
                    className="rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-xs font-black text-white shadow-[4px_4px_0_0_#000]"
                  >
                    {aiSaving ? "Saving…" : "Save exact view / บันทึกแบบตรงกัน"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-neutral-500">
                  This sets the exact weekly and monthly numbers the learner sees right now. / ช่องนี้กำหนดตัวเลขรายสัปดาห์และรายเดือนที่ผู้เรียนเห็นตรง ๆ ตอนนี้
                </p>
              </div>
            ) : null}

            {(aiQuota.effectiveTier ?? "free") !== "vip" ? (
            <div className="mt-4 border-t-2 border-neutral-200 pt-4">
              <p className="text-sm font-black">Edit monthly state / แก้สถานะรายเดือน</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  AI used this month / ใช้ไปเดือนนี้
                  <input
                    value={aiUsedEdit}
                    onChange={(e) => setAiUsedEdit(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={lifetimeAiUsedEdit}
                    onChange={(e) => setLifetimeAiUsedEdit(e.target.checked)}
                  />
                  Free lifetime feedback already used / ใช้สิทธิ์ฟรี 1 ครั้งแล้ว
                </label>
                <button
                  type="button"
                  onClick={() => void saveAiMonthlyState()}
                  disabled={aiSaving}
                  className="rounded-[4px] border-4 border-black bg-[#004AAD] px-3 py-2 text-xs font-black text-white shadow-[4px_4px_0_0_#000]"
                >
                  {aiSaving ? "Saving…" : "Save AI state / บันทึก"}
                </button>
              </div>
            </div>
            ) : null}

            <div className="mt-4 border-t-2 border-neutral-200 pt-4">
              <p className="text-sm font-black">Grant extra AI credits / เพิ่มเครดิต AI ชั่วคราว</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  Credits / จำนวนเครดิต
                  <input
                    value={grantCredits}
                    onChange={(e) => setGrantCredits(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  Expiry / วันหมดอายุ
                  <select
                    value={grantExpiryMode}
                    onChange={(e) => setGrantExpiryMode(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                  >
                    <option value="7d">7 days / 7 วัน</option>
                    <option value="week_end">End of week / สิ้นสัปดาห์</option>
                    <option value="days">Exact days / ระบุจำนวนวัน</option>
                    <option value="month_end">End of month / สิ้นเดือน</option>
                    <option value="custom">Custom / กำหนดเอง</option>
                    <option value="none">No expiry / ไม่หมดอายุ</option>
                  </select>
                </label>
                {grantExpiryMode === "days" ? (
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Days / จำนวนวัน
                    <input
                      value={grantExactDays}
                      onChange={(e) => setGrantExactDays(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                      inputMode="numeric"
                    />
                  </label>
                ) : null}
                {grantExpiryMode === "custom" ? (
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Custom expiry / วันหมดอายุ
                    <input
                      type="datetime-local"
                      value={grantCustomExpiry}
                      onChange={(e) => setGrantCustomExpiry(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => void grantExtraCredits("feedback")}
                  disabled={aiSaving}
                  className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                >
                  {aiSaving ? "Saving…" : "Grant credits / เพิ่มเครดิต"}
                </button>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-neutral-600">
                Expiry preview / ตัวอย่างวันหมดอายุ: {aiExpiryPreview ? formatAdminDateTime(aiExpiryPreview) : "—"}
              </p>
              <p className="mt-2 text-[10px] text-neutral-500">
                Use 7 days for weekly support, or end of month for monthly support. / ใช้ 7 วันสำหรับโควตารายสัปดาห์ หรือสิ้นเดือนสำหรับรายเดือน
              </p>
            </div>

            <div className="mt-4 border-t-2 border-neutral-200 pt-4">
              <p className="text-sm font-black">Extra AI credit rows / แถวเครดิต AI เพิ่ม</p>
              {feedbackCredits.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No extra AI credit rows yet. / ยังไม่มีเครดิตเพิ่ม</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-sm border-2 border-neutral-200">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="border-b-2 border-black p-2">Created</th>
                        <th className="border-b-2 border-black p-2">SKU</th>
                        <th className="border-b-2 border-black p-2">Granted</th>
                        <th className="border-b-2 border-black p-2">Used</th>
                        <th className="border-b-2 border-black p-2">Left</th>
                        <th className="border-b-2 border-black p-2">Expiry</th>
                        <th className="border-b-2 border-black p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackCredits.map((row) => (
                        <tr key={String(row.id)}>
                          <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                            {row.created_at ? new Date(row.created_at as string).toLocaleString() : "—"}
                          </td>
                          <td className="border-b border-neutral-200 p-2 font-mono text-[10px]">
                            {String(row.sku ?? "—")}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat">
                            {String(row.credits_granted ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat">
                            {String(row.credits_used ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 font-bold text-[#004AAD]">
                            {String(row.remaining ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                            {row.expires_at ? new Date(row.expires_at as string).toLocaleString() : "No expiry"}
                          </td>
                          <td className="border-b border-neutral-200 p-2">
                            <button
                              type="button"
                              onClick={() => void saveExtraCreditRow("feedback", row)}
                              className="rounded-[4px] border-2 border-black bg-white px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_0_#000]"
                            >
                              Edit / แก้ไข
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Mock quota / โควตา Mock</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["Monthly limit / ลิมิตรายเดือน", String(mockQuota.monthlyLimit ?? 0)],
                ["Used this month / ใช้เดือนนี้", String(mockQuota.monthlyUsed ?? 0)],
                ["Plan left / คงเหลือจากแพ็ก", String(mockQuota.monthlyRemaining ?? 0)],
                ["Extra credits / สิทธิ์เพิ่ม", String(mockQuota.addonRemaining ?? 0)],
                ["Total left / คงเหลือรวม", String(mockQuota.totalRemaining ?? 0)],
              ].map(([k, v]) => (
                <div
                  key={String(k)}
                  className="rounded-[4px] border-2 border-black bg-neutral-50 p-3"
                >
                  <p className="text-[10px] font-bold uppercase text-neutral-600">{k}</p>
                  <p className="ep-stat mt-1 text-lg font-black text-[#004AAD]">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t-2 border-neutral-200 pt-4">
              <p className="text-sm font-black">Grant extra mock credits / เพิ่มสิทธิ์ Mock ชั่วคราว</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  Credits / จำนวนสิทธิ์
                  <input
                    value={grantMockCredits}
                    onChange={(e) => setGrantMockCredits(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                  Expiry / วันหมดอายุ
                  <select
                    value={grantMockExpiryMode}
                    onChange={(e) => setGrantMockExpiryMode(e.target.value)}
                    className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                  >
                    <option value="7d">7 days / 7 วัน</option>
                    <option value="week_end">End of week / สิ้นสัปดาห์</option>
                    <option value="days">Exact days / ระบุจำนวนวัน</option>
                    <option value="month_end">End of month / สิ้นเดือน</option>
                    <option value="custom">Custom / กำหนดเอง</option>
                    <option value="none">No expiry / ไม่หมดอายุ</option>
                  </select>
                </label>
                {grantMockExpiryMode === "days" ? (
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Days / จำนวนวัน
                    <input
                      value={grantMockExactDays}
                      onChange={(e) => setGrantMockExactDays(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                      inputMode="numeric"
                    />
                  </label>
                ) : null}
                {grantMockExpiryMode === "custom" ? (
                  <label className="flex flex-col text-[10px] font-bold text-neutral-600">
                    Custom expiry / วันหมดอายุ
                    <input
                      type="datetime-local"
                      value={grantMockCustomExpiry}
                      onChange={(e) => setGrantMockCustomExpiry(e.target.value)}
                      className="mt-1 rounded-[4px] border-4 border-black bg-white px-2 py-1 ep-stat text-sm"
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => void grantExtraCredits("mock")}
                  disabled={aiSaving}
                  className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black shadow-[4px_4px_0_0_#000]"
                >
                  {aiSaving ? "Saving…" : "Grant mock / เพิ่มสิทธิ์"}
                </button>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-neutral-600">
                Expiry preview / ตัวอย่างวันหมดอายุ: {mockExpiryPreview ? formatAdminDateTime(mockExpiryPreview) : "—"}
              </p>
              <p className="mt-2 text-[10px] text-neutral-500">
                Grant short-term support by week or month, then let it expire automatically. / เพิ่มสิทธิ์แบบรายสัปดาห์หรือรายเดือน แล้วให้หมดอายุอัตโนมัติ
              </p>
            </div>

            <div className="mt-4 border-t-2 border-neutral-200 pt-4">
              <p className="text-sm font-black">Extra mock credit rows / แถวสิทธิ์ Mock เพิ่ม</p>
              {mockCredits.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No extra mock rows yet. / ยังไม่มีสิทธิ์ Mock เพิ่ม</p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-sm border-2 border-neutral-200">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="border-b-2 border-black p-2">Created</th>
                        <th className="border-b-2 border-black p-2">SKU</th>
                        <th className="border-b-2 border-black p-2">Granted</th>
                        <th className="border-b-2 border-black p-2">Used</th>
                        <th className="border-b-2 border-black p-2">Left</th>
                        <th className="border-b-2 border-black p-2">Expiry</th>
                        <th className="border-b-2 border-black p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCredits.map((row) => (
                        <tr key={String(row.id)}>
                          <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                            {row.created_at ? new Date(row.created_at as string).toLocaleString() : "—"}
                          </td>
                          <td className="border-b border-neutral-200 p-2 font-mono text-[10px]">
                            {String(row.sku ?? "—")}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat">
                            {String(row.credits_granted ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat">
                            {String(row.credits_used ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 font-bold text-[#004AAD]">
                            {String(row.remaining ?? 0)}
                          </td>
                          <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                            {row.expires_at ? new Date(row.expires_at as string).toLocaleString() : "No expiry"}
                          </td>
                          <td className="border-b border-neutral-200 p-2">
                            <button
                              type="button"
                              onClick={() => void saveExtraCreditRow("mock", row)}
                              className="rounded-[4px] border-2 border-black bg-white px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_0_#000]"
                            >
                              Edit / แก้ไข
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Admin notes / บันทึกผู้ดูแล</h2>
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="text-xs font-bold underline"
              >
                Add note / เพิ่ม
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {notes.map((n) => (
                <li
                  key={String(n.id)}
                  className="rounded-[4px] border-2 border-black bg-neutral-50 p-2 text-sm"
                >
                  {String(n.note)}
                  <p className="ep-stat mt-1 text-[10px] text-neutral-500">
                    {String(n.adminName ?? "—")} ·{" "}
                    {new Date(n.created_at as string).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-2">
            {[
              ["Total paid / ยอดชำระทั้งหมด", formatBahtFromSatang((data.totalPaidSatang as number) ?? 0)],
              ["Sessions / เซสชัน", String(study.sessionsCompleted ?? 0)],
              ["Mock tests / mock", String(study.mockTestsTotal ?? 0)],
              ["Favorite skill / ทักษะยอดนิยม", String(study.favoriteSkill ?? "—")],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]"
              >
                <p className="text-[10px] font-bold uppercase text-neutral-600">
                  {k}
                </p>
                <p className="ep-stat mt-1 text-lg font-black text-[#004AAD]">
                  {v}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-black">Notebook (cloud sync) / สมุดโน้ต (ซิงค์)</h2>
              <Link
                href={`/admin/subscriptions/${userId}/notebook`}
                className="shrink-0 rounded-[4px] border-4 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                Full notebook / ดูสมุดเต็ม →
              </Link>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              Saved cards sync while the student is signed in (add, edit, delete). Visiting the Notebook
              page once backfills existing local saves. / บันทึกลงคลาวด์เมื่อล็อกอิน — เปิดหน้า Notebook
              เพื่อซิงค์ของเก่าจากเครื่อง
            </p>
            {notebookSync.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">
                No synced cards yet. / ยังไม่มีการซิงค์
              </p>
            ) : (
              <div className="mt-3 max-h-96 overflow-auto rounded-sm border-2 border-neutral-200">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-100">
                    <tr>
                      <th className="border-b-2 border-black p-2">Updated</th>
                      <th className="border-b-2 border-black p-2">Source</th>
                      <th className="border-b-2 border-black p-2">Title</th>
                      <th className="border-b-2 border-black p-2">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notebookSync.map((row) => {
                      const { source, title, preview } = notebookPayloadLine(row.payload);
                      return (
                        <tr key={String(row.id)} className="align-top">
                          <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                            {row.updated_at
                              ? new Date(row.updated_at as string).toLocaleString()
                              : "—"}
                          </td>
                          <td className="border-b border-neutral-200 p-2 font-mono text-[10px]">
                            {source}
                          </td>
                          <td className="border-b border-neutral-200 p-2 max-w-[200px] break-words font-semibold">
                            {title}
                          </td>
                          <td className="border-b border-neutral-200 p-2 max-w-xl break-words text-[11px] leading-snug text-neutral-800">
                            {preview}
                            {preview.length >= 500 ? "…" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="mt-6 text-sm font-black text-neutral-800">
              Legacy mock quick-save / บันทึก mock แบบเดิม
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Older &quot;Save to Notebook&quot; from mock results (plain text row). / แถวข้อความจาก mock
            </p>
            {notebookEntries.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">None. / ไม่มี</p>
            ) : (
              <div className="mt-2 max-h-56 overflow-auto rounded-sm border-2 border-neutral-200">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-100">
                    <tr>
                      <th className="border-b-2 border-black p-2">Date</th>
                      <th className="border-b-2 border-black p-2">Type</th>
                      <th className="border-b-2 border-black p-2">Source</th>
                      <th className="border-b-2 border-black p-2">Score</th>
                      <th className="border-b-2 border-black p-2">Content</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notebookEntries.map((row) => (
                      <tr key={String(row.id)} className="align-top">
                        <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                          {row.created_at
                            ? new Date(row.created_at as string).toLocaleString()
                            : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">{String(row.type ?? "—")}</td>
                        <td className="border-b border-neutral-200 p-2">
                          <span className="block">{String(row.source_exercise_type ?? "—")}</span>
                          <span className="text-[10px] text-neutral-500">
                            {String(row.source_skill ?? "")}
                          </span>
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.score_at_save != null ? String(row.score_at_save) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 max-w-md break-words text-[11px] leading-snug">
                          {String(row.content ?? "").slice(0, 400)}
                          {String(row.content ?? "").length > 400 ? "…" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Mock test scores / คะแนน mock test</h2>
            {mockTestScores.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No mock test results yet. / ยังไม่มีผล mock</p>
            ) : (
              <div className="mt-3 max-h-72 overflow-auto rounded-sm border-2 border-neutral-200">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-100">
                    <tr>
                      <th className="border-b-2 border-black p-2">Date</th>
                      <th className="border-b-2 border-black p-2">Overall</th>
                      <th className="border-b-2 border-black p-2">Lit</th>
                      <th className="border-b-2 border-black p-2">Comp</th>
                      <th className="border-b-2 border-black p-2">Conv</th>
                      <th className="border-b-2 border-black p-2">Prod</th>
                      <th className="border-b-2 border-black p-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTestScores.map((row) => (
                      <tr key={String(row.id)}>
                        <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                          {row.created_at
                            ? new Date(row.created_at as string).toLocaleString()
                            : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 font-bold">
                          {row.overall_score != null ? String(row.overall_score) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.literacy_score != null ? String(row.literacy_score) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.comprehension_score != null ? String(row.comprehension_score) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.conversation_score != null ? String(row.conversation_score) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.production_score != null ? String(row.production_score) : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 ep-stat">
                          {row.duration_seconds != null
                            ? `${Math.round(Number(row.duration_seconds) / 60)} min`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Practice sessions &amp; scores / แบบฝึกและคะแนน</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Per-attempt scores plus saved submission/report snapshots when the app recorded them. Older
              sessions may still be missing detail. / คะแนนรายครั้งพร้อม submission และ report snapshot
            </p>
            {studySessionScores.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No study sessions yet. / ยังไม่มีเซสชัน</p>
            ) : (
              <div className="mt-3 max-h-80 overflow-auto rounded-sm border-2 border-neutral-200">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="sticky top-0 bg-neutral-100">
                    <tr>
                      <th className="border-b-2 border-black p-2">Started</th>
                      <th className="border-b-2 border-black p-2">Skill</th>
                      <th className="border-b-2 border-black p-2">Exercise</th>
                      <th className="border-b-2 border-black p-2">Difficulty</th>
                      <th className="border-b-2 border-black p-2">Score</th>
                      <th className="border-b-2 border-black p-2">Duration</th>
                      <th className="border-b-2 border-black p-2">Done</th>
                      <th className="border-b-2 border-black p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studySessionScores.map((row) => {
                      const sessionId = String(row.id);
                      const isOpen = expandedStudySessionId === sessionId;
                      const submissionCard = extractSubmissionCard(row);
                      const reportCard = extractReportCard(row);
                      const hasDetails = Boolean(submissionCard || reportCard);
                      return (
                        <Fragment key={sessionId}>
                          <tr key={sessionId}>
                            <td className="border-b border-neutral-200 p-2 ep-stat whitespace-nowrap">
                              {row.started_at
                                ? new Date(row.started_at as string).toLocaleString()
                                : "—"}
                            </td>
                            <td className="border-b border-neutral-200 p-2">{String(row.skill ?? "—")}</td>
                            <td className="border-b border-neutral-200 p-2 font-mono text-[10px]">
                              {String(row.exercise_type ?? "—")}
                            </td>
                            <td className="border-b border-neutral-200 p-2">
                              {String(row.difficulty ?? "—")}
                            </td>
                            <td className="border-b border-neutral-200 p-2 font-semibold">
                              {row.score != null ? String(row.score) : "—"}
                            </td>
                            <td className="border-b border-neutral-200 p-2 ep-stat">
                              {row.duration_seconds != null && Number(row.duration_seconds) > 0
                                ? `${Math.round(Number(row.duration_seconds) / 60)} min`
                                : "—"}
                            </td>
                            <td className="border-b border-neutral-200 p-2">
                              {row.completed ? "✓" : "—"}
                            </td>
                            <td className="border-b border-neutral-200 p-2">
                              {hasDetails ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedStudySessionId((prev) =>
                                      prev === sessionId ? null : sessionId,
                                    )
                                  }
                                  className="rounded-sm border-2 border-black bg-[#ffcc00] px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                                >
                                  {isOpen ? "Hide" : "View"}
                                </button>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                          </tr>
                          {isOpen ? (
                            <tr>
                              <td colSpan={8} className="border-b border-neutral-200 bg-neutral-50 p-3">
                                <div className="grid gap-3 lg:grid-cols-2">
                                  <div className="rounded-sm border-2 border-black bg-white p-3">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
                                      {submissionCard?.title ?? "Learner submission"}
                                    </p>
                                    {submissionCard?.meta?.length ? (
                                      <p className="mt-1 text-[10px] font-bold text-neutral-500">
                                        {submissionCard.meta.filter(Boolean).join(" · ")}
                                      </p>
                                    ) : null}
                                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">
                                      {submissionCard?.body ?? "No saved submission snapshot for this session."}
                                    </p>
                                  </div>
                                  <div className="rounded-sm border-2 border-black bg-white p-3">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
                                      Saved report snapshot
                                    </p>
                                    <p className="mt-2 text-sm font-black text-neutral-900">
                                      Score: <span className="text-[#004AAD]">{reportCard?.score ?? "—"}</span>
                                    </p>
                                    <p className="mt-2 text-xs leading-relaxed text-neutral-800">
                                      {reportCard?.summary || "No compact report summary was saved for this session."}
                                    </p>
                                    {reportCard?.bullets?.length ? (
                                      <ul className="mt-3 space-y-1 text-xs text-neutral-800">
                                        {reportCard.bullets.map((bullet, index) => (
                                          <li key={`${sessionId}-bullet-${index}`} className="flex gap-2">
                                            <span className="font-black text-[#004AAD]">{index + 1}.</span>
                                            <span>{bullet}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Payments / การชำระเงิน</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border-b-2 border-black p-2">Date</th>
                    <th className="border-b-2 border-black p-2">Amount</th>
                    <th className="border-b-2 border-black p-2">Status</th>
                    <th className="border-b-2 border-black p-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={String(p.id)}>
                      <td className="border-b border-black p-2 ep-stat">
                        {new Date(p.created_at as string).toLocaleDateString()}
                      </td>
                      <td className="border-b border-black p-2 ep-stat">
                        {formatBahtFromSatang((p.amount as number) ?? 0)}
                      </td>
                      <td className="border-b border-black p-2">
                        {String(p.status)}
                      </td>
                      <td className="border-b border-black p-2">
                        {p.receipt_url ? (
                          <a
                            href={String(p.receipt_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Link
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Tier history / ประวัติ tier</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {actions.slice(0, 12).map((a) => (
                <li key={String(a.id)} className="ep-stat border-l-4 border-[#004AAD] pl-2">
                  {new Date(a.created_at as string).toLocaleString()} —{" "}
                  {String(a.action)} — {String(a.adminName ?? "")}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Study (4 weeks) / การเรียน</h2>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#004AAD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="ep-stat mt-2 text-xs text-neutral-600">
              Total study time / เวลาเรียนรวม: {String(study.totalMinutes ?? 0)} min
            </p>
          </section>

          <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Admin log / บันทึกการแก้ไข</h2>
            <div className="mt-2 max-h-64 overflow-auto text-xs">
              {actions.map((a) => (
                <p key={String(a.id)} className="ep-stat border-b border-neutral-200 py-1">
                  {new Date(a.created_at as string).toLocaleString()} |{" "}
                  {String(a.action)} | {JSON.stringify(a.previous_value)} →{" "}
                  {JSON.stringify(a.new_value)}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ConfirmActionDialog
        open={dialog.kind !== null}
        title={
          dialog.kind === "revoke"
            ? "Revoke access?"
            : dialog.kind === "extend"
              ? "Extend 30 days?"
              : dialog.kind === "stripe"
                ? "Cancel Stripe subscription?"
                : dialog.kind === "vip"
                  ? "Grant VIP course?"
                  : "Change tier?"
        }
        description="This action will update the student account. / การกระทำนี้จะอัปเดตบัญชีนักเรียน"
        actionLabel="Confirm / ยืนยัน"
        actionType={
          dialog.kind === "revoke" || dialog.kind === "stripe"
            ? "danger"
            : dialog.kind === "tier"
              ? "info"
              : "warning"
        }
        requireReason
        reason={dialog.reason}
        onReasonChange={(v) => setDialog((d) => ({ ...d, reason: v }))}
        onCancel={() => setDialog({ kind: null, reason: "" })}
        onConfirm={() => void runAction()}
      />

      {noteOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h3 className="font-black">Add note / เพิ่มบันทึก</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-[4px] border-4 border-black p-2 ep-stat text-sm"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="border-2 border-black px-3 py-1 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void postNote()}
                className="border-2 border-black bg-[#004AAD] px-3 py-1 text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
