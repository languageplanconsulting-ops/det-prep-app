"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { getPackageSummary } from "@/lib/package-copy";
import { buildPaywallSpec } from "@/lib/paywall-upsell";

type QuotaSummaryLite = {
  expiresAt?: string | null;
  ai?: {
    totalRemaining?: number;
    totalLimit?: number;
  };
  mock?: {
    used?: number;
    totalRemaining?: number;
  };
};

const TIER_REFRESH_EVENT = "ep-refresh-tier";

function formatExpiry(expiresAt: string | null, tier: Tier): string {
  if (!expiresAt) return tier === "free" || tier === "vip" ? "ไม่มีวันหมดอายุ" : "—";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("th-TH");
}

export function DashboardPlanCard() {
  const { effectiveTier, loading, vipGrantedByCourse } = useEffectiveTier();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [aiLimit, setAiLimit] = useState<number | null>(null);
  const [mockRemaining, setMockRemaining] = useState<number | null>(null);
  const [mockVisibleLimit, setMockVisibleLimit] = useState<number | null>(null);
  const plan = useMemo(() => getPackageSummary(effectiveTier), [effectiveTier]);
  const durationText =
    vipGrantedByCourse && effectiveTier === "vip"
      ? "สิทธิ์ VIP จากคอร์ส (ไม่มีวันหมดอายุ)"
      : plan.durationTh;
  const quickSpec =
    effectiveTier === "free"
      ? buildPaywallSpec("free", "heavy_free")
      : effectiveTier === "basic"
        ? buildPaywallSpec("basic", "heavy_basic")
        : effectiveTier === "premium"
          ? buildPaywallSpec("premium", "heavy_premium")
          : null;

  const loadQuota = useCallback(async () => {
    const res = await fetch("/api/account/quota-summary", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      setExpiresAt(null);
      setAiRemaining(null);
      setAiLimit(null);
      setMockRemaining(null);
      setMockVisibleLimit(null);
      return;
    }
    const json = (await res.json()) as QuotaSummaryLite;
    setExpiresAt(json.expiresAt ?? null);
    setAiRemaining(
      json.ai?.totalRemaining == null ? null : Math.max(0, Number(json.ai.totalRemaining)),
    );
    setAiLimit(
      json.ai?.totalLimit == null
        ? AI_MONTHLY_LIMIT[effectiveTier]
        : Math.max(0, Number(json.ai.totalLimit)),
    );
    const nextMockRemaining =
      json.mock?.totalRemaining == null ? null : Math.max(0, Number(json.mock.totalRemaining));
    setMockRemaining(nextMockRemaining);
    setMockVisibleLimit(
      json.mock?.used == null || json.mock?.totalRemaining == null
        ? MOCK_TEST_MONTHLY_LIMIT[effectiveTier]
        : Math.max(0, Number(json.mock.used) + Number(json.mock.totalRemaining)),
    );
  }, [effectiveTier]);

  useEffect(() => {
    if (loading) return;
    void loadQuota();
  }, [loadQuota, loading]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadQuota();
    };
    window.addEventListener(TIER_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(TIER_REFRESH_EVENT, handleRefresh);
    };
  }, [loadQuota]);

  if (loading) {
    return (
      <BrutalPanel eyebrow="Current plan" title="…">
        <p className="text-sm text-neutral-500">Loading plan…</p>
      </BrutalPanel>
    );
  }

  return (
    <BrutalPanel eyebrow="Current plan" title={`${plan.labelTh} / ${plan.labelEn}`}>
      <dl className="space-y-2 text-sm font-semibold">
        <div className="flex justify-between gap-2 border-b border-neutral-200 pb-2">
          <dt className="text-neutral-600">Duration</dt>
          <dd className="ep-stat">{durationText}</dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-neutral-200 pb-2">
          <dt className="text-neutral-600">instant feedback</dt>
          <dd className="ep-stat">
            {aiRemaining == null || aiLimit == null ? "…" : `${aiRemaining} / ${aiLimit}`}
          </dd>
        </div>
        <div className="flex justify-between gap-2 border-b border-neutral-200 pb-2">
          <dt className="text-neutral-600">Mock tests</dt>
          <dd className="ep-stat">
            {mockRemaining == null || mockVisibleLimit == null
              ? "…"
              : `${mockRemaining} / ${mockVisibleLimit}`}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-600">Expires on</dt>
          <dd className="ep-stat">{formatExpiry(expiresAt, effectiveTier)}</dd>
        </div>
      </dl>
      <div className="mt-4 rounded-sm border-2 border-dashed border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#004AAD]">
          Package access
        </p>
        <p className="mt-2 text-sm font-semibold text-neutral-800">{plan.practiceTh}</p>
        <p className="mt-1 text-xs text-neutral-500">{plan.aiTh}</p>
        <p className="mt-1 text-xs text-neutral-500">{plan.mockTh}</p>
      </div>
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
