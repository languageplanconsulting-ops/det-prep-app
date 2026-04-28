"use client";

const CURRENT_USER_ID_KEY = "ep-current-user-id";

export function getCurrentBrowserUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(CURRENT_USER_ID_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function setCurrentBrowserUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userId && userId.trim()) {
      localStorage.setItem(CURRENT_USER_ID_KEY, userId);
    } else {
      localStorage.removeItem(CURRENT_USER_ID_KEY);
    }
    window.dispatchEvent(new Event("ep-current-user-scope"));
  } catch {
    /* ignore */
  }
}
