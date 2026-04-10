"use client";

import { useEffect } from "react";

import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function ContentBankHydrator() {
  useEffect(() => {
    let cancelled = false;
    let hydratedForUserId: string | null = null;

    const runPullIfSignedIn = async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid || cancelled) return;
      if (hydratedForUserId === uid) return;
      const res = await pullContentBankSnapshotFromSupabase();
      if (!cancelled && res.ok) {
        hydratedForUserId = uid;
      }
    };

    void runPullIfSignedIn();

    const supabase = getBrowserSupabase();
    const authSub = supabase?.auth.onAuthStateChange(() => {
      void runPullIfSignedIn();
    });

    // Safety retry for fresh-browser race conditions right after login redirect.
    const retryId = window.setTimeout(() => {
      void runPullIfSignedIn();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
      authSub?.data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

