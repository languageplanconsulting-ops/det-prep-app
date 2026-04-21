"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { useBillingActions } from "@/hooks/useBillingActions";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { ADD_ON_CATALOG, type AddOnSku } from "@/lib/paywall-upsell";

type PricingTier = "free" | "basic" | "premium" | "vip";

const PLAN_CARDS: Array<{
  tier: PricingTier;
  price: string;
  headlineTh: string;
  headlineEn: string;
  ai: string;
  mocks: string;
  examAccess: string;
  recommended?: boolean;
}> = [
  {
    tier: "free",
    price: "ฟรี",
    headlineTh: "ลองระบบก่อน เริ่มฝึกแบบค่อยเป็นค่อยไป",
    headlineEn: "Explore the platform before committing.",
    ai: "AI Feedback 1 ครั้งตลอดอายุการใช้งาน",
    mocks: "Mock Test 0 ครั้ง / เดือน",
    examAccess: "Starter test lane ละ 1 ครั้ง",
  },
  {
    tier: "basic",
    price: "฿399 / เดือน",
    headlineTh: "เหมาะสำหรับคนที่เริ่มจริงจังและอยากวัดจุดอ่อน",
    headlineEn: "Best for steady learners starting serious prep.",
    ai: "AI Feedback 12 ครั้ง / เดือน",
    mocks: "Mock Test 2 ครั้ง / เดือน",
    examAccess: "Comprehension 15 · Vocabulary 15 · Literacy 20 · Conversation 10",
  },
  {
    tier: "premium",
    price: "฿699 / เดือน",
    headlineTh: "เหมาะสำหรับคนที่ต้องการอัปคะแนนแบบต่อเนื่อง",
    headlineEn: "Best for frequent scoring, reports, and mock practice.",
    ai: "AI Feedback 30 ครั้ง / เดือน",
    mocks: "Mock Test 4 ครั้ง / เดือน",
    examAccess: "Comprehension 30 · Vocabulary 30 · Literacy 50 · Conversation 20",
    recommended: true,
  },
  {
    tier: "vip",
    price: "฿999 / เดือน",
    headlineTh: "สำหรับผู้เตรียมสอบจริงจังที่ต้องการความยืดหยุ่นสูงสุด",
    headlineEn: "Best for the most intensive, least-interrupted prep.",
    ai: "AI Feedback 60 ครั้ง / เดือน",
    mocks: "Mock Test 6 ครั้ง / เดือน",
    examAccess: "Practice lanes ไม่จำกัด + priority-style prep feel",
  },
];

const ADD_ON_ORDER: AddOnSku[] = ["mock_1", "mock_2", "feedback_1", "feedback_3", "feedback_5"];

function PricingPageContent() {
  const { startUpgradeCheckout, startAddOnCheckout, user, loading } = useBillingActions();
  const { effectiveTier } = useEffectiveTier();
  const searchParams = useSearchParams();

  const focus = searchParams.get("focus");
  const focusedSku = searchParams.get("sku");
  const checkoutStatus = searchParams.get("checkout");

  useEffect(() => {
    if (focus === "addons") {
      const el = document.getElementById("addons-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [focus]);

  const recommendation = useMemo(() => {
    if (effectiveTier === "free") return "premium";
    if (effectiveTier === "basic") return "premium";
    if (effectiveTier === "premium") return "vip";
    return null;
  }, [effectiveTier]);

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-10" style={{ backgroundImage: "radial-gradient(#111 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111] md:p-8">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
            Pricing / สิทธิ์การใช้งาน
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter md:text-5xl">
                เลือกแพลนที่เหมาะกับการเตรียมสอบ
                <br />
                <span className="not-italic text-[#004aad]">Choose your prep plan</span>
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-bold text-neutral-700">
                ทุกแพลนเน้นให้คุณฝึกได้ต่อเนื่อง แต่เมื่อใช้สิทธิ์ครบ คุณสามารถเลือกได้ทั้ง{" "}
                <span className="underline">อัปเกรดแพลน</span> หรือ{" "}
                <span className="underline">ซื้อ add-on</span> เพื่อไม่ให้การเตรียมสอบสะดุด
              </p>
            </div>
            <div className="border-4 border-black bg-[#ffcc00] p-3 text-center shadow-[6px_6px_0_0_#111]">
              <p className="font-mono text-[10px] font-black uppercase">Current Plan</p>
              <p className="mt-1 text-2xl font-black uppercase text-[#004aad]">{effectiveTier}</p>
            </div>
          </div>
        </section>

        {recommendation ? (
          <section className="border-4 border-black bg-[#e0f2fe] p-5 shadow-[8px_8px_0_0_#111]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#004aad]">
              Recommended Next Step
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  แนะนำให้ขยับเป็น {recommendation === "vip" ? "VIP" : "Premium"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-neutral-700">
                  ถ้าคุณใช้ Mock Test หรือ AI Feedback บ่อย การอัปเกรดมักคุ้มกว่าการซื้อ add-on ซ้ำหลายครั้ง
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Upgrading is usually better value than repeated one-off top-ups for active learners.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void startUpgradeCheckout(recommendation)}
                className="border-[3px] border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50"
              >
                อัปเกรดตอนนี้ / Upgrade now
              </button>
            </div>
          </section>
        ) : null}

        {checkoutStatus === "success" ? (
          <section className="border-4 border-black bg-[#dcfce7] p-4 shadow-[8px_8px_0_0_#111]">
            <p className="text-lg font-black text-[#166534]">
              ชำระเงินสำเร็จแล้ว / Payment successful
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">
              สิทธิ์ add-on ของคุณถูกเติมแล้ว หากยังไม่เห็นยอดใหม่ ให้รีเฟรชหน้าอีกครั้ง
            </p>
          </section>
        ) : null}

        {checkoutStatus === "cancel" ? (
          <section className="border-4 border-black bg-[#fff7ed] p-4 shadow-[8px_8px_0_0_#111]">
            <p className="text-lg font-black text-[#c2410c]">
              ยังไม่ได้ชำระเงิน / Checkout canceled
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">
              คุณสามารถกลับมาเลือกแพลนหรือ add-on ได้ทุกเมื่อ
            </p>
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-4">
          {PLAN_CARDS.map((plan) => {
            const active = effectiveTier === plan.tier;
            const paid = plan.tier !== "free";
            return (
              <article
                key={plan.tier}
                className={`flex h-full flex-col border-4 border-black p-5 shadow-[8px_8px_0_0_#111] ${
                  plan.recommended ? "bg-[#fffbeb]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#004aad]">
                      {plan.tier}
                    </p>
                    <h2 className="mt-2 text-3xl font-black uppercase italic">{plan.tier}</h2>
                  </div>
                  <div className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${active ? "bg-[#ffcc00]" : "bg-white"}`}>
                    {active ? "Current" : plan.recommended ? "Recommended" : "Plan"}
                  </div>
                </div>

                <p className="mt-4 text-3xl font-black text-[#004aad]">{plan.price}</p>
                <p className="mt-3 text-sm font-bold text-neutral-900">{plan.headlineTh}</p>
                <p className="mt-1 text-xs text-neutral-500">{plan.headlineEn}</p>

                <div className="mt-5 space-y-3 border-t-2 border-dashed border-black pt-4">
                  <div className="border-2 border-black bg-neutral-50 p-3">
                    <p className="font-mono text-[10px] font-black uppercase text-neutral-500">AI Feedback</p>
                    <p className="mt-1 text-sm font-black">{plan.ai}</p>
                  </div>
                  <div className="border-2 border-black bg-neutral-50 p-3">
                    <p className="font-mono text-[10px] font-black uppercase text-neutral-500">Mock Tests</p>
                    <p className="mt-1 text-sm font-black">{plan.mocks}</p>
                  </div>
                  <div className="border-2 border-black bg-neutral-50 p-3">
                    <p className="font-mono text-[10px] font-black uppercase text-neutral-500">Practice Access</p>
                    <p className="mt-1 text-sm font-black leading-relaxed">{plan.examAccess}</p>
                  </div>
                </div>

                <div className="mt-5">
                  {active ? (
                    <Link
                      href="/profile"
                      className="block border-[3px] border-black bg-white px-4 py-3 text-center text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
                    >
                      ดูสิทธิ์ปัจจุบัน / View my plan
                    </Link>
                  ) : paid ? (
                    <button
                      type="button"
                      disabled={loading || !user}
                      onClick={() => void startUpgradeCheckout(plan.tier)}
                      className="block w-full border-[3px] border-black bg-[#004aad] px-4 py-3 text-center text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:opacity-50"
                    >
                      เลือกแพลนนี้ / Choose this plan
                    </button>
                  ) : (
                    <Link
                      href="/practice"
                      className="block border-[3px] border-black bg-white px-4 py-3 text-center text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
                    >
                      เริ่มใช้ฟรี / Start free
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section
          id="addons-section"
          className={`border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111] ${focus === "addons" ? "ring-4 ring-[#004aad] ring-offset-4" : ""}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
                Add-on Store / ซื้อสิทธิ์เพิ่ม
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter">
                เพิ่ม Mock หรือ AI Feedback ได้
                <br />
                <span className="not-italic text-[#004aad]">Top up when you hit a quota</span>
              </h2>
            </div>
            <div className="border-2 border-black bg-[#ffcc00] px-3 py-2 text-xs font-black uppercase">
              ไม่ rollover · หมดอายุพร้อมรอบบิล
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-neutral-700">
            เหมาะสำหรับคนที่ต้องการสิทธิ์เพิ่มเฉพาะช่วงนี้ แต่หากซื้อซ้ำบ่อย การอัปเกรดแพลนจะคุ้มกว่า
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Great for one-off needs. Frequent top-ups usually mean it is time to upgrade.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {ADD_ON_ORDER.map((sku) => {
              const addOn = ADD_ON_CATALOG[sku];
              const highlighted = focusedSku === sku;
              return (
                <article
                  key={sku}
                  className={`flex h-full flex-col border-4 border-black p-4 shadow-[6px_6px_0_0_#111] ${
                    highlighted ? "bg-[#fffbeb]" : "bg-neutral-50"
                  }`}
                >
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#004aad]">
                    {addOn.kind}
                  </p>
                  <h3 className="mt-2 text-lg font-black leading-tight">{addOn.labelTh}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{addOn.labelEn}</p>
                  <p className="mt-4 text-3xl font-black text-[#004aad]">฿{addOn.priceThb}</p>
                  <p className="mt-2 text-sm font-bold text-neutral-800">{addOn.shortTh}</p>
                  <p className="mt-1 text-xs text-neutral-500">{addOn.shortEn}</p>
                  <button
                    type="button"
                    onClick={() => void startAddOnCheckout(sku)}
                    className="mt-5 border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
                  >
                    ซื้อสิทธิ์นี้ / Buy this add-on
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-4 border-black bg-black p-5 text-white shadow-[10px_10px_0_0_#111]">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ffcc00]">Business Logic / กติกาการขาย</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-base font-black">1. Upgrade first</p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                เวลา quota หมด ระบบจะเสนอการอัปเกรดก่อน แล้วค่อยเสนอ add-on เป็นทางเลือกที่สอง
              </p>
            </div>
            <div>
              <p className="text-base font-black">2. Add-on for short-term needs</p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                เหมาะกับการเร่งฝึกเฉพาะรอบนี้ เช่นก่อนสอบจริงหรือก่อนยื่นทุน
              </p>
            </div>
            <div>
              <p className="text-base font-black">3. No rollover</p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                สิทธิ์ที่ซื้อเพิ่มจะหมดอายุพร้อมรอบบิล เพื่อให้แพลนหลักยังคุ้มค่ากว่าในระยะยาว
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-[#f3f4f6] px-4 py-10"
          style={{ backgroundImage: "radial-gradient(#111 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        >
          <div className="mx-auto max-w-7xl">
            <section className="border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111] md:p-8">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
                Pricing / สิทธิ์การใช้งาน
              </p>
              <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tighter md:text-5xl">
                กำลังโหลดแพลน...
                <br />
                <span className="not-italic text-[#004aad]">Loading pricing…</span>
              </h1>
            </section>
          </div>
        </main>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
