import "server-only";

/**
 * Sends transactional email via Resend when RESEND_API_KEY is set.
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Env:
 * - RESEND_API_KEY (required for real sends)
 * - RESEND_FROM — must be from a domain verified in Resend, or use `onboarding@resend.dev` for testing
 */

function formatResendError(payload: unknown): string {
  if (payload == null) return "Unknown error";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object" && payload !== null) {
    const o = payload as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(o.errors)) {
      try {
        return JSON.stringify(o.errors);
      } catch {
        return String(o.errors);
      }
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }
  return String(payload);
}

async function postResendEmail(body: Record<string, unknown>): Promise<{
  ok: boolean;
  error?: string;
  status: number;
}> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY not set", status: 0 };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = { raw: rawText };
    }

    if (!res.ok) {
      const err = formatResendError(payload);
      console.error(
        "[email-resend] Resend API error",
        res.status,
        err,
        rawText.slice(0, 500),
      );
      return { ok: false, error: err || `HTTP ${res.status}`, status: res.status };
    }

    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-resend] Network/fetch error:", msg);
    return { ok: false, error: msg, status: 0 };
  }
}

export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional; can cause validation issues if set — prefer omitting */
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const fromConfigured = process.env.RESEND_FROM?.trim();

  if (!key) {
    console.warn(
      "[email-resend] RESEND_API_KEY not set; email not sent:",
      params.subject,
    );
    return { ok: false, error: "Email not configured (set RESEND_API_KEY in Vercel)" };
  }

  const toList = Array.isArray(params.to) ? params.to : [params.to];
  const base: Record<string, unknown> = {
    to: toList,
    subject: params.subject,
    html: params.html,
  };
  if (params.replyTo?.trim()) {
    base.reply_to = params.replyTo.trim();
  }

  /** Try configured from, then bare Resend sandbox address (most reliable for new API keys). */
  const fromCandidates: string[] = [];
  if (fromConfigured) fromCandidates.push(fromConfigured);
  fromCandidates.push("English Plan <onboarding@resend.dev>");
  fromCandidates.push("onboarding@resend.dev");

  const tried = new Set<string>();
  let lastError = "No from address worked";

  for (const from of fromCandidates) {
    if (tried.has(from)) continue;
    tried.add(from);

    const result = await postResendEmail({ ...base, from });
    if (result.ok) {
      console.log("[email-resend] Sent OK, from=", from.slice(0, 48));
      return { ok: true };
    }
    lastError = result.error ?? lastError;
    if (result.status === 401 || result.status === 403) {
      return {
        ok: false,
        error: `${lastError} (check RESEND_API_KEY in Vercel Production)`,
      };
    }
    console.warn(
      "[email-resend] Retrying another From address. Status:",
      result.status,
      lastError,
    );
  }

  console.error(
    "[email-resend] All from-address attempts failed. Last error:",
    lastError,
    "Hint: In Resend dashboard verify your domain and set RESEND_FROM to an address on that domain.",
  );
  return { ok: false, error: lastError };
}
