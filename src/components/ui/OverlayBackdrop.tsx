"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Full-screen backdrop for tap-opened, tap-to-dismiss overlays (sheets, dialogs,
 * pickers) that is immune to the iOS Safari "ghost click".
 *
 * The bug: on iPad/iPhone, Safari synthesizes a second "ghost" click ~immediately
 * after the tap that opened the overlay. Because the overlay mounts at the tapped
 * spot, that ghost click lands on the backdrop and fires its dismiss handler — the
 * overlay opens and closes in one tap, so the control looks completely dead. Desktop
 * never synthesizes this second click, which is why it only breaks on iPad.
 *
 * Two guards make dismissal reliable everywhere:
 *  1. Only a click on the backdrop ITSELF dismisses (clicks bubbling up from the
 *     dialog content are ignored) — so the inner panel no longer needs its own
 *     stopPropagation wrapper.
 *  2. Clicks within `guardMs` of the overlay mounting are ignored — this is exactly
 *     the window the ghost click arrives in. A real user can't see the overlay and
 *     decide to tap away that fast, so nothing legitimate is lost.
 *
 * Use for any overlay that opens from a tap. (Announcement modals that auto-open on
 * mount aren't affected by the ghost click, but using this everywhere keeps dismissal
 * behavior consistent.)
 */
export function OverlayBackdrop({
  onDismiss,
  className,
  children,
  guardMs = 400,
  style,
  role,
  ariaLabel,
}: {
  onDismiss: () => void;
  className?: string;
  children?: ReactNode;
  guardMs?: number;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
}) {
  const mountedAtRef = useRef<number | null>(null);
  if (mountedAtRef.current === null) mountedAtRef.current = Date.now();

  return (
    <div
      className={className}
      style={style}
      role={role}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return; // ignore clicks from the panel inside
        if (Date.now() - (mountedAtRef.current ?? 0) < guardMs) return; // ignore iOS ghost click
        onDismiss();
      }}
    >
      {children}
    </div>
  );
}
