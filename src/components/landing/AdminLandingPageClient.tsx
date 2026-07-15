"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ArticleSection } from "@/components/landing/ArticleSection";
import { FeedbackShowcase } from "@/components/landing/FeedbackShowcase";
import { useBillingActions } from "@/hooks/useBillingActions";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type ExamGroup = {
  title: string;
  th: string;
  icon: string;
  count: string;
  cardBg: string;
  cardBorder: string;
  tileBg: string;
  accent: string;
  problem: string;
  items: [string, string, string][];
  pill: string;
  pillCls: string;
};

const EXAM_GROUPS: ExamGroup[] = [
  {
    title: "Production",
    th: "เขียน–พูด",
    icon: "✍️",
    count: "5 แบบ",
    cardBg: "bg-[#f4f8ff]",
    cardBorder: "border-[#dbe7ff]",
    tileBg: "bg-ep-blue",
    accent: "text-ep-blue",
    problem: "ส่วนที่คนไทยกลัวสุด เพราะไม่รู้ว่าผิดตรงไหน",
    items: [
      ["🖼️", "เขียนจากภาพ", "เขียนบรรยายภาพ"],
      ["📝", "อ่านแล้วเขียน", "เขียนเรียงความตอบ"],
      ["🗣️", "พูดจากภาพ", "พูดเพื่ออธิบายภาพ"],
      ["🎙️", "อ่านแล้วพูด", "พูดตอบจากบทความ"],
      ["💬", "พูดแบบโต้ตอบ", "ตอบคำถามสดต่อเนื่อง"],
    ],
    pill: "✦ ตรวจให้เป็นภาษาไทย: ไวยากรณ์ · คำศัพท์ · ความลื่นไหล · การตอบตรงโจทย์",
    pillCls: "text-ep-blue border-[#dbe7ff]",
  },
  {
    title: "Comprehension",
    th: "การอ่าน",
    icon: "📖",
    count: "2 แบบ",
    cardBg: "bg-[#fffbf0]",
    cardBorder: "border-amber-200/70",
    tileBg: "bg-amber-400",
    accent: "text-amber-600",
    problem: "อ่านไม่ทัน หรือจับใจความไม่ได้",
    items: [
      ["🔤", "ศัพท์ (Vocabulary)", "เติมคำในบทความ"],
      ["📚", "การอ่าน (Reading)", "ตอบคำถามจับใจความ"],
    ],
    pill: "✦ รู้คะแนนทันที · มี 3 ระดับความยาก",
    pillCls: "text-amber-700 border-amber-200",
  },
  {
    title: "Literacy",
    th: "สะกด–ฟังจับคำ",
    icon: "🔡",
    count: "3 แบบ",
    cardBg: "bg-[#f0fbf5]",
    cardBorder: "border-emerald-200/70",
    tileBg: "bg-emerald-500",
    accent: "text-emerald-600",
    problem: "คะแนนพื้นฐานที่หล่นง่าย — เก็บคืนได้เร็ว",
    items: [
      ["⌨️", "ฟังแล้วพิมพ์ (Dictation)", "พิมพ์ตามเสียง"],
      ["✏️", "เติมคำในช่องว่าง", "เติมให้ถูกบริบท"],
      ["✅", "คำจริง (Real word)", "คำไหนเป็นคำจริง"],
    ],
    pill: "✦ รู้ผลทันทีทุกข้อ",
    pillCls: "text-emerald-700 border-emerald-200",
  },
  {
    title: "Conversation",
    th: "ฟังสนทนา",
    icon: "🎧",
    count: "2 แบบ",
    cardBg: "bg-[#f7f5ff]",
    cardBorder: "border-violet-200/70",
    tileBg: "bg-violet-500",
    accent: "text-violet-600",
    problem: "ฝรั่งคุยเร็ว ๆ แล้วตามไม่ทัน",
    items: [
      ["🎧", "การสนทนาแบบโต้ตอบ", "ฟังแล้วตอบคำถาม"],
      ["📋", "สรุปการสนทนา", "ฟังแล้วเขียนสรุป"],
    ],
    pill: "✦ สถานการณ์จริงแบบในมหาลัย",
    pillCls: "text-violet-700 border-violet-200",
  },
];

const TOOLS: { icon: string; title: string; what: string; benefit: string; highlight?: boolean }[] = [
  {
    icon: "🎯",
    title: "เช็กระดับฟรี (Mini Diagnosis)",
    what: "ตอบไม่กี่ข้อ ใช้เวลาไม่กี่นาที",
    benefit: "รู้ทันทีว่าตอนนี้อยู่ระดับไหน และทักษะไหนที่ต้องเก็บก่อน — ไม่ต้องเดาเอง",
  },
  {
    icon: "📝",
    title: "ข้อสอบเสมือนจริง (Mock Test)",
    what: "20 ข้อ ~1 ชั่วโมง เหมือนสอบจริง · ให้คะแนน 0–160 แยกราย 4 ทักษะ",
    benefit:
      "เห็นชัด ๆ ว่า 2 ทักษะไหนกำลังฉุดคะแนนของคุณอยู่ — จุดที่คนคะแนนน้อยส่วนใหญ่มองไม่เห็น แล้วลุยเก็บก่อน",
    highlight: true,
  },
  {
    icon: "🔍",
    title: "ฟีดแบ็กรายข้อ เป็นภาษาไทย",
    what: "ตรวจคำตอบเขียน/พูด ให้คะแนนแยก ไวยากรณ์ · คำศัพท์ · ความลื่นไหล · การตอบตรงโจทย์ + โน้ตอธิบาย",
    benefit: "รู้ว่าต้องแก้ ประโยคไหน คำไหน ไม่ใช่แค่ “ต้องพัฒนา grammar” ลอย ๆ",
  },
  {
    icon: "💡",
    title: "เทคนิคเพิ่มคะแนนสั้นๆ",
    what: "บทเรียนสั้น ๆ (เช่น เรื่อง comma, การเติม -ed / -s) + เทคนิคจำง่าย",
    benefit: "เก็บคะแนนที่หล่นง่าย ๆ คืนมาได้เร็ว โดยไม่ต้องเดาเองว่ากฎไหนสำคัญ",
  },
];

const PRICING = [
  {
    tier: "free" as const,
    name: "ฟรี",
    price: "฿0",
    note: "ตลอดไป",
    rows: ["เช็กระดับ (Mini Diagnosis) 1 ครั้ง", "ทดลองแต่ละทักษะ 1 ครั้ง", "ฟีดแบ็กรายข้อ 1 เครดิต"],
    featured: false,
  },
  {
    tier: "basic" as const,
    name: "Basic",
    price: "฿399",
    note: "/ 30 วัน",
    rows: ["ฟีดแบ็ก 18 ครั้ง/เดือน", "Mock test 2 ครั้ง"],
    featured: false,
  },
  {
    tier: "premium" as const,
    name: "Premium",
    price: "฿699",
    note: "/ 30 วัน",
    rows: ["ฟีดแบ็ก 45 ครั้ง/เดือน", "Mock test 4 ครั้ง", "มินิเลสซัน + เทคนิค (บทมาตรฐาน)"],
    featured: true,
  },
  {
    tier: "vip" as const,
    name: "VIP",
    price: "฿999",
    note: "/ 30 วัน",
    rows: ["ฟีดแบ็ก 100 ครั้ง/เดือน", "Mock test 6 ครั้ง", "ฝึกทุก Lane ไม่จำกัด", "มินิเลสซันครบทุกบท (รวมบทขั้นสูง)"],
    featured: false,
  },
];

type DemoVideo = {
  file: string;
  icon: string;
  title: string;
  th: string;
  group: string;
  tease: string;
  ring: string;
  chip: string;
  glow: string;
};

// Full-length narrated tutorials live on Google Drive (too heavy to ship in-repo).
// Paste each Drive share link here — use the "/preview" form so it embeds/plays,
// e.g. https://drive.google.com/file/d/FILE_ID/preview
// Any skill left as "" simply hides its "watch the full tutorial" button.
const FULL_TUTORIAL_URLS: Record<string, string> = {
  writing: "https://drive.google.com/file/d/1HDgdrkcObs0-K-ImUB1axrEZd-kZt7Wo/preview",
  speaking: "https://drive.google.com/file/d/1KkFB3KA2HIXA3qor4Tq05umB8lU6saIu/preview",
  conversation: "https://drive.google.com/file/d/12HSzA6hh-jbf0rk4U0ZiGeMm1jEQg24a/preview",
  reading: "https://drive.google.com/file/d/19ejFpj-P0C92OCNMPO5aF2BF1gGDk3PM/preview",
  dictation: "https://drive.google.com/file/d/1NtPRohqbWTGG0_k3C6HVZ-Nowi6LeRzi/preview",
  "real-word": "https://drive.google.com/file/d/1K-upkFeEHxBecSgMQHAEaRI6wfA3Z7xv/preview",
  "fill-in-the-blanks": "https://drive.google.com/file/d/1TfyPw94DGovyKqnRvSJEb_PLn8JLD-Af/preview",
};

// Real narrated screen-walkthroughs — one per DET task. Ordered by the skills
// Thai test-takers fear most first (Production → Conversation → Reading → Literacy),
// so the anxious visitor sees their own weak spot demoed before they scroll past.
const DEMO_VIDEOS: DemoVideo[] = [
  {
    file: "writing",
    icon: "📝",
    title: "เขียน",
    th: "Writing",
    group: "เขียน–พูด",
    tease: "เขียนตอบจริง แล้วดูฟีดแบ็กชี้ทีละประโยคว่าต้องแก้ตรงไหน",
    ring: "hover:border-ep-blue/60",
    chip: "text-ep-blue",
    glow: "from-blue-500/15",
  },
  {
    file: "speaking",
    icon: "🗣️",
    title: "พูด",
    th: "Speaking",
    group: "เขียน–พูด",
    tease: "พูดตอบภาพ แล้วเห็นคะแนนแยกไวยากรณ์ · คำศัพท์ · ความลื่นไหล",
    ring: "hover:border-ep-blue/60",
    chip: "text-ep-blue",
    glow: "from-blue-500/15",
  },
  {
    file: "conversation",
    icon: "🎧",
    title: "สนทนา",
    th: "Conversation",
    group: "ฟังสนทนา",
    tease: "ฟังบทสนทนาเร็ว ๆ แบบในมหาลัย แล้วตอบคำถามให้ทัน",
    ring: "hover:border-violet-400/60",
    chip: "text-violet-600",
    glow: "from-violet-500/15",
  },
  {
    file: "reading",
    icon: "📚",
    title: "การอ่าน",
    th: "Reading",
    group: "การอ่าน",
    tease: "จับใจความให้ทันเวลา พร้อมเทคนิคอ่านเร็วที่ใช้ได้จริง",
    ring: "hover:border-amber-400/60",
    chip: "text-amber-600",
    glow: "from-amber-400/20",
  },
  {
    file: "dictation",
    icon: "⌨️",
    title: "ฟังแล้วพิมพ์",
    th: "Dictation",
    group: "สะกด–ฟังจับคำ",
    tease: "ฟังเสียงแล้วพิมพ์ตาม — เก็บคะแนนพื้นฐานที่คนส่วนใหญ่ทำหล่น",
    ring: "hover:border-emerald-400/60",
    chip: "text-emerald-600",
    glow: "from-emerald-500/15",
  },
  {
    file: "real-word",
    icon: "✅",
    title: "คำจริง",
    th: "Real word",
    group: "สะกด–ฟังจับคำ",
    tease: "แยกคำจริงออกจากคำหลอกให้ไว รู้ผลทันทีทุกข้อ",
    ring: "hover:border-emerald-400/60",
    chip: "text-emerald-600",
    glow: "from-emerald-500/15",
  },
  {
    file: "fill-in-the-blanks",
    icon: "✏️",
    title: "เติมคำในช่องว่าง",
    th: "Fill in the blanks",
    group: "สะกด–ฟังจับคำ",
    tease: "เติมคำให้ถูกบริบท พร้อมเหตุผลว่าทำไมคำนี้ถึงใช่",
    ring: "hover:border-emerald-400/60",
    chip: "text-emerald-600",
    glow: "from-emerald-500/15",
  },
];

export function AdminLandingPageClient({
  initialFastTrackOpen = false,
}: {
  initialFastTrackOpen?: boolean;
}) {
  const [openVideo, setOpenVideo] = useState<DemoVideo | null>(null);
  const [fastTrackOpen, setFastTrackOpen] = useState(initialFastTrackOpen);
  const [ftEmail, setFtEmail] = useState("");
  const [ftName, setFtName] = useState("");
  const [ftLoading, setFtLoading] = useState(false);
  const [ftMsg, setFtMsg] = useState<string | null>(null);
  const [ftLinkedEmail, setFtLinkedEmail] = useState<string | null>(null);
  const [ftErr, setFtErr] = useState<string | null>(null);
  const [stickyOn, setStickyOn] = useState(false);
  const [paymentErr, setPaymentErr] = useState<string | null>(null);
  const { user, loading: billingLoading, startUpgradePromptPay } = useBillingActions();

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
      setStickyOn(window.scrollY > 800 && scrollPos < pricingTop && scrollPos < footerTop);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!openVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenVideo(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openVideo]);

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

  const openLandingPromptPay = useCallback(
    async (tier: "basic" | "premium" | "vip") => {
      try {
        setPaymentErr(null);
        await startUpgradePromptPay(tier);
      } catch (error) {
        setPaymentErr(
          error instanceof Error
            ? error.message
            : "เปิดหน้าชำระเงิน QR ไม่สำเร็จ กรุณาลองอีกครั้ง",
        );
        const pricing = document.getElementById("pricing");
        pricing?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [startUpgradePromptPay],
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 [font-feature-settings:'liga'] [scroll-behavior:smooth]">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 no-underline">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ep-blue">
              <span className="font-mono text-xs font-bold text-white">EP</span>
            </div>
            <span className="hidden text-sm font-semibold leading-none text-ep-blue sm:block">
              ENGLISH PLAN
            </span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-gray-500 md:flex">
            <a href="#tools" className="transition-colors hover:text-ep-blue">มีอะไรให้ใช้</a>
            <a href="#demos" className="transition-colors hover:text-ep-blue">ฟังก์ชันในแอป</a>
            <a href="#feedback" className="transition-colors hover:text-ep-blue">ฟีดแบ็ก</a>
            <a href="#mock" className="transition-colors hover:text-ep-blue">Mock test</a>
            <a href="#exams" className="transition-colors hover:text-ep-blue">ข้อสอบ</a>
            <a href="#pricing" className="transition-colors hover:text-ep-blue">แผน</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm text-gray-500 transition-colors hover:text-ep-blue sm:block"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/explore"
              className="flex min-h-[44px] items-center rounded-lg bg-ep-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              เริ่มฟรี
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-3xl px-5 pb-12 pt-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-ep-blue">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ep-blue" />
          ติว Duolingo English Test (DET) · สำหรับคนไทย
        </div>
        <h1 className="mb-5 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
          รู้ว่า<span className="text-ep-blue">อ่อนตรงไหน</span>
          <br />
          คะแนนถึงจะขึ้น
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base text-gray-600 sm:text-lg">
          English Plan คือที่ติว DET สำหรับคนไทย — มีข้อสอบครบทุกแบบเหมือนที่ออกสอบจริง,
          ข้อสอบเสมือนจริง (Mock test) ที่บอกจุดอ่อนของคุณ และฟีดแบ็กรายข้อที่บอกตรง ๆ ว่าต้องแก้
          <b className="text-gray-800">ประโยคไหน คำไหน</b>
        </p>
        <div className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-ep-blue px-8 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-blue-800 hover:shadow-lg sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            เช็กระดับของคุณฟรี — เริ่มเลย
          </Link>
        </div>
        <p className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            ฟรี — ไม่ต้องใส่บัตรเครดิต
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            เห็นจุดอ่อนก่อนค่อยตัดสินใจ
          </span>
        </p>
      </section>

      {/* PROBLEM REFRAME */}
      <section className="mx-auto max-w-2xl px-5 pb-14">
        <div className="rounded-2xl bg-gray-50 p-6 text-center sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">
            ทำไมฝึกแล้วคะแนนไม่ขึ้นสักที?
          </p>
          <p className="text-lg leading-relaxed text-gray-800 sm:text-xl">
            ส่วนใหญ่ไม่ใช่เพราะ<span className="text-gray-400 line-through">ไม่ขยัน</span> — แต่เพราะ
            <b className="text-ep-blue">ไม่รู้ว่าตัวเองอ่อนตรงไหน</b> เลยฝึกมั่ว ๆ เสียเวลากับสิ่งที่ทำได้อยู่แล้ว
          </p>
          <p className="mt-4 text-sm text-gray-500">
            English Plan เริ่มจากการหาจุดอ่อนให้เจอก่อน แล้วค่อยฝึกเฉพาะจุดนั้น
          </p>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" className="bg-blue-50 px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900 sm:text-2xl">
            ในแอปมีอะไรให้ใช้บ้าง
          </h2>
          <p className="mb-10 text-center text-sm text-gray-500">
            แต่ละอย่างมีหน้าที่ชัดเจน — ทำงานต่อกันเป็นระบบเดียว
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div
                key={t.title}
                className={cn(
                  "flex gap-4 rounded-2xl bg-white p-6",
                  t.highlight && "ring-2 ring-ep-yellow/70",
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  {t.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t.title}</h3>
                  <p className="mb-2 mt-1.5 text-sm text-gray-500">{t.what}</p>
                  <p className="text-sm text-gray-700">
                    <b className="text-ep-blue">ได้อะไร:</b> {t.benefit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEEDBACK EXAMPLE */}
      <section id="feedback" className="mx-auto max-w-3xl px-5 py-16">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">ฟีดแบ็กหน้าตาเป็นแบบนี้</h2>
          <p className="mx-auto max-w-xl text-sm text-gray-500">
            ตรวจเทียบกับฐานข้อมูลคำตอบที่ English Plan เก็บมา 6 ปี — ไม่ใช่แค่บอกถูก/ผิด แต่บอกว่า
            <b className="text-gray-700">แก้ยังไงให้คะแนนขึ้น</b>
          </p>
        </div>
        <FeedbackShowcase />
      </section>

      {/* MOCK SPOTLIGHT */}
      <section id="mock" className="bg-gray-900 px-5 py-16 text-white">
        <div className="mx-auto grid max-w-4xl items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-ep-yellow">
              Mock Test
            </span>
            <h2 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">
              สอบเสมือนจริง 1 ครั้ง
              <br />
              เห็นจุดอ่อนชัดกว่าฝึกเดา ๆ เป็นเดือน
            </h2>
            <p className="mb-5 text-sm leading-relaxed text-gray-300">
              ข้อสอบเต็มรูปแบบ 20 ข้อ ~1 ชั่วโมง เหมือนสอบจริง จบแล้วได้คะแนนแยกราย 4 ทักษะ พร้อมบอกว่า{" "}
              <b className="text-white">2 ทักษะไหนที่ต้องเก็บก่อน</b> เพื่อให้ถึงเป้าได้เร็วที่สุด
            </p>
            <p className="text-xs text-gray-400">
              คนคะแนนน้อยส่วนใหญ่ไม่ได้อ่อนทุกอย่าง — แค่ไม่รู้ว่าอ่อนตรงไหน Mock test ทำให้เห็น
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-gray-900 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ผลสอบของคุณ</span>
              <span className="font-mono text-sm font-bold text-ep-blue">รวม 108 / 160</span>
            </div>
            <div className="space-y-3">
              {([
                ["✍️ Writing", "85", true, "53%"],
                ["🗣️ Speaking", "95", true, "59%"],
                ["📖 Reading", "120", false, "75%"],
                ["🎧 Listening", "130", false, "81%"],
              ] as const).map(([label, score, weak, width]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("text-xs", weak ? "font-medium text-gray-700" : "text-gray-600")}>
                      {label}
                      {weak && <span className="ml-1 text-[10px] font-bold text-red-600">จุดอ่อน</span>}
                    </span>
                    <span className={cn("font-mono text-xs font-semibold", weak ? "text-red-600" : "text-gray-700")}>
                      {score}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={cn("h-full rounded-full", weak ? "bg-red-400" : "bg-ep-blue")} style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-ep-yellow/60 bg-yellow-50 px-4 py-3">
              <p className="text-xs text-gray-800">
                <b>เก็บ 2 ทักษะนี้ก่อน</b> (Writing + Speaking) จะขึ้นถึงเป้าได้เร็วที่สุด →
              </p>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">
              ตัวอย่างหน้าผลสอบ · คะแนนเป็นการประมาณเพื่อการฝึก
            </p>
          </div>
        </div>
      </section>

      {/* ALL EXAM TYPES */}
      <section id="exams" className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">
            ข้อสอบในระบบ — ครบทุกแบบที่ DET ออกจริง
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-500">
            แบ่งตาม 4 ทักษะที่ DET วัด · แต่ละแบบมีไว้แก้ปัญหาคนละอย่าง — เลือกฝึกเฉพาะแบบที่คุณอ่อนได้ ไม่ต้องทำทั้งหมด
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {EXAM_GROUPS.map((g) => (
            <div key={g.title} className={cn("rounded-3xl border p-5 sm:p-6", g.cardBg, g.cardBorder)}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm", g.tileBg)}>
                    {g.icon}
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight text-gray-900">{g.title}</h3>
                    <p className={cn("text-xs font-semibold", g.accent)}>{g.th}</p>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-gray-500">
                  {g.count}
                </span>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">{g.problem}</p>
              <div className="space-y-2">
                {g.items.map(([icon, name, desc]) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm">
                      {icon}
                    </span>
                    <div className="min-w-0 text-sm">
                      <span className="font-semibold text-gray-800">{name}</span>{" "}
                      <span className="text-gray-400">· {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className={cn("mt-4 inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-[11px] font-semibold", g.pillCls)}>
                {g.pill}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl bg-gradient-to-r from-ep-blue to-blue-700 p-6 text-white sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">📝</span>
              <div>
                <p className="text-sm font-bold">Mock test</p>
                <p className="mt-0.5 text-xs leading-relaxed text-blue-100">
                  รวมทุกแบบข้างบนเป็นข้อสอบเต็มเหมือนสอบจริง เพื่อให้เห็นจุดอ่อน
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ep-yellow text-lg text-gray-900">🎯</span>
              <div>
                <p className="text-sm font-bold">เช็กระดับฟรี</p>
                <p className="mt-0.5 text-xs leading-relaxed text-blue-100">
                  ตัวอย่างย่อ ให้ลองหลายแบบก่อนตัดสินใจ — ระบบชี้ให้ว่าควรเริ่มจากแบบไหน
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEE-IT-IN-ACTION — real narrated walkthroughs of every task */}
      <section id="demos" className="bg-gray-900 px-5 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-ep-yellow">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ep-yellow opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ep-yellow" />
              </span>
              ฟังก์ชันจริงในแอป
            </span>
          </div>
          <h2 className="mb-3 text-center text-2xl font-bold leading-tight sm:text-3xl">
            แอปนี้ช่วยให้คะแนนนักเรียน<span className="text-ep-yellow">เพิ่มขึ้นได้อย่างไร?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm leading-relaxed text-gray-300 sm:text-base">
            แต่ละฟังก์ชันถูกออกแบบมาแก้ปัญหาคนละจุด — <b className="text-white">เลือกดูทักษะที่คุณกังวลที่สุด</b>{" "}
            แล้วดูว่าพี่ดอยอธิบายวิธีแก้จุดนั้นยังไง
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_VIDEOS.map((v) => (
              <button
                key={v.file}
                type="button"
                onClick={() => setOpenVideo(v)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-1 hover:bg-white/[0.07]",
                  v.ring,
                )}
              >
                <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100", v.glow)} />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                    {v.icon}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg transition-transform group-hover:scale-110">
                    <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                <div className="relative mt-4">
                  <h3 className="text-base font-bold text-white">{v.title}</h3>
                  <p className={cn("text-[11px] font-semibold uppercase tracking-wide", v.chip)}>
                    {v.th} · {v.group}
                  </p>
                </div>
                <p className="relative mt-2 text-sm leading-relaxed text-gray-300">{v.tease}</p>
                <span className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ep-yellow">
                  ดูฟังก์ชันนี้ทำงานยังไง
                  <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-gray-400">
            ✓ หน้าจอจริงจากแอป ✓ ฟีดแบ็กจริงจากระบบ ✓ อธิบายโดยพี่ดอยเอง ทีละฟังก์ชัน
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/explore"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-ep-yellow px-8 py-3.5 text-base font-bold text-gray-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-yellow-400"
            >
              ลองใช้ฟังก์ชันเหล่านี้ด้วยตัวเองฟรี — ไม่ต้องใส่บัตร
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — student reviews */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <p className="mb-5 text-center text-sm font-semibold text-gray-500">เสียงจากนักเรียน</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Phim */}
          <div className="rounded-2xl bg-gray-50 p-6">
            <div className="mb-3 text-base text-ep-yellow">★★★★★</div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              &quot;ตอนแรกกังวลเรื่อง Writing กับ Speaking มาก ไม่รู้จะแก้ตรงไหน พอได้ฟีดแบ็กที่บอกตรง ๆ ว่าต้องปรับอะไร รู้สึกมั่นใจขึ้นเยอะเลย คะแนนขยับจาก 95 เป็น 115&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-ep-blue">พ</div>
              <div>
                <div className="text-xs font-semibold text-gray-800">พิมพ์</div>
                <div className="font-mono text-xs text-gray-400">95 → 115</div>
              </div>
            </div>
          </div>
          {/* Lily */}
          <div className="rounded-2xl bg-gray-50 p-6">
            <div className="mb-3 text-base text-ep-yellow">★★★★★</div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              &quot;ตอนนี้ได้ 115 อยากได้ 130 แต่ติดที่ Reading กับ Conversation — ปกติหาข้อสอบจริงมาฝึกยากมาก เว็บอื่นอธิบายเป็นภาษาอังกฤษล้วน คนที่อังกฤษไม่แข็งอย่างเรางงไปหมด ที่นี่มีข้อสอบให้ฝึกเยอะ + อธิบายเป็นภาษาไทย แล้วฟีดแบ็กแบบ personalized ยังบอกวิธีอัปคะแนน Production ได้เร็วด้วย&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-ep-blue">ล</div>
              <div>
                <div className="text-xs font-semibold text-gray-800">ลิลลี่</div>
                <div className="font-mono text-xs text-gray-400">115 · กำลังไป 130</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COURSE → VIP (opens the real Fast Track modal) */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-2xl border-2 border-ep-yellow/70 bg-yellow-50 p-6 text-center sm:p-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ep-yellow">
            <svg className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">
            เรียนคอร์ส Duolingo Fast Track อยู่หรือเปล่า?
          </h2>
          <p className="mx-auto mb-5 max-w-xl text-sm leading-relaxed text-gray-600">
            นักเรียนในคอร์สติวรับสิทธิ์ <b className="text-gray-900">VIP เต็มรูปแบบ 6 เดือนฟรี</b> — ฝึกได้ไม่จำกัด,
            ฟีดแบ็ก 100 ครั้ง/เดือน, Mock test 6 ครั้ง/เดือน และเทคนิคสั้น ๆ เพิ่มคะแนนทั้งหมด แค่ยืนยันอีเมลที่ลงเรียนไว้
          </p>
          <button
            type="button"
            onClick={() => setFastTrackOpen(true)}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800"
          >
            เปิดสิทธิ์ VIP สำหรับนักเรียนคอร์ส →
          </button>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-gray-50 px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900 sm:text-2xl">เริ่มฟรี — อัปเกรดเมื่อพร้อม</h2>
          <p className="mb-10 text-center text-sm text-gray-500">
            ไม่มีการตัดเงินอัตโนมัติ · ทุกแผนคือการซื้อ 30 วัน ไม่ใช่ subscription
          </p>

          {paymentErr ? (
            <div className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-left">
              <p className="text-base font-bold text-red-700">เปิดหน้าชำระเงิน QR ไม่สำเร็จ</p>
              <p className="mt-1 text-sm font-medium text-gray-700">{paymentErr}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING.map((p) => (
              <div
                key={p.tier}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-white p-5",
                  p.tier === "free" && "border-2 border-ep-blue",
                  p.featured && "border-2 border-ep-yellow",
                  !p.featured && p.tier !== "free" && "border-gray-200",
                )}
              >
                {p.featured ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ep-yellow px-3 py-1 text-xs font-bold text-gray-900">
                    ยอดนิยม
                  </div>
                ) : null}
                <div className={cn("mb-1", p.featured && "mt-1", p.tier === "free" ? "font-bold text-gray-900" : "font-semibold text-gray-700")}>
                  {p.name}
                </div>
                <div className={cn("mb-1 font-mono font-bold", p.tier === "free" ? "text-3xl text-ep-blue" : "text-2xl text-gray-800")}>
                  {p.price}
                </div>
                <div className="mb-4 text-xs text-gray-400">{p.note}</div>
                <ul className="mb-5 flex-1 space-y-2 text-xs text-gray-600">
                  {p.rows.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="text-green-500">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>

                {p.tier === "free" ? (
                  <Link
                    href="/explore"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-ep-blue px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-blue-800"
                  >
                    เริ่มเลย ฟรี
                  </Link>
                ) : (
                  <div className="space-y-2">
                    {user ? (
                      <button
                        type="button"
                        disabled={billingLoading}
                        onClick={() => void openLandingPromptPay(p.tier)}
                        className={cn(
                          "flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-bold transition-colors disabled:opacity-50",
                          p.featured
                            ? "bg-ep-yellow text-gray-900 hover:bg-yellow-400"
                            : "bg-gray-900 text-white hover:bg-gray-800",
                        )}
                      >
                        ชำระด้วย QR พร้อมเพย์
                      </button>
                    ) : (
                      <Link
                        href={`/signup?next=${encodeURIComponent(`/pricing?plan=${p.tier}`)}`}
                        className={cn(
                          "flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-bold transition-colors",
                          p.featured
                            ? "bg-ep-yellow text-gray-900 hover:bg-yellow-400"
                            : "bg-gray-900 text-white hover:bg-gray-800",
                        )}
                      >
                        สมัครแล้วชำระด้วย QR พร้อมเพย์
                      </Link>
                    )}
                    <Link
                      href={
                        user
                          ? `/pricing?plan=${p.tier}`
                          : `/signup?next=${encodeURIComponent(`/pricing?plan=${p.tier}`)}`
                      }
                      className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-center text-xs font-semibold text-gray-600 transition-colors hover:border-ep-blue hover:text-ep-blue"
                    >
                      ดูตัวเลือกการชำระเงินทั้งหมด
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center text-xs leading-relaxed text-gray-500">
            <span className="font-semibold text-gray-700">มินิเลสซัน (บทเรียนสั้น ๆ + เทคนิค) เปิดให้ใคร?</span>{" "}
            Free &amp; Basic ยังไม่รวม · <b className="text-gray-700">Premium</b> เข้าถึงบทมาตรฐาน ·{" "}
            <b className="text-gray-700">VIP</b> เข้าถึงครบทุกบท รวมบทขั้นสูง
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            ไม่แน่ใจ?{" "}
            <Link href="/mini-diagnosis/start" className="font-semibold text-ep-blue hover:underline">
              ลองเช็กระดับฟรีก่อนเลย
            </Link>{" "}
            — ไม่ต้องใส่บัตร เห็นจุดอ่อนก่อนค่อยตัดสินใจ
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">เริ่มจากรู้ว่าตัวเองอ่อนตรงไหน</h2>
          <p className="mb-6 text-sm text-gray-500">ฟรี · ไม่ต้องใส่บัตร · ไม่มีอะไรต้องเสีย</p>
          <Link
            href="/explore"
            className="inline-flex min-h-[56px] items-center gap-2 rounded-xl bg-ep-blue px-10 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-blue-800 hover:shadow-lg"
          >
            เช็กระดับของคุณฟรี
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ARTICLES — "บันทึกของครู" */}
      <ArticleSection />

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ep-blue">
              <span className="font-mono text-xs font-bold text-white">EP</span>
            </div>
            <span className="text-xs text-gray-400">ENGLISH PLAN · ติว DET สำหรับคนไทย</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/about" className="transition-colors hover:text-ep-blue">เกี่ยวกับเรา</Link>
            <span className="text-gray-200">|</span>
            <Link href="/login" className="transition-colors hover:text-ep-blue">เข้าสู่ระบบ</Link>
            <span className="text-gray-200">|</span>
            <button
              type="button"
              onClick={() => setFastTrackOpen(true)}
              className="transition-colors hover:text-ep-blue"
            >
              นักเรียนคอร์ส
            </button>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      {stickyOn ? (
        <div className="fixed bottom-0 left-0 right-0 z-[999] border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-700">เช็กระดับฟรี · ไม่ต้องใส่บัตร</span>
            <Link
              href="/explore"
              className="shrink-0 rounded-lg bg-ep-blue px-4 py-2 text-sm font-bold text-white"
            >
              เริ่ม
            </Link>
          </div>
        </div>
      ) : null}

      {/* DEMO VIDEO LIGHTBOX */}
      {openVideo ? (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={`ตัวอย่างการใช้งาน ${openVideo.title}`}
          onClick={() => setOpenVideo(null)}
        >
          <div
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                  {openVideo.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{openVideo.title}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {openVideo.th} · วิธีใช้จริง
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenVideo(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg font-bold text-white transition-colors hover:bg-white/10"
                aria-label="ปิด"
              >
                ✕
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <iframe
                key={openVideo.file}
                src={FULL_TUTORIAL_URLS[openVideo.file]}
                className="aspect-video w-full bg-black"
                allow="autoplay"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 rounded-xl bg-ep-yellow px-6 py-2.5 text-sm font-bold text-gray-900 transition-colors hover:bg-yellow-400"
                >
                  ลองทักษะนี้เองฟรี →
                </Link>
                <p className="text-center text-xs text-gray-500">
                  กด <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Esc</span> หรือคลิกรอบ ๆ เพื่อปิด
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* FAST TRACK MODAL — identical logic to the live landing page */}
      {fastTrackOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="fast-track-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="fast-track-title" className="text-xl font-bold text-gray-900">
                Duolingo Fast Track course / นักเรียนคอร์ส Fast Track
              </h2>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
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
            <p className="mt-3 text-sm text-gray-600">
              If you are a student from the <strong>Duolingo Fast Track</strong> course, type the email you
              will use to sign in. We will email our team to verify your enrollment. After approval, you will
              receive an email from <strong>English Plan</strong> with <strong>VIP access for 6 months</strong>{" "}
              (counted from the date you submit this form) and your <strong>personal password</strong>.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              หากคุณเป็นนักเรียนจากคอร์ส <strong>Duolingo Fast Track</strong> ให้ใส่อีเมลที่จะใช้ล็อกอิน
              เราจะส่งเรื่องให้ทีมตรวจสอบ หลังอนุมัติ คุณจะได้รับอีเมลจาก <strong>English Plan</strong> พร้อมสิทธิ์{" "}
              <strong>VIP 6 เดือน</strong> (นับจากวันที่ส่งคำขอ) และ<strong>รหัสผ่านส่วนตัว</strong>
            </p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-gray-700">
              Email
              <input
                type="email"
                autoComplete="email"
                value={ftEmail}
                onChange={(e) => setFtEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-gray-700">
              Full name / ชื่อ-นามสกุล
              <input
                type="text"
                autoComplete="name"
                value={ftName}
                onChange={(e) => setFtName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            {ftErr ? <p className="mt-4 text-sm font-bold text-red-700">{ftErr}</p> : null}
            {ftMsg ? (
              <div className="mt-4 rounded-lg border-2 border-green-800/30 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-900">{ftMsg}</p>
                {ftLinkedEmail ? (
                  <p className="mt-2 text-sm text-green-900">
                    <span className="font-bold uppercase tracking-wide text-green-800">
                      Linked email / อีเมลที่ผูกไว้
                    </span>
                    <br />
                    <span className="break-all font-mono text-base font-black text-gray-900">{ftLinkedEmail}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              disabled={ftLoading || !ftEmail.trim().includes("@")}
              onClick={() => void submitFastTrack()}
              className="mt-6 w-full rounded-xl bg-ep-blue py-4 text-sm font-bold uppercase text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {ftLoading ? "…" : "Send request / ส่งคำขอ"}
            </button>
            {!ftMsg ? (
              <p className="mt-4 text-center text-xs text-gray-500">
                After you receive our approval email, use{" "}
                <Link href="/login" className="font-bold text-ep-blue underline">
                  Sign in
                </Link>{" "}
                with Google or email + password. / หลังได้รับอีเมลอนุมัติแล้วค่อยเข้า Sign in
              </p>
            ) : (
              <p className="mt-4 text-center text-xs text-gray-500">
                Watch your inbox for an email from English Plan. / รออีเมลจาก English Plan
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
