"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  getVipWeeklyAiFeedbackUses,
  recordVipAiFeedbackUse,
  thConfirmBeforeAiSubmit,
  thExhaustedQuotaMessage,
  VIP_AI_FEEDBACK_WEEKLY_LIMIT,
} from "@/lib/vip-ai-feedback-quota";

/**
 * VIP-only weekly AI submit quota. Non-VIP: no client gate (unchanged).
 * Call `confirmBeforeAiSubmit()` on each Submit click; after successful API, `recordSuccessfulAiSubmit()`.
 */
export function useVipAiFeedbackGate() {
  const { effectiveTier, loading: tierLoading } = useEffectiveTier();
  const isVip = effectiveTier === "vip";
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
    if (!isVip || !userId) return 0;
    return getVipWeeklyAiFeedbackUses(userId);
  }, [isVip, userId, tick]);

  const remaining = useMemo(
    () => Math.max(0, VIP_AI_FEEDBACK_WEEKLY_LIMIT - used),
    [used],
  );

  /**
   * Run before starting the AI request. Returns false if user cancelled or quota exhausted.
   */
  const confirmBeforeAiSubmit = useCallback((): boolean => {
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
    if (rem <= 0) {
      window.alert(thExhaustedQuotaMessage());
      return false;
    }
    return window.confirm(thConfirmBeforeAiSubmit(rem));
  }, [isVip, userId, authLoading]);

  const recordSuccessfulAiSubmit = useCallback(() => {
    if (isVip && userId) {
      recordVipAiFeedbackUse(userId);
      refresh();
    }
  }, [isVip, userId, refresh]);

  const showQuotaBanner = isVip && !!userId && !authLoading;

  return {
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
