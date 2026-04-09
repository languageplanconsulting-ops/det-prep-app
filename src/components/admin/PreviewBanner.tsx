"use client";

import { useRouter } from "next/navigation";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  clearPreviewTier,
  setPreviewTier,
} from "@/lib/admin-preview";
import type { Tier } from "@/lib/access-control";
import { TIER_DISPLAY } from "@/lib/access-control";

const SWITCH_TIERS: Tier[] = ["free", "basic", "premium", "vip"];

export function PreviewBanner() {
  const router = useRouter();
  const { previewEligible, isPreviewMode, effectiveTier, loading } =
    useEffectiveTier();

  if (loading || !previewEligible || !isPreviewMode) {
    return null;
  }

  const tierLabel = TIER_DISPLAY[effectiveTier].nameEn.toUpperCase();

  return (
    <div
      className="sticky top-0 z-[200] flex flex-wrap items-center justify-center gap-2 border-b-2 border-black px-3 py-2 text-xs font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.15)] sm:text-sm"
      style={{
        backgroundColor: "#004AAD",
        color: "#FFCC00",
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      }}
      role="region"
      aria-label="Admin preview mode"
    >
      <span className="shrink-0">
        👁 Admin Preview Mode — Viewing as {tierLabel} subscriber
      </span>
      <span className="hidden sm:inline text-[#FFCC00]/70">|</span>
      <div className="flex flex-wrap items-center gap-1">
        {SWITCH_TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setPreviewTier(t);
              router.refresh();
            }}
            className={`rounded-sm border-2 border-black px-2 py-1 uppercase tracking-wide transition hover:opacity-90 ${
              effectiveTier === t
                ? "bg-[#FFCC00] text-[#004AAD]"
                : "bg-[#003580] text-[#FFCC00]"
            }`}
          >
            {TIER_DISPLAY[t].nameEn}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          clearPreviewTier();
          router.refresh();
        }}
        className="ml-1 shrink-0 rounded-sm border-2 border-[#FFCC00] bg-transparent px-3 py-1 font-black uppercase tracking-wide text-[#FFCC00] hover:bg-[#FFCC00]/10"
      >
        Exit Preview
      </button>
    </div>
  );
}
