"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { VIPBadge } from "@/components/ui/VIPBadge";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  AI_MONTHLY_LIMIT,
  MOCK_TEST_MONTHLY_LIMIT,
  TIER_DISPLAY,
  type Tier,
} from "@/lib/access-control";
import { getNonApiReminderSnapshot } from "@/lib/non-api-practice-usage";
import { mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type QuotaResponse = {
  expiresAt?: string | null;
  ai?: {
    used?: number;
    planRemaining?: number;
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

function formatExpiry(expiresAt: string | null, tier: Tier): string {
  if (!expiresAt) return tier === "free" ? "ไม่มีวันหมดอายุ" : "—";
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
          เหลือ {card.remaining}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white/75 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">คงเหลือ</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">
            {card.remaining}
            <span className="ml-1 text-sm text-neutral-400">/ {card.limit}</span>
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
  const [aiPlanRemainingOverride, setAiPlanRemainingOverride] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [practiceTick, setPracticeTick] = useState(0);
  const { effectiveTier, loading } = useEffectiveTier();

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
        setAiPlanRemainingOverride(
          json.ai?.planRemaining == null ? null : Math.max(0, Number(json.ai.planRemaining)),
        );
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
  const aiRemaining = (aiPlanRemainingOverride ?? Math.max(0, aiLimit - aiUsed)) + aiAddonRemaining;
  const mockRemaining = Math.max(0, mockLimit - mockUsed) + mockAddonRemaining;
  const daysLeft = getDaysLeft(expiresAt);

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
        limit: mockLimit,
        used: mockUsed,
        unit: "ครั้ง / เดือน",
        note:
          mockAddonRemaining > 0
            ? `รวมสิทธิ์ Mock Test เพิ่มอีก ${mockAddonRemaining} ครั้งจาก add-on ของคุณ`
            : "จำนวนครั้งที่ใช้ได้ตามแพลนของคุณในรอบเดือนนี้",
      },
      {
        id: "ai",
        label: "AI Feedback / รายงานตรวจโดย AI",
        category: "AI Credits / เครดิต AI",
        remaining: aiRemaining,
        limit: aiLimit,
        used: aiUsed,
        unit: "เครดิต / เดือน",
        note:
          aiAddonRemaining > 0
            ? `รวมเครดิต AI เพิ่มอีก ${aiAddonRemaining} เครดิตจาก add-on ของคุณ`
            : "ใช้ร่วมกันสำหรับข้อสอบพูดและเขียนที่มีรายงานตรวจโดย AI",
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
    mockRemaining,
    mockUsed,
    practiceTick,
  ]);

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
      note: "สิทธิ์ฝึกทำข้อสอบ + AI + Mock Test",
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
          หน้านี้สรุปให้คุณเห็นว่า ตอนนี้คุณอยู่แพลนอะไร แพลนหมดอายุเมื่อไร และยังเหลือสิทธิ์ฝึกทำข้อสอบหรือเครดิต AI
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
                    : `${TIER_DISPLAY[effectiveTier].priceThb} บาท`}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                แพลนนี้ออกแบบให้คุณเห็นสิทธิ์ที่เหลืออยู่ชัดเจน และวางแผนการฝึกได้ง่ายขึ้น
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                หากแพลนของคุณหมดอายุ ระบบจะพาไปเลือกแพลนใหม่เพื่อใช้งานต่อ
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                AI Feedback และ Mock Test จะแสดงรวมสิทธิ์จากแพลนและ add-on ของคุณ
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-3 text-sm font-semibold text-neutral-700">
                สำหรับผู้ใช้ฟรี สิทธิ์ทดลองบางประเภทเป็นแบบใช้ได้ 1 ครั้งตลอดอายุบัญชี
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
