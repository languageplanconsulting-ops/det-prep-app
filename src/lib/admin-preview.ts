import type { Tier } from "@/lib/access-control";

export const ADMIN_PREVIEW_STORAGE_KEY = "admin_preview_tier";
export const ADMIN_PREVIEW_COOKIE = "ep_admin_preview_tier";

const PREVIEW_CHANGE_EVENT = "englishplan-admin-preview-changed";

function dispatchPreviewChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PREVIEW_CHANGE_EVENT));
}

function isTier(s: string): s is Tier {
  return s === "free" || s === "basic" || s === "premium" || s === "vip";
}

function setPreviewCookie(tier: Tier): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_PREVIEW_COOKIE}=${encodeURIComponent(tier)}; path=/; SameSite=Lax`;
}

function clearPreviewCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_PREVIEW_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Persist the tier the admin wants to preview as (client-only).
 */
export function setPreviewTier(tier: Tier): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_PREVIEW_STORAGE_KEY, tier);
  setPreviewCookie(tier);
  dispatchPreviewChanged();
}

/**
 * Current preview tier from session storage, or null if not previewing.
 */
export function getPreviewTier(): Tier | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ADMIN_PREVIEW_STORAGE_KEY);
  if (!raw || !isTier(raw)) return null;
  return raw;
}

export function clearPreviewTier(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_PREVIEW_STORAGE_KEY);
  clearPreviewCookie();
  dispatchPreviewChanged();
}

export function isAdminPreviewing(): boolean {
  return getPreviewTier() !== null;
}

export function subscribePreviewTierChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(PREVIEW_CHANGE_EVENT, handler);
  return () => window.removeEventListener(PREVIEW_CHANGE_EVENT, handler);
}
