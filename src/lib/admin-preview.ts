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

// ---------------------------------------------------------------------------
// Gate override — walk the learner journey without having to pass anything
// ---------------------------------------------------------------------------

export const ADMIN_GATE_OVERRIDE_KEY = "admin_gate_override";
const GATE_OVERRIDE_EVENT = "englishplan-admin-gate-override-changed";

/**
 * When on, every pass-mark in the course journey gains a visible "skip (admin)"
 * escape: cloze 100%, pronunciation 95%, read-aloud and listen confirmations,
 * score gates, and video watch-through.
 *
 * Deliberately an explicit toggle rather than "always on for admins": an admin
 * checking whether a gate actually blocks a learner needs the real behaviour by
 * default, and a silent bypass would hide exactly the bugs this exists to find.
 * It is also client-only and cosmetic — it never writes a passing score to the
 * server, it just lets the UI advance.
 */
export function setGateOverride(on: boolean): void {
  if (typeof window === "undefined") return;
  if (on) sessionStorage.setItem(ADMIN_GATE_OVERRIDE_KEY, "1");
  else sessionStorage.removeItem(ADMIN_GATE_OVERRIDE_KEY);
  window.dispatchEvent(new CustomEvent(GATE_OVERRIDE_EVENT));
}

export function getGateOverride(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_GATE_OVERRIDE_KEY) === "1";
}

export function subscribeGateOverrideChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(GATE_OVERRIDE_EVENT, handler);
  return () => window.removeEventListener(GATE_OVERRIDE_EVENT, handler);
}
