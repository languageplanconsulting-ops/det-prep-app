"use client";

import { useEffect } from "react";

import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export function ContentBankHydrator() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      await pullContentBankSnapshotFromSupabase();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

