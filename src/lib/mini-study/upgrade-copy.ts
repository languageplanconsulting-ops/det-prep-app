import type { Tier } from "@/lib/access-control";
import type { MiniStudyTier } from "@/lib/mini-study/content";

/** Monthly THB price for each plan (matches /pricing page). */
export const MINI_STUDY_TIER_PRICE_THB: Record<"basic" | "premium" | "vip", number> = {
  basic: 399,
  premium: 699,
  vip: 999,
};

export type LockReason =
  | { allowed: true }
  | {
      allowed: false;
      missingTier: MiniStudyTier;
      currentTier: Tier;
      /** Thai short label for the missing tier (e.g. "Premium" / "VIP"). */
      missingTierLabel: string;
      /** Thai access copy, e.g. "เปิดให้สมาชิก VIP เท่านั้น". */
      headlineTh: string;
      /** Thai CTA copy, e.g. "อัปเกรดเป็น VIP · เพิ่มเดือนละ ฿300". */
      ctaTh: string;
      /** Where to send the user. */
      href: string;
    };

/**
 * Check whether the given user tier satisfies the session's required tier.
 * Returns a structured object with Thai-localised copy ready for the lock card.
 *
 * Tier hierarchy (ascending): free < basic < premium < vip.
 * Admins (effective tier = "vip" or preview-eligible) always pass.
 */
export function checkMiniStudyAccess(
  currentTier: Tier,
  tierRequired: MiniStudyTier,
  opts?: { isAdmin?: boolean; previewEligible?: boolean },
): LockReason {
  if (opts?.isAdmin || opts?.previewEligible) {
    return { allowed: true };
  }

  const rank: Record<Tier, number> = { free: 0, basic: 1, premium: 2, vip: 3 };
  const need: Record<MiniStudyTier, number> = { premium: 2, vip: 3 };
  if (rank[currentTier] >= need[tierRequired]) {
    return { allowed: true };
  }

  const missingTierLabel = tierRequired === "vip" ? "VIP" : "Premium";
  const targetPrice = MINI_STUDY_TIER_PRICE_THB[tierRequired];

  let ctaTh: string;
  // If the user already has the previous tier, show the delta price; otherwise show full.
  if (tierRequired === "vip" && currentTier === "premium") {
    const delta = MINI_STUDY_TIER_PRICE_THB.vip - MINI_STUDY_TIER_PRICE_THB.premium;
    ctaTh = `อัปเกรดเป็น VIP · เพิ่มเดือนละ ฿${delta}`;
  } else if (tierRequired === "premium" && currentTier === "basic") {
    const delta = MINI_STUDY_TIER_PRICE_THB.premium - MINI_STUDY_TIER_PRICE_THB.basic;
    ctaTh = `อัปเกรดเป็น Premium · เพิ่มเดือนละ ฿${delta}`;
  } else {
    ctaTh = `อัปเกรดเป็น ${missingTierLabel} · ฿${targetPrice}/เดือน`;
  }

  const headlineTh = `เปิดให้สมาชิก ${missingTierLabel} เท่านั้น`;

  return {
    allowed: false,
    missingTier: tierRequired,
    currentTier,
    missingTierLabel,
    headlineTh,
    ctaTh,
    href: "/pricing",
  };
}
