"use client";

import { useCallback, useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
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
  const [quotaLoading, setQuotaLoading] = useState(false);

  const loadQuota = useCallback(async () => {
    if (hasBypassAccess || !isVip) {
      setWeekly(null);
      return;
    }
    setQuotaLoading(true);
    try {
      const res = await fetch("/api/account/quota-summary", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Could not load quota");
      const json = (await res.json()) as QuotaSummaryResponse;
      setWeekly(
        json.vipWeekly
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
    } catch {
      setWeekly({
        used: 0,
        baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
        extraLimit: 0,
        totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
        remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
        renewsAt: null,
        extraExpiresAt: null,
      });
    } finally {
      setQuotaLoading(false);
    }
  }, [hasBypassAccess, isVip]);

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
    if (!userId || hasBypassAccess || !isVip) {
      if (!isVip || hasBypassAccess) setWeekly(null);
      return;
    }
    void loadQuota();
  }, [userId, hasBypassAccess, isVip, loadQuota]);

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
  const used = hasBypassAccess || !isVip ? 0 : Math.max(0, Number(weekly?.used ?? 0));
  const remaining = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? Math.max(0, Number(weekly?.remaining ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT))
      : Number.POSITIVE_INFINITY;
  const limit = hasBypassAccess
    ? Number.POSITIVE_INFINITY
    : isVip
      ? Math.max(0, Number(weekly?.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT))
      : Number.POSITIVE_INFINITY;

  const confirmBeforeAiSubmit = useCallback((): boolean => {
    if (hasBypassAccess) return true;
    if (!isVip) return true;
    if (authLoading || quotaLoading) {
      window.alert("กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองกดส่งอีกครั้ง");
      return false;
    }
    if (!userId) return true;

    const rem = Math.max(0, Number(weekly?.remaining ?? 0));
    const total = Math.max(0, Number(weekly?.totalLimit ?? VIP_AI_FEEDBACK_WEEKLY_LIMIT));
    emitVipApiCreditNotice(rem, total);
    if (rem <= 0) {
      window.alert(thExhaustedQuotaMessage());
      return false;
    }
    return window.confirm(thConfirmBeforeAiSubmit(rem).replaceAll(`/${VIP_AI_FEEDBACK_WEEKLY_LIMIT}`, `/${total}`));
  }, [authLoading, hasBypassAccess, isVip, quotaLoading, userId, weekly]);

  const recordSuccessfulAiSubmit = useCallback(
    (delta = 1) => {
      if (hasBypassAccess || !isVip) return;
      setWeekly((prev) => {
        const current = prev ?? {
          used: 0,
          baseLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
          extraLimit: 0,
          totalLimit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
          remaining: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
          renewsAt: null,
          extraExpiresAt: null,
        };
        const nextUsed = current.used + delta;
        const nextRemaining = Math.max(0, current.totalLimit - nextUsed);
        emitVipApiCreditNotice(nextRemaining, current.totalLimit);
        return {
          ...current,
          used: nextUsed,
          remaining: nextRemaining,
        };
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ep-vip-ai-quota-changed"));
      }
      void loadQuota();
    },
    [hasBypassAccess, isVip, loadQuota],
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
    extraLimit: Math.max(0, Number(weekly?.extraLimit ?? 0)),
    renewsAt: weekly?.renewsAt ?? null,
    extraExpiresAt: weekly?.extraExpiresAt ?? null,
    resetOn,
    confirmBeforeAiSubmit,
    recordSuccessfulAiSubmit,
    showQuotaBanner,
    refresh,
  };
}
