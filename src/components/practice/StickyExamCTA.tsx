"use client";

import type { ReactNode } from "react";

/**
 * StickyExamCTA — design-system primitive (Fitts's Law + thumb-zone ergonomics).
 *
 * On mobile, pins the single primary action to the bottom of the viewport where
 * the thumb naturally rests, full-width and large (≥48px). On desktop (sm+) it
 * renders inline. A spacer prevents the fixed bar from covering content on mobile.
 *
 * Presentational only — gate it by rendering inside an admin/soft branch.
 * Pass the primary action first; optional secondary/hint render beside/above it.
 */
export function StickyExamCTA({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <>
      {/* spacer so the fixed bar never covers content on mobile */}
      <div className="h-24 sm:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:mt-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="mx-auto w-full max-w-2xl">
          {hint ? (
            <p className="mb-2 text-center text-xs text-slate-500 sm:text-left">{hint}</p>
          ) : null}
          <div className="flex items-center gap-2">{children}</div>
        </div>
      </div>
    </>
  );
}
