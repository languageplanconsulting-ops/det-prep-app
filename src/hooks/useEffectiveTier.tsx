"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Tier } from "@/lib/access-control";
import {
  getPreviewTier,
  subscribePreviewTierChange,
} from "@/lib/admin-preview";
import { isBootstrapAdminEmail } from "@/lib/admin-emails";
import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export type EffectiveTierState = {
  effectiveTier: Tier;
  realTier: Tier;
  isPreviewMode: boolean;
  /** True when `profiles.role === 'admin'` (Supabase). */
  isAdmin: boolean;
  /**
   * True when the server allows subscriber preview: DB admin **or** simple admin code cookie.
   * Preview-as-VIP uses this — not `isAdmin` alone — so code-only admins still work.
   */
  previewEligible: boolean;
  loading: boolean;
  vipGrantedByCourse: boolean;
  hasStripeSubscription: boolean;
};

const EffectiveTierContext = createContext<EffectiveTierState | null>(null);

export function EffectiveTierProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [realTier, setRealTier] = useState<Tier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewEligible, setPreviewEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewTier, setPreviewTierState] = useState<Tier | null>(null);
  const [vipGrantedByCourse, setVipGrantedByCourse] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);

  const fetchPreviewEligible = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { credentials: "same-origin" });
      const data = (await res.json()) as { previewEligible?: boolean };
      setPreviewEligible(data.previewEligible === true);
    } catch {
      setPreviewEligible(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setRealTier("free");
      setIsAdmin(false);
      setVipGrantedByCourse(false);
      setHasStripeSubscription(false);
      setLoading(false);
      void fetchPreviewEligible();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRealTier("free");
      setIsAdmin(false);
      setVipGrantedByCourse(false);
      setHasStripeSubscription(false);
      setLoading(false);
      void fetchPreviewEligible();
      return;
    }
    let { data } = await supabase
      .from("profiles")
      .select("tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (
      isBootstrapAdminEmail(user.email) &&
      data?.role !== "admin"
    ) {
      await claimBootstrapAdminClient(supabase);
      await fetch("/api/auth/sync-admin-role", {
        method: "POST",
        credentials: "same-origin",
      });
      const { data: again } = await supabase
        .from("profiles")
        .select("tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      data = again;
    }

    setRealTier(
      resolveEffectiveTierFromProfile({
        tier: data?.tier,
        tier_expires_at: (data?.tier_expires_at as string | null | undefined) ?? null,
        vip_granted_by_course: data?.vip_granted_by_course === true,
      }),
    );
    setIsAdmin(data?.role === "admin");
    setVipGrantedByCourse(data?.vip_granted_by_course === true);
    setHasStripeSubscription(
      !!data?.stripe_subscription_id ||
        (!!data?.stripe_customer_id &&
          resolveEffectiveTierFromProfile({
            tier: data?.tier,
            tier_expires_at: (data?.tier_expires_at as string | null | undefined) ?? null,
            vip_granted_by_course: data?.vip_granted_by_course === true,
          }) !== "free" &&
          data?.vip_granted_by_course !== true),
    );
    setLoading(false);
    void fetchPreviewEligible();
  }, [fetchPreviewEligible]);

  useEffect(() => {
    void refreshProfile();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  useEffect(() => {
    setPreviewTierState(getPreviewTier());
    return subscribePreviewTierChange(() =>
      setPreviewTierState(getPreviewTier()),
    );
  }, []);

  useEffect(() => {
    void fetchPreviewEligible();
  }, [pathname, fetchPreviewEligible]);

  const value = useMemo((): EffectiveTierState => {
    const usePreview = previewEligible && previewTier !== null;
    const effectiveTier = usePreview ? previewTier : realTier;
    return {
      effectiveTier,
      realTier,
      isPreviewMode: usePreview,
      isAdmin,
      previewEligible,
      loading,
      vipGrantedByCourse,
      hasStripeSubscription,
    };
  }, [
    realTier,
    isAdmin,
    previewEligible,
    loading,
    previewTier,
    vipGrantedByCourse,
    hasStripeSubscription,
  ]);

  return (
    <EffectiveTierContext.Provider value={value}>
      {children}
    </EffectiveTierContext.Provider>
  );
}

/**
 * Use the subscriber-facing tier for all access-control and locked/unlocked UI.
 * Prefer this over reading `profiles.tier` directly so admin preview stays consistent.
 */
export function useEffectiveTier(): EffectiveTierState {
  const ctx = useContext(EffectiveTierContext);
  if (!ctx) {
    throw new Error(
      "useEffectiveTier must be used within EffectiveTierProvider (see app/layout.tsx).",
    );
  }
  return ctx;
}
