import "server-only";

/**
 * Sends transactional email via Resend when RESEND_API_KEY is set.
 * https://resend.com/docs/api-reference/emails/send-email
 */
export async function sendResendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional reply-to for student replies */
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM?.trim() ?? "English Plan <onboarding@resend.dev>";

  if (!key) {
    console.warn(
      "[email-resend] RESEND_API_KEY not set; email not sent:",
      params.subject,
    );
    return { ok: false, error: "Email not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      id?: string;
    };

    if (!res.ok) {
      console.error("[email-resend]", res.status, body?.message ?? body);
      return { ok: false, error: body?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email-resend]", msg);
    return { ok: false, error: msg };
  }
}
