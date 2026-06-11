"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT, TIER_DISPLAY, type Tier } from "@/lib/access-control";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// ─── Logic layer: identical to LoginWelcomeModal ────────────────────────────

const STORAGE_KEY = "ep-show-login-welcome";

type UserSummary = {
  label: string;
  planStatus: string;
};

function featureCopy(tier: Tier) {
  if (tier === "basic") {
    return {
      persona: "สายลองเชิง — The Explorer",
      blurb: "สำหรับคนที่อยากเริ่มฝึกอย่างค่อยเป็นค่อยไป พร้อมดูระดับตัวเองก่อน",
      read: "📖 15 Read & Vocab",
      feedback: `✍️ ${AI_MONTHLY_LIMIT.basic} Feedback Credits / เดือน`,
      literacy: "📚 20 Literacy",
      convo: "🎧 10 Convo",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.basic} Mock Tests / Month`,
    };
  }
  if (tier === "premium") {
    return {
      persona: "สายอัปคะแนน — The Achiever",
      blurb: "สำหรับคนที่ต้องการอัปคะแนนอย่างจริงจัง",
      read: "📖 30 Read & Vocab",
      feedback: `✍️ ${AI_MONTHLY_LIMIT.premium} Feedback Credits / เดือน`,
      literacy: "📚 50 Literacy",
      convo: "🎧 20 Convo",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.premium} Mock Tests / Month`,
    };
  }
  if (tier === "vip") {
    return {
      persona: "สายล่าคะแนนสูง — The Elite Master",
      blurb: "เป้าหมายสำคัญมาก ขอเตรียมให้พร้อมที่สุด",
      read: "🔥 Vocab ไม่จำกัด",
      feedback: `📝 ${AI_MONTHLY_LIMIT.vip} Instant Feedback Credits / เดือน`,
      literacy: "🔥 Literacy ไม่จำกัด",
      convo: "🔥 Convo ไม่จำกัด",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.vip} Full Mock Tests`,
    };
  }
  // free
  return {
    persona: "เริ่มต้นใช้งาน — The Starter",
    blurb:
      "ลองได้ทุก lane แบบเริ่มต้น และมี Instant Feedback credit 1 ครั้งไว้ทดลองงานตรวจคะแนน หนึ่งชิ้น",
    read: "📖 1 Starter Test / Exam Lane",
    feedback: `✍️ ${AI_MONTHLY_LIMIT.free} Instant Feedback Credit`,
    literacy: "📚 Try each exam lane once",
    convo: "🎧 RW / RS / IS / Photo tasks: choose 1 instant feedback",
    mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.free} Mock Tests / Month`,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminLoginWelcomeModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserSummary>({ label: "student", planStatus: "ACTIVE" });
  const [freeFeedbackChoice, setFreeFeedbackChoice] = useState("write_about_photo");

  // ── Show/hide logic: verbatim from LoginWelcomeModal ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/admin")
    )
      return;
    const shouldShow = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (!shouldShow) return;
    setOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.sessionStorage.removeItem(STORAGE_KEY);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email ?? "";
      const base = email.split("@")[0]?.trim() || "student";
      if (!cancelled) {
        setUser({
          label: base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 24) || "student",
          planStatus: `${TIER_DISPLAY[effectiveTier].nameEn.toUpperCase()} PLAN`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, effectiveTier]);

  const close = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    setOpen(false);
  };

  const current = useMemo(() => featureCopy(effectiveTier), [effectiveTier]);
  const basic = featureCopy("basic");
  const premium = featureCopy("premium");
  const vip = featureCopy("vip");

  if (!open || loading) return null;

  // ─── FREE tier: "Show the value" layout ──────────────────────────────────

  if (effectiveTier === "free") {
    const freeFeedbackOptions = [
      { id: "write_about_photo", emoji: "✍️", label: "Write about Photo" },
      { id: "speak_about_photo", emoji: "🗣️", label: "Speak about Photo" },
      { id: "read_then_write", emoji: "📖", label: "Read then Write" },
      { id: "interactive_speaking", emoji: "💬", label: "Interactive Speaking" },
    ] as const;

    return (
      <div
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-welcome-title"
        onClick={close}
      >
        <div
          className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Plan badge */}
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              Free Plan
            </span>
            <button
              type="button"
              aria-label="ปิด"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Heading */}
          <h1
            id="login-welcome-title"
            className="mb-1 text-2xl font-bold leading-tight text-[#004aad] md:text-3xl"
          >
            ยินดีต้อนรับ!
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            สิทธิ์ฟรีของคุณเริ่มใช้งานได้เลย — นี่คือทุกอย่างที่ทำได้ตอนนี้
          </p>

          {/* Section 1: Standard lanes */}
          <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                ฝึกทักษะพื้นฐาน
              </h2>
              <span className="rounded-full bg-[#004aad]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#004aad]">
                อย่างละ 1 ครั้ง
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              ทดลองทุก lane ได้เลย ไม่ต้องจ่ายก่อน:
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                ["📖", "Reading"],
                ["🔤", "Vocabulary"],
                ["📝", "Fill in the Blank"],
                ["🔊", "Dictation"],
                ["💬", "Interactive Conversation"],
                ["🌐", "Real Word"],
              ].map(([icon, name]) => (
                <div key={name} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004aad]/10 text-[10px]">
                    {icon}
                  </span>
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Instant Feedback credit */}
          <div className="mb-6 rounded-xl border border-[#004aad]/20 bg-[#f0f5ff] p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#004aad]">
                Instant Feedback — 1 เครดิต
              </h2>
              <span className="rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[10px] font-bold text-black">
                ฟรี 1 ชิ้น
              </span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-600">
              ระบบจะตรวจงานชิ้นนึงให้แบบ Instant Feedback —{" "}
              <span className="font-medium text-gray-800">
                เลือกงานที่อยากให้ตรวจก่อน
              </span>
              <br />
              <span className="text-[11px] text-gray-400">
                (เปลี่ยนได้ภายหลังตอนใช้เครดิต ไม่ผูกมัดตอนนี้)
              </span>
            </p>

            <div className="space-y-2">
              {freeFeedbackOptions.map((option) => {
                const checked = freeFeedbackChoice === option.id;
                return (
                  <label key={option.id} className="flex cursor-pointer">
                    <input
                      type="radio"
                      name="feedback_choice"
                      className="sr-only"
                      checked={checked}
                      onChange={() => setFreeFeedbackChoice(option.id)}
                    />
                    <div
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                        checked
                          ? "border-[#004aad] bg-white shadow-sm"
                          : "border-transparent bg-white/60 hover:bg-white"
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800">
                        {option.emoji}&nbsp; {option.label}
                      </span>
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          checked
                            ? "border-[#004aad] bg-[#004aad]"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            className="w-full rounded-xl bg-[#004aad] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#003d91] active:scale-[0.98]"
            onClick={() => {
              close();
              router.push("/practice");
            }}
          >
            เริ่มต้นทดลองใช้งาน →
          </button>

          <div className="mt-3 text-center">
            <Link
              href="/pricing"
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-[#004aad]"
              onClick={close}
            >
              ดูแผนราคา / Upgrade
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Paid tiers (basic / premium / vip): clarity layout ──────────────────

  const tierAccent: Record<string, string> = {
    basic: "bg-gray-100 text-gray-700",
    premium: "bg-[#004aad] text-white",
    vip: "bg-[#ffcc00] text-black",
  };
  const tierBadge = tierAccent[effectiveTier] ?? tierAccent.basic;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-welcome-title"
      onClick={close}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${tierBadge}`}
          >
            {TIER_DISPLAY[effectiveTier].nameEn} Plan — {user.label}
          </span>
          <button
            type="button"
            aria-label="ปิด"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Heading */}
        <h1
          id="login-welcome-title"
          className="mb-1 text-2xl font-bold leading-tight text-[#004aad] md:text-3xl"
        >
          ยินดีต้อนรับกลับมา!
        </h1>
        <p className="mb-1 text-base font-semibold text-gray-700">{current.persona}</p>
        <p className="mb-6 text-sm text-gray-500">{current.blurb}</p>

        {/* Benefit grid */}
        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            สิทธิ์การใช้งานของคุณ
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[current.read, current.feedback, current.literacy, current.convo].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-100"
              >
                {item}
              </div>
            ))}
            <div className="col-span-2 flex items-start gap-2 rounded-lg bg-[#004aad]/5 px-3 py-2.5 text-xs font-semibold text-[#004aad] ring-1 ring-[#004aad]/20">
              {current.mocks}
            </div>
          </div>
        </div>

        {/* Pro-tip */}
        <div className="mb-6 rounded-xl border border-[#ffcc00]/50 bg-[#fffbea] px-4 py-3 text-xs text-gray-700">
          <span className="mr-1 font-bold text-[#004aad]">Pro-tip:</span>
          เจอศัพท์ที่ยังไม่แม่น? กด{" "}
          <span className="font-bold text-[#004aad]">&quot;Add to Notebook&quot;</span>{" "}
          ที่หน้าสรุปผลเพื่อเก็บไว้ทบทวนได้เลย
        </div>

        {/* Tier comparison strip (compact) */}
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            เปรียบเทียบแผน
          </h2>
          {(["basic", "premium", "vip"] as Tier[]).map((t) => {
            const isCurrent = effectiveTier === t;
            const copy = featureCopy(t);
            const colors: Record<string, string> = {
              basic: "border-gray-200",
              premium: "border-[#004aad]",
              vip: "border-[#ffcc00]",
            };
            const headerBg: Record<string, string> = {
              basic: "bg-gray-100 text-gray-600",
              premium: "bg-[#004aad] text-white",
              vip: "bg-[#ffcc00] text-black",
            };
            return (
              <div
                key={t}
                className={`overflow-hidden rounded-xl border-2 transition-opacity ${colors[t]} ${
                  isCurrent ? "opacity-100" : "opacity-50"
                }`}
              >
                <div
                  className={`flex items-center justify-between px-3 py-2 text-xs font-bold ${headerBg[t]}`}
                >
                  <span>
                    {TIER_DISPLAY[t].nameEn} Plan
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-bold">
                      ✓ แผนปัจจุบัน
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-white px-3 py-2.5">
                  <p className="text-[10px] text-gray-500">{copy.feedback}</p>
                  <p className="text-[10px] text-gray-500">{copy.mocks}</p>
                </div>
              </div>
            );
          })}

          {effectiveTier !== "vip" && (
            <div className="pt-1 text-right">
              <Link
                href="/pricing"
                className="text-xs font-semibold text-[#004aad] underline underline-offset-2 hover:text-[#003d91]"
                onClick={close}
              >
                ดูแผนสูงขึ้น →
              </Link>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={close}
          className="w-full rounded-xl bg-[#004aad] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#003d91] active:scale-[0.98]"
        >
          เริ่มฝึกเลย →
        </button>
      </div>
    </div>
  );
}
