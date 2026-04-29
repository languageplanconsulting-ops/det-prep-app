"use client";

import { useCallback, useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT } from "@/lib/access-control";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  emitVipApiCreditNotice,
  getNextLocalMondayLabels,
  thConfirmBeforeAiSubmit,
  thExhaustedQuotaMessage,
  VIP_AI_FEEDBACK_WEEKLY_LIMIT,
} from "@/lib/vip-ai-feedback-quota";

type VipWeeklySummary = {
  used: number;
  baseLimit: number;
  baseRemaining?: number;
  weeklyExtraRemaining?: number;
  monthlyExtraRemaining?: number;
  weeklyVisibleRemaining?: number;
  weeklyVisibleLimit?: number;
  monthlyVisibleRemaining?: number;
  weeklyOverrideActive?: boolean;
  monthlyOverrideActive?: boolean;
  extraLimit: number;
  totalLimit: number;
  remaining: number;
  renewsAt: string | null;
  extraExpiresAt: string | null;
  monthlyExtraExpiresAt?: string | null;
};

type QuotaSummaryResponse = {
  tier?: string;
  expiresAt?: string | null;
  ai?: {
    used?: number;
    planLimit?: number;
    planRemaining?: number;
    addonRemaining?: number;
    totalRemaining?: number;
    weeklyUsed?: number | null;
    weeklyLimit?: number | null;
    weeklyRemaining?: number | null;
    weeklyRenewsAt?: string | null;
    monthlyRemaining?: number | null;
    monthlyRenewsAt?: string | null;
    extraExpiry?: string | null;
  } | null;
  vipWeekly?: VipWeeklySummary | null;
};

/**
 * VIP weekly AI submit quota backed by the server.
 * This keeps learner-facing remaining credits aligned with admin-added weekly top-ups.
 */
export function useVipAiFeedbackGate() {
  const { effectiveTier, isAdmin, previewEligible, loading: tierLoading } =
    useEffectiveTier();
  const isVip = effectiveTier === "vip";
  const hasBypassAccess = isAdmin || previewEligible;
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [weekly, setWeekly] = useState<VipWeeklySummary | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(0);
  const [aiLimit, setAiLimit] = useState(VIP_AI_FEEDBACK_WEEKLY_LIMIT);
  const [aiRemaining, setAiRemaining] = useState(VIP_AI_FEEDBACK_WEEKLY_LIMIT);
  const [addonRemaining, setAddonRemaining] = useState(0);
  const [weeklyUsedDisplay, setWeeklyUsedDisplay] = useState<number | null>(null);
  const [weeklyLimitDisplay, setWeeklyLimitDisplay] = useState<number | null>(null);
  const [weeklyRemainingDisplay, setWeeklyRemainingDisplay] = useState<number | null>(null);
  const [weeklyRenewsDisplay, setWeeklyRenewsDisplay] = useState<string | null>(null);
  const [monthlyRemainingDisplay, setMonthlyRemainingDisplay] = useState<number | null>(null);
  const [monthlyRenewsDisplay, setMonthlyRenewsDisplay] = useState<string | null>(null);
  const [monthlyExtraExpiry, setMonthlyExtraExpiry] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const fallbackLimit = isVip
    ? VIP_AI_FEEDBACK_WEEKLY_LIMIT
    : AI_MONTHLY_LIMIT[(effectiveTier === "free" || effectiveTier === "basic" || effectiveTier === "premium" || effectiveTier === "vip"
        ? effectiveTier
        : "free")] ?? 0;

  const loadQuota = useCallback(async (emitNotice = false) => {
    if (hasBypassAccess) {
      setWeekly(null);
      setPlanExpiresAt(null);
      return;
    }
    setQuotaLoading(true);
    try {
      const res = await fetch("/api/account/quota-summary", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Could not load quota");
      const json = (await res.json()) as QuotaSummaryResponse;
      setPlanExpiresAt(typeof json.expiresAt === "string" ? json.expiresAt : null);
      setAiUsed(Math.max(0, Number(json.ai?.used ?? 0)));
      setAiLimit(Math.max(0, Number(json.ai?.used ?? 0)) + Math.max(0, Number(json.ai?.totalRemaining ?? 0)));
      setAiRemaining(Math.max(0, Number(json.ai?.totalRemaining ?? 0)));
      setAddonRemaining(Math.max(0, Number(json.ai?.addonRemaining ?? 0)));
      setWeeklyUsedDisplay(json.ai?.weeklyUsed == null ? null : Math.max(0, Number(json.ai.weeklyUsed)));
      setWeeklyLimitDisplay(json.ai?.weeklyLimit == null ? null : Math.max(0, Number(json.ai.weeklyLimit)));
      setWeeklyRemainingDisplay(
        json.ai?.weeklyRemaining == null ? null : Math.max(0, Number(json.ai.weeklyRemaining)),
      );
      setWeeklyRenewsDisplay(typeof json.ai?.weeklyRenewsAt === "string" ? json.ai.weeklyRenewsAt : null);
      setMonthlyRemainingDisplay(
        json.ai?.monthlyRemaining == null ? null : Math.max(0, Number(json.ai.monthlyRemaining)),
      );
      setMonthlyRenewsDisplay(typeof json.ai?.monthlyRenewsAt === "string" ? json.ai.monthlyRenewsAt : null);
      setMonthlyExtraExpiry(typeof json.ai?.extraExpiry === "string" ? json.ai.extraExpiry : null);
      setWeekly(
        isVip && json.vipWeekly
          ? {
              used: Math.max(0, Number(json.vipWeekly.used ?? 0)),
              baseLimit: Math.max(0, Number(json.vipWeekly.baseLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
              baseRemaining: Math.max(0, Number(json.vipWeekly.baseRemaining ?? 0)),
              weeklyExtraRemaining: Math.max(0, Number(json.vipWeekly.weeklyExtraRemaining ?? 0)),
              monthlyExtraRemaining: Math.max(0, Number(json.vipWeekly.monthlyExtraRemaining ?? 0)),
              extraLimit: Math.max(0, Number(json.vipWeekly.extraLimit ?? 0)),
              totalLimit: Math.max(0, Number(json.vipWeekly.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
              remaining: Math.max(0, Number(json.vipWeekly.remaining ?? 0)),
              renewsAt:
                typeof json.vipWeekly.renewsAt === "string" ? json.vipWeekly.renewsAt : null,
              extraExpiresAt:
                typeof json.vipWeekly.extraExpiresAt === "string"
                  ? json.vipWeekly.extraExpiresAt
                  : null,
              monthlyExtraExpiresAt:
                typeof json.vipWeekly.monthlyExtraExpiresAt === "string"
                  ? json.vipWeekly.monthlyExtraExpiresAt
                  : null,
            }
          : {
              used: 0,
              baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              baseRemaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              weeklyExtraRemaining: 0,
              monthlyExtraRemaining: 0,
              extraLimit: 0,
              totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              renewsAt: null,
              extraExpiresAt: null,
              monthlyExtraExpiresAt: null,
            },
      );
      if (emitNotice && isVip && json.vipWeekly) {
        emitVipApiCreditNotice(
          Math.max(0, Number(json.ai?.weeklyRemaining ?? json.vipWeekly.remaining ?? 0)),
          Math.max(
            0,
            Number(
              json.ai?.weeklyLimit ??
                (Number(json.vipWeekly.baseRemaining ?? 0) +
                  Number(json.vipWeekly.used ?? 0) +
                  Number(json.vipWeekly.weeklyExtraRemaining ?? 0)),
            ),
          ),
          {
            used: Math.max(0, Number(json.ai?.weeklyUsed ?? json.vipWeekly.used ?? 0)),
            weeklyRenewsAt:
              typeof json.ai?.weeklyRenewsAt === "string"
                ? json.ai.weeklyRenewsAt
                : typeof json.vipWeekly.renewsAt === "string"
                  ? json.vipWeekly.renewsAt
                  : null,
            monthlyRenewsAt:
              typeof json.ai?.monthlyRenewsAt === "string"
                ? json.ai.monthlyRenewsAt
                : typeof json.expiresAt === "string"
                  ? json.expiresAt
                  : null,
            extraRemaining: Math.max(
              0,
              Number(json.ai?.monthlyRemaining ?? json.vipWeekly.monthlyExtraRemaining ?? 0),
            ),
            extraExpiresAt:
              typeof json.ai?.extraExpiry === "string"
                ? json.ai.extraExpiry
                : typeof json.vipWeekly.monthlyExtraExpiresAt === "string"
                  ? json.vipWeekly.monthlyExtraExpiresAt
                : null,
          },
        );
      }
    } catch {
      setPlanExpiresAt(null);
      setAiUsed(0);
      setAiLimit(fallbackLimit);
      setAiRemaining(fallbackLimit);
      setAddonRemaining(0);
      setWeeklyUsedDisplay(null);
      setWeeklyLimitDisplay(null);
      setWeeklyRemainingDisplay(null);
      setWeeklyRenewsDisplay(null);
      setMonthlyRemainingDisplay(null);
      setMonthlyRenewsDisplay(null);
      setMonthlyExtraExpiry(null);
      setWeekly(
        isVip
          ? {
              used: 0,
              baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              baseRemaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              weeklyExtraRemaining: 0,
              monthlyExtraRemaining: 0,
              extraLimit: 0,
              totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              renewsAt: null,
              extraExpiresAt: null,
              monthlyExtraExpiresAt: null,
            }
          : null,
      );
    } finally {
      setQuotaLoading(false);
    }
  }, [fallbackLimit, hasBypassAccess, isVip]);

  const refresh = useCallback(() => {
    void loadQuota();
  }, [loadQuota]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = getBrowserSupabase();
      if (!sb) {
        if (!cancelled) setUserId(null);
        return;
      }
      const { data } = await sb.auth.getUser();
      if (!cancelled) setUserId(data.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId || hasBypassAccess) {
      if (hasBypassAccess) setWeekly(null);
      return;
    }
    void loadQuota();
  }, [userId, hasBypassAccess, loadQuota]);

  useEffect(() => {
    const bump = () => refresh();
    window.addEventListener("ep-vip-ai-quota-changed", bump);
    window.addEventListener("storage", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("ep-vip-ai-quota-changed", bump);
      window.removeEventListener("storage", bump);
      window.removeEventListener("focus", bump);
    };
  }, [refresh]);

  const authLoading = userId === undefined;
  const loading = tierLoading || authLoading || quotaLoading;
  const weeklyUsedNow =
    isVip && weeklyUsedDisplay != null
      ? weeklyUsedDisplay
      : isVip
        ? Math.max(0, Number(weekly?.used ?? 0))
        : Math.max(0, aiUsed);
  const weeklyRemainingNow =
    isVip && weeklyRemainingDisplay != null
      ? weeklyRemainingDisplay
      : isVip
        ? Math.max(
            0,
            Number(
              weekly?.weeklyVisibleRemaining ??
                weekly?.remaining ??
                VIP_AI_FEEDBACK_WEEKLY_LIMIT,
            ),
          )
        : Math.max(0, aiRemaining);
  const weeklyLimitNow =
    isVip && weeklyLimitDisplay != null
      ? weeklyLimitDisplay
      : isVip
        ? Math.max(
            0,
            Number(
              weekly?.weeklyVisibleLimit ??
                weekly?.totalLimit ??
                VIP_AI_FEEDBACK_WEEKLY_LIMIT,
            ),
          )
        : Math.max(0, aiLimit);
  const monthlyRemainingNow =
    isVip && monthlyRemainingDisplay != null
      ? monthlyRemainingDisplay
      : isVip
        ? Math.max(0, Number(weekly?.monthlyVisibleRemaining ?? 0))
        : addonRemaining;
  const monthlyRenewsNow =
    isVip
      ? monthlyRenewsDisplay ?? planExpiresAt
      : planExpiresAt;
  const monthlyExpiryNow =
    isVip
      ? monthlyExtraExpiry ?? weekly?.monthlyExtraExpiresAt ?? null
      : null;
  const combinedRemaining = isVip
    ? Math.max(0, weeklyRemainingNow + monthlyRemainingNow)
    : Math.max(0, aiRemaining);
  const used = hasBypassAccess
    ? 0
    : isVip
      ? weeklyUsedNow
      : Math.max(0, aiUsed);
  const remaining = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? combinedRemaining
      : Math.max(0, aiRemaining);
  const limit = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? Math.max(0, weeklyLimitNow + monthlyRemainingNow)
      : Math.max(0, aiLimit);

  const confirmBeforeAiSubmit = useCallback((): boolean => {
    if (hasBypassAccess) return true;
    if (authLoading || quotaLoading) {
      window.alert("กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองกดส่งอีกครั้ง");
      return false;
    }
    if (!userId) return true;

    const rem = Math.max(0, isVip ? combinedRemaining : remaining);
    const total = Math.max(0, isVip ? weeklyLimitNow + monthlyRemainingNow : limit);
    if (isVip) {
      emitVipApiCreditNotice(weeklyRemainingNow, weeklyLimitNow, {
        used: weeklyUsedNow,
        weeklyRenewsAt: weeklyRenewsDisplay ?? weekly?.renewsAt ?? null,
        monthlyRenewsAt: monthlyRenewsNow,
        extraRemaining: monthlyRemainingNow,
        extraExpiresAt: monthlyExpiryNow,
      });
    }
    if (rem <= 0) {
      window.alert(
        thExhaustedQuotaMessage({
          remaining: isVip ? weeklyRemainingNow : rem,
          limit: isVip ? weeklyLimitNow : total,
          used: weeklyUsedNow,
          weeklyRenewsAt: weeklyRenewsDisplay ?? weekly?.renewsAt ?? null,
          monthlyRenewsAt: monthlyRenewsNow,
          extraRemaining: monthlyRemainingNow,
          extraExpiresAt: monthlyExpiryNow,
        }),
      );
      return false;
    }
    return window.confirm(
      thConfirmBeforeAiSubmit({
        remaining: isVip ? weeklyRemainingNow : rem,
        limit: isVip ? weeklyLimitNow : total,
        used: weeklyUsedNow,
        weeklyRenewsAt: weeklyRenewsDisplay ?? weekly?.renewsAt ?? null,
        monthlyRenewsAt: monthlyRenewsNow,
        extraRemaining: monthlyRemainingNow,
        extraExpiresAt: monthlyExpiryNow,
        cost: 1,
      }),
    );
  }, [
    authLoading,
    combinedRemaining,
    hasBypassAccess,
    isVip,
    limit,
    monthlyExpiryNow,
    monthlyRemainingNow,
    monthlyRenewsNow,
    quotaLoading,
    remaining,
    userId,
    used,
    weekly,
    weeklyLimitNow,
    weeklyRemainingNow,
    weeklyRenewsDisplay,
    weeklyUsedNow,
  ]);

  const recordSuccessfulAiSubmit = useCallback(
    (delta = 1) => {
      if (hasBypassAccess) return;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ep-vip-ai-quota-changed"));
      }
      void loadQuota(Boolean(delta));
    },
    [hasBypassAccess, loadQuota],
  );

  const showQuotaBanner = !hasBypassAccess && isVip && !!userId && !authLoading;
  const resetOn = getNextLocalMondayLabels();

  return {
    isAdmin,
    hasBypassAccess,
    isVip,
    loading,
    userId: userId ?? null,
    used,
    remaining,
    limit,
    baseLimit: Math.max(0, Number(weekly?.baseLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
    extraLimit: isVip ? monthlyRemainingNow : addonRemaining,
    renewsAt: weeklyRenewsDisplay ?? weekly?.renewsAt ?? null,
    extraExpiresAt: monthlyExpiryNow,
    planExpiresAt: monthlyRenewsNow,
    weeklyUsed: weeklyUsedNow,
    weeklyRemaining: weeklyRemainingNow,
    weeklyLimit: weeklyLimitNow,
    monthlyRemaining: monthlyRemainingNow,
    monthlyExtraExpiresAt: monthlyExpiryNow,
    resetOn,
    confirmBeforeAiSubmit,
    recordSuccessfulAiSubmit,
    showQuotaBanner,
    refresh,
  };
}
