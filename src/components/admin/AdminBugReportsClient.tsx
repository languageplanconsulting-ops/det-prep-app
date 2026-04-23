"use client";

import { useEffect, useMemo, useState } from "react";

type BugReportStatus = "open" | "investigating" | "fixed" | "closed";

type BugReportMessage = {
  id: string;
  sender_role: "reporter" | "admin";
  sender_email: string | null;
  body: string;
  status_after: BugReportStatus | null;
  created_at: string;
};

type BugReport = {
  id: string;
  reporter_email: string;
  reporter_line: string;
  reporter_name: string | null;
  page_url: string | null;
  subject: string;
  details: string;
  status: BugReportStatus;
  priority: string;
  created_at: string;
  updated_at: string;
  last_replied_at: string | null;
  messages: BugReportMessage[];
};

const STATUS_OPTIONS: BugReportStatus[] = ["open", "investigating", "fixed", "closed"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function AdminBugReportsClient() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | BugReportStatus>("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyStatus, setReplyStatus] = useState<Record<string, BugReportStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setBanner(null);
    const res = await fetch("/api/admin/bug-reports", { credentials: "same-origin" });
    const json = (await res.json().catch(() => null)) as { reports?: BugReport[]; error?: string } | null;
    if (!res.ok) {
      setBanner(json?.error ?? "Could not load bug reports.");
      setLoading(false);
      return;
    }
    const next = json?.reports ?? [];
    setReports(next);
    setReplyStatus(
      Object.fromEntries(next.map((report) => [report.id, report.status])),
    );
    setLoading(false);
  }

  const visibleReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  async function sendReply(reportId: string) {
    const replyBody = replyDrafts[reportId]?.trim() ?? "";
    const status = replyStatus[reportId] ?? "investigating";
    if (!replyBody) {
      setBanner("Please write a reply before sending.");
      return;
    }

    setBusyId(reportId);
    setBanner(null);
    const res = await fetch(`/api/admin/bug-reports/${reportId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ replyBody, status }),
    });
    const json = (await res.json().catch(() => null)) as { error?: string; emailSent?: boolean } | null;

    if (!res.ok) {
      setBanner(json?.error ?? "Could not send the reply.");
      setBusyId(null);
      return;
    }

    setReplyDrafts((prev) => ({ ...prev, [reportId]: "" }));
    setBanner(json?.emailSent === false ? "Reply saved, but reporter email could not be sent." : "Reply sent and reporter emailed.");
    await loadReports();
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">Admin only</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Bug reports inbox</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Review new issues, reply to the reporter by email, and update the status when the bug is fixed.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | BugReportStatus)}
          className="rounded-[4px] border-2 border-black bg-white px-3 py-2 text-sm font-bold"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadReports()}
          className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_0_#111]"
        >
          Refresh
        </button>
      </div>

      {banner ? (
        <div className="rounded-[4px] border-2 border-black bg-white px-4 py-3 text-sm font-bold">
          {banner}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[4px] border-4 border-black bg-white p-6 text-sm font-bold shadow-[4px_4px_0_0_#111]">
          Loading bug reports…
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-[4px] border-4 border-black bg-white p-6 text-sm font-bold shadow-[4px_4px_0_0_#111]">
          No bug reports found for this filter.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleReports.map((report) => (
            <section
              key={report.id}
              className="rounded-[4px] border-4 border-black bg-white p-5 shadow-[5px_5px_0_0_#111]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border-2 border-black bg-[#FFCC00] px-2 py-1 text-[10px] font-black uppercase">
                      {report.status}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                      {report.id}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
                    {report.subject}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-neutral-600">
                    {report.reporter_name?.trim() || "Unnamed reporter"} · {report.reporter_email} · LINE {report.reporter_line}
                  </p>
                </div>
                <div className="text-right text-xs font-bold text-neutral-500">
                  <p>Created: {formatDate(report.created_at)}</p>
                  <p className="mt-1">Updated: {formatDate(report.updated_at)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="rounded-[4px] border-2 border-black bg-neutral-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Reported issue</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-neutral-800">
                      {report.details}
                    </p>
                  </div>
                  <div className="rounded-[4px] border-2 border-dashed border-black bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Page URL</p>
                    <p className="mt-2 break-all text-sm font-semibold text-neutral-700">
                      {report.page_url || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[4px] border-2 border-black bg-[#f8fafc] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Conversation</p>
                    <div className="mt-3 space-y-3">
                      {report.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`max-w-[92%] rounded-[18px] border-2 border-black px-4 py-3 text-sm font-semibold ${
                            message.sender_role === "admin"
                              ? "ml-auto bg-[#e9f3ff]"
                              : "bg-white"
                          }`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                            {message.sender_role} · {formatDate(message.created_at)}
                            {message.status_after ? ` · ${message.status_after}` : ""}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-neutral-800">{message.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[4px] border-2 border-black bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                      <label className="text-sm font-black text-neutral-900">
                        New status
                        <select
                          value={replyStatus[report.id] ?? report.status}
                          onChange={(e) =>
                            setReplyStatus((prev) => ({
                              ...prev,
                              [report.id]: e.target.value as BugReportStatus,
                            }))
                          }
                          className="mt-2 w-full rounded-[4px] border-2 border-black bg-white px-3 py-2 text-sm font-bold"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-black text-neutral-900">
                        Reply to reporter
                        <textarea
                          rows={5}
                          value={replyDrafts[report.id] ?? ""}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [report.id]: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-[4px] border-2 border-black bg-white px-3 py-3 text-sm font-semibold outline-none"
                          placeholder="Explain what was fixed, what you found, or what the reporter should try next."
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-neutral-500">
                        Sending a reply here also emails the reporter automatically.
                      </p>
                      <button
                        type="button"
                        onClick={() => void sendReply(report.id)}
                        disabled={busyId === report.id}
                        className="rounded-[4px] border-4 border-black bg-[#004aad] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50"
                      >
                        {busyId === report.id ? "Sending..." : "Reply + email"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
