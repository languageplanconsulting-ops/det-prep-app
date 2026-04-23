import "server-only";

import {
  sendBugReplyToReporter,
  sendBugReportReceivedToReporter,
  sendBugReportToAdmin,
} from "@/lib/notifications";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type BugReportStatus = "open" | "investigating" | "fixed" | "closed";
export type BugReportPriority = "low" | "normal" | "high" | "urgent";

export type BugReportRow = {
  id: string;
  user_id: string | null;
  reporter_email: string;
  reporter_line: string;
  reporter_name: string | null;
  page_url: string | null;
  subject: string;
  details: string;
  status: BugReportStatus;
  priority: BugReportPriority;
  created_at: string;
  updated_at: string;
  last_replied_at: string | null;
  last_admin_reply: string | null;
  fixed_at: string | null;
  fixed_by: string | null;
};

export type BugReportMessageRow = {
  id: string;
  report_id: string;
  sender_role: "reporter" | "admin";
  sender_email: string | null;
  body: string;
  status_after: BugReportStatus | null;
  admin_id: string | null;
  created_at: string;
};

export type BugReportWithMessages = BugReportRow & {
  messages: BugReportMessageRow[];
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function cleanText(value: string): string {
  return value.trim();
}

export async function submitBugReport(params: {
  userId: string | null;
  reporterEmail: string;
  reporterLine: string;
  reporterName?: string | null;
  pageUrl?: string | null;
  subject: string;
  details: string;
}): Promise<
  | { ok: true; reportId: string; adminEmailSent: boolean; reporterEmailSent: boolean }
  | { ok: false; error: string }
> {
  const reporterEmail = normalizeEmail(params.reporterEmail);
  const reporterLine = cleanText(params.reporterLine);
  const subject = cleanText(params.subject);
  const details = cleanText(params.details);
  const reporterName = cleanText(params.reporterName ?? "");
  const pageUrl = cleanText(params.pageUrl ?? "");

  if (!reporterEmail.includes("@")) {
    return { ok: false, error: "Please enter a valid email." };
  }
  if (!reporterLine) {
    return { ok: false, error: "Please enter your LINE contact." };
  }
  if (!subject) {
    return { ok: false, error: "Please add a short subject." };
  }
  if (!details) {
    return { ok: false, error: "Please describe the problem." };
  }

  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("bug_reports")
    .insert({
      user_id: params.userId,
      reporter_email: reporterEmail,
      reporter_line: reporterLine,
      reporter_name: reporterName || null,
      page_url: pageUrl || null,
      subject,
      details,
      status: "open",
      priority: "normal",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[bug-reports] submit insert", error?.message);
    return { ok: false, error: "Could not save your report. Please try again." };
  }

  const report = data as BugReportRow;

  const { error: msgError } = await supabase.from("bug_report_messages").insert({
    report_id: report.id,
    sender_role: "reporter",
    sender_email: reporterEmail,
    body: details,
    status_after: "open",
  });

  if (msgError) {
    console.error("[bug-reports] submit message insert", msgError.message);
  }

  const adminMail = await sendBugReportToAdmin({
    reportId: report.id,
    reporterEmail,
    reporterLine,
    reporterName: reporterName || null,
    subject,
    details,
    pageUrl: pageUrl || null,
    submittedAtIso: report.created_at,
  });

  const reporterMail = await sendBugReportReceivedToReporter({
    to: reporterEmail,
    reportId: report.id,
    subject,
  });

  return {
    ok: true,
    reportId: report.id,
    adminEmailSent: adminMail.ok,
    reporterEmailSent: reporterMail.ok,
  };
}

export async function listBugReports(): Promise<BugReportWithMessages[]> {
  const supabase = createServiceRoleSupabase();
  const { data: reports, error } = await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[bug-reports] list reports", error.message);
    return [];
  }

  const reportRows = (reports ?? []) as BugReportRow[];
  if (reportRows.length === 0) return [];

  const reportIds = reportRows.map((row) => row.id);
  const { data: messages, error: msgError } = await supabase
    .from("bug_report_messages")
    .select("*")
    .in("report_id", reportIds)
    .order("created_at", { ascending: true });

  if (msgError) {
    console.error("[bug-reports] list messages", msgError.message);
  }

  const byReport = new Map<string, BugReportMessageRow[]>();
  for (const message of ((messages ?? []) as BugReportMessageRow[])) {
    const list = byReport.get(message.report_id) ?? [];
    list.push(message);
    byReport.set(message.report_id, list);
  }

  return reportRows.map((report) => ({
    ...report,
    messages: byReport.get(report.id) ?? [],
  }));
}

export async function replyToBugReport(params: {
  reportId: string;
  adminId: string | null;
  adminEmail?: string | null;
  replyBody: string;
  nextStatus: BugReportStatus;
}): Promise<
  | { ok: true; emailSent: boolean; emailError?: string }
  | { ok: false; error: string }
> {
  const replyBody = cleanText(params.replyBody);
  if (!replyBody) {
    return { ok: false, error: "Reply message is required." };
  }

  const supabase = createServiceRoleSupabase();
  const { data: report, error } = await supabase
    .from("bug_reports")
    .select("*")
    .eq("id", params.reportId)
    .maybeSingle();

  if (error || !report) {
    return { ok: false, error: "Bug report not found." };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: params.nextStatus,
    updated_at: now,
    last_replied_at: now,
    last_admin_reply: replyBody,
  };
  if (params.nextStatus === "fixed") {
    patch.fixed_at = now;
    patch.fixed_by = params.adminId;
  }

  const { error: updateError } = await supabase
    .from("bug_reports")
    .update(patch)
    .eq("id", params.reportId);

  if (updateError) {
    console.error("[bug-reports] reply update", updateError.message);
    return { ok: false, error: "Could not update this report." };
  }

  const { error: messageError } = await supabase.from("bug_report_messages").insert({
    report_id: params.reportId,
    sender_role: "admin",
    sender_email: params.adminEmail?.trim() || null,
    body: replyBody,
    status_after: params.nextStatus,
    admin_id: params.adminId,
  });

  if (messageError) {
    console.error("[bug-reports] reply message", messageError.message);
  }

  const mail = await sendBugReplyToReporter({
    to: String(report.reporter_email),
    reportId: String(report.id),
    subject: String(report.subject),
    replyBody,
    status: params.nextStatus,
  });

  return { ok: true, emailSent: mail.ok, emailError: mail.error };
}
