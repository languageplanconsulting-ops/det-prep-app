/**
 * Optional browser-only override for Supabase public URL + anon key.
 * Lets admins (or power users) point the client at a project without redeploying
 * (e.g. production feedback / testing when NEXT_PUBLIC_* is missing in the build).
 */

const URL_KEY = "ep-supabase-url";
const ANON_KEY = "ep-supabase-anon-key";

function read(key: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key)?.trim() ?? "";
}

export function getRuntimeSupabaseUrl(): string {
  return read(URL_KEY);
}

export function getRuntimeSupabaseAnonKey(): string {
  return read(ANON_KEY);
}

export function hasRuntimeSupabaseConfig(): boolean {
  return !!(getRuntimeSupabaseUrl() && getRuntimeSupabaseAnonKey());
}

export function setRuntimeSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(URL_KEY, url.trim());
  localStorage.setItem(ANON_KEY, anonKey.trim());
}

export function clearRuntimeSupabaseConfig(): void {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
}
