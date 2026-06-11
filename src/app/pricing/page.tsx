"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AdminPricingContent } from "@/components/pricing/AdminPricingContent";
import { useBillingActions } from "@/hooks/useBillingActions";
import { getPackageSummary } from "@/lib/package-copy";
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
    ai: "Instant Feedback 1 ครั้งตลอดอายุการใช้งาน",
    mocks: "Mock Test 0 ครั้ง / เดือน",
    examAccess:
      "Reading, Vocabulary, Dictation, Fill in the Blank, Real Word และ Interactive Conversation ฟรีอย่างละ 1 ครั้ง",
  },
  {
    tier: "basic",
    price: "฿399 / 30 วัน",
    headlineTh: "เหมาะสำหรับคนที่เริ่มจริงจังและอยากวัดจุดอ่อน",
    headlineEn: "Best for steady learners starting serious prep.",
    ai: "Instant Feedback 12 ครั้ง / 30 วัน",
    mocks: "Mock Test 2 ครั้ง / 30 วัน",
    examAccess: "Comprehension 15 · Vocabulary 15 · Literacy 20 · Conversation 10 / 30 วัน",
  },
  {
    tier: "premium",
    price: "฿699 / 30 วัน",
    headlineTh: "เหมาะสำหรับคนที่ต้องการอัปคะแนนแบบต่อเนื่อง",
    headlineEn: "Best for frequent scoring, reports, and mock practice.",
    ai: "Instant Feedback 30 ครั้ง / 30 วัน",
    mocks: "Mock Test 4 ครั้ง / 30 วัน",
    examAccess: "Comprehension 30 · Vocabulary 30 · Literacy 50 · Conversation 20 / 30 วัน",
    recommended: true,
  },
  {
    tier: "vip",
    price: "฿999 / 30 วัน",
    headlineTh: "สำหรับผู้เตรียมสอบจริงจังที่ต้องการความยืดหยุ่นสูงสุด",
    headlineEn: "Best for the most intensive, least-interrupted prep.",
    ai: "Instant Feedback 60 ครั้ง / 30 วัน",
    mocks: "Mock Test 6 ครั้ง / 30 วัน",
    examAccess: "Practice lanes ไม่จำกัด + priority-style prep feel",
  },
];

const ADD_ON_ORDER: AddOnSku[] = ["mock_1", "mock_2", "feedback_1", "feedback_3", "feedback_5"];

function PricingPageContent() {
  const { startUpgradeCheckout, startUpgradePromptPay, startAddOnCheckout, user, loading, checkoutBusy } = useBillingActions();
  const { effectiveTier } = useEffectiveTier();
  const searchParams = useSearchParams();
  const [checkoutError, setCheckoutError] = useState("");
  const [activationState, setActivationState] = useState<"idle" | "confirming" | "activated" | "pending" | "error">("idle");
  const [activationMessage, setActivationMessage] = useState("");
  const [handledSessionId, setHandledSessionId] = useState<string | null>(null);

  const focus = searchParams.get("focus");
  const focusedSku = searchParams.get("sku");
  const checkoutStatus = searchParams.get("checkout");
  const focusedPlan = searchParams.get("plan");
  const sessionId = searchParams.get("session_id");
  const expired = searchParams.get("expired");
  const focusedAddOn = focusedSku ? ADD_ON_CATALOG[focusedSku as AddOnSku] : null;
  const activePlanSummary =
    focusedPlan === "basic" || focusedPlan === "premium" || focusedPlan === "vip"
      ? getPackageSummary(focusedPlan)
      : getPackageSummary(effectiveTier);

  useEffect(() => {
    if (focus === "addons") {
      const el = document.getElementById("addons-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [focus]);

  useEffect(() => {
    if (checkoutStatus !== "success") {
      setActivationState("idle");
      setActivationMessage("");
      setHandledSessionId(null);
      return;
    }

    if (!sessionId) {
      window.dispatchEvent(new Event("ep-refresh-tier"));
      setActivationState("activated");
      setActivationMessage("เรารีเฟรชสิทธิ์ให้แล้ว หากสถานะยังไม่เปลี่ยนภายในไม่กี่วินาที ระบบกำลังรอ webhook จาก Stripe อยู่");
      return;
    }

    if (handledSessionId === sessionId) {
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    const confirmCheckout = async () => {
      setActivationState("confirming");
      setActivationMessage("กำลังยืนยันการชำระเงินและเปิดสิทธิ์แพลนของคุณ...");

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await fetch("/api/stripe/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ sessionId }),
        });

        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          pending?: boolean;
          error?: string;
        };

        if (cancelled) return;

        if (res.ok && json.ok) {
          setHandledSessionId(sessionId);
          setActivationState("activated");
          setActivationMessage("สิทธิ์ของคุณพร้อมใช้งานแล้ว สามารถเริ่มฝึกต่อได้ทันที");
          window.dispatchEvent(new Event("ep-refresh-tier"));
          return;
        }

        if (res.status === 202 && json.pending) {
          if (attempt < 3) {
            await sleep(1500);
            continue;
          }
          setHandledSessionId(sessionId);
          setActivationState("pending");
          setActivationMessage("Stripe ยืนยันว่าชำระเงินกำลังปิดงานอยู่ ระบบจะอัปเดตสิทธิ์ให้อัตโนมัติในอีกไม่กี่วินาที");
          window.dispatchEvent(new Event("ep-refresh-tier"));
          return;
        }

        setHandledSessionId(sessionId);
        setActivationState("error");
        setActivationMessage(json.error ?? "ยังยืนยันสิทธิ์หลังชำระเงินไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง");
        return;
      }
    };

    void confirmCheckout();
    return () => {
      cancelled = true;
    };
  }, [checkoutStatus, handledSessionId, sessionId]);

  const recommendation = useMemo(() => {
    if (effectiveTier === "free") return "premium";
    if (effectiveTier === "basic") return "premium";
    if (effectiveTier === "premium") return "vip";
    return null;
  }, [effectiveTier]);

  const beginPlanCheckout = async (tier: PricingTier) => {
    try {
      setCheckoutError("");
      await startUpgradeCheckout(tier);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not open card checkout.");
    }
  };

  const beginPlanPromptPay = async (tier: PricingTier) => {
    try {
      setCheckoutError("");
      await startUpgradePromptPay(tier);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not open QR payment.");
    }
  };

  const beginAddOnCheckout = async (sku: AddOnSku) => {
    try {
      setCheckoutError("");
      await startAddOnCheckout(sku);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not open add-on checkout.");
    }
  };

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
                  ถ้าคุณใช้ Mock Test หรือ Instant Feedback บ่อย การอัปเกรดมักคุ้มกว่าการซื้อ add-on ซ้ำหลายครั้ง
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Upgrading is usually better value than repeated one-off top-ups for active learners.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[18rem]">
                <button
                  type="button"
                  disabled={loading || checkoutBusy}
                  onClick={() => void startUpgradeCheckout(recommendation)}
                  className="border-[3px] border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutBusy ? "Opening checkout..." : "จ่ายด้วยบัตร / สิทธิ์ 30 วัน"}
                </button>
                <button
                  type="button"
                  disabled={loading || checkoutBusy}
                  onClick={() => void startUpgradePromptPay(recommendation)}
                  className="border-[3px] border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase text-neutral-900 shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutBusy ? "Opening checkout..." : "จ่ายด้วย QR PromptPay"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {checkoutStatus === "success" ? (
          <section className="border-4 border-black bg-[#dcfce7] p-4 shadow-[8px_8px_0_0_#111]">
            <p className="text-lg font-black text-[#166534]">
              ชำระเงินสำเร็จแล้ว / Payment successful
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">
              {activationState === "confirming"
                ? activationMessage
                : activationState === "pending"
                  ? activationMessage
                  : activationState === "error"
                    ? activationMessage
                    : focus === "addons"
                      ? "สิทธิ์ add-on ของคุณพร้อมใช้งานแล้ว สามารถเริ่มฝึกต่อได้เลย"
                      : activationMessage || "เราเปิดสิทธิ์แพลน 30 วันให้แล้ว สามารถเริ่มฝึกต่อได้ทันที"}
            </p>
            {focus !== "addons" ? (
              <div className="mt-4 grid gap-3 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_#111] md:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[#166534]">
                    Activated package
                  </p>
                  <h3 className="mt-2 text-xl font-black text-neutral-900">
                    {activePlanSummary.labelTh} / {activePlanSummary.labelEn}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-neutral-700">
                    {activePlanSummary.durationTh}
                  </p>
                </div>
                <div className="grid gap-2 text-sm font-semibold text-neutral-800">
                  <p>{activePlanSummary.aiTh}</p>
                  <p>{activePlanSummary.mockTh}</p>
                  <p>{activePlanSummary.practiceTh}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={
                  focus === "addons" && focusedAddOn?.kind === "mock"
                    ? "/mock-test/start"
                    : "/practice"
                }
                className="border-[3px] border-black bg-[#004aad] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
              >
                {focus === "addons" && focusedAddOn?.kind === "mock"
                  ? "เริ่มทำ Mock Test"
                  : "เริ่มใช้ Practice"}
              </Link>
              <Link
                href="/profile"
                className="border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase text-neutral-900 shadow-[4px_4px_0_0_#111]"
              >
                ดูสิทธิ์ในโปรไฟล์
              </Link>
              <Link
                href="/mock-test/start"
                className="border-[3px] border-black bg-[#ffcc00] px-5 py-3 text-sm font-black uppercase text-neutral-900 shadow-[4px_4px_0_0_#111]"
              >
                ไปหน้า Mock Test
              </Link>
            </div>
            {focusedPlan ? (
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-neutral-600">
                Active checkout: {focusedPlan}
              </p>
            ) : null}
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

        {expired ? (
          <section className="border-4 border-black bg-[#fff7ed] p-4 shadow-[8px_8px_0_0_#111]">
            <p className="text-lg font-black text-[#9a3412]">
              แพ็กเกจของคุณหมดอายุแล้ว / Your plan has expired
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">
              เลือกแพลนที่ต้องการเพื่อใช้งานต่อ ระบบจะเปิดสิทธิ์แบบ 30 วันต่อครั้ง ไม่มีการตัดอัตโนมัติ
            </p>
          </section>
        ) : null}

        {checkoutError ? (
          <section className="border-4 border-black bg-[#fee2e2] p-4 shadow-[8px_8px_0_0_#111]">
            <p className="text-lg font-black text-[#b91c1c]">
              เปิดหน้าชำระเงินไม่สำเร็จ / Payment page could not open
            </p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">{checkoutError}</p>
          </section>
        ) : null}

        <section className="border-4 border-black bg-[linear-gradient(135deg,#e8f1ff_0%,#ffffff_48%,#fff8dc_100%)] p-6 shadow-[8px_8px_0_0_#111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#004aad]">
            Learn before you buy
          </p>
          <h2 className="mt-3 text-2xl font-black text-neutral-900">
            Compare plans with the DET guide hub
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-neutral-700">
            If you are still deciding, start with the Duolingo English Test guide pages for score
            targets, mock-test planning, cost, and task-specific prep. They are built to bring search
            visitors into the exact product area they need next.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-black uppercase">
            <Link href="/duolingo-english-test" className="border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#111]">
              DET guide hub
            </Link>
            <Link href="/duolingo-english-test/mock-test" className="border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#111]">
              Mock test guide
            </Link>
            <Link href="/duolingo-english-test/score-guide" className="border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#111]">
              Score guide
            </Link>
            <Link href="/duolingo-english-test/write-about-photo" className="border-[3px] border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#111]">
              Write about photo
            </Link>
          </div>
        </section>

        {!loading && !user ? (
          <section className="border-4 border-black bg-[linear-gradient(135deg,#fff8dc_0%,#ffffff_42%,#eaf4ff_100%)] p-5 shadow-[8px_8px_0_0_#111]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#004aad]">
                  New buyer setup
                </p>
                <h2 className="mt-2 text-2xl font-black text-neutral-900">
                  Create your account first, then choose card or QR payment
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-neutral-700">
                  For first-time buyers, we create your learner account before checkout so your plan,
                  mock-test credits, and instant feedback can be attached correctly right after payment.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[18rem]">
                <Link
                  href="/signup?next=/pricing"
                  className="border-[3px] border-black bg-[#004aad] px-5 py-3 text-center text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
                >
                  Create account / Sign up
                </Link>
                <Link
                  href="/login?next=/pricing"
                  className="border-[3px] border-black bg-white px-5 py-3 text-center text-sm font-black uppercase text-neutral-900 shadow-[4px_4px_0_0_#111]"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
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
                  focusedPlan === plan.tier
                    ? "bg-[#fff7d6]"
                    : plan.recommended
                      ? "bg-[#fffbeb]"
                      : "bg-white"
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
                    <p className="font-mono text-[10px] font-black uppercase text-neutral-500">Instant Feedback</p>
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
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={loading || checkoutBusy}
                        onClick={() => void beginPlanCheckout(plan.tier)}
                        className="block w-full border-[3px] border-black bg-[#004aad] px-4 py-3 text-center text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checkoutBusy
                          ? "Opening checkout..."
                          : user
                            ? "สมัครด้วยบัตร / สิทธิ์ 30 วัน"
                            : "สร้างบัญชีก่อน / Create account first"}
                      </button>
                      <button
                        type="button"
                        disabled={loading || checkoutBusy}
                        onClick={() => void beginPlanPromptPay(plan.tier)}
                        className="block w-full border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-center text-sm font-black uppercase text-neutral-900 shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checkoutBusy
                          ? "Opening checkout..."
                          : user
                            ? "จ่ายด้วย QR PromptPay"
                            : "ไปสมัครเพื่อจ่าย QR / Sign up for QR checkout"}
                      </button>
                      <p className="text-[11px] font-semibold text-neutral-500">
                        {user
                          ? "แต่ละครั้งเป็นการซื้อสิทธิ์ใช้งาน 30 วันแบบ one-time ไม่มีการต่ออายุอัตโนมัติ"
                          : "New buyers will be guided through account creation first, then returned here to finish payment."}
                      </p>
                    </div>
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
                เพิ่ม Mock หรือ Instant Feedback ได้
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

          <div className="mt-5 rounded-[24px] border-3 border-black bg-[linear-gradient(135deg,#eef7ff_0%,#ffffff_48%,#fff6d6_100%)] p-5 shadow-[6px_6px_0_0_#111]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-[#004aad]">
                  Payment options
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-900">
                  Pay by card or QR PromptPay
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-neutral-700">
                  When you open checkout for a mock-test or feedback add-on, Stripe can show both card and QR PromptPay
                  on the same professional payment page, depending on your setup and customer eligibility.
                </p>
              </div>
              <div className="grid gap-2 rounded-[18px] border-2 border-black bg-white px-4 py-3 text-sm font-black shadow-[4px_4px_0_0_#111]">
                <span className="rounded-full border-2 border-black bg-[#004aad] px-3 py-1 text-center text-[10px] uppercase tracking-[0.2em] text-white">
                  Card
                </span>
                <span className="rounded-full border-2 border-black bg-[#ffcc00] px-3 py-1 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-900">
                  QR PromptPay
                </span>
              </div>
            </div>
          </div>

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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-900">
                      Instant top-up
                    </span>
                    <span className="rounded-full border-2 border-black bg-[#e8f3ff] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#004aad]">
                      Card or QR
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutBusy}
                    onClick={() => void beginAddOnCheckout(sku)}
                    className="mt-5 border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkoutBusy ? "Opening checkout..." : "ซื้อสิทธิ์นี้ / Pay by card or QR"}
                  </button>
                  <p className="mt-2 text-[11px] font-semibold leading-5 text-neutral-500">
                    Stripe Checkout opens in a secure payment window with the available methods for this purchase.
                  </p>
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

// Admin-only preview of the new "Show the value" pricing page. Real users keep
// the current page until it's approved. Client-side gate (this is a client page);
// non-admins always get the original PricingPageContent.
function PricingRouter() {
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  if (!loading && (isAdmin || previewEligible)) {
    return <AdminPricingContent />;
  }
  return <PricingPageContent />;
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
      <PricingRouter />
    </Suspense>
  );
}
