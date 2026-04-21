import {
  MOCK_TEST_MONTHLY_LIMIT,
  TIER_DISPLAY,
  type Tier,
} from "@/lib/access-control";

export type AddOnSku =
  | "mock_1"
  | "mock_2"
  | "feedback_1"
  | "feedback_3"
  | "feedback_5";

export type PaywallContext =
  | "mock_limit"
  | "mock_near_limit"
  | "ai_limit"
  | "ai_near_limit"
  | "renewal_7d"
  | "renewal_3d"
  | "expired"
  | "heavy_free"
  | "heavy_basic"
  | "heavy_premium";

export type UpsellAction = {
  kind: "upgrade" | "addon" | "pricing";
  labelTh: string;
  labelEn: string;
  targetTier?: Tier;
  sku?: AddOnSku;
  recommended?: boolean;
};

export type PaywallSpec = {
  titleTh: string;
  titleEn: string;
  bodyTh: string;
  bodyEn: string;
  noteTh?: string;
  noteEn?: string;
  actions: UpsellAction[];
};

export const ADD_ON_CATALOG: Record<
  AddOnSku,
  {
    kind: "mock" | "feedback";
    priceThb: number;
    labelTh: string;
    labelEn: string;
    shortTh: string;
    shortEn: string;
  }
> = {
  mock_1: {
    kind: "mock",
    priceThb: 289,
    labelTh: "Mock Test เพิ่ม 1 ครั้ง",
    labelEn: "1 extra Mock Test",
    shortTh: "เหมาะสำหรับเร่งฝึกเฉพาะครั้งนี้",
    shortEn: "Best for one urgent extra attempt",
  },
  mock_2: {
    kind: "mock",
    priceThb: 499,
    labelTh: "Mock Test เพิ่ม 2 ครั้ง",
    labelEn: "2 extra Mock Tests",
    shortTh: "คุ้มกว่าสำหรับช่วงใกล้สอบ",
    shortEn: "Better value for exam week",
  },
  feedback_1: {
    kind: "feedback",
    priceThb: 59,
    labelTh: "เครดิต AI Feedback 1 ครั้ง",
    labelEn: "1 AI Feedback credit",
    shortTh: "เหมาะสำหรับปลดล็อกรายงานครั้งถัดไป",
    shortEn: "Good for one more report",
  },
  feedback_3: {
    kind: "feedback",
    priceThb: 149,
    labelTh: "เครดิต AI Feedback 3 ครั้ง",
    labelEn: "3 AI Feedback credits",
    shortTh: "เหมาะกับการฝึกต่อเนื่องระยะสั้น",
    shortEn: "Good for short practice bursts",
  },
  feedback_5: {
    kind: "feedback",
    priceThb: 229,
    labelTh: "เครดิต AI Feedback 5 ครั้ง",
    labelEn: "5 AI Feedback credits",
    shortTh: "คุ้มขึ้นสำหรับผู้ใช้บ่อย",
    shortEn: "Best for heavier usage",
  },
};

export function nextTier(tier: Tier): Tier | null {
  if (tier === "free") return "basic";
  if (tier === "basic") return "premium";
  if (tier === "premium") return "vip";
  return null;
}

export function buildPaywallSpec(
  tier: Tier,
  context: PaywallContext,
  opts?: { mockRemaining?: number; aiRemaining?: number },
): PaywallSpec {
  switch (context) {
    case "mock_limit":
      return mockLimitSpec(tier);
    case "mock_near_limit":
      return {
        titleTh: `คุณเหลือสิทธิ์ Mock Test อีก ${opts?.mockRemaining ?? 1} ครั้ง`,
        titleEn: `${opts?.mockRemaining ?? 1} Mock Test left`,
        bodyTh:
          "อัปเกรดตอนนี้เพื่อไม่ให้การฝึกสะดุด หรือเตรียมซื้อ Mock เพิ่มหากต้องการสอบซ้ำในรอบบิลนี้",
        bodyEn:
          "Upgrade now to avoid interruptions, or prepare an extra mock add-on if you need more this cycle.",
        actions: mockActions(tier, true),
      };
    case "ai_limit":
      return aiLimitSpec(tier);
    case "ai_near_limit":
      return {
        titleTh: `เครดิต AI ของคุณใกล้หมดแล้ว`,
        titleEn: "Your AI credits are running low",
        bodyTh:
          "คุณยังฝึกต่อได้ แต่หากต้องการคะแนนและรายงานต่อเนื่อง แนะนำให้อัปเกรดหรือซื้อเครดิตเพิ่มตั้งแต่ตอนนี้",
        bodyEn:
          "You can keep practicing, but upgrade or buy more credits now if you want uninterrupted scoring and reports.",
        actions: aiActions(tier, true),
      };
    case "renewal_7d":
      return {
        titleTh: "สมาชิกของคุณจะหมดอายุในอีก 7 วัน",
        titleEn: "Your subscription expires in 7 days",
        bodyTh:
          "ต่ออายุหรืออัปเกรดตอนนี้เพื่อไม่ให้โควต้าฝึกและรายงาน AI สะดุดในช่วงใกล้สอบ",
        bodyEn:
          "Renew or upgrade now to avoid interruptions to your practice and AI reports.",
        actions: renewalActions(tier),
      };
    case "renewal_3d":
      return {
        titleTh: "ใกล้หมดอายุแล้ว อย่าให้การฝึกสะดุด",
        titleEn: "Your plan is about to expire",
        bodyTh:
          "เหลือเวลาอีกไม่มากก่อนสิทธิ์จะหมด หากกำลังเตรียมสอบอยู่ แนะนำให้ต่ออายุหรืออัปเกรดทันที",
        bodyEn:
          "Your access is about to expire. Renew or upgrade now if you are actively preparing.",
        actions: renewalActions(tier),
      };
    case "expired":
      return {
        titleTh: "สมาชิกของคุณหมดอายุแล้ว",
        titleEn: "Your subscription has expired",
        bodyTh:
          "สิทธิ์แบบชำระเงินถูกปิดชั่วคราวแล้ว กลับมาใช้งานต่อหรืออัปเกรดเพื่อปลดล็อกโควต้าอีกครั้ง",
        bodyEn:
          "Paid features are currently locked. Resume or upgrade to unlock your credits again.",
        actions: renewalActions(tier),
      };
    case "heavy_free":
      return {
        titleTh: "คุณกำลังใช้งานแบบผู้เตรียมสอบจริงจัง",
        titleEn: "You are using the platform like a serious test taker",
        bodyTh:
          "จากรูปแบบการใช้งานของคุณ แนะนำให้อัปเกรดเพื่อปลดล็อก Mock Test และรับเครดิต AI มากพอสำหรับการฝึกต่อเนื่อง",
        bodyEn:
          "Based on your usage, upgrading will unlock Mock Tests and enough AI credits for consistent preparation.",
        actions: [
          {
            kind: "upgrade",
            labelTh: "แนะนำ: อัปเกรดเป็น Premium",
            labelEn: "Recommended: Upgrade to Premium",
            targetTier: "premium",
            recommended: true,
          },
          {
            kind: "pricing",
            labelTh: "ดูเปรียบเทียบแพลน",
            labelEn: "Compare plans",
          },
        ],
      };
    case "heavy_basic":
      return {
        titleTh: "Basic อาจไม่พอสำหรับการใช้งานของคุณ",
        titleEn: "Basic may no longer fit your usage",
        bodyTh:
          "หากคุณใช้ add-on หรือชนโควต้าบ่อย การอัปเกรดเป็น Premium มักคุ้มกว่าการซื้อเพิ่มทีละรายการ",
        bodyEn:
          "If you keep hitting limits or buying add-ons, Premium is usually better value than repeated one-offs.",
        actions: [
          {
            kind: "upgrade",
            labelTh: "อัปเกรดเป็น Premium",
            labelEn: "Upgrade to Premium",
            targetTier: "premium",
            recommended: true,
          },
          {
            kind: "addon",
            labelTh: "ซื้อ Add-on ครั้งนี้",
            labelEn: "Buy this cycle’s add-on",
            sku: "feedback_3",
          },
        ],
      };
    case "heavy_premium":
      return {
        titleTh: "คุณกำลังเตรียมสอบอย่างจริงจัง",
        titleEn: "You are preparing at a serious level",
        bodyTh:
          "VIP จะเหมาะกว่า หากคุณต้องการฝึกต่อเนื่องโดยไม่สะดุดและมีโควต้า Mock / AI มากที่สุด",
        bodyEn:
          "VIP is a better fit if you want the least interrupted preparation with the strongest mock and AI quota.",
        actions: [
          {
            kind: "upgrade",
            labelTh: "อัปเกรดเป็น VIP",
            labelEn: "Upgrade to VIP",
            targetTier: "vip",
            recommended: true,
          },
          {
            kind: "addon",
            labelTh: "ซื้อ Add-on ครั้งนี้",
            labelEn: "Buy this cycle’s add-on",
            sku: "mock_1",
          },
        ],
      };
  }
}

function mockLimitSpec(tier: Tier): PaywallSpec {
  if (tier === "free") {
    return {
      titleTh: "แพลนฟรียังไม่มีสิทธิ์ทำ Mock Test",
      titleEn: "Mock Tests are not included in Free",
      bodyTh:
        "อัปเกรดเป็น Basic ขึ้นไปเพื่อปลดล็อกการสอบจำลองแบบเต็ม และเริ่มเก็บ score history ของคุณ",
      bodyEn:
        "Upgrade to Basic or above to unlock full mock exams and start building your score history.",
      actions: [
        {
          kind: "upgrade",
          labelTh: "อัปเกรดเป็น Basic",
          labelEn: "Upgrade to Basic",
          targetTier: "basic",
          recommended: true,
        },
        {
          kind: "pricing",
          labelTh: "ดูแพลนทั้งหมด",
          labelEn: "View all plans",
        },
      ],
    };
  }

  const next = nextTier(tier);
  return {
    titleTh: "คุณใช้สิทธิ์ Mock Test ครบแล้ว",
    titleEn: "You have used all your Mock Test credits",
    bodyTh:
      "คุณสามารถอัปเกรดแพลนเพื่อรับสิทธิ์เพิ่มทุกเดือน หรือซื้อ Mock เพิ่มครั้งเดียวภายในรอบบิลนี้ได้",
    bodyEn:
      "Upgrade your plan for more monthly mock credits, or buy a one-time extra mock for this billing cycle.",
    noteTh: "สิทธิ์ add-on จะหมดอายุพร้อมรอบบิลปัจจุบัน",
    noteEn: "Add-on credits expire with the current billing cycle.",
    actions: mockActions(tier, false, next),
  };
}

function aiLimitSpec(tier: Tier): PaywallSpec {
  if (tier === "free") {
    return {
      titleTh: "เครดิต AI Feedback ของคุณหมดแล้ว",
      titleEn: "You have run out of AI feedback credits",
      bodyTh:
        "คุณยังฝึกต่อได้ แต่ถ้าต้องการคะแนนและรายงานวิเคราะห์ ต้องอัปเกรดหรือซื้อเครดิตเพิ่ม",
      bodyEn:
        "You can keep practicing, but scoring and reports require more AI credits.",
      noteTh: "เครดิต add-on จะหมดอายุพร้อมรอบบิลปัจจุบัน",
      noteEn: "Add-on credits expire with the current billing cycle.",
      actions: aiActions(tier, false),
    };
  }

  return {
    titleTh: "เครดิต AI Feedback ของคุณหมดแล้ว",
    titleEn: "You have run out of AI feedback credits",
    bodyTh:
      "หากต้องการตรวจงานและสร้างรายงานต่อเนื่อง แนะนำให้อัปเกรดแพลนหรือซื้อเครดิตเพิ่ม",
    bodyEn:
      "Upgrade or buy more credits if you want uninterrupted scoring and report generation.",
    noteTh: "ระบบจะใช้โควต้าแพลนก่อน แล้วค่อยใช้ add-on",
    noteEn: "Your plan credits are used first, then add-ons.",
    actions: aiActions(tier, false),
  };
}

function mockActions(tier: Tier, nearLimit: boolean, next = nextTier(tier)): UpsellAction[] {
  const actions: UpsellAction[] = [];
  if (next) {
    actions.push({
      kind: "upgrade",
      labelTh: nearLimit
        ? `อัปเกรดเป็น ${TIER_DISPLAY[next].nameTh}`
        : `อัปเกรดเป็น ${TIER_DISPLAY[next].nameTh}`,
      labelEn: `Upgrade to ${TIER_DISPLAY[next].nameEn}`,
      targetTier: next,
      recommended: true,
    });
  }
  if (tier !== "free") {
    actions.push(
      {
        kind: "addon",
        labelTh: `ซื้อ ${ADD_ON_CATALOG.mock_1.labelTh} — ฿${ADD_ON_CATALOG.mock_1.priceThb}`,
        labelEn: `Buy ${ADD_ON_CATALOG.mock_1.labelEn} — ฿${ADD_ON_CATALOG.mock_1.priceThb}`,
        sku: "mock_1",
      },
      {
        kind: "addon",
        labelTh: `ซื้อ ${ADD_ON_CATALOG.mock_2.labelTh} — ฿${ADD_ON_CATALOG.mock_2.priceThb}`,
        labelEn: `Buy ${ADD_ON_CATALOG.mock_2.labelEn} — ฿${ADD_ON_CATALOG.mock_2.priceThb}`,
        sku: "mock_2",
      },
    );
  }
  if (tier === "vip" && actions.length === 0) {
    actions.push({ kind: "pricing", labelTh: "ดูสิทธิ์ปัจจุบัน", labelEn: "View current plan" });
  }
  return actions;
}

function aiActions(tier: Tier, nearLimit: boolean): UpsellAction[] {
  const actions: UpsellAction[] = [];
  const next = nextTier(tier);
  if (tier !== "vip" && next) {
    actions.push({
      kind: "upgrade",
      labelTh:
        tier === "free" && !nearLimit
          ? "อัปเกรดแพลน"
          : `อัปเกรดเป็น ${TIER_DISPLAY[next].nameTh}`,
      labelEn:
        tier === "free" && !nearLimit
          ? "Upgrade plan"
          : `Upgrade to ${TIER_DISPLAY[next].nameEn}`,
      targetTier: tier === "free" && !nearLimit ? "basic" : next,
      recommended: true,
    });
  }

  if (tier === "free") {
    actions.push({
      kind: "addon",
      labelTh: `ซื้อ ${ADD_ON_CATALOG.feedback_1.labelTh} — ฿${ADD_ON_CATALOG.feedback_1.priceThb}`,
      labelEn: `Buy ${ADD_ON_CATALOG.feedback_1.labelEn} — ฿${ADD_ON_CATALOG.feedback_1.priceThb}`,
      sku: "feedback_1",
    });
    return actions;
  }

  actions.push(
    {
      kind: "addon",
      labelTh: `ซื้อ ${ADD_ON_CATALOG.feedback_3.labelTh} — ฿${ADD_ON_CATALOG.feedback_3.priceThb}`,
      labelEn: `Buy ${ADD_ON_CATALOG.feedback_3.labelEn} — ฿${ADD_ON_CATALOG.feedback_3.priceThb}`,
      sku: "feedback_3",
    },
    {
      kind: "addon",
      labelTh: `ซื้อ ${ADD_ON_CATALOG.feedback_5.labelTh} — ฿${ADD_ON_CATALOG.feedback_5.priceThb}`,
      labelEn: `Buy ${ADD_ON_CATALOG.feedback_5.labelEn} — ฿${ADD_ON_CATALOG.feedback_5.priceThb}`,
      sku: "feedback_5",
    },
  );
  return actions;
}

function renewalActions(tier: Tier): UpsellAction[] {
  if (tier === "free") {
    return [
      {
        kind: "upgrade",
        labelTh: "อัปเกรดแพลน",
        labelEn: "Upgrade plan",
        targetTier: "basic",
        recommended: true,
      },
      {
        kind: "pricing",
        labelTh: "ดูแพลนทั้งหมด",
        labelEn: "View all plans",
      },
    ];
  }
  const next = nextTier(tier);
  return [
    {
      kind: "upgrade",
      labelTh: "ต่ออายุแพลนปัจจุบัน",
      labelEn: "Renew current plan",
      targetTier: tier,
      recommended: true,
    },
    ...(next
      ? [
          {
            kind: "upgrade" as const,
            labelTh: `อัปเกรดเป็น ${TIER_DISPLAY[next].nameTh}`,
            labelEn: `Upgrade to ${TIER_DISPLAY[next].nameEn}`,
            targetTier: next,
          },
        ]
      : []),
  ];
}

export function shouldShowHeavyUsageUpgrade(
  tier: Tier,
  opts: { mockRemaining?: number | null; mockLimit?: number | null; aiRemaining?: number | null },
): PaywallContext | null {
  if (tier === "free") return "heavy_free";
  if (tier === "basic") {
    if ((opts.mockRemaining ?? 99) <= 0) return "heavy_basic";
    if ((opts.aiRemaining ?? 99) <= 0) return "heavy_basic";
  }
  if (tier === "premium") {
    if ((opts.mockRemaining ?? 99) <= 0) return "heavy_premium";
    if ((opts.aiRemaining ?? 99) <= 0) return "heavy_premium";
  }
  return null;
}

export function mockMonthlyLimitForTier(tier: Tier) {
  return MOCK_TEST_MONTHLY_LIMIT[tier];
}
