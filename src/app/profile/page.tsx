"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { VIPBadge } from "@/components/ui/VIPBadge";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  AI_MONTHLY_LIMIT,
  MOCK_TEST_MONTHLY_LIMIT,
  TIER_DISPLAY,
  type Tier,
} from "@/lib/access-control";
import { getPackageSummary } from "@/lib/package-copy";
import { getNonApiReminderSnapshot } from "@/lib/non-api-practice-usage";
import { mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { loadStats, tierProgress } from "@/lib/gamification";

// The 2-weakest-skills → practice-route map, kept in sync with the Mock report
// (MockFixedReportBrandedViewV2). Used by the redesigned profile to point a
// learner straight at what to work on next.
const SKILL_ROUTE: Record<string, { label: string; emoji: string; href: string }> = {
  writing: { label: "การเขียน", emoji: "✍️", href: "/practice/production/write-about-photo" },
  listening: { label: "การฟัง", emoji: "👂", href: "/practice/literacy/dictation" },
  reading: { label: "การอ่าน", emoji: "📖", href: "/practice/comprehension/reading" },
  speaking: { label: "การพูด", emoji: "🗣️", href: "/practice/production/speak-about-photo" },
};

/** Fill-as-you-use percentage: the bar fills toward the limit as usage grows. */
const fillPct = (used: number, limit: number) =>
  limit > 0 ? Math.min(100, Math.max(0, Math.round((used / limit) * 100))) : 0;

type QuotaResponse = {
  expiresAt?: string | null;
  ai?: {
    used?: number;
    planLimit?: number;
    planRemaining?: number;
    addonRemaining?: number;
    totalRemaining?: number;
    totalLimit?: number;
  };
  mock?: {
    used?: number;
    planLimit?: number;
    planRemaining?: number;
    addonRemaining?: number;
    totalRemaining?: number;
  };
};

const PRACTICE_STORAGE_EVENTS = [
  "storage",
  "focus",
  "ep-current-user-scope",
  "ep-reading-storage",
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

const TIER_REFRESH_EVENT = "ep-refresh-tier";

// Admin / unlimited plans come back from the API as Number.MAX_SAFE_INTEGER
// (9007199254740991). No real quota is anywhere near this, so anything at or
// above the threshold is treated as "unlimited" and shown as ไม่จำกัด instead
// of the raw number.
const UNLIMITED_THRESHOLD = 1_000_000;
const isUnlimitedQuota = (value: number) =>
  !Number.isFinite(value) || value >= UNLIMITED_THRESHOLD;
const formatQuota = (value: number) =>
  isUnlimitedQuota(value) ? "ไม่จำกัด" : value.toLocaleString("en-US");

function formatExpiry(expiresAt: string | null, tier: Tier): string {
  if (!expiresAt) return tier === "free" || tier === "vip" ? "ไม่มีวันหมดอายุ" : "—";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("th-TH");
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
  const unlimited = isUnlimitedQuota(card.remaining) || isUnlimitedQuota(card.limit);
  const remainingText = unlimited ? "ไม่จำกัด" : formatQuota(card.remaining);
  const tone = quotaTone(unlimited ? card.limit : card.remaining, card.limit);
  const pct =
    !unlimited && card.limit > 0
      ? Math.min(100, Math.round((card.used / card.limit) * 100))
      : 0;

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
          เหลือ {remainingText}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white/75 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">คงเหลือ</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">
            {remainingText}
            {!unlimited && (
              <span className="ml-1 text-sm text-neutral-400">/ {formatQuota(card.limit)}</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/75 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">ใช้ไปแล้ว</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">{card.used}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          <span>{card.unit.includes("lifetime") ? "การใช้งานสะสม" : "การใช้งานรอบนี้"}</span>
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
        หน่วย: {card.unit}
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
  const [mockTotalVisibleLimit, setMockTotalVisibleLimit] = useState<number | null>(null);
  const [mockPlanRemaining, setMockPlanRemaining] = useState<number | null>(null);
  const [aiPlanRemainingOverride, setAiPlanRemainingOverride] = useState<number | null>(null);
  const [aiLimitOverride, setAiLimitOverride] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [practiceTick, setPracticeTick] = useState(0);
  const { effectiveTier, loading, vipGrantedByCourse, isAdmin, previewEligible } =
    useEffectiveTier();
  // Admin-gated redesign (same rollout pattern as every prior revamp): admins /
  // preview-eligible see the new "Progress + Plan" layout; real users keep the
  // original until it's promoted.
  const soft = isAdmin || previewEligible;
  const router = useRouter();

  // Learner progress + display name — loaded only for the soft layout, from the
  // same real sources the Practice Hub / Mock report / XP badge already use.
  const [fullName, setFullName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    loaded: boolean;
    streak: number;
    xpTotal: number;
    tierName: string;
    tierEmoji: string;
    lastMock: number | null;
    mockDelta: number | null;
    weakest: Array<{ label: string; emoji: string; href: string }>;
  }>({
    loaded: false,
    streak: 0,
    xpTotal: 0,
    tierName: "",
    tierEmoji: "",
    lastMock: null,
    mockDelta: null,
    weakest: [],
  });

  const loadAccountSummary = useCallback(async () => {
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

    const res = await fetch("/api/account/quota-summary", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as QuotaResponse;
      setExpiresAt(json.expiresAt ?? null);
      setAiUsed(Math.max(0, Number(json.ai?.used ?? 0)));
      setAiPlanRemainingOverride(
        json.ai?.planRemaining == null ? null : Math.max(0, Number(json.ai.planRemaining)),
      );
      setAiLimitOverride(
        json.ai?.totalLimit == null
          ? json.ai?.planLimit == null
            ? null
            : Math.max(0, Number(json.ai.planLimit))
          : Math.max(0, Number(json.ai.totalLimit)),
      );
      setMockUsed(Math.max(0, Number(json.mock?.used ?? 0)));
      setMockPlanRemaining(
        json.mock?.planRemaining == null ? null : Math.max(0, Number(json.mock.planRemaining)),
      );
      setAiAddonRemaining(Math.max(0, Number(json.ai?.addonRemaining ?? 0)));
      setMockAddonRemaining(Math.max(0, Number(json.mock?.addonRemaining ?? 0)));
      setMockTotalVisibleLimit(
        json.mock?.totalRemaining == null
          ? null
          : Math.max(0, Number(json.mock.used ?? 0) + Number(json.mock.totalRemaining)),
      );
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
      setMockPlanRemaining(null);
      setAiLimitOverride(null);
      setMockTotalVisibleLimit(null);
    }
    setLoadingStats(false);
  }, []);

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
    void loadAccountSummary();
  }, [loadAccountSummary]);

  useEffect(() => {
    const handleRefresh = () => {
      setLoadingStats(true);
      void loadAccountSummary();
    };
    window.addEventListener(TIER_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(TIER_REFRESH_EVENT, handleRefresh);
    };
  }, [loadAccountSummary]);

  // Soft-layout only: pull display name, XP/streak, and the latest Mock score +
  // 2 weakest skills. Gated on `soft` so real users never trigger these reads.
  useEffect(() => {
    if (!soft) return;
    let alive = true;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let name: string | null = (user.user_metadata?.full_name as string | undefined) ?? null;
      const [{ data: prof }, stats, { data: rows }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        loadStats(user.id),
        supabase
          .from("mock_fixed_results")
          .select(
            "actual_total, actual_reading, actual_writing, actual_speaking, actual_listening, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);
      if (prof?.full_name) name = prof.full_name as string;

      const mrows = (rows ?? []) as Array<{
        actual_total: number | null;
        actual_reading: number | null;
        actual_writing: number | null;
        actual_speaking: number | null;
        actual_listening: number | null;
      }>;
      let lastMock: number | null = null;
      let mockDelta: number | null = null;
      let weakest: Array<{ label: string; emoji: string; href: string }> = [];
      if (mrows[0]) {
        lastMock = Math.round(Number(mrows[0].actual_total ?? 0));
        weakest = (
          [
            ["writing", Number(mrows[0].actual_writing ?? 0)],
            ["listening", Number(mrows[0].actual_listening ?? 0)],
            ["reading", Number(mrows[0].actual_reading ?? 0)],
            ["speaking", Number(mrows[0].actual_speaking ?? 0)],
          ] as Array<[string, number]>
        )
          .sort((a, b) => a[1] - b[1])
          .slice(0, 2)
          .map(([key]) => SKILL_ROUTE[key]);
        if (mrows[1]) mockDelta = lastMock - Math.round(Number(mrows[1].actual_total ?? 0));
      }

      const tp = tierProgress(stats.tierXp);
      if (!alive) return;
      setFullName(name);
      setProgress({
        loaded: true,
        streak: stats.streak,
        xpTotal: stats.xpTotal,
        tierName: tp.tier.name,
        tierEmoji: tp.tier.emoji,
        lastMock,
        mockDelta,
        weakest,
      });
    })();
    return () => {
      alive = false;
    };
  }, [soft]);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  const aiLimit = aiLimitOverride ?? AI_MONTHLY_LIMIT[effectiveTier];
  const mockLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const aiRemaining = (aiPlanRemainingOverride ?? Math.max(0, aiLimit - aiUsed)) + aiAddonRemaining;
  const mockRemaining = Math.max(0, mockLimit - mockUsed) + mockAddonRemaining;
  const visibleMockLimit = mockTotalVisibleLimit ?? Math.max(mockLimit, mockUsed + mockRemaining);
  const daysLeft = getDaysLeft(expiresAt);
  const packageSummary = getPackageSummary(effectiveTier);
  const packageDurationText =
    vipGrantedByCourse && effectiveTier === "vip"
      ? "สิทธิ์ VIP จากคอร์สที่ได้รับ ไม่มีวันหมดอายุจนกว่าจะมีการเปลี่ยนสิทธิ์"
      : packageSummary.durationTh;

  const examCredits = useMemo(() => {
    const vocabulary = getNonApiReminderSnapshot("vocabulary", effectiveTier);
    const reading = getNonApiReminderSnapshot("reading", effectiveTier);
    const dictation = getNonApiReminderSnapshot("dictation", effectiveTier);
    const fitb = getNonApiReminderSnapshot("fitb", effectiveTier);
    const realword = getNonApiReminderSnapshot("realword", effectiveTier);
    const conversation = getNonApiReminderSnapshot("conversation", effectiveTier);

    const cards: ExamCreditCard[] = [
      {
        id: "reading",
        label: "Reading / การอ่าน",
        category: "Comprehension / การอ่านจับใจความ",
        remaining: reading.remaining,
        limit: reading.limit,
        used: reading.used,
        unit: reading.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "ชุดข้อสอบ / เดือน",
        note:
          reading.poolMessage === "Free users can try one Reading exam for life. After that, you can still browse the bank, but the sets are locked until you upgrade."
            ? "ผู้ใช้ฟรีลอง Reading ได้ 1 ชุดตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่จะถูกล็อกจนกว่าจะอัปเกรด"
            : "ส่วนนี้นับจากการใช้งาน Reading ของคุณในรอบเดือนปัจจุบัน",
      },
      {
        id: "vocabulary",
        label: "Vocabulary / คำศัพท์",
        category: "Comprehension / การอ่านจับใจความ",
        remaining: vocabulary.remaining,
        limit: vocabulary.limit,
        used: vocabulary.used,
        unit: vocabulary.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "ชุดข้อสอบ / เดือน",
        note:
          vocabulary.poolMessage === "Free users can try one Vocabulary question set for life. After that, the bank stays visible, but the sets are locked until you upgrade."
            ? "ผู้ใช้ฟรีลอง Vocabulary ได้ 1 ชุดตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่จะถูกล็อกจนกว่าจะอัปเกรด"
            : "ส่วนนี้นับจากการใช้งาน Vocabulary ของคุณในรอบเดือนปัจจุบัน",
      },
      {
        id: "dictation",
        label: "Dictation / ฟังแล้วพิมพ์",
        category: "Literacy / ทักษะภาษา",
        remaining: dictation.remaining,
        limit: dictation.limit,
        used: dictation.used,
        unit: dictation.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "โควต้า Literacy / เดือน",
        note:
          dictation.cycleKind === "lifetime"
            ? `ผู้ใช้ฟรีลอง ${dictation.examLabel} ได้ 1 ครั้งตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่ชุดข้อสอบจะถูกล็อก`
            : "Dictation, Fill in the Blank และ Real Word ใช้โควต้า Literacy ร่วมกัน",
      },
      {
        id: "fitb",
        label: "Fill in the Blank / เติมคำ",
        category: "Literacy / ทักษะภาษา",
        remaining: fitb.remaining,
        limit: fitb.limit,
        used: fitb.used,
        unit: fitb.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "โควต้า Literacy / เดือน",
        note:
          fitb.cycleKind === "lifetime"
            ? `ผู้ใช้ฟรีลอง ${fitb.examLabel} ได้ 1 ครั้งตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่ชุดข้อสอบจะถูกล็อก`
            : "Dictation, Fill in the Blank และ Real Word ใช้โควต้า Literacy ร่วมกัน",
      },
      {
        id: "realword",
        label: "Choose the Real Word / เลือกคำจริง",
        category: "Literacy / ทักษะภาษา",
        remaining: realword.remaining,
        limit: realword.limit,
        used: realword.used,
        unit: realword.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "โควต้า Literacy / เดือน",
        note:
          realword.cycleKind === "lifetime"
            ? `ผู้ใช้ฟรีลอง ${realword.examLabel} ได้ 1 ครั้งตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่ชุดข้อสอบจะถูกล็อก`
            : "Dictation, Fill in the Blank และ Real Word ใช้โควต้า Literacy ร่วมกัน",
      },
      {
        id: "conversation",
        label: "Interactive Conversation / บทสนทนาโต้ตอบ",
        category: "Listening / การฟัง",
        remaining: conversation.remaining,
        limit: conversation.limit,
        used: conversation.used,
        unit: conversation.cycleKind === "lifetime" ? "สิทธิ์ฟรี / ตลอดอายุบัญชี" : "ชุดข้อสอบ / เดือน",
        note:
          conversation.poolMessage === "Free users can try one Interactive Conversation set for life. After that, the bank stays open to browse, but the sets are locked until you upgrade."
            ? "ผู้ใช้ฟรีลอง Interactive Conversation ได้ 1 ชุดตลอดอายุบัญชี หลังจากนั้นยังดูคลังข้อสอบได้ แต่ชุดข้อสอบจะถูกล็อกจนกว่าจะอัปเกรด"
            : "ส่วนนี้นับจากการใช้งาน Interactive Conversation ของคุณในรอบเดือนปัจจุบัน",
      },
      {
        id: "mock",
        label: "Full Mock Test / ข้อสอบเสมือนจริง",
        category: "Mock Exam / ข้อสอบจำลอง",
        remaining: mockRemaining,
        limit: visibleMockLimit,
        used: mockUsed,
        unit: "ครั้ง / เดือน",
        note:
          mockAddonRemaining > 0
            ? `แพ็กเกจหลักเหลือ ${mockPlanRemaining ?? Math.max(0, mockLimit - mockUsed)} ครั้ง และมี add-on เพิ่มอีก ${mockAddonRemaining} ครั้ง`
            : "จำนวนครั้งที่ใช้ได้ตามแพ็กเกจของคุณในรอบปัจจุบัน",
      },
      {
        id: "ai",
        label: "Instant Feedback / รายงานตรวจให้คะแนน",
        category: "Feedback Credits / เครดิตตรวจงาน",
        remaining: aiRemaining,
        limit: aiLimit,
        used: aiUsed,
        unit: "เครดิต / เดือน",
        note:
          aiAddonRemaining > 0
            ? `รวมเครดิตตรวจงาน เพิ่มอีก ${aiAddonRemaining} เครดิตจาก add-on ของคุณ`
            : "ใช้ร่วมกันสำหรับข้อสอบพูดและเขียนที่มีรายงานตรวจให้คะแนน",
      },
    ];

    return cards;
  }, [
    aiAddonRemaining,
    aiPlanRemainingOverride,
    aiLimit,
    aiRemaining,
    aiUsed,
    effectiveTier,
    mockAddonRemaining,
    mockLimit,
    mockPlanRemaining,
    mockRemaining,
    visibleMockLimit,
    mockUsed,
    practiceTick,
  ]);

  // Dictation + Fill-in-the-Blank + Real Word share ONE Literacy pool on paid
  // plans (sharesPool: true → identical numbers), so the redesign shows it once
  // instead of three duplicate cards. On free they are separate lifetime tries,
  // so we sum them.
  const softLiteracy = useMemo(() => {
    const d = getNonApiReminderSnapshot("dictation", effectiveTier);
    const f = getNonApiReminderSnapshot("fitb", effectiveTier);
    const r = getNonApiReminderSnapshot("realword", effectiveTier);
    const limit = d.sharesPool ? d.limit : d.limit + f.limit + r.limit;
    const used = d.sharesPool ? d.used : d.used + f.used + r.used;
    return { limit, used, remaining: Math.max(0, limit - used) };
    // practiceTick forces a recompute when local practice storage changes.
  }, [effectiveTier, practiceTick]);

  if (soft) {
    const displayName = fullName || email?.split("@")[0] || "ผู้เรียน";
    const initial = displayName.charAt(0).toUpperCase();
    const byId = (id: string) => examCredits.find((c) => c.id === id);
    const usageRows = [
      { emoji: "📖", label: "การอ่าน (Reading)", data: byId("reading") },
      { emoji: "🔤", label: "คำศัพท์ (Vocabulary)", data: byId("vocabulary") },
      {
        emoji: "✍️",
        label: "Literacy — ใช้โควต้าร่วมกัน",
        data: {
          remaining: softLiteracy.remaining,
          limit: softLiteracy.limit,
          used: softLiteracy.used,
        },
        sub: "โควต้าเดียวใช้ร่วมกันสำหรับ · ฟังแล้วพิมพ์ · เติมคำ · เลือกคำจริง",
      },
      { emoji: "🎧", label: "บทสนทนาโต้ตอบ (Listening)", data: byId("conversation") },
    ];

    const planNameTh = loading ? "…" : TIER_DISPLAY[effectiveTier].nameTh;
    const planNameEn = loading ? "" : TIER_DISPLAY[effectiveTier].nameEn;
    const hasExpiry = daysLeft != null;
    const expiryBarPct =
      daysLeft != null ? Math.min(100, Math.max(2, Math.round((daysLeft / 30) * 100))) : 0;

    const usageBar = (used: number, limit: number, unlimited: boolean) => (
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef2f7]">
        <div
          className="h-full rounded-full bg-[#004AAD]"
          style={{ width: unlimited ? "0%" : `${fillPct(used, limit)}%` }}
        />
      </div>
    );

    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {/* ── who you are + learning progress ── */}
        <section className="overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#004AAD] text-2xl font-black text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black leading-tight text-slate-900">สวัสดี, {displayName} 👋</p>
              <p className="truncate text-sm text-slate-500">{email ?? "—"}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#FFCC00] px-3 py-1 text-[11px] font-black uppercase text-slate-900">
              {planNameEn || planNameTh}
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="p-4 text-center">
              <p className="text-2xl font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {progress.loaded ? progress.streak : "…"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">วันติดต่อกัน 🔥</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {!progress.loaded ? "…" : progress.lastMock == null ? "—" : progress.lastMock}
                {progress.loaded && progress.lastMock != null ? (
                  <span className="text-sm text-slate-400">/160</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                Mock ล่าสุด
                {progress.mockDelta != null && progress.mockDelta !== 0 ? (
                  <span className={progress.mockDelta > 0 ? "text-emerald-600" : "text-rose-600"}>
                    {" "}
                    {progress.mockDelta > 0 ? "+" : ""}
                    {progress.mockDelta}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {progress.loaded ? progress.xpTotal.toLocaleString("en-US") : "…"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                แต้มสะสม{progress.loaded && progress.tierName ? ` · ${progress.tierEmoji}${progress.tierName}` : ""}
              </p>
            </div>
          </div>

          {progress.weakest.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
              <span>จุดที่ควรฝึกต่อ:</span>
              {progress.weakest.map((w) => (
                <Link key={w.href} href={w.href} className="font-bold text-[#004AAD] underline">
                  {w.emoji} {w.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── plan at a glance (shown once) ── */}
        <section className="rounded-[20px] bg-white p-5 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">แพ็กเกจปัจจุบัน</p>
              <p className="text-xl font-black text-slate-900">
                {planNameTh}
                {planNameEn ? <span className="text-slate-400"> · {planNameEn}</span> : null}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {hasExpiry && daysLeft! > 0
                  ? `เหลือ ${daysLeft} วัน`
                  : vipGrantedByCourse || !expiresAt
                    ? "ไม่มีวันหมดอายุ"
                    : "หมดอายุแล้ว"}
              </p>
              <p className="text-xs text-slate-500">
                {loadingStats ? "…" : hasExpiry ? `หมดอายุ ${formatExpiry(expiresAt, effectiveTier)}` : packageDurationText}
              </p>
            </div>
          </div>
          {hasExpiry ? (
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#004AAD]" style={{ width: `${expiryBarPct}%` }} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pricing" className="rounded-xl bg-[#FFCC00] px-4 py-2 text-sm font-black text-slate-900">
              ต่ออายุ / อัปเกรด
            </Link>
            <Link href="/pricing" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              ซื้อเครดิตเพิ่ม
            </Link>
          </div>
        </section>

        {/* ── usage: grouped, merged Literacy, fill-as-you-use bars ── */}
        <section className="rounded-[20px] bg-white p-5 ring-1 ring-slate-200">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">สิทธิ์คงเหลือเดือนนี้</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">แถบจะเต็มขึ้นเมื่อคุณใช้งาน — ส่วนที่ว่างคือสิทธิ์ที่ยังเหลือ</p>

          <div className="space-y-4">
            {usageRows.map((row) => {
              const remaining = Number(row.data?.remaining ?? 0);
              const limit = Number(row.data?.limit ?? 0);
              const used = Number(row.data?.used ?? 0);
              const unlimited = isUnlimitedQuota(remaining) || isUnlimitedQuota(limit);
              return (
                <div key={row.label} className={row.sub ? "rounded-2xl bg-slate-50 p-3" : undefined}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-bold text-slate-900">
                      {row.emoji} {row.label}
                    </span>
                    <span className="text-slate-500" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                      {unlimited ? (
                        "ไม่จำกัด"
                      ) : (
                        <>
                          เหลือ <b className="text-slate-900">{formatQuota(remaining)}</b> / {formatQuota(limit)}
                        </>
                      )}
                    </span>
                  </div>
                  {usageBar(used, limit, unlimited)}
                  {row.sub ? <p className="mt-2 text-[11px] text-slate-500">{row.sub}</p> : null}
                </div>
              );
            })}
          </div>

          {/* the two premium resources get a highlighted tile each */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#004AAD]/20 bg-[#004AAD]/[.04] p-4">
              <p className="text-sm font-black text-slate-900">📝 Mock Test เต็มรูปแบบ</p>
              <p className="mt-1 text-2xl font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {isUnlimitedQuota(mockRemaining) ? "ไม่จำกัด" : formatQuota(mockRemaining)}
                <span className="text-sm font-semibold text-slate-400"> ครั้ง</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {mockAddonRemaining > 0
                  ? `แพ็กเกจ ${mockPlanRemaining ?? Math.max(0, mockLimit - mockUsed)} · add-on ${mockAddonRemaining}`
                  : "ตามแพ็กเกจของคุณในรอบนี้"}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-[#004AAD]/20 bg-[#004AAD]/[.04] p-4">
              <p className="text-sm font-black text-slate-900">✅ เครดิตตรวจงาน</p>
              <p className="mt-1 text-2xl font-black text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                {isUnlimitedQuota(aiRemaining) ? "ไม่จำกัด" : formatQuota(aiRemaining)}
                <span className="text-sm font-semibold text-slate-400"> เครดิต</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {aiAddonRemaining > 0 ? `รวม add-on อีก ${aiAddonRemaining} เครดิต` : "สำหรับข้อสอบพูด + เขียน"}
              </p>
            </div>
          </div>
        </section>

        {/* ── real account actions ── */}
        <section className="divide-y divide-slate-100 overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200">
          <Link href="/pricing" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            จัดการแพ็กเกจ <span className="text-slate-300">›</span>
          </Link>
          <Link href="/forgot-password" className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            เปลี่ยนรหัสผ่าน <span className="text-slate-300">›</span>
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-rose-600 hover:bg-slate-50"
          >
            ออกจากระบบ <span className="text-rose-300">›</span>
          </button>
        </section>
      </main>
    );
  }

  const heroStats = [
    {
      label: "แพลนปัจจุบัน",
      value: loading ? "…" : TIER_DISPLAY[effectiveTier].nameTh,
      note: loading ? "…" : TIER_DISPLAY[effectiveTier].nameEn,
    },
    {
      label: "วันหมดอายุแพลน",
      value: loadingStats ? "…" : formatExpiry(expiresAt, effectiveTier),
      note:
        daysLeft != null && daysLeft > 0
          ? `เหลืออีก ${daysLeft} วัน`
          : effectiveTier === "free"
            ? "ใช้ฟรีได้ต่อเนื่อง"
            : "สถานะแพ็กเกจ",
    },
    {
      label: "รายการที่ตรวจสอบได้",
      value: String(examCredits.length),
      note: "สิทธิ์ฝึกทำข้อสอบ + ตรวจงาน + Mock Test",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="relative overflow-hidden rounded-[30px] border-4 border-black bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_48%,#fff7db_100%)] p-6 shadow-[8px_8px_0_0_#111] md:p-8">
        <div className="absolute right-4 top-4">
          <VIPBadge />
        </div>
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.24em] text-[#004AAD]">
          สิทธิ์ของฉัน
        </p>
        <h1
          className="mt-3 text-3xl font-black tracking-tight text-neutral-900 md:text-5xl"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          แพลนและสิทธิ์ใช้งาน
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700 md:text-base">
          หน้านี้สรุปให้คุณเห็นว่า ตอนนี้คุณอยู่แพลนอะไร แพลนหมดอายุเมื่อไร และยังเหลือสิทธิ์ฝึกทำข้อสอบหรือเครดิตตรวจงาน
          สำหรับแต่ละประเภทอีกเท่าไร
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
          <BrutalPanel title="ข้อมูลบัญชี" eyebrow="สำหรับผู้เรียน" variant="elevated">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">อีเมล</p>
                <p className="mt-2 text-lg font-black text-neutral-900">{email ?? "—"}</p>
              </div>
              <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">สรุปแพลน</p>
                <p className="mt-2 text-lg font-black text-neutral-900">
                  {loading ? "กำลังโหลด…" : `${TIER_DISPLAY[effectiveTier].nameTh} / ${TIER_DISPLAY[effectiveTier].nameEn}`}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {TIER_DISPLAY[effectiveTier].priceThb === 0
                    ? "เริ่มต้นใช้งานฟรี"
                    : `${TIER_DISPLAY[effectiveTier].priceThb} บาท / 30 วัน`}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                {packageSummary.aiTh}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                {packageSummary.mockTh}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                {packageSummary.practiceTh}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                {packageDurationText}
              </div>
            </div>
          </BrutalPanel>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                  ภาพรวมสิทธิ์ใช้งาน
                </p>
                <h2 className="text-2xl font-black tracking-tight text-neutral-900">
                  สิทธิ์คงเหลือตามประเภทข้อสอบ
                </h2>
              </div>
              <p className="text-sm font-semibold text-neutral-500">
                อัปเดตจากการใช้งานล่าสุดและกติกาของแพลนคุณ
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
          <BrutalPanel title="วิธีดูหน้านี้" eyebrow="กติกาการนับสิทธิ์" variant="elevated">
            <ul className="space-y-3 text-sm leading-6 text-neutral-700">
              <li>Vocabulary และ Reading แยกกันนับคนละส่วน</li>
              <li>Dictation, Fill in the Blank และ Real Word ใช้โควต้า Literacy ร่วมกันเมื่อเป็นแพลนรายเดือน</li>
              <li>Interactive Conversation มีสิทธิ์แยกของตัวเอง</li>
              <li>ถ้าคุณซื้อ add-on เพิ่ม ระบบจะบวกสิทธิ์เพิ่มให้ต่อจากสิทธิ์ในแพลน</li>
            </ul>
            <Link
              href="/pricing"
              className="mt-5 inline-block rounded-[18px] border-[3px] border-black bg-[#FFCC00] px-5 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
            >
              ดูแพลนทั้งหมด
            </Link>
          </BrutalPanel>
        </aside>
      </div>
    </main>
  );
}
