"use client";

import { useEffect, useState } from "react";
import { getSfxMuted, setSfxMuted, SFX_MUTE_EVENT, sfxTap } from "@/lib/exam-sfx";

/**
 * SoundToggle — floating mute control + a global click-sound listener.
 *
 * Live for every user. It:
 *  - plays the punchy tap "pop" on any button/[role=button] click (muteable),
 *  - renders a 🔊/🔇 toggle (default ON, like Duolingo), remembered per device.
 * Add `data-no-sfx` to any element to opt it out.
 */
export function SoundToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(getSfxMuted());
    const onChange = () => setMuted(getSfxMuted());
    window.addEventListener(SFX_MUTE_EVENT, onChange);
    return () => window.removeEventListener(SFX_MUTE_EVENT, onChange);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest("button, [role='button']");
      if (!el) return;
      if (el.hasAttribute("data-no-sfx") || el.closest("[data-no-sfx]")) return;
      sfxTap();
    };
    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <button
      type="button"
      data-no-sfx
      onClick={() => {
        const next = !muted;
        setSfxMuted(next);
        setMuted(next);
      }}
      aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
      title={muted ? "เปิดเสียง" : "ปิดเสียง"}
      className="fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
