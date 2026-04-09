"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Gentle enter animation when the route changes (App Router children swap).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="ep-page-shell">
      {children}
    </div>
  );
}
