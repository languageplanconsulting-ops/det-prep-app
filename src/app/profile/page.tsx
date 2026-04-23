"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { VIPBadge } from "@/components/ui/VIPBadge";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  AI_MONTHLY_LIMIT,
  MOCK_TEST_MONTHLY_LIMIT,
  TIER_DISPLAY,
  type Tier,
} from "@/lib/access-control";
import {
  getNonApiReminderSnapshot,
} from "@/lib/non-api-practice-usage";
import { buildPaywallSpec, shouldShowHeavyUsageUpgrade } from "@/lib/paywall-upsell";
import { mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type QuotaResponse = {
  expiresAt?: string | null;
  ai?: {
    used?: number;
    addonRemaining?: number;
    totalRemaining?: number;
  };
  mock?: {
    used?: number;
    addonRemaining?: number;
    totalRemaining?: number;
  };
};

const PRACTICE_STORAGE_EVENTS = [
  "storage",
  "focus",
  "ep-vocab-storage",
  "ep-dictation-storage",
  "ep-fitb-storage",
  "ep-realword-storage",
  "ep-conversation-storage",
] as const;

type ExamCreditCard = {
  id: string;
  label: string;
  category: string;
  remaining: number;
  limit: number;
  used: number;
  unit: string;
  note: string;
};

function formatExpiry(expiresAt: string | null, tier: Tier): string {
  if (!expiresAt) return tier === "free" ? "Never expires" : "—";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

function quotaTone(remaining: number, limit: number) {
  if (limit <= 0 || remaining <= 0) {
    return {
      chip: "bg-[#7a0f0f] text-white",
      meter: "from-[#cc4338] via-[#f06b5f] to-[#ffb38c]",
      card: "border-[#7a0f0f] bg-[linear-gradient(160deg,#fff7f3_0%,#ffe2d9_100%)]",
    };
  }

  if (remaining <= Math.ceil(limit * 0.25)) {
    return {
      chip: "bg-[#a15c00] text-white",
      meter: "from-[#f0a500] via-[#ffcc00] to-[#ffe88c]",
      card: "border-[#a15c00] bg-[linear-gradient(160deg,#fff8dd_0%,#ffeab3_100%)]",
    };
  }

  return {
    chip: "bg-[#004aad] text-white",
    meter: "from-[#004aad] via-[#2f86ef] to-[#85c9ff]",
    card: "border-black bg-white",
  };
}

function CreditCard({ card }: { card: ExamCreditCard }) {
  const tone = quotaTone(card.remaining, card.limit);
  const pct = card.limit > 0 ? Math.min(100, Math.round((card.used / card.limit) * 100)) : 0;

  return (
    <div className={`rounded-[24px] border-2 p-5 shadow-[6px_6px_0_0_#111] transition-all duration-500 ${tone.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
            {card.category}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-900">{card.label}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${tone.chip}`}>
          {card.remaining} left
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white/75 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Remaining</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">
            {card.remaining}
            <span className="ml-1 text-sm text-neutral-400">/ {card.limit}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/75 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">Used</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">{card.used}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          <span>Monthly usage</span>
          <span>{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${tone.meter}`}
            style={{ width: `${Math.max(pct, card.used > 0 ? 8 : 0)}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-neutral-600">{card.note}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
        Unit: {card.unit}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(0);
  const [mockUsed, setMockUsed] = useState(0);
  const [aiAddonRemaining, setAiAddonRemaining] = useState(0);
  const [mockAddonRemaining, setMockAddonRemaining] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [practiceTick, setPracticeTick] = useState(0);
  const { effectiveTier, realTier, loading } = useEffectiveTier();

  useEffect(() => {
    const refreshPractice = () => setPracticeTick((value) => value + 1);
    for (const eventName of PRACTICE_STORAGE_EVENTS) {
      window.addEventListener(eventName, refreshPractice);
    }
    return () => {
      for (const eventName of PRACTICE_STORAGE_EVENTS) {
        window.removeEventListener(eventName, refreshPractice);
      }
    };
  }, []);

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
        const json = (await res.json()) as QuotaResponse;
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
  const daysLeft = getDaysLeft(expiresAt);

  const recommendationSpec = useMemo(() => {
    if (daysLeft != null && daysLeft < 0 && realTier !== "free") {
      return buildPaywallSpec(realTier, "expired");
    }
    if (effectiveTier === "free") return buildPaywallSpec("free", "heavy_free");
    if (daysLeft != null && daysLeft <= 3) return buildPaywallSpec(effectiveTier, "renewal_3d");
    if (daysLeft != null && daysLeft <= 7) return buildPaywallSpec(effectiveTier, "renewal_7d");
    if (mockRemaining <= 0) return buildPaywallSpec(effectiveTier, "mock_limit");

    const heavyContext = shouldShowHeavyUsageUpgrade(effectiveTier, {
      mockRemaining,
      mockLimit,
      aiRemaining,
    });
    return heavyContext ? buildPaywallSpec(effectiveTier, heavyContext) : null;
  }, [aiRemaining, daysLeft, effectiveTier, mockLimit, mockRemaining, realTier]);

  const examCredits = useMemo(() => {
    const vocabulary = getNonApiReminderSnapshot("vocabulary", effectiveTier);
    const dictation = getNonApiReminderSnapshot("dictation", effectiveTier);
    const fitb = getNonApiReminderSnapshot("fitb", effectiveTier);
    const realword = getNonApiReminderSnapshot("realword", effectiveTier);
    const conversation = getNonApiReminderSnapshot("conversation", effectiveTier);

    const cards: ExamCreditCard[] = [
      {
        id: "vocabulary",
        label: "Vocabulary",
        category: "Comprehension",
        remaining: vocabulary.remaining,
        limit: vocabulary.limit,
        used: vocabulary.used,
        unit: "questions / month",
        note: "Tracks your Vocabulary practice bank for the current month.",
      },
      {
        id: "dictation",
        label: "Dictation",
        category: "Literacy",
        remaining: dictation.remaining,
        limit: dictation.limit,
        used: dictation.used,
        unit: "shared literacy tests / month",
        note: "Shares the same Literacy pool with Fill in the Blank and Real Word.",
      },
      {
        id: "fitb",
        label: "Fill in the blank",
        category: "Literacy",
        remaining: fitb.remaining,
        limit: fitb.limit,
        used: fitb.used,
        unit: "shared literacy tests / month",
        note: "This shows the shared Literacy allowance, not a separate FITB-only bucket.",
      },
      {
        id: "realword",
        label: "Choose the real word",
        category: "Literacy",
        remaining: realword.remaining,
        limit: realword.limit,
        used: realword.used,
        unit: "shared literacy tests / month",
        note: "Real Word uses the same shared Literacy credit pool as Dictation and FITB.",
      },
      {
        id: "conversation",
        label: "Interactive conversation",
        category: "Listening",
        remaining: conversation.remaining,
        limit: conversation.limit,
        used: conversation.used,
        unit: "sets / month",
        note: "Tracks your Interactive Conversation practice sets for the current month.",
      },
      {
        id: "mock",
        label: "Full mock test",
        category: "Mock exam",
        remaining: mockRemaining,
        limit: mockLimit,
        used: mockUsed,
        unit: "mocks / month",
        note:
          mockAddonRemaining > 0
            ? `Includes ${mockAddonRemaining} add-on mock credits on top of your plan.`
            : "Monthly mock quota from your plan.",
      },
      {
        id: "ai",
        label: "AI scored production tasks",
        category: "AI credits",
        remaining: aiRemaining,
        limit: aiLimit,
        used: aiUsed,
        unit: "credits / month",
        note:
          aiAddonRemaining > 0
            ? `Includes ${aiAddonRemaining} AI add-on credits on top of your plan.`
            : "Shared AI scoring/report credits for supported production tasks.",
      },
    ];

    return cards;
  }, [
    aiAddonRemaining,
    aiLimit,
    aiRemaining,
    aiUsed,
    effectiveTier,
    mockAddonRemaining,
    mockLimit,
    mockRemaining,
    mockUsed,
    practiceTick,
  ]);

  const heroStats = [
    {
      label: "Current plan",
      value: loading ? "…" : TIER_DISPLAY[effectiveTier].nameEn,
      note: TIER_DISPLAY[effectiveTier].nameTh,
    },
    {
      label: "Plan expires",
      value: loadingStats ? "…" : formatExpiry(expiresAt, effectiveTier),
      note: daysLeft != null && daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Billing status",
    },
    {
      label: "Credits to check",
      value: String(examCredits.length),
      note: "Practice + AI + mock quotas",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="relative overflow-hidden rounded-[30px] border-4 border-black bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_48%,#fff7db_100%)] p-6 shadow-[8px_8px_0_0_#111] md:p-8">
        <div className="absolute right-4 top-4">
          <VIPBadge />
        </div>
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.24em] text-[#004AAD]">
          Check my credit
        </p>
        <h1
          className="mt-3 text-3xl font-black tracking-tight text-neutral-900 md:text-5xl"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Plan and exam credits
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700 md:text-base">
          This page is your credit dashboard. It shows what plan you’re on, when it expires, and how many
          credits or tests you still have left for each exam type.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {heroStats.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border-2 border-black bg-white/85 p-4 shadow-[4px_4px_0_0_#111]"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-[#004AAD]">{item.value}</p>
              <p className="mt-1 text-xs font-semibold text-neutral-500">{item.note}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <BrutalPanel title="Account" eyebrow="Student profile" variant="elevated">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Email</p>
                <p className="mt-2 text-lg font-black text-neutral-900">{email ?? "—"}</p>
              </div>
              <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Plan summary</p>
                <p className="mt-2 text-lg font-black text-neutral-900">
                  {loading ? "Loading…" : `${TIER_DISPLAY[effectiveTier].nameTh} / ${TIER_DISPLAY[effectiveTier].nameEn}`}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {TIER_DISPLAY[effectiveTier].priceThb === 0
                    ? "Starter access"
                    : `${TIER_DISPLAY[effectiveTier].priceThb} THB plan`}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {TIER_DISPLAY[effectiveTier].highlightsEn.slice(0, 4).map((line) => (
                <div key={line} className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                  {line}
                </div>
              ))}
            </div>
          </BrutalPanel>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                  Credits overview
                </p>
                <h2 className="text-2xl font-black tracking-tight text-neutral-900">
                  Credits left by exam type
                </h2>
              </div>
              <p className="text-sm font-semibold text-neutral-500">
                Updated from your current month usage and plan rules
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {examCredits.map((card) => (
                <CreditCard key={card.id} card={card} />
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          {recommendationSpec ? <PaywallUpsellCard spec={recommendationSpec} /> : null}

          <BrutalPanel title="How to read this page" eyebrow="Credit rules" variant="elevated">
            <ul className="space-y-3 text-sm leading-6 text-neutral-700">
              <li>Vocabulary has its own monthly pool.</li>
              <li>Dictation, Fill in the Blank, and Real Word share the same Literacy pool.</li>
              <li>Interactive Conversation has its own monthly pool.</li>
              <li>AI and Mock add-ons are added on top of your plan credits when available.</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-5 inline-block rounded-[18px] border-[3px] border-black bg-[#FFCC00] px-5 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
            >
              View plans and add-ons
            </Link>
          </BrutalPanel>
        </aside>
      </div>
    </main>
  );
}
