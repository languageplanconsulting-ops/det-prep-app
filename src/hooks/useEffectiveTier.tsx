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
import { setCurrentBrowserUserId } from "@/lib/browser-user-scope";
import {
  readValidConfirmedTier,
  rememberConfirmedTier,
} from "@/lib/last-known-tier";
import { claimBootstrapAdminClient } from "@/lib/claim-bootstrap-admin";
import { mostPrivilegedTier, resolveEffectiveTierFromProfile } from "@/lib/plan-status";
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
  /**
   * True once a signed-in identity is confirmed (server `/api/me` or client session).
   * Distinguishes a logged-in FREE user from a logged-out visitor — gate login-walls on
   * this, never on a one-shot client `getSession()` (which races/returns null on nav).
   */
  isAuthenticated: boolean;
  vipGrantedByCourse: boolean;
  hasStripeSubscription: boolean;
  /** Raw `profiles.tier_expires_at` for the signed-in user (ISO), or null for none/lifetime. */
  planExpiresAt: string | null;
};

const EffectiveTierContext = createContext<EffectiveTierState | null>(null);
const TIER_REFRESH_EVENT = "ep-refresh-tier";

export function EffectiveTierProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [realTier, setRealTier] = useState<Tier>("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewEligible, setPreviewEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [previewTier, setPreviewTierState] = useState<Tier | null>(null);
  const [vipGrantedByCourse, setVipGrantedByCourse] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);

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
    // 1) Best-effort client read. Wrapped in try/catch so a thrown Supabase/session error
    //    (seen on some Safari/iPad setups where session storage is blocked) can never leave
    //    `loading` stuck true or crash the provider.
    let clientTier: Tier = "free";
    let clientAdmin = false;
    let clientVipCourse = false;
    let clientStripe = false;
    let clientExpiry: string | null = null;
    let userId: string | null = null;
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          let { data } = await supabase
            .from("profiles")
            .select("tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at")
            .eq("id", user.id)
            .maybeSingle();

          if (isBootstrapAdminEmail(user.email) && data?.role !== "admin") {
            await claimBootstrapAdminClient(supabase);
            await fetch("/api/auth/sync-admin-role", { method: "POST", credentials: "same-origin" });
            const { data: again } = await supabase
              .from("profiles")
              .select("tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at")
              .eq("id", user.id)
              .maybeSingle();
            data = again;
          }

          const expiry = (data?.tier_expires_at as string | null | undefined) ?? null;
          clientTier = resolveEffectiveTierFromProfile({
            tier: data?.tier,
            tier_expires_at: expiry,
            vip_granted_by_course: data?.vip_granted_by_course === true,
          });
          clientAdmin = data?.role === "admin";
          clientExpiry = expiry;
          clientVipCourse = data?.vip_granted_by_course === true;
          clientStripe =
            !!data?.stripe_subscription_id ||
            (!!data?.stripe_customer_id && clientTier !== "free" && data?.vip_granted_by_course !== true);
        }
      }
    } catch {
      // fall through to the server read below
    }

    // 2) Server-authoritative read (first-party cookies — reliable on Safari/iPad). When the
    //    server confirms a signed-in user, trust it over the client read so a blocked browser
    //    session can't wrongly demote a paying user to "free".
    let server:
      | {
          authenticated?: boolean;
          userId?: string | null;
          effectiveTier?: Tier;
          isAdmin?: boolean;
          vipGrantedByCourse?: boolean;
          hasStripeSubscription?: boolean;
          planExpiresAt?: string | null;
        }
      | null = null;
    // Retry once on a transient network/5xx failure (an authenticated:false 200 is a
    // definitive "no session" answer, not an error, so it is not retried).
    for (let attempt = 0; attempt < 2 && !server; attempt++) {
      try {
        const res = await fetch("/api/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (res.ok) server = await res.json();
      } catch {
        // keep client values
      }
      if (!server && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    const serverConfirmed = server?.authenticated === true;
    const effectiveUserId = userId ?? server?.userId ?? null;

    // Live resolution. The server read is service-role (RLS-immune) and trusted; the client
    // read is a same-source cross-check. Take the more privileged so a single failed read
    // can't demote a payer.
    let liveTier: Tier = serverConfirmed
      ? mostPrivilegedTier(clientTier, server?.effectiveTier ?? "free")
      : clientTier;
    const liveExpiry = serverConfirmed
      ? server?.planExpiresAt ?? clientExpiry
      : clientExpiry;

    // Absolute guarantee: a paid user is NEVER shown "free" because of a flaky read.
    // A trusted read updates the remembered tier (recording paid, clearing on genuine
    // free/expired). When no trusted read is available, fall back to that memory — which is
    // user-scoped and expiry-aware, so it can never over-grant.
    if (serverConfirmed) {
      rememberConfirmedTier(effectiveUserId, liveTier, liveExpiry);
    } else {
      const remembered = readValidConfirmedTier(effectiveUserId);
      if (remembered) liveTier = mostPrivilegedTier(liveTier, remembered);
    }

    if (serverConfirmed || effectiveUserId) {
      setCurrentBrowserUserId(effectiveUserId);
      setIsAuthenticated(true);
      setRealTier(liveTier);
      setIsAdmin(server?.isAdmin === true || clientAdmin);
      setVipGrantedByCourse(server?.vipGrantedByCourse === true || clientVipCourse);
      setHasStripeSubscription(server?.hasStripeSubscription === true || clientStripe);
      setPlanExpiresAt(liveExpiry);
    } else {
      // No identity from either source (logged out / total failure) → free + login prompt.
      setCurrentBrowserUserId(null);
      setIsAuthenticated(false);
      setRealTier("free");
      setIsAdmin(false);
      setVipGrantedByCourse(false);
      setHasStripeSubscription(false);
      setPlanExpiresAt(null);
    }
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
    const handleRefresh = () => {
      void refreshProfile();
    };
    window.addEventListener(TIER_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(TIER_REFRESH_EVENT, handleRefresh);
    };
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
    const resolvedPreviewTier: Tier | null = previewEligible
      ? previewTier ?? "vip"
      : null;
    const usePreview = previewEligible && resolvedPreviewTier !== null;
    const effectiveTier = usePreview ? resolvedPreviewTier : realTier;
    return {
      effectiveTier,
      realTier,
      isPreviewMode: usePreview,
      isAdmin,
      previewEligible,
      loading,
      isAuthenticated,
      vipGrantedByCourse,
      hasStripeSubscription,
      planExpiresAt,
    };
  }, [
    realTier,
    isAdmin,
    previewEligible,
    loading,
    isAuthenticated,
    previewTier,
    vipGrantedByCourse,
    hasStripeSubscription,
    planExpiresAt,
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
