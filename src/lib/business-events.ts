import "server-only";

import { sendResendEmail } from "@/lib/email-resend";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type BusinessEventType =
  | "account_created"
  | "plan_purchased"
  | "addon_purchased"
  | "mini_diagnosis_started"
  | "mock_test_started";

type BusinessEventMetadata = Record<string, unknown>;

export type BusinessEventRow = {
  id: string;
  user_id: string | null;
  event_type: BusinessEventType;
  event_source: string | null;
  event_label: string | null;
  event_value: number | null;
  event_currency: string | null;
  email: string | null;
  dedupe_key: string | null;
  metadata: BusinessEventMetadata | null;
  email_notified_at: string | null;
  email_notification_error: string | null;
  created_at: string;
};

type RecordBusinessEventParams = {
  userId?: string | null;
  email?: string | null;
  eventType: BusinessEventType;
  eventSource?: string | null;
  eventLabel?: string | null;
  eventValue?: number | null;
  eventCurrency?: string | null;
  dedupeKey?: string | null;
  metadata?: BusinessEventMetadata;
};

function businessNotifyEmailDefault(): string {
  return (
    process.env.BUSINESS_NOTIFY_EMAIL?.trim() ??
    process.env.FAST_TRACK_NOTIFY_EMAIL?.trim() ??
    "languageplanconsulting@gmail.com"
  );
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeCurrency(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim().toLowerCase() || null;
}

function formatEventValue(value: number | null, currency: string | null): string {
  if (!Number.isFinite(value ?? NaN)) return "—";
  if ((currency ?? "").toLowerCase() === "thb") {
    return `฿${((value ?? 0) / 100).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return String(value ?? 0);
}

function formatBangkokDate(value: string): string {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function buildEventTitle(event: BusinessEventRow): string {
  switch (event.event_type) {
    case "account_created":
      return "มีผู้สมัครสมาชิกใหม่";
    case "plan_purchased":
      return "มีการซื้อแพ็กเกจใหม่";
    case "addon_purchased":
      return "มีการซื้อ Add-on";
    case "mini_diagnosis_started":
      return "มีผู้เริ่ม Mini Diagnosis";
    case "mock_test_started":
      return "มีผู้เริ่ม Full Mock Test";
    default:
      return "มี Business Event ใหม่";
  }
}

function buildEventSubject(event: BusinessEventRow): string {
  switch (event.event_type) {
    case "account_created":
      return `[English Plan] New account — ${event.email ?? "unknown"}`;
    case "plan_purchased":
      return `[English Plan] Plan purchase — ${event.event_label ?? "plan"}`;
    case "addon_purchased":
      return `[English Plan] Add-on purchase — ${event.event_label ?? "add-on"}`;
    case "mini_diagnosis_started":
      return `[English Plan] Free mini diagnosis started — ${event.email ?? "unknown"}`;
    case "mock_test_started":
      return `[English Plan] Mock test started — ${event.email ?? "unknown"}`;
    default:
      return "[English Plan] Business event";
  }
}

function shouldNotifyByEmail(event: BusinessEventRow): boolean {
  if (event.event_type === "mock_test_started") return false;
  if (event.event_type === "mini_diagnosis_started") {
    return event.metadata?.isFreeUser === true;
  }
  return true;
}

function buildEventHtml(event: BusinessEventRow): string {
  const meta = event.metadata ?? {};
  const metaList = Object.entries(meta)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(
      ([key, value]) =>
        `<li><strong>${escapeHtml(key)}</strong>: ${escapeHtml(
          typeof value === "string" ? value : JSON.stringify(value),
        )}</li>`,
    )
    .join("");

  return `
    <p><strong>${escapeHtml(buildEventTitle(event))}</strong></p>
    <p>
      Event: <strong>${escapeHtml(event.event_type)}</strong><br/>
      Source: ${escapeHtml(event.event_source ?? "—")}<br/>
      Email: ${escapeHtml(event.email ?? "—")}<br/>
      Label: ${escapeHtml(event.event_label ?? "—")}<br/>
      Value: ${escapeHtml(formatEventValue(event.event_value, event.event_currency))}<br/>
      Time (Bangkok): ${escapeHtml(formatBangkokDate(event.created_at))}
    </p>
    ${
      metaList
        ? `<p><strong>Metadata</strong></p><ul>${metaList}</ul>`
        : "<p><strong>Metadata</strong>: —</p>"
    }
  `;
}

async function markBusinessEventEmailResult(
  eventId: string,
  result: { ok: boolean; error?: string },
) {
  const supabase = createServiceRoleSupabase();
  const patch = result.ok
    ? {
        email_notified_at: new Date().toISOString(),
        email_notification_error: null,
      }
    : {
        email_notification_error: result.error ?? "Unknown email error",
      };

  const { error } = await supabase
    .from("business_events")
    .update(patch)
    .eq("id", eventId);
  if (error) {
    console.error("[business-events] failed to update email result", error.message);
  }
}

async function notifyAdminAboutBusinessEvent(event: BusinessEventRow) {
  if (!shouldNotifyByEmail(event)) return;

  const result = await sendResendEmail({
    to: businessNotifyEmailDefault(),
    subject: buildEventSubject(event),
    html: buildEventHtml(event),
  });

  await markBusinessEventEmailResult(event.id, result);
}

export async function recordBusinessEvent(
  params: RecordBusinessEventParams,
): Promise<{ ok: boolean; inserted: boolean; eventId?: string; error?: string }> {
  const supabase = createServiceRoleSupabase();
  const payload = {
    user_id: params.userId ?? null,
    email: params.email?.trim().toLowerCase() ?? null,
    event_type: params.eventType,
    event_source: params.eventSource ?? null,
    event_label: params.eventLabel ?? null,
    event_value:
      typeof params.eventValue === "number" && Number.isFinite(params.eventValue)
        ? Math.round(params.eventValue)
        : null,
    event_currency: normalizeCurrency(params.eventCurrency ?? "thb"),
    dedupe_key: params.dedupeKey ?? null,
    metadata: params.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("business_events")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: true, inserted: false };
    }
    console.error("[business-events] insert failed", error.message, payload);
    return { ok: false, inserted: false, error: error.message };
  }

  if (data?.id) {
    void notifyAdminAboutBusinessEvent(data as BusinessEventRow);
  }

  return { ok: true, inserted: Boolean(data?.id), eventId: data?.id };
}
