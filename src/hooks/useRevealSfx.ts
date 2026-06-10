"use client";

import { useEffect } from "react";
import { sfxReveal } from "@/lib/exam-sfx";

/**
 * Plays the celebratory reveal chime once when a result/report screen mounts.
 * Admin + unmuted only (exam-sfx is gated) — silent for normal users.
 */
export function useRevealSfx(): void {
  useEffect(() => {
    sfxReveal();
  }, []);
}
