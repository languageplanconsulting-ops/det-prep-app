"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  emitVipApiCreditNotice,
  getVipWeeklyAiFeedbackRemaining,
  getVipWeeklyAiFeedbackUses,
  recordVipAiFeedbackUse,
  thConfirmBeforeAiSubmit,
  thExhaustedQuotaMessage,
  VIP_AI_FEEDBACK_WEEKLY_LIMIT,
} from "@/lib/vip-ai-feedback-quota";

/**
 * VIP-only weekly AI submit quota. Non-VIP: no client gate (unchanged).
 * Call `confirmBeforeAiSubmit()` on each Submit click; after successful API, `recordSuccessfulAiSubmit()`.
 * Interactive speaking uses its own flow: session-start confirm + `addVipAiFeedbackUses` per API call.
 */
export function useVipAiFeedbackGate() {
  const { effectiveTier, isAdmin, previewEligible, loading: tierLoading } =
    useEffectiveTier();
  const isVip = effectiveTier === "vip";
  const hasBypassAccess = isAdmin || previewEligible;
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

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
    const bump = () => refresh();
    window.addEventListener("ep-vip-ai-quota-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("ep-vip-ai-quota-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, [refresh]);

  const authLoading = userId === undefined;
  const loading = tierLoading || authLoading;

  const used = useMemo(() => {
    void tick;
    if (hasBypassAccess || !isVip || !userId) return 0;
    return getVipWeeklyAiFeedbackUses(userId);
  }, [hasBypassAccess, isVip, userId, tick]);

  const remaining = useMemo(
    () =>
      hasBypassAccess
        ? Number.POSITIVE_INFINITY
        : Math.max(0, VIP_AI_FEEDBACK_WEEKLY_LIMIT - used),
    [hasBypassAccess, used],
  );

  /**
   * Run before starting the AI request. Returns false if user cancelled or quota exhausted.
   */
  const confirmBeforeAiSubmit = useCallback((): boolean => {
    if (hasBypassAccess) return true;
    if (!isVip) return true;
    if (authLoading) {
      window.alert(
        "กำลังโหลดข้อมูลบัญชีอยู่ครับ โปรดรอสักครู่แล้วลองกดส่งอีกครั้ง",
      );
      return false;
    }
    if (!userId) return true;

    const u = getVipWeeklyAiFeedbackUses(userId);
    const rem = VIP_AI_FEEDBACK_WEEKLY_LIMIT - u;
    emitVipApiCreditNotice(Math.max(0, rem));
    if (rem <= 0) {
      window.alert(thExhaustedQuotaMessage());
      return false;
    }
    return window.confirm(thConfirmBeforeAiSubmit(rem));
  }, [hasBypassAccess, isVip, userId, authLoading]);

  const recordSuccessfulAiSubmit = useCallback(() => {
    if (hasBypassAccess) return;
    if (isVip && userId) {
      recordVipAiFeedbackUse(userId);
      emitVipApiCreditNotice(getVipWeeklyAiFeedbackRemaining(userId));
      refresh();
    }
  }, [hasBypassAccess, isVip, userId, refresh]);

  const showQuotaBanner = !hasBypassAccess && isVip && !!userId && !authLoading;

  return {
    isAdmin,
    hasBypassAccess,
    isVip,
    loading,
    userId: userId ?? null,
    used,
    remaining,
    limit: VIP_AI_FEEDBACK_WEEKLY_LIMIT,
    confirmBeforeAiSubmit,
    recordSuccessfulAiSubmit,
    showQuotaBanner,
    refresh,
  };
}
