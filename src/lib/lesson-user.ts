"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

/** Signed-in user id, or null while loading / signed out. Shared by all lesson runners. */
export function useLessonUserId(): string | null {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let alive = true;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (alive) setUid(user?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return uid;
}
