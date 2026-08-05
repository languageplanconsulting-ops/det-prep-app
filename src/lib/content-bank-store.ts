"use client";

/**
 * Storage layer for the 16 published content banks (CONTENT_BANK_KEYS in content-bank-sync).
 *
 * Those banks total ~2.7 MILLION characters. Browsers store localStorage as UTF-16 and cap an
 * origin at ~5MB, so writing the whole snapshot with plain `localStorage.setItem` overflows the
 * quota and throws QuotaExceededError partway through. That rejection used to propagate out of
 * ensureCanonicalPracticeContent() into every practice gate's `await`, so the gate never reached
 * its `setState` and sat on its loader forever ("ขึ้นโหลดตลอด"). Existing learners never noticed —
 * they still had an older copy already in localStorage — but a NEW learner, whose storage is
 * empty, was left with no content at all on every practice page.
 *
 * So: memory is authoritative for the tab, and localStorage is a best-effort MIRROR.
 * - A browser with room keeps the old behaviour (persisted between page loads).
 * - A browser over quota — or one that blocks storage entirely, like private mode and the
 *   LINE/Facebook in-app browsers — degrades to "re-pull on next page load", never to a hang.
 * Nothing in here throws.
 */

const memory = new Map<string, string>();
let crossTabHookAttached = false;

/** Keep the in-memory copy honest when another tab republishes a bank. */
function attachCrossTabListener(): void {
  if (crossTabHookAttached || typeof window === "undefined") return;
  crossTabHookAttached = true;
  window.addEventListener("storage", (e) => {
    if (!e.key || !memory.has(e.key)) return;
    if (typeof e.newValue === "string") memory.set(e.key, e.newValue);
    else memory.delete(e.key);
  });
}

export function readContentBankItem(key: string): string | null {
  attachCrossTabListener();
  const cached = memory.get(key);
  if (typeof cached === "string") return cached;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (typeof raw === "string") memory.set(key, raw);
    return raw;
  } catch {
    // Storage blocked (private mode / in-app browser) — memory-only for this tab.
    return null;
  }
}

/**
 * Always succeeds for this tab. The localStorage mirror is optional; when it fails we keep
 * whatever older value is already persisted (setItem is atomic, so it is still valid) rather
 * than clearing it — that copy is the offline fallback if the next pull can't reach the server.
 */
export function writeContentBankItem(key: string, value: string): void {
  attachCrossTabListener();
  memory.set(key, value);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* over quota or blocked — memory already holds it */
  }
}

export function removeContentBankItem(key: string): void {
  memory.delete(key);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* blocked */
  }
}
