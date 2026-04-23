"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useBillingActions } from "@/hooks/useBillingActions";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.183l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function LandingPageClient({
  initialFastTrackOpen = false,
}: {
  /** Set from `/?fastTrack=1` so shortcuts can open the enrollment modal. */
  initialFastTrackOpen?: boolean;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [fastTrackOpen, setFastTrackOpen] = useState(initialFastTrackOpen);
  const [ftEmail, setFtEmail] = useState("");
  const [ftName, setFtName] = useState("");
  const [ftLoading, setFtLoading] = useState(false);
  const [ftMsg, setFtMsg] = useState<string | null>(null);
  const [ftLinkedEmail, setFtLinkedEmail] = useState<string | null>(null);
  const [ftErr, setFtErr] = useState<string | null>(null);
  const [stickyOn, setStickyOn] = useState(false);
  const { user, loading: billingLoading, startUpgradePromptPay } = useBillingActions();
  const {
    isAdmin,
    previewEligible,
    realTier,
    vipGrantedByCourse,
    hasStripeSubscription,
    loading: tierLoading,
  } = useEffectiveTier();
  const canAccessPracticeHub =
    !tierLoading &&
    (isAdmin ||
      previewEligible === true ||
      realTier !== "free" ||
      vipGrantedByCourse ||
      hasStripeSubscription);
  const practiceHref = canAccessPracticeHub ? "/practice" : "#pricing";

  useEffect(() => {
    if (initialFastTrackOpen) {
      setFastTrackOpen(true);
    }
  }, [initialFastTrackOpen]);

  useEffect(() => {
    const onScroll = () => {
      if (typeof window === "undefined" || window.innerWidth > 640) {
        setStickyOn(false);
        return;
      }
      const pricing = document.getElementById("pricing");
      const footer = document.querySelector("footer");
      if (!pricing || !footer) return;
      const pricingTop = pricing.offsetTop;
      const footerTop = footer.offsetTop;
      const scrollPos = window.scrollY + window.innerHeight;
      setStickyOn(
        window.scrollY > 800 &&
          scrollPos < pricingTop &&
          scrollPos < footerTop,
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const submitFastTrack = useCallback(async () => {
    setFtLoading(true);
    setFtErr(null);
    setFtMsg(null);
    setFtLinkedEmail(null);
    try {
      const res = await fetch("/api/enrollment/fast-track-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ftEmail.trim(),
          fullName: ftName.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        alreadyPending?: boolean;
      };
      if (!res.ok) {
        setFtErr(data.error ?? "Something went wrong.");
        return;
      }
      if (ftEmail.trim().includes("@")) {
        setFtLinkedEmail(ftEmail.trim().toLowerCase());
      }
      setFtMsg(
        data.message ??
          "Request received. After we verify your course enrollment, you will get an email from English Plan with VIP access and your password.",
      );
    } catch {
      setFtErr("Network error. Try again.");
    } finally {
      setFtLoading(false);
    }
  }, [ftEmail, ftName]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900">
      <nav className="sticky top-0 z-[1000] border-b-4 border-black bg-white">
        <div className="mx-auto flex min-w-0 max-w-[1400px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-3 no-underline text-neutral-900"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-4 border-black bg-ep-blue ep-stat text-xl font-bold text-white shadow-[4px_4px_0_0_#000]">
              EP
            </div>
            <div className="min-w-0 flex flex-col leading-tight">
              <span className="ep-stat text-lg font-bold">ENGLISH PLAN</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest">
                DET Prep · EN/ไทย
              </span>
            </div>
          </Link>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-stretch gap-2 sm:w-auto sm:justify-end sm:gap-4">
            <a
              href="#preview"
              className="ep-stat inline-flex min-h-[44px] flex-1 items-center justify-center border-2 border-black bg-white px-3 py-2 text-center text-xs font-bold text-neutral-900 shadow-[2px_2px_0_0_#000] hover:bg-neutral-50 sm:flex-initial sm:text-sm"
            >
              <span className="leading-tight">
                Preview
                <span className="hidden sm:inline"> / ดูตัวอย่าง</span>
              </span>
            </a>
            <button
              type="button"
              onClick={() => setFastTrackOpen(true)}
              className="ep-stat min-h-[44px] flex-1 border-2 border-black bg-ep-yellow px-3 py-2 text-left text-black shadow-[2px_2px_0_0_#000] hover:bg-[#ffe033] sm:flex-initial sm:px-4 sm:text-sm"
            >
              <span className="block text-[11px] font-bold uppercase leading-tight text-black/80">
                Duolingo Fast Track
              </span>
              <span className="mt-0.5 block text-xs font-black uppercase leading-tight">
                Course VIP (6 mo)
              </span>
            </button>
            <Link
              href="/login"
              className="flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-2 border-4 border-black bg-white px-4 py-3 text-sm font-bold text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] sm:flex-initial sm:px-6"
            >
              <GoogleIcon />
              <span className="whitespace-nowrap">Sign in</span>
            </Link>
          </div>
        </div>
      </nav>

      <section className={cn("px-4 py-16 sm:px-6 sm:py-24", LANDING_PAGE_GRID_BG)}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Master the
              <br />
              <span className="relative text-ep-blue">
                Duolingo
                <span
                  className="absolute bottom-2 left-0 -z-10 h-4 w-full bg-ep-yellow/30 sm:bottom-3 sm:h-5"
                  aria-hidden
                />
              </span>
              <br />
              English Test
            </h1>
            <p className="mt-8 text-lg text-neutral-800 sm:text-2xl sm:leading-relaxed">
              Complete DET preparation across all four skills—not only mock tests. AI feedback on
              Production, Comprehension, Literacy, and Conversation with levels that match your goal.
              <br />
              <br />
              <span className="text-base font-semibold text-neutral-700 sm:text-lg">
                เตรียมสอบ DET แบบครบวงจร เน้นทั้ง 4 ทักษะ พร้อมฟีดแบ็กจาก AI และระดับที่ปรับให้เหมาะกับคุณ
              </span>
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link
                href="/mini-diagnosis/start"
                className="inline-block border-4 border-black bg-ep-yellow px-8 py-5 text-center text-lg font-black uppercase tracking-wide text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
              >
                Mini diagnosis / เช็กระดับฟรี
              </Link>
              <a
                href="#pricing"
                className="inline-block border-4 border-black bg-ep-blue px-8 py-5 text-center text-lg font-black uppercase tracking-wide text-white shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
              >
                Get started / เริ่มเลย
              </a>
              <a
                href="#features"
                className="inline-block border-4 border-black bg-white px-8 py-5 text-center text-lg font-bold text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:bg-neutral-100 hover:shadow-[4px_4px_0_0_#000]"
              >
                See features / ดูฟีเจอร์
              </a>
              <a
                href="#preview"
                className="inline-block border-4 border-black bg-white px-8 py-5 text-center text-lg font-bold text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:bg-neutral-100 hover:shadow-[4px_4px_0_0_#000]"
              >
                Preview / ดูตัวอย่าง
              </a>
              <Link
                href="/login"
                className="inline-block border-4 border-black bg-ep-yellow px-8 py-5 text-center text-lg font-black uppercase tracking-wide text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
              >
                Sign in (VIP &amp; members) / เข้าสู่ระบบ
              </Link>
              <button
                type="button"
                onClick={() => setFastTrackOpen(true)}
                className="inline-block border-4 border-black bg-white px-8 py-5 text-center text-lg font-black uppercase tracking-wide text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:bg-neutral-50 hover:shadow-[4px_4px_0_0_#000]"
              >
                Duolingo Fast Track VIP / เปิดสิทธิ์คอร์ส
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-4 ep-stat sm:flex-row sm:gap-6">
              <div className="border-[3px] border-black bg-white px-6 py-4">
                <span className="block text-3xl font-bold text-ep-yellow">600+</span>
                <span className="text-xs uppercase tracking-wide text-neutral-700">
                  Questions / ข้อสอบ
                </span>
              </div>
              <div className="border-[3px] border-black bg-white px-6 py-4">
                <span className="block text-3xl font-bold text-ep-yellow">4</span>
                <span className="text-xs uppercase tracking-wide text-neutral-700">
                  Skills / ทักษะ
                </span>
              </div>
              <div className="border-[3px] border-black bg-white px-6 py-4">
                <span className="block text-3xl font-bold text-ep-yellow">FREE</span>
                <span className="text-xs uppercase tracking-wide text-neutral-700">
                  Trial / ทดลอง
                </span>
              </div>
            </div>
          </div>
          <div className="relative mx-auto h-[420px] w-full max-w-lg sm:h-[520px] lg:max-w-none">
            <div className="absolute left-0 top-0 w-[85%] border-4 border-black bg-ep-blue p-6 text-white shadow-[12px_12px_0_0_#000] sm:p-8">
              <p className="ep-stat mb-3 text-xs font-bold uppercase tracking-widest opacity-80">
                Production / การผลิตภาษา
              </p>
              <p className="text-xl font-black leading-tight sm:text-2xl">
                Grammar, vocabulary, flow & task response
              </p>
            </div>
            <div className="absolute bottom-16 right-0 w-[80%] border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
              <p className="ep-stat mb-3 text-xs font-bold uppercase tracking-widest text-neutral-600">
                Comprehension / การเข้าใจ
              </p>
              <p className="text-xl font-black leading-tight sm:text-2xl">
                Reading skills & vocabulary building
              </p>
            </div>
            <div className="absolute left-6 top-40 w-[55%] border-4 border-black bg-ep-yellow p-5 text-neutral-900 shadow-[12px_12px_0_0_#000] sm:left-10 sm:top-48">
              <p className="ep-stat mb-2 text-xs font-bold uppercase tracking-widest">
                Literacy / การอ่านเขียน
              </p>
              <p className="text-lg font-black leading-tight">Vocabulary & dictation</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y-4 border-black bg-ep-yellow py-6 text-center">
        <div className="mx-auto flex max-w-[1400px] flex-wrap justify-center gap-8 px-4 sm:gap-16">
          {[
            ["400+", "Students tested / นักเรียน"],
            ["600+", "Updated items / ข้อสอบ"],
            ["4 Skills", "Full training / ครบทุกทักษะ"],
            ["AI", "Personalized feedback / ฟีดแบ็ก"],
          ].map(([n, l]) => (
            <div key={l} className="ep-stat">
              <span className="block text-3xl font-black text-neutral-900">{n}</span>
              <span className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                {l}
              </span>
            </div>
          ))}
        </div>
      </div>

      <section className={cn("px-4 py-16 sm:px-6 sm:py-20", LANDING_PAGE_GRID_BG)}>
        <div className="mx-auto max-w-[1400px] border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-blue">
                Mini diagnosis / มินิไดแอกโนซิส
              </p>
              <h2 className="text-3xl font-black sm:text-5xl">
                Check your level first / เช็กระดับก่อนตัดสินใจ
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-neutral-700 sm:text-lg">
                Free users can take one fast diagnostic block to see their current level, weakest skill,
                and 2 real AI feedback tasks before committing to a full plan.
                <br />
                <br />
                <span className="font-semibold text-neutral-900">
                  ผู้ใช้ฟรีสามารถลองทำมินิไดแอกโนซิส 1 ครั้ง เพื่อดูคะแนนโดยรวม จุดอ่อนหลัก และรับ AI feedback จริง 2 งาน
                  ก่อนตัดสินใจอัปเกรด
                </span>
              </p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/mini-diagnosis/start"
                  className="inline-block border-4 border-black bg-ep-blue px-8 py-4 text-center text-base font-black uppercase tracking-wide text-white shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000]"
                >
                  Start mini diagnosis
                </Link>
                <a
                  href="#pricing"
                  className="inline-block border-4 border-black bg-white px-8 py-4 text-center text-base font-black uppercase tracking-wide text-neutral-900 shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:bg-neutral-100 hover:shadow-[4px_4px_0_0_#000]"
                >
                  Compare plans / ดูแพลน
                </a>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "2 dictation",
                "1 real English word",
                "1 vocabulary reading",
                "2 fill in the blank",
                "1 listening mini test",
                "1 write about photo",
                "1 read then speak",
              ].map((item) => (
                <div key={item} className="border-4 border-black bg-[#fff9e6] px-4 py-4 text-sm font-black text-neutral-900">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={cn("px-4 py-20 sm:px-6 sm:py-28", LANDING_PAGE_GRID_BG)}>
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-16 text-center">
            <p className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-blue">
              Simple process / กระบวนการง่ายๆ
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">
              How it works / วิธีใช้งาน
            </h2>
          </header>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                t: "Sign up free / ลงทะเบียนฟรี",
                d: "Google sign-in in seconds. No card required. / เข้าด้วย Google ไม่ต้องใช้บัตร",
              },
              {
                n: "02",
                t: "Set your goal / ตั้งเป้าหมาย",
                d: "Pick target score and difficulty. Practice stays on-level. / เลือกคะแนนและระดับที่เหมาะกับคุณ",
              },
              {
                n: "03",
                t: "Train 4 skills / ฝึก 4 ทักษะ",
                d: "Production, Comprehension, Literacy, Conversation with AI help. / ฝึกครบพร้อม AI",
              },
              {
                n: "04",
                t: "Track progress / ติดตามผล",
                d: "See growth across skills before test day. / เห็นความก้าวหน้าก่อนสอบจริง",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="relative border-4 border-black bg-[#fafafa] px-6 pb-8 pt-14"
              >
                <div className="ep-stat absolute -top-5 left-6 flex h-16 w-16 items-center justify-center border-4 border-black bg-ep-blue text-2xl font-black text-white">
                  {s.n}
                </div>
                <h3 className="text-lg font-black">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="scroll-mt-28 bg-white px-4 py-20 sm:scroll-mt-32 sm:px-6 sm:py-28"
        id="preview"
      >
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-12 text-center">
            <p className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-blue">
              See it in action / ดูการทำงาน
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">
              AI feedback on every skill / ฟีดแบ็กครบทั้ง 4 ทักษะ
            </h2>
          </header>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="border-4 border-black bg-white p-6 shadow-[16px_16px_0_0_#000]">
              <div className="mb-4 flex gap-2 border-b-[3px] border-neutral-200 pb-4">
                <span className="h-3 w-3 rounded-full border-2 border-black bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full border-2 border-black bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full border-2 border-black bg-[#27c93f]" />
              </div>
              <div className="ep-stat text-sm leading-relaxed">
                <p className="mb-4 font-bold text-ep-blue">Your Production feedback:</p>
                <p>
                  <span className="my-1 inline-block border-2 border-black bg-ep-yellow px-1.5 py-0.5">
                    Grammar: 92/100
                  </span>
                  <br />
                  <span className="my-1 inline-block border-2 border-black bg-ep-yellow px-1.5 py-0.5">
                    Flow: 94/100
                  </span>
                  <br />
                  <span className="mt-4 block font-bold text-ep-blue">Estimated band: 125–135</span>
                </p>
              </div>
            </div>
            <ul className="space-y-6">
              {[
                ["📝", "Production analysis / วิเคราะห์การผลิตภาษา", "Grammar, vocabulary, flow, task response."],
                ["🎯", "Personalized difficulty / ระดับที่ปรับได้", "Stay challenged without burning out."],
                ["💬", "Conversation practice / ฝึกสนทนา", "Listen, respond, and summarize with support."],
              ].map(([icon, title, desc]) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-ep-blue text-2xl">
                    {icon}
                  </span>
                  <div>
                    <h4 className="text-lg font-black">{title}</h4>
                    <p className="mt-1 text-sm text-neutral-700">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-y-8 border-ep-yellow bg-neutral-900 px-4 py-20 text-white sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-16 text-center">
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-ep-yellow">
              Core skills / ทักษะหลัก
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">
              Four skills—not only mocks / ฝึกครบ 4 ทักษะ
            </h2>
          </header>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              ["📝", "PRODUCTION", "AI feedback on accuracy, range, coherence, and task fit."],
              ["📚", "COMPREHENSION", "DET-style reading and vocabulary in context."],
              ["✍️", "LITERACY", "Dictation, spelling, and advanced word work."],
              ["💬", "CONVERSATION", "Interactive listening and summary-style tasks."],
            ].map(([icon, title, blurb], i) => (
              <div
                key={title}
                className="relative border-4 border-white bg-white p-10 text-neutral-900"
              >
                <div
                  className={cn(
                    "absolute left-0 right-0 top-0 h-2",
                    i % 2 === 0 ? "bg-ep-blue" : "bg-ep-yellow",
                  )}
                />
                <div className="mb-6 flex h-16 w-16 items-center justify-center border-4 border-black bg-neutral-900 ep-stat text-3xl text-white">
                  {icon}
                </div>
                <h3 className="text-2xl font-black">{title}</h3>
                <p className="mt-4 text-neutral-700">{blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn("px-4 py-20 sm:px-6 sm:py-28", LANDING_PAGE_GRID_BG)}
        id="pricing"
      >
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-16 text-center">
            <p className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-blue">
              Pricing / ราคา
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">Choose your plan / เลือกแพ็กเกจ</h2>
          </header>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                tier: "free" as const,
                name: "FREE / ฟรี",
                price: "฿0",
                summaryRows: [
                  "1 mini diagnosis",
                  "1 starter test for each exam lane",
                  "1 personalized feedback credit",
                  "0 mock tests",
                ],
                details: [],
                cta: "Start free / เริ่มฟรี",
                href: "/login",
                featured: false,
                current: false,
              },
              {
                tier: "basic" as const,
                name: "BASIC / เบสิก",
                price: "฿399",
                summaryRows: [
                  "12 AI feedbacks / month",
                  "Read/Vocab 15 · Literacy 20 · Convo 10",
                  "2 mock tests / month",
                ],
                details: [
                  {
                    title: "AI feedback 12 ครั้ง / เดือน คืออะไร?",
                    body:
                      "รับฟีดแบ็กแบบ personalized สำหรับทุกข้อสอบสาย writing/speaking เช่น write about photo, read about photo, read then speak, interactive speaking และ conversation summary รวม 12 ครั้งต่อเดือน เลือกใช้กับข้อไหนก็ได้ตามต้องการ",
                  },
                  {
                    title: "Mock test 2 ครั้ง / เดือน คืออะไร?",
                    body:
                      "เป็น full-length test ประมาณ 1 ชั่วโมง เพื่อดูคะแนนแบบ over-estimated score, จุดอ่อนของคุณ และช่วยวางแผนว่าจะเอาเวลาไปฝึกส่วนไหนต่อให้คุ้มขึ้นโดยไม่เสียเวลา",
                  },
                  {
                    title: "Read / Vocab 15 หมายถึงอะไร?",
                    body:
                      "ฝึกข้อสอบเต็มชุดของสายอ่านและคำศัพท์ได้รวม 15 ชุดต่อเดือน",
                  },
                  {
                    title: "Literacy 20 หมายถึงอะไร?",
                    body:
                      "รวม listen and type, choose the real word และ fill in the blank ได้ 20 ชุดเต็มต่อเดือน",
                  },
                  {
                    title: "Interactive conversation 10 หมายถึงอะไร?",
                    body:
                      "ฝึก listening conversation แบบเต็มชุดได้ 10 ครั้งต่อเดือน",
                  },
                ],
                cta: "Choose / เลือก",
                href: "/login",
                featured: false,
                current: false,
              },
              {
                tier: "premium" as const,
                name: "PREMIUM / พรีเมียม",
                price: "฿699",
                summaryRows: [
                  "30 AI feedbacks / month",
                  "Read/Vocab 30 · Literacy 50 · Convo 20",
                  "4 mock tests / month",
                ],
                details: [
                  {
                    title: "AI feedback 30 ครั้ง / เดือน คืออะไร?",
                    body:
                      "รับฟีดแบ็กแบบ personalized สำหรับทุกข้อสอบสาย writing/speaking เช่น write about photo, read about photo, read then speak, interactive speaking และ conversation summary รวม 30 ครั้งต่อเดือน เลือกใช้กับข้อไหนก็ได้ตามแผนของคุณ",
                  },
                  {
                    title: "Mock test 4 ครั้ง / เดือน คืออะไร?",
                    body:
                      "เป็น full-length test ประมาณ 1 ชั่วโมง เพื่อดูคะแนนแบบ over-estimated score, จุดอ่อน และช่วยให้รู้ว่าควรใช้เวลาฝึกตรงไหนต่อแบบฉลาดขึ้น",
                  },
                  {
                    title: "Read / Vocab 30 หมายถึงอะไร?",
                    body:
                      "ฝึกข้อสอบเต็มชุดของสายอ่านและคำศัพท์ได้รวม 30 ชุดต่อเดือน",
                  },
                  {
                    title: "Literacy 50 หมายถึงอะไร?",
                    body:
                      "รวม listen and type, choose the real word และ fill in the blank ได้ 50 ชุดเต็มต่อเดือน",
                  },
                  {
                    title: "Interactive conversation 20 หมายถึงอะไร?",
                    body:
                      "ฝึก listening conversation แบบเต็มชุดได้ 20 ครั้งต่อเดือน",
                  },
                ],
                cta: "Choose / เลือก",
                href: "/login",
                featured: true,
                current: false,
              },
              {
                tier: "vip" as const,
                name: "VIP / วีไอพี",
                price: "฿999",
                summaryRows: [
                  "60 AI feedbacks / month",
                  "Unlimited practice lanes",
                  "6 mock tests / month",
                ],
                details: [
                  {
                    title: "AI feedback 60 ครั้ง / เดือน คืออะไร?",
                    body:
                      "รับฟีดแบ็กแบบ personalized สำหรับทุกข้อสอบสาย writing/speaking เช่น write about photo, read about photo, read then speak, interactive speaking และ conversation summary รวม 60 ครั้งต่อเดือน เลือกใช้ได้ตามต้องการ",
                  },
                  {
                    title: "Unlimited practice lanes คืออะไร?",
                    body:
                      "เข้าถึงข้อสอบฝึกทุกชุดในทุกหมวด และมีอัปเดตข้อใหม่เพิ่มทุกเดือน เหมาะกับคนที่อยากฝึกต่อเนื่องแบบไม่ติดเพดาน",
                  },
                  {
                    title: "Mock test 6 ครั้ง / เดือน คืออะไร?",
                    body:
                      "เป็น full-length test ประมาณ 1 ชั่วโมง เพื่อดูคะแนนแบบ over-estimated score, จุดอ่อน และวางแผนใช้เวลาฝึกต่อให้แม่นขึ้น",
                  },
                ],
                cta: "Choose / เลือก",
                href: "/login",
                featured: false,
                current: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={cn(
                  "relative border-4 border-black p-8 transition hover:-translate-y-2 hover:shadow-[12px_12px_0_0_#000]",
                  p.featured ? "scale-100 bg-ep-blue text-white lg:scale-105" : "bg-white",
                )}
              >
                {p.featured ? (
                  <div className="ep-stat absolute -top-4 left-1/2 -translate-x-1/2 border-[3px] border-black bg-ep-yellow px-4 py-1 text-xs font-bold uppercase text-neutral-900">
                    Popular / ยอดนิยม
                  </div>
                ) : null}
                <h3 className="text-2xl font-black uppercase">{p.name}</h3>
                <p
                  className={cn(
                    "ep-stat mt-4 text-4xl font-bold",
                    p.featured ? "text-white" : "text-neutral-900",
                  )}
                >
                  {p.price}
                  <span className="text-lg font-normal">/mo / เดือน</span>
                </p>
                <ul className="mt-8 space-y-3 ep-stat text-sm">
                  {p.summaryRows.map((f) => (
                    <li
                      key={f}
                      className={cn(
                        "border-b-2 border-neutral-200 py-2",
                        p.featured && "border-white/20",
                      )}
                    >
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                {p.details.length ? (
                  <div className="mt-5 space-y-3">
                    {p.details.map((item) => (
                      <details
                        key={item.title}
                        className={cn(
                          "group border-2 border-black bg-white/80",
                          p.featured && "bg-white text-neutral-900",
                        )}
                      >
                        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black leading-6">
                          <span>{item.title}</span>
                          <span className="ml-2 inline-block text-[#004aad] transition group-open:rotate-45">
                            +
                          </span>
                        </summary>
                        <div className="border-t-2 border-black px-4 py-3 text-sm font-semibold leading-6 text-neutral-700">
                          {item.body}
                        </div>
                      </details>
                    ))}
                  </div>
                ) : null}
                {p.tier === "free" ? (
                  <Link
                    href={p.href}
                    className={cn(
                      "mt-8 block w-full border-4 border-black py-4 text-center text-sm font-black uppercase",
                      p.featured
                        ? "bg-white text-ep-blue hover:bg-ep-yellow"
                        : "bg-neutral-900 text-white hover:bg-ep-yellow hover:text-neutral-900",
                    )}
                  >
                    {p.cta}
                  </Link>
                ) : (
                  <div className="mt-8 space-y-3">
                    {user ? (
                      <button
                        type="button"
                        disabled={billingLoading}
                        onClick={() => void startUpgradePromptPay(p.tier)}
                        className={cn(
                          "block w-full border-4 border-black py-4 text-center text-sm font-black uppercase",
                          p.featured
                            ? "bg-white text-ep-blue hover:bg-ep-yellow"
                            : "bg-neutral-900 text-white hover:bg-ep-yellow hover:text-neutral-900",
                        )}
                      >
                        Pay by QR / PromptPay
                      </button>
                    ) : (
                      <Link
                        href={`/signup?next=${encodeURIComponent(`/pricing?plan=${p.tier}`)}`}
                        className={cn(
                          "block w-full border-4 border-black py-4 text-center text-sm font-black uppercase",
                          p.featured
                            ? "bg-white text-ep-blue hover:bg-ep-yellow"
                            : "bg-neutral-900 text-white hover:bg-ep-yellow hover:text-neutral-900",
                        )}
                      >
                        Create account for QR payment
                      </Link>
                    )}
                    <Link
                      href={user ? `/pricing?plan=${p.tier}` : `/signup?next=${encodeURIComponent(`/pricing?plan=${p.tier}`)}`}
                      className={cn(
                        "block w-full border-4 border-black py-3 text-center text-xs font-black uppercase",
                        p.featured
                          ? "bg-ep-yellow text-neutral-900 hover:bg-white"
                          : "bg-white text-neutral-900 hover:bg-ep-yellow",
                      )}
                    >
                      View all payment options
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <header className="mb-12 text-center">
            <p className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-blue">
              FAQ / คำถามที่พบบ่อย
            </p>
            <h2 className="text-3xl font-black sm:text-5xl">Questions / คำถาม</h2>
          </header>
          <div className="flex flex-col gap-4">
            {[
              {
                q: "Different from only doing mock tests? / ต่างจากทำแต่ mock ยังไง?",
                a: "We train Production, Comprehension, Literacy, and Conversation with targeted practice and AI notes—not only full tests. / เราฝึกแยกทักษะและให้คำแนะนำ ไม่ใช่แค่สอบย่อย",
              },
              {
                q: "How does difficulty adapt? / ระดับความยากปรับยังไง?",
                a: "You set a goal band; tasks stay in a range that pushes you without overwhelming you. / ตั้งเป้าแล้วระบบจะรักษาระดับที่เหมาะสม",
              },
              {
                q: "What is in Conversation? / Conversation มีอะไรบ้าง?",
                a: "Interactive listening and summary-style tasks aligned with DET-style conversation skills. / ฝึกฟังและสรุปแบบใกล้เคียงข้อสอบ",
              },
            ].map((item, i) => (
              <div key={item.q} className="border-4 border-black bg-[#fafafa]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left text-lg font-black hover:bg-neutral-100"
                  onClick={() => setOpenFaq((prev) => (prev === i ? null : i))}
                >
                  <span>{item.q}</span>
                  <span
                    className={cn(
                      "ep-stat text-2xl text-ep-blue transition",
                      openFaq === i && "rotate-45",
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    "overflow-hidden px-6 transition-all",
                    openFaq === i ? "max-h-96 pb-6" : "max-h-0",
                  )}
                >
                  <p className="text-neutral-700 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y-8 border-black bg-ep-blue px-4 py-20 text-center text-white sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="ep-stat mb-6 inline-flex flex-wrap items-center justify-center gap-2 border-4 border-black bg-ep-yellow px-4 py-2 text-sm font-bold text-neutral-900">
            600+ items · Full-skill training / ฝึกครบทุกทักษะ
          </p>
          <h2 className="text-3xl font-black sm:text-5xl">
            Ready for test day? / พร้อมสอบแล้วหรือยัง?
          </h2>
          <p className="mt-6 text-lg opacity-90">
            Start free, then upgrade when you want deeper limits and mocks.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-block border-4 border-black bg-white px-12 py-6 text-lg font-black uppercase tracking-wide text-ep-blue shadow-[8px_8px_0_0_#000] transition hover:translate-x-1 hover:translate-y-1 hover:bg-ep-yellow hover:text-neutral-900 hover:shadow-[4px_4px_0_0_#000]"
          >
            Open the app / เข้าแอป
          </Link>
        </div>
      </section>

      <footer className="border-t-8 border-ep-blue bg-neutral-900 px-4 py-16 text-white sm:px-6">
        <div className="mx-auto grid max-w-[1400px] gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-4 border-white bg-ep-blue ep-stat text-2xl font-bold">
              EP
            </div>
            <div>
              <h3 className="text-2xl font-black">ENGLISH PLAN</h3>
              <p className="mt-2 text-sm text-white/70">
                Duolingo English Test prep with AI feedback across all scored skills.
              </p>
            </div>
          </div>
          <div>
            <h4 className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-yellow">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-ep-yellow">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-ep-yellow">
                  Pricing
                </a>
              </li>
              <li>
                <Link href={practiceHref} className="hover:text-ep-yellow">
                  Practice hub
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-yellow">
              Account
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-ep-yellow">
                  Login
                </Link>
              </li>
              <li>
                <Link href={practiceHref} className="hover:text-ep-yellow">
                  Practice
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="ep-stat mb-4 text-sm font-bold uppercase tracking-widest text-ep-yellow">
              Cohort
            </h4>
            <button
              type="button"
              onClick={() => setFastTrackOpen(true)}
              className="text-left text-sm font-bold text-white underline decoration-ep-yellow hover:text-ep-yellow"
            >
              Duolingo Fast Track students →
            </button>
          </div>
        </div>
        <p className="ep-stat mx-auto mt-12 max-w-[1400px] border-t border-white/10 pt-8 text-center text-sm text-white/50">
          © {new Date().getFullYear()} ENGLISH PLAN. All rights reserved.
        </p>
      </footer>

      {stickyOn ? (
        <div className="fixed bottom-0 left-0 right-0 z-[999] border-t-4 border-black bg-ep-blue px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] sm:hidden">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
            <span className="text-sm font-bold text-white">DET prep · 4 skills</span>
            <a
              href="#pricing"
              className="shrink-0 border-[3px] border-black bg-ep-yellow px-4 py-2 text-sm font-black text-neutral-900"
            >
              Start / เริ่ม
            </a>
          </div>
        </div>
      ) : null}

      {fastTrackOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="fast-track-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
            <div className="flex items-start justify-between gap-4">
              <h2 id="fast-track-title" className="text-xl font-black">
                Duolingo Fast Track course / นักเรียนคอร์ส Fast Track
              </h2>
              <button
                type="button"
                className="ep-stat border-2 border-black px-2 py-1 text-sm font-bold hover:bg-neutral-100"
                onClick={() => {
                  setFastTrackOpen(false);
                  setFtErr(null);
                  setFtMsg(null);
                  setFtLinkedEmail(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-neutral-600">
              If you are a student from the <strong>Duolingo Fast Track</strong> course, type the
              email you will use to sign in. We will email our team to verify your enrollment. After
              approval, you will receive an email from <strong>English Plan</strong> with{" "}
              <strong>VIP access for 6 months</strong> (counted from the date you submit this form)
              and your <strong>personal password</strong>.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              หากคุณเป็นนักเรียนจากคอร์ส <strong>Duolingo Fast Track</strong> ให้ใส่อีเมลที่จะใช้ล็อกอิน
              เราจะส่งเรื่องให้ทีมตรวจสอบ หลังอนุมัติ คุณจะได้รับอีเมลจาก{" "}
              <strong>English Plan</strong> พร้อมสิทธิ์ <strong>VIP 6 เดือน</strong> (นับจากวันที่ส่งคำขอ)
              และ<strong>รหัสผ่านส่วนตัว</strong>
            </p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide">
              Email
              <input
                type="email"
                autoComplete="email"
                value={ftEmail}
                onChange={(e) => setFtEmail(e.target.value)}
                className="mt-1 w-full border-2 border-black px-3 py-2 ep-stat text-sm"
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide">
              Full name / ชื่อ-นามสกุล
              <input
                type="text"
                autoComplete="name"
                value={ftName}
                onChange={(e) => setFtName(e.target.value)}
                className="mt-1 w-full border-2 border-black px-3 py-2 ep-stat text-sm"
              />
            </label>
            {ftErr ? <p className="mt-4 text-sm font-bold text-red-700">{ftErr}</p> : null}
            {ftMsg ? (
              <div className="mt-4 rounded border-2 border-green-800/30 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-900">{ftMsg}</p>
                {ftLinkedEmail ? (
                  <p className="mt-2 text-sm text-green-900">
                    <span className="font-bold uppercase tracking-wide text-green-800">
                      Linked email / อีเมลที่ผูกไว้
                    </span>
                    <br />
                    <span className="break-all font-mono text-base font-black text-neutral-900">
                      {ftLinkedEmail}
                    </span>
                  </p>
                ) : null}
                {ftLinkedEmail ? (
                  <p className="mt-3 text-xs text-green-900">
                    Submitted email / อีเมลที่ส่ง:{" "}
                    <span className="break-all font-mono font-bold">{ftLinkedEmail}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              disabled={ftLoading || !ftEmail.trim().includes("@")}
              onClick={() => void submitFastTrack()}
              className="mt-6 w-full border-4 border-black bg-ep-blue py-4 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#000] hover:bg-ep-blue/90 disabled:opacity-50"
            >
              {ftLoading ? "…" : "Send request / ส่งคำขอ"}
            </button>
            {!ftMsg ? (
              <p className="mt-4 text-center text-xs text-neutral-500">
                After you receive our approval email, use{" "}
                <Link href="/login" className="font-bold text-ep-blue underline">
                  Sign in
                </Link>{" "}
                with Google or email + password. / หลังได้รับอีเมลอนุมัติแล้วค่อยเข้า Sign in
              </p>
            ) : (
              <p className="mt-4 text-center text-xs text-neutral-500">
                Watch your inbox for an email from English Plan. / รออีเมลจาก English Plan
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
