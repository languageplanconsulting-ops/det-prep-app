import {
  AI_MONTHLY_LIMIT,
  SET_LIMITS,
  TIER_DISPLAY,
  type Tier,
} from "@/lib/access-control";
import type { PlanTier } from "@/types/exams";

export interface PlanDisplay {
  tier: PlanTier;
  label: string;
  aiFeedbackPerMonth: number | "unlimited";
  dailySets: number | "unlimited";
  expires: string;
}

export const MOCK_USER_PLAN: PlanDisplay = {
  tier: "free",
  label: "Free",
  aiFeedbackPerMonth: 1,
  dailySets: 1,
  expires: "Never",
};

export const PLAN_ORDER: PlanTier[] = ["free", "basic", "premium", "vip"];

/**
 * Dashboard copy derived from access-control (respects admin preview via effective tier passed in).
 */
export function planDisplayFromTier(tier: Tier): PlanDisplay {
  const ai = AI_MONTHLY_LIMIT[tier];
  const maxSets = Math.max(
    ...(Object.values(SET_LIMITS[tier]) as number[]),
  );
  return {
    tier,
    label: TIER_DISPLAY[tier].nameEn,
    aiFeedbackPerMonth: ai,
    dailySets: Number.isFinite(maxSets) ? maxSets : "unlimited",
    expires: tier === "free" ? "Never" : "30-day access",
  };
}
