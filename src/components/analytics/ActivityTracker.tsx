"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  flush,
  setTrackingEnabled,
  track,
} from "@/lib/activity-tracker";

/** Walk up from the clicked node to the nearest "actionable" ancestor we care about. */
function closestActionable(start: EventTarget | null): HTMLElement | null {
  let el = start instanceof HTMLElement ? start : null;
  for (let i = 0; el && i < 8; i += 1) {
    if (
      el.hasAttribute("data-track") ||
      el.tagName === "BUTTON" ||
      el.tagName === "A" ||
      el.getAttribute("role") === "button" ||
      el.getAttribute("role") === "link" ||
      el.getAttribute("role") === "tab" ||
      (el.tagName === "INPUT" &&
        ["submit", "button", "radio", "checkbox"].includes(
          (el as HTMLInputElement).type,
        )) ||
      el.tagName === "LABEL"
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function labelFor(el: HTMLElement): string | null {
  const explicit = el.getAttribute("data-track-label") || el.getAttribute("aria-label");
  if (explicit) return explicit.trim().slice(0, 200);
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 200);
  const title = el.getAttribute("title") || el.getAttribute("alt");
  return title ? title.trim().slice(0, 200) : null;
}

/** Coarse, stable-ish key for grouping similar clicks across users. */
function keyFor(el: HTMLElement): string {
  const dt = el.getAttribute("data-track");
  if (dt) return dt;
  const id = el.id ? `#${el.id}` : "";
  const tag = el.tagName.toLowerCase();
  return `${tag}${id}`;
}

/** Collect data-track-* attributes (minus the label) as event metadata. */
function trackMetadata(el: HTMLElement): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-track-") && attr.name !== "data-track-label") {
      meta[attr.name.replace("data-track-", "")] = attr.value;
    }
  }
  if (el.tagName === "A") {
    const href = (el as HTMLAnchorElement).getAttribute("href");
    if (href) meta.href = href.split(/[?#]/)[0].slice(0, 200);
  }
  return meta;
}

/**
 * Mounts once in the root layout. Auto-captures page views + clicks for non-converted users,
 * and flushes the buffer on tab-hide / unload. Paid users and admins are never tracked.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const { effectiveTier, realTier, isAdmin, isPreviewMode, loading } = useEffectiveTier();
  const lastPathRef = useRef<string | null>(null);

  // Decide whether this visitor should be tracked. Anonymous + free only; never admins/preview.
  // `realTier` guards against an admin previewing-as-free; logged-out users resolve to free.
  const shouldTrack =
    !loading &&
    !isAdmin &&
    !isPreviewMode &&
    realTier === "free" &&
    effectiveTier === "free";

  useEffect(() => {
    setTrackingEnabled(shouldTrack);
    return () => setTrackingEnabled(false);
  }, [shouldTrack]);

  // Page views (also fires for the initial load once tracking is enabled).
  useEffect(() => {
    if (!shouldTrack || !pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    track("page_view", { path: pathname });
  }, [pathname, shouldTrack]);

  // Delegated click capture.
  useEffect(() => {
    if (!shouldTrack) return;
    const onClick = (e: MouseEvent) => {
      const el = closestActionable(e.target);
      if (!el) return;
      const tagged = el.getAttribute("data-track");
      track(tagged || "click", {
        targetLabel: labelFor(el),
        targetKey: keyFor(el),
        metadata: trackMetadata(el),
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [shouldTrack]);

  // Flush on tab hide / navigation away.
  useEffect(() => {
    if (!shouldTrack) return;
    const onHide = () => flush(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(true);
    };
  }, [shouldTrack]);

  return null;
}
