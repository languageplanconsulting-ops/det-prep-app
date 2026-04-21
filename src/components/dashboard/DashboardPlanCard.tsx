"use client";

import Link from "next/link";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { buildPaywallSpec } from "@/lib/paywall-upsell";
import { planDisplayFromTier } from "@/lib/plans";

export function DashboardPlanCard() {
  const { effectiveTier, loading } = useEffectiveTier();
  const plan = planDisplayFromTier(effectiveTier);
  const quickSpec =
    effectiveTier === "free"
      ? buildPaywallSpec("free", "heavy_free")
      : effectiveTier === "basic"
        ? buildPaywallSpec("basic", "heavy_basic")
        : effectiveTier === "premium"
          ? buildPaywallSpec("premium", "heavy_premium")
          : null;

  if (loading) {
    return (
      <BrutalPanel eyebrow="Current plan" title="…">
        <p className="text-sm text-neutral-500">Loading plan…</p>
      </BrutalPanel>
    );
  }

  return (
    <BrutalPanel eyebrow="Current plan" title={plan.label}>
      <dl className="space-y-2 text-sm font-semibold">
        <div className="flex justify-between gap-2 border-b border-neutral-200 pb-2">
          <dt className="text-neutral-600">AI feedback</dt>
          <dd className="ep-stat">
            {plan.aiFeedbackPerMonth === "unlimited"
              ? "∞"
              : `${plan.aiFeedbackPerMonth} / mo`}
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-neutral-200 pb-2">
          <dt className="text-neutral-600">Sets / skill (monthly cap)</dt>
          <dd className="ep-stat">
            {plan.dailySets === "unlimited"
              ? "∞ sets"
              : `${plan.dailySets} sets`}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-600">Expires on</dt>
          <dd className="ep-stat">{plan.expires}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t-2 border-dashed border-black pt-4">
        <p className="text-xs font-black uppercase tracking-widest text-[#004AAD]">
          สิทธิ์เพิ่ม / Upgrade path
        </p>
        <p className="mt-2 text-sm font-semibold text-neutral-700">
          ถ้าคุณใช้สิทธิ์ครบ ระบบจะเสนอทั้งการอัปเกรดแพลนและการซื้อ add-on เพื่อไม่ให้การฝึกสะดุด
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-block border-[3px] border-black bg-[#FFCC00] px-4 py-3 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
        >
          ดูแพลนและ add-on
        </Link>
      </div>
      {quickSpec ? <div className="mt-4"><PaywallUpsellCard spec={quickSpec} compact /></div> : null}
    </BrutalPanel>
  );
}
