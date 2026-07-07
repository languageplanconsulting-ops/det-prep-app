"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

// Pill / badge helper
function Badge({ children, variant = "blue" }: { children: React.ReactNode; variant?: "blue" | "yellow" | "green" | "gray" | "amber" }) {
  const cls: Record<string, string> = {
    blue: "bg-blue-50 text-ep-blue border border-blue-100",
    yellow: "bg-amber-50 text-amber-800 border border-amber-100",
    green: "bg-green-50 text-green-800 border border-green-100",
    gray: "bg-gray-100 text-gray-600 border border-gray-200",
    amber: "bg-amber-100 text-amber-900 border border-amber-200",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${cls[variant]}`}>
      {children}
    </span>
  );
}

// Thin labelled detail row inside a plan card
function PlanFeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-gray-50 px-3.5 py-2.5">
      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm font-semibold leading-snug text-gray-800">{value}</span>
    </div>
  );
}

export function AdminPricingContent() {
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

      // PromptPay settlement is async on Stripe's side — usually a few seconds
      // up to ~2 minutes. Poll for ~90s before falling back to "pending" (the
      // daily cron + admin re-sync still catch it after that, but most real
      // payments confirm well inside this window so the customer isn't left
      // wondering if the purchase went through).
      const MAX_ATTEMPTS = 24;
      const POLL_INTERVAL_MS = 3500;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
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
          if (attempt < MAX_ATTEMPTS - 1) {
            setActivationMessage(
              "กำลังรอ Stripe ยืนยันการชำระเงิน (PromptPay อาจใช้เวลาถึง 1-2 นาที)...",
            );
            await sleep(POLL_INTERVAL_MS);
            continue;
          }
          setHandledSessionId(sessionId);
          setActivationState("pending");
          setActivationMessage(
            "Stripe ยังไม่ยืนยันการชำระเงินภายในหน้านี้ ไม่ต้องกังวล — ระบบจะตรวจสอบและเปิดสิทธิ์ให้อัตโนมัติทันทีที่ Stripe ยืนยัน (ปกติไม่เกินไม่กี่นาที ช้าสุดไม่เกิน 24 ชม.) คุณสามารถปิดหน้านี้ได้",
          );
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
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ── Header ── */}
        <section className="rounded-3xl bg-white px-8 py-8 shadow-md">
          <Badge variant="blue">Pricing / สิทธิ์การใช้งาน</Badge>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                เลือกแพลนที่เหมาะกับการเตรียมสอบ
              </h1>
              <p className="mt-1 text-base font-medium text-gray-500">Choose your prep plan</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
                ทุกแพลนเป็นแบบ <span className="font-semibold text-gray-800">one-time 30 วัน · ไม่ตัดเงินอัตโนมัติ</span>{" "}
                เมื่อสิทธิ์ครบคุณเลือกได้ทั้งอัปเกรดแพลนหรือซื้อ add-on เพื่อฝึกต่อเนื่อง
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3 text-center shadow-sm">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">แพลนปัจจุบัน</p>
              <p className="mt-1 font-mono text-2xl font-bold uppercase text-ep-blue">{effectiveTier}</p>
            </div>
          </div>
        </section>

        {/* ── Recommended next step ── */}
        {recommendation ? (
          <section className="rounded-3xl bg-blue-50 px-7 py-6 shadow-sm">
            <Badge variant="blue">แนะนำสำหรับคุณ</Badge>
            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  อัปเกรดเป็น {recommendation === "vip" ? "VIP" : "Premium"} — คุ้มกว่า add-on ซ้ำหลายครั้ง
                </h2>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-gray-600">
                  ถ้าคุณใช้ Mock Test หรือ Instant Feedback บ่อย การอัปเกรดมักคุ้มกว่าการซื้อ add-on ซ้ำ
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Upgrading is usually better value than repeated one-off top-ups for active learners.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[17rem]">
                <button
                  type="button"
                  disabled={loading || checkoutBusy}
                  onClick={() => void startUpgradeCheckout(recommendation)}
                  className="rounded-xl bg-ep-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                >
                  {checkoutBusy ? "กำลังเปิดหน้าชำระเงิน..." : "จ่ายด้วยบัตร · สิทธิ์ 30 วัน"}
                </button>
                <button
                  type="button"
                  disabled={loading || checkoutBusy}
                  onClick={() => void startUpgradePromptPay(recommendation)}
                  className="rounded-xl border border-amber-200 bg-ep-yellow px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                >
                  {checkoutBusy ? "กำลังเปิดหน้าชำระเงิน..." : "จ่ายด้วย QR PromptPay"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Checkout success / payment confirmation ── */}
        {checkoutStatus === "success" ? (
          <section
            className={`rounded-3xl px-7 py-6 shadow-md ${
              activationState === "error"
                ? "bg-red-50"
                : activationState === "pending"
                  ? "bg-amber-50"
                  : activationState === "confirming"
                    ? "bg-blue-50"
                    : "bg-green-50"
            }`}
          >
            {/* State-aware header */}
            {activationState === "confirming" && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ep-blue border-t-transparent" />
                <p className="font-semibold text-ep-blue">กำลังยืนยัน… ไม่ต้องปิดหน้านี้</p>
              </div>
            )}
            {activationState === "pending" && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <p className="font-semibold text-amber-700">กำลังยืนยัน… ไม่ต้องปิดหน้านี้</p>
              </div>
            )}
            {activationState === "activated" && (
              <div className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <p className="font-bold text-green-800">ชำระเงินสำเร็จแล้ว · Payment successful</p>
              </div>
            )}
            {activationState === "error" && (
              <p className="font-bold text-red-700">พบปัญหาระหว่างยืนยันสิทธิ์</p>
            )}
            {activationState === "idle" && (
              <p className="font-bold text-green-800">ชำระเงินสำเร็จแล้ว · Payment successful</p>
            )}

            {/* Message */}
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
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

            {/* What was unlocked */}
            {focus !== "addons" && (activationState === "activated" || activationState === "idle" || activationState === "pending") ? (
              <div className="mt-5 rounded-2xl bg-white px-5 py-5 shadow-sm">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-green-700">สิทธิ์ที่เปิดให้แล้ว</p>
                <h3 className="mt-2 text-xl font-bold text-gray-900">
                  {activePlanSummary.labelTh}
                  <span className="ml-2 text-sm font-normal text-gray-400">/ {activePlanSummary.labelEn}</span>
                </h3>
                <p className="mt-0.5 text-sm font-medium text-gray-500">{activePlanSummary.durationTh}</p>
                <div className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-400">ฟีดแบ็ก</p>
                    <p className="mt-0.5 font-semibold">{activePlanSummary.aiTh}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-400">Mock Test</p>
                    <p className="mt-0.5 font-semibold">{activePlanSummary.mockTh}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-gray-400">Practice</p>
                    <p className="mt-0.5 font-semibold">{activePlanSummary.practiceTh}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* CTA links */}
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={
                  focus === "addons" && focusedAddOn?.kind === "mock"
                    ? "/mock-test/start"
                    : "/practice"
                }
                className="rounded-xl bg-ep-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                {focus === "addons" && focusedAddOn?.kind === "mock"
                  ? "เริ่มทำ Mock Test"
                  : "เริ่มใช้ Practice"}
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
              >
                ดูสิทธิ์ในโปรไฟล์
              </Link>
              <Link
                href="/mock-test/start"
                className="rounded-xl border border-amber-200 bg-ep-yellow px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-opacity hover:opacity-90"
              >
                ไปหน้า Mock Test
              </Link>
            </div>
            {focusedPlan ? (
              <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Active checkout: {focusedPlan}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── Checkout cancelled ── */}
        {checkoutStatus === "cancel" ? (
          <section className="rounded-3xl bg-orange-50 px-7 py-5 shadow-sm">
            <p className="font-bold text-orange-700">ยังไม่ได้ชำระเงิน · Checkout canceled</p>
            <p className="mt-1 text-sm text-gray-600">คุณสามารถกลับมาเลือกแพลนหรือ add-on ได้ทุกเมื่อ</p>
          </section>
        ) : null}

        {/* ── Expired notice ── */}
        {expired ? (
          <section className="rounded-3xl bg-amber-50 px-7 py-5 shadow-sm">
            <p className="font-bold text-amber-800">แพ็กเกจของคุณหมดอายุแล้ว · Your plan has expired</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">
              เลือกแพลนที่ต้องการเพื่อใช้งานต่อ ระบบจะเปิดสิทธิ์แบบ 30 วันต่อครั้ง ไม่มีการตัดอัตโนมัติ
            </p>
          </section>
        ) : null}

        {/* ── Checkout error ── */}
        {checkoutError ? (
          <section className="rounded-3xl bg-red-50 px-7 py-5 shadow-sm">
            <p className="font-bold text-red-700">เปิดหน้าชำระเงินไม่สำเร็จ · Payment page could not open</p>
            <p className="mt-1 text-sm text-gray-700">{checkoutError}</p>
          </section>
        ) : null}

        {/* ── Sign-up prompt for unauthenticated users ── */}
        {!loading && !user ? (
          <section className="rounded-3xl bg-white px-7 py-7 shadow-md">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant="blue">สำหรับผู้ใช้ใหม่</Badge>
                <h2 className="mt-3 text-xl font-bold text-gray-900">สร้างบัญชีก่อน แล้วเลือกชำระด้วยบัตรหรือ QR</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-600">
                  สำหรับผู้ซื้อครั้งแรก เราสร้างบัญชีให้ก่อน checkout เพื่อให้แพลน, Mock Test credits
                  และ Instant Feedback ถูกผูกกับบัญชีของคุณได้ถูกต้องทันทีหลังชำระเงิน
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[17rem]">
                <Link
                  href="/signup?next=/pricing"
                  className="rounded-xl bg-ep-blue px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  สร้างบัญชี · Sign up
                </Link>
                <Link
                  href="/login?next=/pricing"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                >
                  มีบัญชีแล้ว? เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Plan cards ── */}
        <section className="grid gap-5 lg:grid-cols-4">
          {PLAN_CARDS.map((plan) => {
            const active = effectiveTier === plan.tier;
            const paid = plan.tier !== "free";
            const isRecommended = plan.recommended;
            const isFocused = focusedPlan === plan.tier;

            return (
              <article
                key={plan.tier}
                className={`relative flex h-full flex-col rounded-2xl px-5 py-6 shadow-sm transition-shadow ${
                  isFocused
                    ? "bg-amber-50 ring-2 ring-ep-yellow shadow-md"
                    : isRecommended
                      ? "bg-white ring-2 ring-ep-blue shadow-md"
                      : "bg-white"
                }`}
              >
                {/* Top labels */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant={active ? "green" : isRecommended ? "blue" : "gray"}>
                      {active ? "แพลนปัจจุบัน" : isRecommended ? "แนะนำ" : plan.tier}
                    </Badge>
                    <h2 className="mt-2 font-mono text-2xl font-bold uppercase tracking-tight text-gray-900">
                      {plan.tier}
                    </h2>
                  </div>
                </div>

                {/* Price */}
                <p className="mt-3 font-mono text-3xl font-bold text-ep-blue">{plan.price}</p>

                {/* Headlines */}
                <p className="mt-2 text-sm font-semibold leading-snug text-gray-800">{plan.headlineTh}</p>
                <p className="mt-0.5 text-xs text-gray-400">{plan.headlineEn}</p>

                {/* Feature rows */}
                <div className="mt-4 flex flex-col gap-2">
                  <PlanFeatureRow label="Instant Feedback" value={plan.ai} />
                  <PlanFeatureRow label="Mock Tests" value={plan.mocks} />
                  <PlanFeatureRow label="Practice Access" value={plan.examAccess} />
                </div>

                {/* CTA */}
                <div className="mt-auto pt-5">
                  {active ? (
                    <Link
                      href="/profile"
                      className="block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                    >
                      ดูสิทธิ์ปัจจุบัน · View my plan
                    </Link>
                  ) : paid ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={loading || checkoutBusy}
                        onClick={() => void beginPlanCheckout(plan.tier)}
                        className="block w-full rounded-xl bg-ep-blue px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                      >
                        {checkoutBusy
                          ? "กำลังเปิดหน้าชำระเงิน..."
                          : user
                            ? "สมัครด้วยบัตร · สิทธิ์ 30 วัน"
                            : "สร้างบัญชีก่อน · Create account first"}
                      </button>
                      <button
                        type="button"
                        disabled={loading || checkoutBusy}
                        onClick={() => void beginPlanPromptPay(plan.tier)}
                        className="block w-full rounded-xl border border-amber-200 bg-ep-yellow px-4 py-2.5 text-center text-sm font-semibold text-gray-900 shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                      >
                        {checkoutBusy
                          ? "กำลังเปิดหน้าชำระเงิน..."
                          : user
                            ? "จ่ายด้วย QR PromptPay"
                            : "สมัครแล้วจ่ายด้วย QR · Sign up to pay by QR"}
                      </button>
                      <p className="text-[11px] leading-relaxed text-gray-400">
                        {user
                          ? "one-time 30 วัน · ไม่ตัดเงินอัตโนมัติ"
                          : "New buyers will be guided through account creation first, then returned here to finish payment."}
                      </p>
                    </div>
                  ) : (
                    <Link
                      href="/practice"
                      className="block rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                    >
                      เริ่มใช้ฟรี · Start free
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* ── DET guide hub cross-link ── */}
        <section className="rounded-3xl bg-white px-7 py-7 shadow-md">
          <Badge variant="blue">Learn before you buy</Badge>
          <h2 className="mt-3 text-xl font-bold text-gray-900">Compare plans with the DET guide hub</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
            If you are still deciding, start with the Duolingo English Test guide pages for score
            targets, mock-test planning, cost, and task-specific prep.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { href: "/duolingo-english-test", label: "DET guide hub" },
              { href: "/duolingo-english-test/mock-test", label: "Mock test guide" },
              { href: "/duolingo-english-test/score-guide", label: "Score guide" },
              { href: "/duolingo-english-test/write-about-photo", label: "Write about photo" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Add-on store ── */}
        <section
          id="addons-section"
          className={`rounded-3xl bg-white px-7 py-7 shadow-md transition-shadow ${
            focus === "addons" ? "ring-2 ring-ep-blue" : ""
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="yellow">Add-on Store · ซื้อสิทธิ์เพิ่ม</Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                เพิ่ม Mock หรือ Instant Feedback ได้
              </h2>
              <p className="mt-0.5 text-sm font-medium text-gray-400">Top up when you hit a quota</p>
            </div>
            <Badge variant="amber">ไม่ rollover · หมดอายุพร้อมรอบบิล</Badge>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600">
            เหมาะสำหรับคนที่ต้องการสิทธิ์เพิ่มเฉพาะช่วงนี้ แต่หากซื้อซ้ำบ่อย{" "}
            <span className="font-semibold text-gray-800">การอัปเกรดแพลนจะคุ้มกว่า</span>
          </p>

          {/* Payment methods callout */}
          <div className="mt-5 rounded-2xl bg-blue-50 px-5 py-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ep-blue">Payment options</p>
            <h3 className="mt-1.5 text-base font-bold text-gray-900">Pay by card or QR PromptPay</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-600">
              Stripe แสดงทั้งบัตรและ QR PromptPay บนหน้าชำระเงินเดียวกัน ขึ้นกับการตั้งค่าและสิทธิ์ของบัญชี
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="blue">Card</Badge>
              <Badge variant="yellow">QR PromptPay</Badge>
            </div>
          </div>

          {/* Add-on cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {ADD_ON_ORDER.map((sku) => {
              const addOn = ADD_ON_CATALOG[sku];
              const highlighted = focusedSku === sku;
              return (
                <article
                  key={sku}
                  className={`flex h-full flex-col rounded-2xl px-4 py-5 shadow-sm ${
                    highlighted ? "bg-amber-50 ring-2 ring-ep-yellow" : "bg-gray-50"
                  }`}
                >
                  <Badge variant={addOn.kind === "mock" ? "blue" : "yellow"}>{addOn.kind}</Badge>
                  <h3 className="mt-2.5 text-base font-bold leading-snug text-gray-900">{addOn.labelTh}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">{addOn.labelEn}</p>
                  <p className="mt-3 font-mono text-2xl font-bold text-ep-blue">฿{addOn.priceThb}</p>
                  <p className="mt-1.5 text-sm font-semibold text-gray-700">{addOn.shortTh}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{addOn.shortEn}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="gray">Instant top-up</Badge>
                    <Badge variant="blue">Card or QR</Badge>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutBusy}
                    onClick={() => void beginAddOnCheckout(sku)}
                    className="mt-auto pt-4 w-full rounded-xl border border-amber-200 bg-ep-yellow px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
                  >
                    {checkoutBusy ? "กำลังเปิดหน้าชำระเงิน..." : "ซื้อสิทธิ์นี้ · Pay by card or QR"}
                  </button>
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                    Stripe Checkout opens in a secure payment window with the available methods for this purchase.
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Business logic footer ── */}
        <section className="rounded-3xl bg-gray-900 px-7 py-7 text-white shadow-md">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ep-yellow">
            Business Logic · กติกาการขาย
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm font-bold">1. Upgrade first</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                เวลา quota หมด ระบบจะเสนอการอัปเกรดก่อน แล้วค่อยเสนอ add-on เป็นทางเลือกที่สอง
              </p>
            </div>
            <div>
              <p className="text-sm font-bold">2. Add-on for short-term needs</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                เหมาะกับการเร่งฝึกเฉพาะรอบนี้ เช่นก่อนสอบจริงหรือก่อนยื่นทุน
              </p>
            </div>
            <div>
              <p className="text-sm font-bold">3. No rollover</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                สิทธิ์ที่ซื้อเพิ่มจะหมดอายุพร้อมรอบบิล เพื่อให้แพลนหลักยังคุ้มค่ากว่าในระยะยาว
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
