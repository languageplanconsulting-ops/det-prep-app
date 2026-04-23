"use client";

import { useCallback, useEffect, useState } from "react";

import type { Tier } from "@/lib/access-control";
import type { AddOnSku } from "@/lib/paywall-upsell";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type UserLite = {
  id: string;
  email: string;
};

export function useBillingActions() {
  const [user, setUser] = useState<UserLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!cancelled) {
        if (authUser?.id && authUser.email) {
          setUser({ id: authUser.id, email: authUser.email });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startUpgradeCheckout = useCallback(
    async (tier: Tier) => {
      if (tier === "free") {
        window.location.href = "/pricing";
        return;
      }

      if (!user) {
        window.location.href = `/signup?next=${encodeURIComponent(`/pricing?plan=${tier}`)}`;
        return;
      }

      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tier,
          userId: user.id,
          email: user.email,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start checkout");
      }
      window.location.href = json.url;
    },
    [user],
  );

  const startUpgradePromptPay = useCallback(
    async (tier: Tier) => {
      if (tier === "free") {
        window.location.href = "/pricing";
        return;
      }

      if (!user) {
        window.location.href = `/signup?next=${encodeURIComponent(`/pricing?plan=${tier}`)}`;
        return;
      }

      const res = await fetch("/api/stripe/create-plan-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          tier,
          userId: user.id,
          email: user.email,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start PromptPay invoice");
      }
      window.location.href = json.url;
    },
    [user],
  );

  const openAddOnCatalog = useCallback((sku?: string) => {
    const next = sku ? `/pricing?focus=addons&sku=${encodeURIComponent(sku)}` : "/pricing?focus=addons";
    window.location.href = next;
  }, []);

  const startAddOnCheckout = useCallback(
    async (sku: AddOnSku) => {
      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent(`/pricing?focus=addons&sku=${sku}`)}`;
        return;
      }

      const res = await fetch("/api/stripe/create-addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sku }),
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start add-on checkout");
      }
      window.location.href = json.url;
    },
    [user],
  );

  return {
    user,
    loading,
    startUpgradeCheckout,
    startUpgradePromptPay,
    openAddOnCatalog,
    startAddOnCheckout,
  };
}
