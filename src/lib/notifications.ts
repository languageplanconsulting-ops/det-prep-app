import "server-only";

import { sendResendEmail } from "@/lib/email-resend";

/**
 * Transactional email via Resend when RESEND_API_KEY is set; otherwise logs only.
 */

function notifyEmailDefault(): string {
  return (
    process.env.FAST_TRACK_NOTIFY_EMAIL?.trim() ??
    "languageplanconsulting@gmail.com"
  );
}

function supportEmailDefault(): string {
  return (
    process.env.BUG_REPORT_NOTIFY_EMAIL?.trim() ??
    notifyEmailDefault()
  );
}

/** Admin receives a new Fast Track request from the landing page. */
export async function sendFastTrackRequestToAdmin(params: {
  studentEmail: string;
  studentName: string | null;
  submittedAtIso: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = notifyEmailDefault();
  const name = params.studentName?.trim() || "—";
  const html = `
    <p><strong>New Duolingo Fast Track VIP request</strong></p>
    <p>Email: <a href="mailto:${params.studentEmail}">${params.studentEmail}</a><br/>
    Name: ${escapeHtml(name)}<br/>
    Submitted (UTC): ${escapeHtml(params.submittedAtIso)}</p>
    <p>Review in Admin → VIP course access → <strong>Pending Fast Track</strong>.</p>
    <hr/>
    <p><strong>คำขอสิทธิ์ VIP Fast Track ใหม่</strong></p>
    <p>อีเมล: ${escapeHtml(params.studentEmail)}<br/>ชื่อ: ${escapeHtml(name)}<br/>เวลาส่ง (UTC): ${escapeHtml(params.submittedAtIso)}</p>
    <p>ตรวจในแอดมิน → VIP course access → ส่วน Pending Fast Track</p>
  `;
  const r = await sendResendEmail({
    to,
    subject: `[English Plan] Fast Track VIP request — ${params.studentEmail}`,
    html,
  });
  if (!r.ok) {
    console.error("[notifications] sendFastTrackRequestToAdmin failed:", r.error);
  }
  return r;
}

/** Student receives access confirmation + personalized password after admin approval. */
export async function sendFastTrackApprovedToStudent(params: {
  to: string;
  accessPassword: string;
  accessUntilIso: string;
}): Promise<{ ok: boolean; error?: string }> {
  const until = new Date(params.accessUntilIso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const untilTh = new Date(params.accessUntilIso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const html = `
    <p>Hello,</p>
    <p>Your <strong>VIP access</strong> to <strong>ENGLISH PLAN</strong> is ready. You can sign in with <strong>Google</strong> using this same email address, or use <strong>email + password</strong> on the login page.</p>
    <p><strong>Your access password</strong> (save it in a safe place):<br/>
    <code style="font-size:16px;padding:8px 12px;background:#f4f4f4;border:2px solid #000;display:inline-block">${escapeHtml(params.accessPassword)}</code></p>
    <p>VIP access is valid until: <strong>${escapeHtml(until)}</strong> (UTC-based).</p>
    <p>— English Plan (Language Plan Consulting)</p>
    <hr/>
    <p>สวัสดีครับ/ค่ะ</p>
    <p>สิทธิ์ <strong>VIP</strong> สำหรับแอป <strong>ENGLISH PLAN</strong> พร้อมแล้ว คุณสามารถล็อกอินด้วย <strong>Google</strong> ด้วยอีเมลนี้ หรือใช้ <strong>อีเมล + รหัสผ่าน</strong> ที่หน้าเข้าสู่ระบบ</p>
    <p><strong>รหัสผ่านสำหรับเข้าใช้งาน</strong> (เก็บเป็นความลับ):<br/>
    <code style="font-size:16px;padding:8px 12px;background:#f4f4f4;border:2px solid #000;display:inline-block">${escapeHtml(params.accessPassword)}</code></p>
    <p>สิทธิ์ VIP ใช้ได้ถึง: <strong>${escapeHtml(untilTh)}</strong></p>
    <p>— English Plan (Language Plan Consulting)</p>
  `;
  const r = await sendResendEmail({
    to: params.to,
    subject: "Your ENGLISH PLAN VIP access is ready / สิทธิ์ VIP พร้อมแล้ว",
    html,
  });
  if (!r.ok) {
    console.error("[notifications] sendFastTrackApprovedToStudent failed:", r.error);
  }
  return r;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendVIPGrantEmail(
  email: string,
  name?: string,
): Promise<void> {
  try {
    const who = name ? `${name} <${email}>` : email;
    console.log(`EMAIL: VIP access granted to ${who}`);
    // EN Subject: "Your VIP access to EnglishPlan is ready 🎉"
    // TH Subject: "สิทธิ์ VIP EnglishPlan ของคุณพร้อมแล้ว 🎉"
    // Body EN / TH — implement with real provider
  } catch (e) {
    console.error("[notifications] sendVIPGrantEmail", e);
  }
}

export async function sendVIPRevokeEmail(
  email: string,
  name?: string,
): Promise<void> {
  try {
    const who = name ? `${name} <${email}>` : email;
    console.log(`EMAIL: VIP access revoked for ${who}`);
  } catch (e) {
    console.error("[notifications] sendVIPRevokeEmail", e);
  }
}

export async function sendWelcomeEmail(
  email: string,
  name?: string,
  tier?: string,
): Promise<void> {
  try {
    const who = name ? `${name} <${email}>` : email;
    console.log(
      `EMAIL: Welcome email sent to ${who} on ${tier ?? "unknown"} plan`,
    );
  } catch (e) {
    console.error("[notifications] sendWelcomeEmail", e);
  }
}

export async function sendBugReportToAdmin(params: {
  reportId: string;
  reporterEmail: string;
  reporterLine: string;
  reporterName: string | null;
  subject: string;
  details: string;
  pageUrl: string | null;
  submittedAtIso: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = supportEmailDefault();
  const html = `
    <p><strong>New bug report from ENGLISH PLAN</strong></p>
    <p>
      Report ID: <strong>${escapeHtml(params.reportId)}</strong><br/>
      Reporter email: <a href="mailto:${escapeHtml(params.reporterEmail)}">${escapeHtml(params.reporterEmail)}</a><br/>
      LINE: ${escapeHtml(params.reporterLine)}<br/>
      Name: ${escapeHtml(params.reporterName?.trim() || "—")}<br/>
      Submitted (UTC): ${escapeHtml(params.submittedAtIso)}
    </p>
    <p><strong>Subject</strong><br/>${escapeHtml(params.subject)}</p>
    <p><strong>Details</strong><br/>${escapeHtml(params.details).replace(/\n/g, "<br/>")}</p>
    <p><strong>Page URL</strong><br/>${escapeHtml(params.pageUrl?.trim() || "—")}</p>
    <p>Review in Admin → Bug reports.</p>
    <hr/>
    <p><strong>รายงานปัญหาใหม่จาก ENGLISH PLAN</strong></p>
    <p>
      รหัสรายงาน: <strong>${escapeHtml(params.reportId)}</strong><br/>
      อีเมลผู้แจ้ง: ${escapeHtml(params.reporterEmail)}<br/>
      LINE: ${escapeHtml(params.reporterLine)}<br/>
      ชื่อ: ${escapeHtml(params.reporterName?.trim() || "—")}
    </p>
  `;
  const result = await sendResendEmail({
    to,
    subject: `[English Plan] Bug report — ${params.subject}`,
    html,
    replyTo: params.reporterEmail,
  });
  if (!result.ok) {
    console.error("[notifications] sendBugReportToAdmin failed:", result.error);
  }
  return result;
}

export async function sendBugReportReceivedToReporter(params: {
  to: string;
  reportId: string;
  subject: string;
}): Promise<{ ok: boolean; error?: string }> {
  const html = `
    <p>Hello,</p>
    <p>We received your bug report for <strong>ENGLISH PLAN</strong>.</p>
    <p>
      Report ID: <strong>${escapeHtml(params.reportId)}</strong><br/>
      Subject: ${escapeHtml(params.subject)}
    </p>
    <p>Our team will review it and email you when there is an update or fix.</p>
    <hr/>
    <p>สวัสดีค่ะ/ครับ</p>
    <p>เราได้รับรายงานปัญหาของคุณใน <strong>ENGLISH PLAN</strong> แล้ว</p>
    <p>
      รหัสรายงาน: <strong>${escapeHtml(params.reportId)}</strong><br/>
      หัวข้อ: ${escapeHtml(params.subject)}
    </p>
    <p>ทีมงานจะตรวจสอบและส่งอีเมลแจ้งกลับเมื่อมีความคืบหน้าหรือแก้ไขเสร็จแล้ว</p>
  `;
  const result = await sendResendEmail({
    to: params.to,
    subject: "We received your bug report / ได้รับรายงานปัญหาของคุณแล้ว",
    html,
  });
  if (!result.ok) {
    console.error("[notifications] sendBugReportReceivedToReporter failed:", result.error);
  }
  return result;
}

export async function sendBugReplyToReporter(params: {
  to: string;
  reportId: string;
  subject: string;
  replyBody: string;
  status: "open" | "investigating" | "fixed" | "closed";
}): Promise<{ ok: boolean; error?: string }> {
  const statusLabel =
    params.status === "open"
      ? "Open"
      : params.status === "investigating"
        ? "Investigating"
        : params.status === "fixed"
          ? "Fixed"
          : "Closed";

  const statusTh =
    params.status === "open"
      ? "เปิดอยู่"
      : params.status === "investigating"
        ? "กำลังตรวจสอบ"
        : params.status === "fixed"
          ? "แก้ไขแล้ว"
          : "ปิดแล้ว";

  const html = `
    <p>Hello,</p>
    <p>There is an update on your ENGLISH PLAN bug report.</p>
    <p>
      Report ID: <strong>${escapeHtml(params.reportId)}</strong><br/>
      Subject: ${escapeHtml(params.subject)}<br/>
      Status: <strong>${escapeHtml(statusLabel)}</strong>
    </p>
    <p><strong>Reply from admin</strong><br/>${escapeHtml(params.replyBody).replace(/\n/g, "<br/>")}</p>
    <hr/>
    <p>สวัสดีค่ะ/ครับ</p>
    <p>มีความคืบหน้าเกี่ยวกับรายงานปัญหา ENGLISH PLAN ของคุณ</p>
    <p>
      รหัสรายงาน: <strong>${escapeHtml(params.reportId)}</strong><br/>
      หัวข้อ: ${escapeHtml(params.subject)}<br/>
      สถานะ: <strong>${escapeHtml(statusTh)}</strong>
    </p>
    <p><strong>ข้อความจากแอดมิน</strong><br/>${escapeHtml(params.replyBody).replace(/\n/g, "<br/>")}</p>
  `;
  const result = await sendResendEmail({
    to: params.to,
    subject: `[English Plan] Bug report update — ${params.subject}`,
    html,
  });
  if (!result.ok) {
    console.error("[notifications] sendBugReplyToReporter failed:", result.error);
  }
  return result;
}
