"use client";

import { useRouter } from "next/navigation";

import { setPreviewTier } from "@/lib/admin-preview";
import type { Tier } from "@/lib/access-control";
import { TIER_DISPLAY } from "@/lib/access-control";

const TIERS: Tier[] = ["free", "basic", "premium", "vip"];

export function AdminPreviewStarter() {
  const router = useRouter();

  return (
    <div
      className="rounded-sm border-2 border-black bg-ep-yellow/30 p-4"
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <p className="text-sm font-black text-neutral-900">Subscriber preview</p>
      <p className="mt-1 text-xs text-neutral-700">
        Pick a tier to open the app with that plan&apos;s limits. A banner appears on every
        page until you exit preview.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setPreviewTier(t);
              router.push("/practice");
              router.refresh();
            }}
            className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/40"
          >
            Preview as {TIER_DISPLAY[t].nameEn}
          </button>
        ))}
      </div>
    </div>
  );
}
