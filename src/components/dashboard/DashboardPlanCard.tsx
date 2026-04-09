"use client";

import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { planDisplayFromTier } from "@/lib/plans";

export function DashboardPlanCard() {
  const { effectiveTier, loading } = useEffectiveTier();
  const plan = planDisplayFromTier(effectiveTier);

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
    </BrutalPanel>
  );
}
