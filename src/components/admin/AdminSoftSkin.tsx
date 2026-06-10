"use client";

import { useEffect } from "react";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * AdminSoftSkin — attaches the `admin-soft` class to <html> for ADMINS ONLY.
 *
 * The class scopes a pure-CSS re-skin (see globals.css ".admin-soft ...") that
 * softens the brutalist borders/shadows/radius across every not-yet-forked
 * screen (exam flows, reports, hubs) so they match the new soft-modern V2 pages.
 *
 * It toggles a class only — no logic, no DOM structure, no data. For non-admins
 * the class is never added, so their experience is byte-for-byte unchanged.
 * Runs in an effect (client-only) so there is no SSR/hydration mismatch.
 */
export function AdminSoftSkin() {
  const { isAdmin, previewEligible } = useEffectiveTier();
  // Match the app's admin signal (DB admin OR code/preview admin).
  const on = isAdmin || previewEligible;

  useEffect(() => {
    const root = document.documentElement;
    if (on) {
      root.classList.add("admin-soft");
    } else {
      root.classList.remove("admin-soft");
    }
    return () => root.classList.remove("admin-soft");
  }, [on]);

  return null;
}
