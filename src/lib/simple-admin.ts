/** httpOnly cookie set after successful admin code login (no Supabase email required). */
export const SIMPLE_ADMIN_COOKIE = "ep_admin_simple";

/** Mobile / API clients send the signed token in this header (Bearer JWT is separate). */
export const SIMPLE_ADMIN_HEADER = "x-ep-admin-token";

const HMAC_MESSAGE = "english-plan-simple-admin-v1";

const DEFAULT_ADMIN_CODE = "englishplanforeover";
const LEGACY_ADMIN_CODE = "englishplanforever";

export function getAdminLoginCode(): string {
  return process.env.ADMIN_LOGIN_CODE?.trim() || DEFAULT_ADMIN_CODE;
}

/** Accept configured code plus legacy alias so older bookmarks still work. */
export function isValidAdminLoginCode(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return false;
  const configured = getAdminLoginCode();
  return (
    trimmed === configured ||
    trimmed === DEFAULT_ADMIN_CODE ||
    trimmed === LEGACY_ADMIN_CODE
  );
}

/** Secret used to sign the cookie value (HMAC). Defaults to login code if unset. */
export function getSimpleAdminSecret(): string {
  return (
    process.env.ADMIN_ACCESS_SECRET?.trim() ||
    process.env.ADMIN_LOGIN_CODE?.trim() ||
    DEFAULT_ADMIN_CODE
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
