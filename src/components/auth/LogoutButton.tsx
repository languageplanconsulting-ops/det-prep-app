"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const sync = () => {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        setShow(!!data.session);
      })();
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      sync();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!show) return null;

  const signOut = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      router.push("/login");
      return;
    }
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="rounded-sm border-2 border-black bg-neutral-100 px-3 py-1 text-sm font-bold text-neutral-900 shadow-[2px_2px_0_0_#000] hover:bg-red-50 hover:text-red-900 disabled:opacity-50"
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      {busy ? "…" : "Log out / ออกจากระบบ"}
    </button>
  );
}
