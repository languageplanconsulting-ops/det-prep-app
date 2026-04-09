import "server-only";

/**
 * Email notification placeholders — swap for Resend/SendGrid/etc. later.
 * Never throws; failures are logged only.
 */

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
