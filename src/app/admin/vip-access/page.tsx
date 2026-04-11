"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type GrantRow = {
  id: string;
  email: string;
  granted_at: string | null;
  is_active: boolean;
  full_name: string | null;
  tier: string | null;
  vip_granted_by_course: boolean | null;
  is_registered: boolean;
};

type Stats = {
  totalGrantsAllTime: number;
  activeGrants: number;
  courseVipUsers: number;
  paidStripeVipUsers: number;
  pendingGrants: number;
  revokedGrants: number;
};

type ActivityRow = {
  email: string;
  action: "grant" | "revoke";
  at: string;
  adminId: string | null;
  adminName: string | null;
};

type BulkResult = {
  success: string[];
  failed: string[];
  alreadyVIP: string[];
  immediateGranted: string[];
  pendingCreated: string[];
};

type PreviewRow = {
  email: string;
  registered: boolean;
  tier: string | null;
  vipGrantedByCourse: boolean;
};

type TabId = "list" | "add" | "stats" | "activity";

const SKILL_LABELS: Record<string, string> = {
  literacy: "Literacy",
  comprehension: "Comprehension",
  conversation: "Conversation",
  production: "Production",
  mock_test: "Mock test",
};

type VIPStudyRow = {
  userId: string;
  email: string;
  fullName: string | null;
  vipGrantedByCourse: boolean;
  hasStripeSubscription: boolean;
  totalSeconds: number;
  totalMinutes: number;
  secondsBySkill: Record<string, number>;
  byExerciseType: { type: string; seconds: number; sessions: number }[];
  timedSessionCount: number;
  endedSessionCount: number;
  lastActivityAt: string | null;
  mockTestCount: number;
};

function vipSourceLabel(r: {
  vipGrantedByCourse: boolean;
  hasStripeSubscription: boolean;
}) {
  if (r.vipGrantedByCourse && r.hasStripeSubscription) return "Course + Stripe";
  if (r.vipGrantedByCourse) return "Course";
  if (r.hasStripeSubscription) return "Stripe";
  return "VIP";
}

function formatSkillLine(secondsBySkill: Record<string, number>): string {
  const parts: string[] = [];
  for (const [k, sec] of Object.entries(secondsBySkill)) {
    if (sec <= 0) continue;
    const m = Math.round((sec / 60) * 10) / 10;
    const label = SKILL_LABELS[k] ?? k;
    parts.push(`${label} ${m}m`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

function formatExerciseLine(
  rows: { type: string; seconds: number; sessions: number }[],
): string {
  if (!rows.length) return "—";
  return rows
    .slice(0, 8)
    .map((r) => {
      const m = Math.round((r.seconds / 60) * 10) / 10;
      return `${r.type} ${m}m (${r.sessions})`;
    })
    .join(" · ");
}

/** Looks like an email inside free text (handles `user@gmail.com` plus codes on the same/next line). */
const EMAIL_IN_TEXT =
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+/g;

/** JSON array of strings, or plain text: one email per line / comma / semicolon / space separated. */
function parseEmailListFromPaste(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];

  if (t.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (Array.isArray(parsed)) {
        const fromJson: string[] = [];
        const seenJ = new Set<string>();
        for (const x of parsed) {
          const s = String(x).trim();
          if (!s.includes("@")) continue;
          const lower = s.toLowerCase();
          if (seenJ.has(lower)) continue;
          seenJ.add(lower);
          fromJson.push(s);
        }
        if (fromJson.length > 0) return fromJson;
      }
    } catch {
      /* Invalid JSON (e.g. `[user@gmail.com]` without quotes) — fall through and scrape emails from text */
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const lines = t.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    let foundOnLine = false;
    const matches = trimmed.match(EMAIL_IN_TEXT);
    if (matches) {
      for (const m of matches) {
        const lower = m.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        out.push(m);
        foundOnLine = true;
      }
    }
    if (foundOnLine) continue;

    const parts = trimmed.split(/[\s,;|]+/);
    for (const p of parts) {
      const s = p.trim();
      if (!s.includes("@")) continue;
      const lower = s.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      out.push(s);
    }
  }

  return out;
}

function tierBadgeClass(tier: string | null | undefined) {
  const t = tier ?? "free";
  if (t === "vip")
    return "border-black bg-[#FFCC00] text-[#004AAD]";
  if (t === "premium")
    return "border-black bg-[#004AAD] text-[#FFCC00]";
  if (t === "basic")
    return "border-black bg-white text-[#004AAD]";
  return "border-black bg-neutral-200 text-neutral-800";
}

export default function AdminVIPAccessPage() {
  const [tab, setTab] = useState<TabId>("list");
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked" | "pending">(
    "all",
  );

  const [singleEmail, setSingleEmail] = useState("");
  const [singleNotes, setSingleNotes] = useState("");
  const [singlePassword, setSinglePassword] = useState("");
  const [singleBusy, setSingleBusy] = useState(false);
  const [singleMsg, setSingleMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [jsonText, setJsonText] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkPassword, setBulkPassword] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const [studyRows, setStudyRows] = useState<VIPStudyRow[]>([]);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyLoaded, setStudyLoaded] = useState(false);

  const loadStudyActivity = useCallback(async () => {
    setStudyLoading(true);
    try {
      const res = await fetch("/api/admin/vip-study-activity", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as { rows: VIPStudyRow[] };
      setStudyRows(data.rows);
      setStudyLoaded(true);
    } catch (e) {
      console.error(e);
      setStudyRows([]);
    } finally {
      setStudyLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vip-access", { credentials: "include" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = (await res.json()) as {
        grants: GrantRow[];
        stats: Stats;
        activity: ActivityRow[];
      };
      setGrants(data.grants);
      setStats(data.stats);
      setActivity(data.activity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "activity" && !studyLoaded && !studyLoading) {
      void loadStudyActivity();
    }
  }, [tab, studyLoaded, studyLoading, loadStudyActivity]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grants.filter((g) => {
      const name = (g.full_name ?? "").toLowerCase();
      const mail = g.email.toLowerCase();
      const matchSearch = !q || mail.includes(q) || name.includes(q);
      const pending = g.is_active && !g.is_registered;
      const matchFilter =
        filter === "all" ||
        (filter === "active" && g.is_active) ||
        (filter === "revoked" && !g.is_active) ||
        (filter === "pending" && pending);
      return matchSearch && matchFilter;
    });
  }, [grants, search, filter]);

  async function revoke(email: string) {
    const ok = window.confirm(
      `Revoke VIP course grant for ${email}?\nยกเลิกสิทธิ์ VIP คอร์สสำหรับ ${email}?`,
    );
    if (!ok) return;
    const res = await fetch("/api/admin/vip-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "revoke", email }),
    });
    if (!res.ok) {
      window.alert("Revoke failed / ยกเลิกไม่สำเร็จ");
      return;
    }
    await load();
  }

  async function grantSingle() {
    setSingleBusy(true);
    setSingleMsg(null);
    try {
      const res = await fetch("/api/admin/vip-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "grant-single",
          email: singleEmail,
          notes: singleNotes || null,
          initialPassword: singlePassword.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(j?.error ?? "Request failed");
      }
      setSingleMsg({
        type: "ok",
        text: "VIP granted / ให้สิทธิ์ VIP แล้ว",
      });
      setSingleEmail("");
      setSingleNotes("");
      setSinglePassword("");
      await load();
    } catch (e) {
      setSingleMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setSingleBusy(false);
    }
  }

  async function runPreview() {
    setBulkMsg(null);
    setBulkResult(null);
    try {
      const emails = parseEmailListFromPaste(jsonText);
      if (emails.length === 0) {
        throw new Error("No valid emails found / ไม่พบอีเมลที่ใช้ได้");
      }
      const res = await fetch("/api/admin/vip-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "preview-bulk", emails }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = (await res.json()) as { rows: PreviewRow[] };
      setPreviewRows(data.rows);
    } catch (e) {
      setPreviewRows(null);
      setBulkMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Parse error",
      });
    }
  }

  async function runBulkGrant() {
    if (!previewRows?.length) return;
    setBulkBusy(true);
    setBulkMsg(null);
    setBulkResult(null);
    try {
      const emails = previewRows.map((r) => r.email);
      const res = await fetch("/api/admin/vip-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "bulk",
          emails,
          notes: bulkNotes || null,
          initialPassword: bulkPassword.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string };
        throw new Error(j?.error ?? "Bulk grant failed");
      }
      const data = (await res.json()) as { result: BulkResult };
      setBulkResult(data.result);
      setBulkMsg({
        type: "ok",
        text: "Bulk grant completed / ให้สิทธิ์แบบกลุ่มเสร็จแล้ว",
      });
      setJsonText("");
      setBulkPassword("");
      setPreviewRows(null);
      await load();
    } catch (e) {
      setBulkMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Error",
      });
    } finally {
      setBulkBusy(false);
    }
  }

  const previewSummary = useMemo(() => {
    if (!previewRows) return null;
    const total = previewRows.length;
    const registered = previewRows.filter((r) => r.registered).length;
    const pending = total - registered;
    return { total, registered, pending };
  }, [previewRows]);

  return (
    <div className="space-y-6">
      <header className="ep-brutal-reading rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-[#004AAD]">
          EnglishPlan · VIP course access
        </p>
        <h1
          className="mt-2 text-3xl font-black tracking-tight text-neutral-900"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          VIP access / สิทธิ์ VIP คอร์ส
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Grant or revoke course-based VIP for enrolled students. / จัดการสิทธิ์ VIP
          จากคอร์ส EnglishPlan สำหรับนักเรียนที่ลงทะเบียน
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2 border-b-4 border-black pb-2"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {(
          [
            ["list", "Grant List / รายการ VIP"],
            ["add", "Add VIP / เพิ่ม VIP"],
            ["stats", "Statistics / สถิติ"],
            ["activity", "Study activity / กิจกรรมเรียน"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-[4px] border-2 border-black px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#000] ${
              tab === id
                ? "bg-[#004AAD] text-[#FFCC00]"
                : "bg-white text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block flex-1 text-sm font-bold">
              Search / ค้นหา (email or name)
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
                placeholder="student@school.com"
              />
            </label>
            <label className="block text-sm font-bold md:w-56">
              Filter / ตัวกรอง
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
              >
                <option value="all">All / ทั้งหมด</option>
                <option value="active">Active / ใช้งาน</option>
                <option value="revoked">Revoked / ถูกยกเลิก</option>
                <option value="pending">Pending / รอสมัคร</option>
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-[4px] border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead className="bg-[#004AAD] text-[#FFCC00]">
                <tr>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Email
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Name / ชื่อ
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Status
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Registered
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Tier
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Granted / วันที่
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 ep-stat text-neutral-500">
                      Loading… / กำลังโหลด
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 ep-stat text-neutral-500">
                      No rows / ไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  filtered.map((g) => (
                    <tr key={g.id} className="odd:bg-neutral-50">
                      <td className="border-b-2 border-black px-3 py-2 font-mono text-xs">
                        {g.email}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        {g.full_name ?? "—"}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        {g.is_active ? (
                          <span className="font-bold text-green-700">
                            Active ✓ / ใช้งาน
                          </span>
                        ) : (
                          <span className="font-bold text-red-700">
                            Revoked ✗ / ยกเลิกแล้ว
                          </span>
                        )}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        {g.is_registered ? (
                          <span>Yes / ลงทะเบียนแล้ว</span>
                        ) : (
                          <span>Pending / รอลงทะเบียน</span>
                        )}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        <span
                          className={`inline-block rounded-[4px] border-2 px-2 py-0.5 text-xs font-black uppercase ${tierBadgeClass(g.tier)}`}
                        >
                          {g.tier ?? "—"}
                        </span>
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat text-xs">
                        {g.granted_at
                          ? new Date(g.granted_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        {g.is_active ? (
                          <button
                            type="button"
                            onClick={() => void revoke(g.email)}
                            className="rounded-[4px] border-2 border-black bg-red-600 px-2 py-1 text-xs font-black uppercase text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                          >
                            Revoke / ยกเลิก
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "add" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Grant VIP to one student</h2>
            <p className="text-sm text-neutral-600">
              ให้สิทธิ์ VIP แก่นักเรียนหนึ่งคน
            </p>
            <label className="block text-sm font-bold">
              Email / อีเมล
              <input
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
              />
            </label>
            <label className="block text-sm font-bold">
              Notes (optional) / หมายเหตุ
              <input
                value={singleNotes}
                onChange={(e) => setSingleNotes(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
                placeholder="Course batch March 2026"
              />
            </label>
            <label className="block text-sm font-bold">
              Initial password (optional) / รหัสผ่านเริ่มต้น
              <input
                type="password"
                autoComplete="new-password"
                value={singlePassword}
                onChange={(e) => setSinglePassword(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
                placeholder="Leave empty if they sign in with Google only"
              />
            </label>
            <p className="text-xs text-neutral-600">
              If you set a password (min 8 characters): creates an email/password login for this address, or updates
              the password if they already have an account. They can still use Google if the email matches.
            </p>
            {singleMsg && (
              <div
                className={`rounded-[4px] border-4 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] ${
                  singleMsg.type === "ok"
                    ? "bg-green-100 text-green-900"
                    : "bg-red-100 text-red-900"
                }`}
              >
                {singleMsg.text}
              </div>
            )}
            <button
              type="button"
              disabled={
                singleBusy ||
                Boolean(singlePassword.trim() && singlePassword.trim().length < 8)
              }
              onClick={() => void grantSingle()}
              className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
            >
              Grant VIP Access / ให้สิทธิ์ VIP
            </button>
          </div>

          <div className="space-y-4 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black">Bulk grant VIP — paste emails</h2>
            <p className="text-sm text-neutral-600">
              ให้สิทธิ์ VIP หลายอีเมล — วางจากสเปรดชีตหรือ JSON
            </p>
            <p className="text-sm text-neutral-700">
              EN: Paste <strong>emails only</strong> in this box (one per line is fine). If you also have an enrollment
              code (e.g. Duofasttrack2026), put it in <strong>Shared initial password</strong> below — not in this
              textarea. Broken JSON like <code className="ep-stat text-xs">[user@gmail.com]</code> is OK: we still
              detect the address. Valid JSON array:{" "}
              <code className="ep-stat text-xs">[&quot;a@b.com&quot;,&quot;c@d.com&quot;]</code>.
            </p>
            <p className="text-sm text-neutral-700">
              TH: ช่องนี้วางเฉพาะอีเมล (บรรทัดละหนึ่งก็ได้) ถ้ามีรหัสคอร์ส/รหัสลงทะเบียน ให้ใส่ในช่อง{' '}
              <strong>รหัสผ่านร่วม</strong> ด้านล่าง ไม่ต้องวางคู่กับอีเมลในช่องใหญ่ JSON ผิดรูปแบบก็ยังดึงอีเมลได้
            </p>
            <pre className="overflow-x-auto rounded-[4px] border-4 border-black bg-neutral-100 p-3 ep-stat text-xs shadow-[4px_4px_0_0_#000]">
{`student1@gmail.com
student2@gmail.com
student3@gmail.com

# or JSON:
# [ "a@b.com", "c@d.com" ]`}
            </pre>
            <label className="block text-sm font-bold">
              Notes for this batch (optional) / หมายเหตุชุดนี้
              <input
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
                placeholder="March 2026 cohort"
              />
            </label>
            <label className="block text-sm font-bold">
              Shared initial password (optional) / รหัสผ่านร่วม
              <input
                type="password"
                autoComplete="new-password"
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                className="mt-1 w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
                placeholder="Same password applied to each email in the list (min 8 chars)"
              />
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={10}
              className="w-full rounded-[4px] border-4 border-black bg-white px-3 py-2 ep-stat text-sm shadow-[4px_4px_0_0_#000]"
              placeholder={`one@school.com\ntwo@school.com\nthree@school.com`}
              spellCheck={false}
            />
            {bulkMsg && (
              <div
                className={`rounded-[4px] border-4 border-black px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] ${
                  bulkMsg.type === "ok"
                    ? "bg-green-100 text-green-900"
                    : "bg-red-100 text-red-900"
                }`}
              >
                {bulkMsg.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runPreview()}
                className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
              >
                Parse &amp; Preview
              </button>
            </div>

            {previewSummary && (
              <p className="ep-stat text-sm font-bold text-neutral-900">
                {previewSummary.total} emails parsed. {previewSummary.registered}{" "}
                already registered. {previewSummary.pending} will receive VIP on
                signup.
                <br />
                อีเมล {previewSummary.total} รายการถูกแยกวิเคราะห์{" "}
                {previewSummary.registered} รายลงทะเบียนแล้ว {previewSummary.pending}{" "}
                รายจะได้รับ VIP เมื่อลงทะเบียน
              </p>
            )}

            {previewRows && previewRows.length > 0 && (
              <div className="overflow-x-auto rounded-[4px] border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="border-b-2 border-black px-2 py-2">Email</th>
                      <th className="border-b-2 border-black px-2 py-2">
                        Registered
                      </th>
                      <th className="border-b-2 border-black px-2 py-2">Tier</th>
                      <th className="border-b-2 border-black px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => {
                      const now = r.registered;
                      return (
                        <tr key={r.email} className="odd:bg-neutral-50">
                          <td className="border-b border-black px-2 py-2 font-mono">
                            {r.email}
                          </td>
                          <td className="border-b border-black px-2 py-2">
                            {r.registered ? "Yes" : "No"}
                          </td>
                          <td className="border-b border-black px-2 py-2">
                            {r.tier ?? "—"}
                          </td>
                          <td
                            className={`border-b border-black px-2 py-2 font-bold ${
                              now ? "text-green-800" : "text-yellow-800"
                            }`}
                          >
                            {now
                              ? "VIP now / ได้ทันที"
                              : "VIP on signup / เมื่อสมัคร"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              disabled={
                bulkBusy ||
                !previewRows?.length ||
                Boolean(bulkPassword.trim() && bulkPassword.trim().length < 8)
              }
              onClick={() => void runBulkGrant()}
              className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
            >
              Confirm &amp; Grant All / ยืนยันและให้สิทธิ์ทั้งหมด
            </button>

            {bulkResult && (
              <div className="space-y-1 rounded-[4px] border-4 border-black bg-neutral-50 p-3 ep-stat text-sm shadow-[4px_4px_0_0_#000]">
                <p className="text-green-800">
                  ✓ {bulkResult.immediateGranted.length} users granted VIP immediately /
                  ให้ VIP ทันที
                </p>
                <p className="text-green-800">
                  ✓ {bulkResult.pendingCreated.length} pending grants created / สร้างสิทธิ์รอสมัคร
                </p>
                <p className="text-red-800">
                  ✗ {bulkResult.failed.length} errors / ข้อผิดพลาด
                </p>
                <p className="text-neutral-700">
                  ◆ {bulkResult.alreadyVIP.length} already VIP (course) / เป็น VIP แล้ว
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "stats" && loading && !stats && (
        <p className="ep-stat text-sm font-bold text-neutral-600">
          Loading statistics… / กำลังโหลดสถิติ
        </p>
      )}

      {tab === "stats" && stats && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["Total VIP grants (all time)", stats.totalGrantsAllTime],
                ["Active VIP grants", stats.activeGrants],
                ["Course VIP users (flag)", stats.courseVipUsers],
                ["Paid VIP (Stripe)", stats.paidStripeVipUsers],
                ["Pending grants (no signup yet)", stats.pendingGrants],
                ["Revoked grants", stats.revokedGrants],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]"
              >
                <p className="text-xs font-bold uppercase text-neutral-600">
                  {label}
                </p>
                <p
                  className="mt-2 text-3xl font-black text-[#004AAD] ep-stat"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[4px] border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#004AAD] text-[#FFCC00]">
                <tr>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Email
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Action
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Date
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Admin
                  </th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-neutral-500">
                      No recent activity / ไม่มีกิจกรรมล่าสุด
                    </td>
                  </tr>
                ) : (
                  activity.map((a, i) => (
                    <tr key={`${a.email}-${a.at}-${i}`} className="odd:bg-neutral-50">
                      <td className="border-b-2 border-black px-3 py-2 font-mono text-xs">
                        {a.email}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 font-bold">
                        {a.action === "grant" ? "Grant / ให้สิทธิ์" : "Revoke / ยกเลิก"}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat text-xs">
                        {new Date(a.at).toLocaleString()}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 text-xs">
                        {a.adminName ?? a.adminId ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "activity" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-sm text-neutral-700">
              Time on task and session counts from recorded study sessions (same as the learner
              dashboard). VIP = current <code className="ep-stat text-xs">profiles.tier = vip</code>{" "}
              (course and/or Stripe). / เวลาเรียนและจำนวนเซสชันตามข้อมูลในระบบ
            </p>
            <button
              type="button"
              disabled={studyLoading}
              onClick={() => void loadStudyActivity()}
              className="shrink-0 rounded-[4px] border-4 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none disabled:opacity-60"
            >
              {studyLoading ? "Loading…" : "Refresh / รีเฟรช"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-[4px] border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-[#004AAD] text-[#FFCC00]">
                <tr>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Name / ชื่อ
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Email
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    VIP source
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Total time
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Sessions
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Mock tests
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Last active
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    By skill (DET)
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    By exercise type
                  </th>
                  <th className="border-b-4 border-black px-3 py-2 font-black">
                    Admin
                  </th>
                </tr>
              </thead>
              <tbody>
                {studyLoading && studyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-6 ep-stat text-neutral-500"
                    >
                      Loading activity… / กำลังโหลดกิจกรรม
                    </td>
                  </tr>
                ) : studyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-6 ep-stat text-neutral-500"
                    >
                      No VIP profiles or no data yet. / ยังไม่มีผู้ใช้ VIP หรือยังไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  studyRows.map((r) => (
                    <tr key={r.userId} className="odd:bg-neutral-50 align-top">
                      <td className="border-b-2 border-black px-3 py-2">
                        {r.fullName ?? "—"}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 font-mono text-xs">
                        {r.email}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 text-xs">
                        {vipSourceLabel(r)}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat whitespace-nowrap">
                        {r.totalMinutes} min
                        <span className="block text-[10px] text-neutral-500">
                          ({r.timedSessionCount} timed)
                        </span>
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat text-xs">
                        {r.endedSessionCount} ended
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat">
                        {r.mockTestCount}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 ep-stat text-xs whitespace-nowrap">
                        {r.lastActivityAt
                          ? new Date(r.lastActivityAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 text-xs max-w-[220px]">
                        {formatSkillLine(r.secondsBySkill)}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2 text-xs max-w-[280px]">
                        {formatExerciseLine(r.byExerciseType)}
                      </td>
                      <td className="border-b-2 border-black px-3 py-2">
                        <a
                          href={`/admin/subscriptions/${r.userId}`}
                          className="text-[#004AAD] font-bold underline text-xs"
                        >
                          Open / เปิด
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
