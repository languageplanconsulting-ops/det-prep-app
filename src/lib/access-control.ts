/**
 * EnglishPlan tier access control — pure functions, no I/O.
 * Monthly limits for content/mock tests are enforced by callers using dates + DB.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier = "free" | "basic" | "premium" | "vip";

export type Difficulty = "easy" | "medium" | "hard";

/** Non-AI practice skills that use per-tier set limits. */
export type ContentSkill = "comprehension" | "literacy" | "vocabulary" | "conversation";

/** Shared AI product surface (5 types share one monthly pool). */
export type AIProductType =
  | "essay"
  | "write_about_photo"
  | "speak_about_photo"
  | "read_then_speak"
  | "summarize_conversation";

export type FeatureKey =
  | "mock_test"
  | "notebook_export"
  | "analytics_full"
  | "analytics_pdf"
  | "streak_freeze"
  | "conversation";

export type AccessSkillResult = {
  allowed: boolean;
  reason: string;
  upgradeRequired: Tier | null;
};

export type AccessDifficultyResult = {
  allowed: boolean;
  /** True when the difficulty exists in the product but tier blocks it (show upgrade). */
  locked: boolean;
  upgradeRequired: Tier | null;
};

export type CanUseAIResult = {
  allowed: boolean;
  remaining: number;
  reason: string;
};

export type TierDisplay = {
  tier: Tier;
  nameEn: string;
  nameTh: string;
  priceThb: number | null;
  /** Tailwind-friendly or hex, e.g. "neutral" | "#0ea5e9" */
  color: string;
  /** Short bullets for marketing / landing */
  highlightsEn: string[];
};

// ---------------------------------------------------------------------------
// Tier config (single source of truth)
// ---------------------------------------------------------------------------

export const TIER_ORDER: Tier[] = ["free", "basic", "premium", "vip"];

/** Max sets per skill per monthly window (non-AI content). Conversation on free = 0 (locked). */
export const SET_LIMITS: Record<Tier, Record<ContentSkill, number>> = {
  free: {
    comprehension: 1,
    literacy: 1,
    vocabulary: 1,
    conversation: 0,
  },
  basic: {
    comprehension: 4,
    literacy: 4,
    vocabulary: 4,
    conversation: 4,
  },
  premium: {
    comprehension: 6,
    literacy: 6,
    vocabulary: 6,
    conversation: 6,
  },
  vip: {
    comprehension: 8,
    literacy: 8,
    vocabulary: 8,
    conversation: 8,
  },
};

/** Which difficulties each tier may use for non-AI sets. */
export const TIER_DIFFICULTY_ACCESS: Record<Tier, Difficulty[]> = {
  free: ["easy"],
  basic: ["easy", "medium"],
  premium: ["easy", "medium", "hard"],
  vip: ["easy", "medium", "hard"],
};

/** Shared AI credits per month (except free = lifetime pool of 1). */
export const AI_MONTHLY_LIMIT: Record<Tier, number> = {
  free: 1,
  basic: 10,
  premium: 28,
  vip: 60,
};

export const AI_TYPES: readonly AIProductType[] = [
  "essay",
  "write_about_photo",
  "speak_about_photo",
  "read_then_speak",
  "summarize_conversation",
] as const;

/** Mock tests allowed per month (approximate cap; callers enforce month window). */
export const MOCK_TEST_MONTHLY_LIMIT: Record<Tier, number> = {
  free: 0,
  basic: 1,
  premium: 5,
  vip: Number.POSITIVE_INFINITY,
};

/** Streak freeze grants per month (VIP = unlimited → use Infinity). */
export const STREAK_FREEZE_MONTHLY: Record<Tier, number> = {
  free: 0,
  basic: 3,
  premium: 3,
  vip: Number.POSITIVE_INFINITY,
};

export type TierConfig = {
  setLimits: typeof SET_LIMITS;
  difficulties: typeof TIER_DIFFICULTY_ACCESS;
  aiMonthlyLimit: typeof AI_MONTHLY_LIMIT;
  mockTestMonthly: typeof MOCK_TEST_MONTHLY_LIMIT;
  streakFreezeMonthly: typeof STREAK_FREEZE_MONTHLY;
  aiTypes: typeof AI_TYPES;
};

export const TIER_CONFIG: TierConfig = {
  setLimits: SET_LIMITS,
  difficulties: TIER_DIFFICULTY_ACCESS,
  aiMonthlyLimit: AI_MONTHLY_LIMIT,
  mockTestMonthly: MOCK_TEST_MONTHLY_LIMIT,
  streakFreezeMonthly: STREAK_FREEZE_MONTHLY,
  aiTypes: AI_TYPES,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minTierForDifficulty(d: Difficulty): Tier {
  if (d === "easy") return "free";
  if (d === "medium") return "basic";
  return "premium";
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function canAccessSkill(tier: Tier, skill: ContentSkill): AccessSkillResult {
  if (skill === "conversation" && tier === "free") {
    return {
      allowed: false,
      reason: "Interactive conversation is not included on the Free plan.",
      upgradeRequired: "basic",
    };
  }

  const limit = SET_LIMITS[tier][skill];
  if (limit <= 0) {
    return {
      allowed: false,
      reason: "This skill is not available on your current plan.",
      upgradeRequired: "basic",
    };
  }

  return {
    allowed: true,
    reason: "OK",
    upgradeRequired: null,
  };
}

export function canAccessDifficulty(tier: Tier, difficulty: Difficulty): AccessDifficultyResult {
  const allowedList = TIER_DIFFICULTY_ACCESS[tier];
  const allowed = allowedList.includes(difficulty);
  const minTier = minTierForDifficulty(difficulty);

  return {
    allowed,
    locked: !allowed,
    upgradeRequired: allowed ? null : minTier,
  };
}

export function getSetLimit(tier: Tier, skill: ContentSkill): number {
  return SET_LIMITS[tier][skill];
}

/**
 * @param currentUsage — total AI calls used in the current month (all 5 types combined), except free tier should pass 0 or unused.
 * @param lifetimeUsed — for free tier only: true after the single lifetime credit is consumed.
 */
export function canUseAI(
  tier: Tier,
  currentUsage: number,
  lifetimeUsed: boolean,
): CanUseAIResult {
  if (tier === "free") {
    if (lifetimeUsed) {
      return {
        allowed: false,
        remaining: 0,
        reason: "Free plan includes 1 lifetime AI credit; it has already been used.",
      };
    }
    return {
      allowed: true,
      remaining: 1,
      reason: "OK",
    };
  }

  const limit = AI_MONTHLY_LIMIT[tier];
  const remaining = Math.max(0, limit - Math.max(0, currentUsage));
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: "Monthly AI credits are used up. They reset next month or upgrade for more.",
    };
  }
  return {
    allowed: true,
    remaining,
    reason: "OK",
  };
}

export function getAILimit(tier: Tier): number {
  return AI_MONTHLY_LIMIT[tier];
}

export function canAccessFeature(tier: Tier, feature: FeatureKey): boolean {
  switch (feature) {
    case "conversation":
      return tier !== "free";
    case "mock_test":
      return tier !== "free";
    case "notebook_export":
      return tier === "vip";
    case "analytics_full":
      return tier === "premium" || tier === "vip";
    case "analytics_pdf":
      return tier === "vip";
    case "streak_freeze":
      return tier !== "free";
  }
}

/** Basic tier gets charts but not “full” analytics — use canAccessFeature('analytics_full') vs landing copy. */
export function getAnalyticsLevel(tier: Tier): "none" | "basic" | "full" {
  if (tier === "free") return "none";
  if (tier === "basic") return "basic";
  return "full";
}

export function getUpgradeMessage(tier: Tier, blockedFeature: FeatureKey): string {
  const messages: Record<FeatureKey, string> = {
    conversation:
      tier === "free"
        ? "ฟีเจอร์สนทนาแบบโต้ตอบ (Conversation) เปิดใช้ตั้งแต่แพ็กเกจ Basic ขึ้นไป — อัปเกรดเพื่อฝึกครบทุกทักษะ"
        : "อัปเกรดแพ็กเกจเพื่อปลดล็อกการสนทนาเพิ่มเติม",

    mock_test:
      tier === "free"
        ? "Mock Test ใช้ได้ตั้งแต่ Basic (1 ครั้ง/เดือน) — อัปเกรดเพื่อฝึกสอบจำลอง"
        : "อัปเกรดเป็น Premium หรือ VIP เพื่อเพิ่มจำนวน Mock Test ต่อเดือน",

    notebook_export:
      "ส่งออกสมุดโน้ตเป็น PDF ใช้ได้เฉพาะ VIP — อัปเกรด VIP เพื่อดาวน์โหลดและเก็บสำเนา",

    analytics_full:
      tier === "free"
        ? "กราฟวิเคราะห์แบบเต็มเปิดใช้ตั้งแต่ Premium — อัปเกรดเพื่อดูสถิติละเอียด"
        : "อัปเกรดเป็น Premium เพื่อดูแดชบอร์ดและกราฟแบบเต็ม",

    analytics_pdf:
      "ส่งออกรายงานวิเคราะห์เป็น PDF ใช้ได้เฉพาะ VIP — อัปเกรด VIP",

    streak_freeze:
      tier === "free"
        ? "ตัวหยุดสตรีค (streak freeze) ใช้ได้ตั้งแต่ Basic — อัปเกรดเพื่อไม่ให้สตรีคขาดเมื่อขาดวัน"
        : "อัปเกรดเป็น VIP เพื่อใช้ streak freeze ไม่จำกัด",
  };

  return messages[blockedFeature];
}

// ---------------------------------------------------------------------------
// Landing / marketing
// ---------------------------------------------------------------------------

export const TIER_DISPLAY: Record<Tier, TierDisplay> = {
  free: {
    tier: "free",
    nameEn: "Free",
    nameTh: "ฟรี",
    priceThb: 0,
    color: "#737373",
    highlightsEn: [
      "1 set/month (easy) — Comprehension, Literacy, Vocabulary",
      "1 lifetime AI credit (shared across all AI tasks)",
      "Streaks & XP",
      "Score-only analytics",
    ],
  },
  basic: {
    tier: "basic",
    nameEn: "Basic",
    nameTh: "เบสิก",
    priceThb: 299,
    color: "#0ea5e9",
    highlightsEn: [
      "4 sets/month (easy + medium) — Comprehension, Literacy, Vocabulary, Conversation",
      "10 AI credits/month (all 5 AI types)",
      "1 Mock Test / month",
      "Basic charts",
      "3 streak freezes / month",
    ],
  },
  premium: {
    tier: "premium",
    nameEn: "Premium",
    nameTh: "พรีเมียม",
    priceThb: 599,
    color: "#8b5cf6",
    highlightsEn: [
      "6 sets/month (all difficulties) — all four skills",
      "28 AI credits/month",
      "5 Mock Tests / month",
      "Full analytics charts",
      "3 streak freezes / month",
    ],
  },
  vip: {
    tier: "vip",
    nameEn: "VIP",
    nameTh: "วีไอพี",
    priceThb: 999,
    color: "#eab308",
    highlightsEn: [
      "8 sets/month (all difficulties)",
      "60 AI credits/month",
      "Unlimited Mock Tests",
      "Full analytics + PDF export",
      "Notebook PDF export",
      "Unlimited streak freezes",
    ],
  },
};
