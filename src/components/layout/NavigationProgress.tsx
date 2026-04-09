"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Indeterminate top shimmer during route changes — no numeric 0–100% snap.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [phase, setPhase] = useState<"idle" | "active" | "fading">("idle");

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setPhase("active");
    const fade = window.setTimeout(() => setPhase("fading"), 1650);
    const idle = window.setTimeout(() => setPhase("idle"), 2900);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(idle);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  return (
    <div
      className={`ep-nav-progress ${phase === "fading" ? "ep-nav-progress--fading" : ""}`}
      aria-hidden
    >
      <div className="ep-nav-progress__track">
        <div className="ep-nav-progress__shimmer" />
      </div>
    </div>
  );
}
