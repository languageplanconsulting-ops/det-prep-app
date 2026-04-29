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
  extraLimit: number;
  totalLimit: number;
  remaining: number;
  renewsAt: string | null;
  extraExpiresAt: string | null;
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
      setWeekly(
        isVip && json.vipWeekly
          ? {
              used: Math.max(0, Number(json.vipWeekly.used ?? 0)),
              baseLimit: Math.max(0, Number(json.vipWeekly.baseLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
              extraLimit: Math.max(0, Number(json.vipWeekly.extraLimit ?? 0)),
              totalLimit: Math.max(0, Number(json.vipWeekly.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
              remaining: Math.max(0, Number(json.vipWeekly.remaining ?? 0)),
              renewsAt:
                typeof json.vipWeekly.renewsAt === "string" ? json.vipWeekly.renewsAt : null,
              extraExpiresAt:
                typeof json.vipWeekly.extraExpiresAt === "string"
                  ? json.vipWeekly.extraExpiresAt
                  : null,
            }
          : {
              used: 0,
              baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              extraLimit: 0,
              totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              renewsAt: null,
              extraExpiresAt: null,
            },
      );
      if (emitNotice && isVip && json.vipWeekly) {
        emitVipApiCreditNotice(
          Math.max(0, Number(json.vipWeekly.remaining ?? 0)),
          Math.max(0, Number(json.vipWeekly.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT)),
          {
            used: Math.max(0, Number(json.vipWeekly.used ?? 0)),
            weeklyRenewsAt:
              typeof json.vipWeekly.renewsAt === "string" ? json.vipWeekly.renewsAt : null,
            monthlyRenewsAt: typeof json.expiresAt === "string" ? json.expiresAt : null,
            extraRemaining: Math.max(0, Number(json.vipWeekly.extraLimit ?? 0)),
            extraExpiresAt:
              typeof json.vipWeekly.extraExpiresAt === "string"
                ? json.vipWeekly.extraExpiresAt
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
      setWeekly(
        isVip
          ? {
              used: 0,
              baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              extraLimit: 0,
              totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
              renewsAt: null,
              extraExpiresAt: null,
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
  const used = hasBypassAccess
    ? 0
    : isVip
      ? Math.max(0, Number(weekly?.used ?? 0))
      : Math.max(0, aiUsed);
  const remaining = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? Math.max(0, Number(weekly?.remaining ?? 0))
      : Math.max(0, aiRemaining);
  const limit = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? Math.max(0, Number(weekly?.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT))
      : Math.max(0, aiLimit);

  const confirmBeforeAiSubmit = useCallback((): boolean => {
    if (hasBypassAccess) return true;
    if (authLoading || quotaLoading) {
      window.alert("กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองกดส่งอีกครั้ง");
      return false;
    }
    if (!userId) return true;

    const rem = Math.max(0, remaining);
    const total = Math.max(0, limit);
    if (isVip) {
      emitVipApiCreditNotice(rem, total, {
        used,
        weeklyRenewsAt: weekly?.renewsAt ?? null,
        monthlyRenewsAt: planExpiresAt,
        extraRemaining: isVip ? Math.max(0, Number(weekly?.extraLimit ?? 0)) : addonRemaining,
        extraExpiresAt: weekly?.extraExpiresAt ?? null,
      });
    }
    if (rem <= 0) {
      window.alert(
        thExhaustedQuotaMessage({
          remaining: rem,
          limit: total,
          weeklyRenewsAt: weekly?.renewsAt ?? null,
          monthlyRenewsAt: planExpiresAt,
        }),
      );
      return false;
    }
    return window.confirm(
      thConfirmBeforeAiSubmit({
        remaining: rem,
        limit: total,
        used,
        weeklyRenewsAt: weekly?.renewsAt ?? null,
        monthlyRenewsAt: planExpiresAt,
        extraRemaining: isVip ? Math.max(0, Number(weekly?.extraLimit ?? 0)) : addonRemaining,
        extraExpiresAt: weekly?.extraExpiresAt ?? null,
        cost: 1,
      }),
    );
  }, [addonRemaining, authLoading, hasBypassAccess, limit, planExpiresAt, quotaLoading, remaining, used, userId, weekly, isVip]);

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
    extraLimit: isVip ? Math.max(0, Number(weekly?.extraLimit ?? 0)) : addonRemaining,
    renewsAt: weekly?.renewsAt ?? null,
    extraExpiresAt: weekly?.extraExpiresAt ?? null,
    planExpiresAt,
    resetOn,
    confirmBeforeAiSubmit,
    recordSuccessfulAiSubmit,
    showQuotaBanner,
    refresh,
  };
}
