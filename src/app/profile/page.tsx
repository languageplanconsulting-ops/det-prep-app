"use client";

import { useEffect, useState } from "react";

import { VIPBadge } from "@/components/ui/VIPBadge";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="ep-brutal-reading rounded-sm border-black bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-[#004AAD]">
              Profile / โปรไฟล์
            </p>
            <h1
              className="mt-2 text-3xl font-black tracking-tight"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Your account
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              บัญชีของคุณ · Plan and identity at a glance.
            </p>
          </div>
          <VIPBadge />
        </div>
      </header>

      <BrutalPanel title="Email / อีเมล" eyebrow="Account">
        <p className="ep-stat text-sm font-bold text-neutral-900">
          {email ?? "—"}
        </p>
      </BrutalPanel>
    </main>
  );
}
