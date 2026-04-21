"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  AI_MONTHLY_LIMIT,
  MOCK_TEST_MONTHLY_LIMIT,
  TIER_DISPLAY,
} from "@/lib/access-control";
import { buildPaywallSpec, shouldShowHeavyUsageUpgrade } from "@/lib/paywall-upsell";
import { mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(0);
  const [mockUsed, setMockUsed] = useState(0);
  const [aiAddonRemaining, setAiAddonRemaining] = useState(0);
  const [mockAddonRemaining, setMockAddonRemaining] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const { effectiveTier, loading } = useEffectiveTier();

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setLoadingStats(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (!user) {
        setLoadingStats(false);
        return;
      }

      const res = await fetch("/api/account/quota-summary", { credentials: "same-origin" });
      if (res.ok) {
        const json = (await res.json()) as {
          expiresAt?: string | null;
          ai?: { used?: number; addonRemaining?: number };
          mock?: { used?: number; addonRemaining?: number };
        };
        setExpiresAt(json.expiresAt ?? null);
        setAiUsed(Math.max(0, Number(json.ai?.used ?? 0)));
        setMockUsed(Math.max(0, Number(json.mock?.used ?? 0)));
        setAiAddonRemaining(Math.max(0, Number(json.ai?.addonRemaining ?? 0)));
        setMockAddonRemaining(Math.max(0, Number(json.mock?.addonRemaining ?? 0)));
      } else {
        const [{ data: profile }, { data: sessions }] = await Promise.all([
          supabase
            .from("profiles")
            .select("tier_expires_at, ai_credits_used")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("mock_fixed_sessions")
            .select("id")
            .eq("user_id", user.id)
            .gte("started_at", mockFixedMonthStartIso()),
        ]);

        setExpiresAt((profile?.tier_expires_at as string | null) ?? null);
        setAiUsed(Math.max(0, Number(profile?.ai_credits_used ?? 0)));
        setMockUsed((sessions ?? []).length);
      }
      setLoadingStats(false);
    })();
  }, []);

  const aiLimit = AI_MONTHLY_LIMIT[effectiveTier];
  const mockLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const aiRemaining = Math.max(0, aiLimit - aiUsed) + aiAddonRemaining;
  const mockRemaining = Math.max(0, mockLimit - mockUsed) + mockAddonRemaining;

  const daysLeft =
    expiresAt && Number.isFinite(new Date(expiresAt).getTime())
      ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

  let recommendationSpec = null as ReturnType<typeof buildPaywallSpec> | null;
  if (effectiveTier === "free") {
    recommendationSpec = buildPaywallSpec("free", "heavy_free");
  } else if (daysLeft != null && daysLeft <= 3) {
    recommendationSpec = buildPaywallSpec(effectiveTier, "renewal_3d");
  } else if (daysLeft != null && daysLeft <= 7) {
    recommendationSpec = buildPaywallSpec(effectiveTier, "renewal_7d");
  } else if (mockRemaining <= 0) {
    recommendationSpec = buildPaywallSpec(effectiveTier, "mock_limit");
  } else {
    const heavyContext = shouldShowHeavyUsageUpgrade(effectiveTier, {
      mockRemaining,
      mockLimit,
      aiRemaining,
    });
    if (heavyContext) recommendationSpec = buildPaywallSpec(effectiveTier, heavyContext);
  }

  const planLabel = TIER_DISPLAY[effectiveTier].nameTh;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
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
              แผนและบัญชีของคุณ
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              ดูแพลนปัจจุบัน สิทธิ์คงเหลือ และคำแนะนำว่าควรอัปเกรดหรือซื้อสิทธิ์เพิ่มเมื่อไร
            </p>
          </div>
          <VIPBadge />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <BrutalPanel title="Email / อีเมล" eyebrow="Account">
            <p className="ep-stat text-sm font-bold text-neutral-900">{email ?? "—"}</p>
          </BrutalPanel>

          <BrutalPanel title="Current plan / แผนปัจจุบัน" eyebrow="Membership">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-sm border-2 border-black bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Plan</p>
                <p className="mt-2 text-2xl font-black text-[#004AAD]">
                  {loading ? "…" : planLabel}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{TIER_DISPLAY[effectiveTier].nameEn}</p>
              </div>
              <div className="rounded-sm border-2 border-black bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Mock Remaining</p>
                <p className="mt-2 text-2xl font-black text-[#004AAD]">
                  {loadingStats ? "…" : `${mockRemaining} / ${mockLimit}`}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Monthly mock credits left
                  {mockAddonRemaining > 0 ? ` · includes ${mockAddonRemaining} add-on` : ""}
                </p>
              </div>
              <div className="rounded-sm border-2 border-black bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">AI Remaining</p>
                <p className="mt-2 text-2xl font-black text-[#004AAD]">
                  {loadingStats ? "…" : `${aiRemaining} / ${aiLimit}`}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Tracked AI feedback credits
                  {aiAddonRemaining > 0 ? ` · includes ${aiAddonRemaining} add-on` : ""}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-sm border-2 border-dashed border-black bg-neutral-50 p-4">
                <p className="text-xs font-black">ใช้ Mock ไปแล้วในเดือนนี้</p>
                <p className="mt-2 text-xl font-black">{loadingStats ? "…" : mockUsed}</p>
              </div>
              <div className="rounded-sm border-2 border-dashed border-black bg-neutral-50 p-4">
                <p className="text-xs font-black">AI feedback ที่ใช้ไป</p>
                <p className="mt-2 text-xl font-black">{loadingStats ? "…" : aiUsed}</p>
              </div>
              <div className="rounded-sm border-2 border-dashed border-black bg-neutral-50 p-4">
                <p className="text-xs font-black">วันหมดอายุ</p>
                <p className="mt-2 text-xl font-black">
                  {expiresAt ? new Date(expiresAt).toLocaleDateString() : effectiveTier === "free" ? "ไม่หมดอายุ" : "—"}
                </p>
              </div>
            </div>
          </BrutalPanel>
        </div>

        <div className="space-y-6">
          {recommendationSpec ? <PaywallUpsellCard spec={recommendationSpec} /> : null}

          <BrutalPanel title="How billing works / วิธีคิดสิทธิ์" eyebrow="Rules">
            <ul className="space-y-2 text-sm font-semibold text-neutral-700">
              <li>ระบบจะใช้โควต้าแพลนก่อน แล้วค่อยใช้ add-on</li>
              <li>Add-on จะหมดอายุพร้อมรอบบิลปัจจุบัน และไม่ rollover</li>
              <li>ถ้าคุณชนลิมิตบ่อย การอัปเกรดแพลนมักคุ้มกว่าการซื้อเพิ่มซ้ำหลายครั้ง</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-4 inline-block border-[3px] border-black bg-[#FFCC00] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
            >
              ดูแพลนและ add-on / View plans & add-ons
            </Link>
          </BrutalPanel>
        </div>
      </div>
    </main>
  );
}
