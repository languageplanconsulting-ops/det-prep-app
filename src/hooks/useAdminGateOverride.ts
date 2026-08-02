"use client";

import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getGateOverride, subscribeGateOverrideChange } from "@/lib/admin-preview";

export type AdminGateOverride = {
  /** Admin/simple-code session — may turn the override on. */
  eligible: boolean;
  /** Override is on: gated steps should offer a skip. */
  enabled: boolean;
};

/**
 * Whether gated steps should show an admin escape hatch.
 *
 * `enabled` requires BOTH an override-eligible session and the explicit toggle,
 * so a normal learner can never see or trigger a skip button.
 */
export function useAdminGateOverride(): AdminGateOverride {
  const { previewEligible } = useEffectiveTier();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getGateOverride());
    return subscribeGateOverrideChange(() => setOn(getGateOverride()));
  }, []);

  return { eligible: previewEligible, enabled: previewEligible && on };
}
