/** httpOnly cookie set after successful admin code login (no Supabase email required). */
export const SIMPLE_ADMIN_COOKIE = "ep_admin_simple";

const HMAC_MESSAGE = "english-plan-simple-admin-v1";

export function getAdminLoginCode(): string {
  return process.env.ADMIN_LOGIN_CODE?.trim() || "englishplanforever";
}

/** Secret used to sign the cookie value (HMAC). Defaults to login code if unset. */
export function getSimpleAdminSecret(): string {
  return (
    process.env.ADMIN_ACCESS_SECRET?.trim() ||
    process.env.ADMIN_LOGIN_CODE?.trim() ||
    "englishplanforever"
  );
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function makeSimpleAdminToken(): Promise<string> {
  return hmacSha256Hex(getSimpleAdminSecret(), HMAC_MESSAGE);
}

export async function verifySimpleAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await makeSimpleAdminToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
