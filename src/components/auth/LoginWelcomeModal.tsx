"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT, TIER_DISPLAY, type Tier } from "@/lib/access-control";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const STORAGE_KEY = "ep-show-login-welcome";

type UserSummary = {
  label: string;
  planStatus: string;
};

function featureCopy(tier: Tier) {
  if (tier === "basic") {
    return {
      persona: "สำหรับสายลองเชิง (The Explorer)",
      blurb: "สำหรับคนที่อยากเริ่มฝึกอย่างค่อยเป็นค่อยไป พร้อมดูระดับตัวเองก่อน",
      read: "📖 15 Read & Vocab",
      feedback: `✍️ ${AI_MONTHLY_LIMIT.basic} Feedback`,
      literacy: "📚 20 Literacy",
      convo: "🎧 10 Convo",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.basic} Mock Tests / Month`,
    };
  }
  if (tier === "premium") {
    return {
      persona: "สำหรับสายอัปคะแนน (The Achiever)",
      blurb: "สำหรับคนที่ต้องการอัปคะแนนอย่างจริงจัง",
      read: "📖 30 Read & Vocab",
      feedback: `✍️ ${AI_MONTHLY_LIMIT.premium} Feedback`,
      literacy: "📚 50 Literacy",
      convo: "🎧 20 Convo",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.premium} Mock Tests / Month`,
    };
  }
  if (tier === "vip") {
    return {
      persona: "สำหรับสายล่าคะแนนสูง (The Elite Master)",
      blurb: "เป้าหมายสำคัญมาก ขอเตรียมให้พร้อมที่สุด",
      read: "🔥 UNLIMITED Vocab",
      feedback: `📝 ${AI_MONTHLY_LIMIT.vip} Feedback`,
      literacy: "🔥 UNLIMITED Literacy",
      convo: "🔥 UNLIMITED Convo",
      mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.vip} Full Mock Tests`,
    };
  }
  return {
    persona: "เริ่มต้นใช้งาน (The Starter)",
    blurb: "ลองได้ทุก lane แบบเริ่มต้น และมี personalized feedback credit 1 ครั้งไว้ทดลองงาน AI หนึ่งชิ้น",
    read: "📖 1 Starter Test / Exam Lane",
    feedback: `✍️ ${AI_MONTHLY_LIMIT.free} Personalized Feedback Credit`,
    literacy: "📚 Try each exam lane once",
    convo: "🎧 RW / RS / IS / Photo tasks: choose 1 AI feedback",
    mocks: `📊 ${MOCK_TEST_MONTHLY_LIMIT.free} Mock Tests / Month`,
  };
}

export function LoginWelcomeModal() {
  const pathname = usePathname();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserSummary>({ label: "student", planStatus: "ACTIVE" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/admin")) return;
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
          planStatus: `YOU ARE ON ${TIER_DISPLAY[effectiveTier].nameEn.toUpperCase()} PLAN`,
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

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[radial-gradient(#111_1px,transparent_1px)] bg-[size:20px_20px] bg-gray-100 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-welcome-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-2xl border-4 border-[#111111] bg-white p-6 shadow-[10px_10px_0px_0px_#111111] md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 top-0 flex w-full items-center justify-between overflow-hidden bg-black px-4 py-1.5 text-white">
          <span className="font-mono text-[9px] font-black uppercase tracking-widest">
            Logged in: {user.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="font-mono text-[9px] font-black uppercase text-[#ffcc00]">{user.planStatus}</span>
          </div>
        </div>

        <div className="mb-8 mt-6 text-center">
          <h1
            id="login-welcome-title"
            className="mb-1 text-4xl font-black uppercase italic tracking-tighter md:text-5xl"
          >
            <span className="text-[#004aad]">LANGUAGEPLAN</span>
            <span className="text-[#ffcc00]">PREP.CO</span>
          </h1>
          <p className="inline-block border-b-4 border-black pb-1 text-lg font-black uppercase tracking-tight">
            PLATFORM ฝึก DET ของ ENGLISH PLAN
          </p>
        </div>

        <div className="custom-scroll max-h-[60vh] space-y-8 overflow-y-auto pr-2">
          <div className="flex items-start gap-4 bg-[#ffcc00] p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-black font-black text-white">1</div>
            <div>
              <h2 className="text-xl font-black uppercase leading-tight">ยินดีต้อนรับกลับมา! (Welcome Back)</h2>
              <p className="mt-1 text-sm font-bold italic leading-tight text-black">
                วันนี้คุณพร้อมที่จะยกระดับคะแนน DET แล้วหรือยัง? เลือกหมวดที่ต้องการฝึกด้านล่างได้เลย
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-black font-black text-white">2</div>
              <h2 className="text-xl font-black uppercase leading-tight">ฝึกอะไรได้บ้าง? (Practice Lanes)</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 border-2 border-black bg-rose-50 p-3 text-[10px] font-black">
                <span className="text-lg">✍️</span>
                <span>
                  PRODUCTION <br />
                  <span className="font-mono text-[8px] opacity-50">(Writing & Speaking)</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 border-2 border-black bg-emerald-50 p-3 text-[10px] font-black">
                <span className="text-lg">📖</span>
                <span>
                  COMPREHENSION <br />
                  <span className="font-mono text-[8px] opacity-50">(Reading)</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 border-2 border-black bg-indigo-50 p-3 text-[10px] font-black">
                <span className="text-lg">🎧</span>
                <span>
                  CONVERSATION <br />
                  <span className="font-mono text-[8px] opacity-50">(Listening)</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 border-2 border-black bg-amber-50 p-3 text-[10px] font-black">
                <span className="text-lg">📚</span>
                <span>
                  LITERACY <br />
                  <span className="font-mono text-[8px] opacity-50">(Vocabulary & Grammar)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-black font-black text-white">3</div>
              <h2 className="text-xl font-black uppercase leading-tight">สิทธิ์การใช้งานปัจจุบัน (Plan Tiers)</h2>
            </div>

            <div className="space-y-8">
              <div
                className={`relative flex flex-col border-4 border-black bg-gray-50 ${
                  effectiveTier === "basic" ? "" : "opacity-60"
                }`}
              >
                {effectiveTier === "basic" ? (
                  <div className="absolute -right-12 top-4 rotate-45 border-y-2 border-black bg-black px-14 text-[8px] font-black text-white shadow-lg">
                    CURRENT PLAN
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-b-[3px] border-black bg-gray-200 p-2 text-xs font-black uppercase">
                  <span className="flex items-center gap-2">
                    Basic Plan
                    {effectiveTier === "basic" ? (
                      <span className="border-2 border-black bg-black px-2 py-0.5 font-mono text-[10px] font-black text-white">
                        ACTIVE
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[9px] opacity-40">Entry Level</span>
                </div>
                <div className="p-5">
                  <span className="mb-1 inline-block bg-black px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-white">
                    {basic.persona}
                  </span>
                  <p className="mb-4 text-sm font-bold italic leading-tight text-gray-700">“{basic.blurb}”</p>
                  <div className="grid grid-cols-2 gap-1.5 border-t-2 border-dashed border-black pt-4">
                    <div className="text-[10px] font-bold">{basic.read}</div>
                    <div className="text-[10px] font-bold">{basic.feedback}</div>
                    <div className="text-[10px] font-bold">{basic.literacy}</div>
                    <div className="text-[10px] font-bold">{basic.convo}</div>
                    <div className="col-span-2 mt-2 text-[10px] font-black text-gray-400 underline">{basic.mocks}</div>
                  </div>
                </div>
              </div>

              <div
                className={`relative flex flex-col border-4 border-black ${
                  effectiveTier === "premium"
                    ? "scale-[1.02] overflow-hidden border-[#004aad] bg-[#ffcc00]/10 ring-4 ring-[#004aad] ring-offset-4 ring-offset-white"
                    : "bg-[#ffcc00]/10 opacity-70"
                }`}
              >
                {effectiveTier === "premium" ? (
                  <div className="absolute -right-12 top-4 rotate-45 border-y-2 border-black bg-[#004aad] px-14 text-[8px] font-black text-white shadow-lg">
                    CURRENT PLAN
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-b-[3px] border-black bg-[#ffcc00] p-2 text-xs font-black uppercase">
                  <span className="flex items-center gap-2 text-[#004aad]">
                    Premium Plan
                    {effectiveTier === "premium" ? (
                      <span className="border-2 border-black bg-[#004aad] px-2 py-0.5 font-mono text-[10px] font-black text-white">
                        ACTIVE
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[9px] text-[#004aad]">High Intensity</span>
                </div>
                <div className="p-5">
                  <span className="mb-1 inline-block bg-[#004aad] px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-white">
                    {premium.persona}
                  </span>
                  <p className="mb-4 text-sm font-black italic leading-tight text-[#004aad]">“{premium.blurb}”</p>
                  <div className="grid grid-cols-2 gap-1.5 border-t-2 border-dashed border-black pt-4">
                    <div className="text-[10px] font-black">{premium.read}</div>
                    <div className="text-[10px] font-black">{premium.feedback}</div>
                    <div className="text-[10px] font-black">{premium.literacy}</div>
                    <div className="text-[10px] font-black">{premium.convo}</div>
                    <div className="col-span-2 mt-2 text-[10px] font-black italic text-[#004aad] underline">
                      {premium.mocks}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`relative flex flex-col border-4 ${
                  effectiveTier === "vip"
                    ? "border-[#004aad] bg-[#004aad]/5"
                    : "border-dashed border-[#004aad] bg-[#004aad]/5"
                }`}
              >
                {effectiveTier === "vip" ? (
                  <div className="absolute -right-12 top-4 rotate-45 border-y-2 border-black bg-[#ffcc00] px-14 text-[8px] font-black text-black shadow-lg">
                    CURRENT PLAN
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-b-[3px] border-black bg-[#004aad] p-2 text-xs font-black uppercase">
                  <span className="flex items-center gap-2 italic text-white">
                    VIP Plan
                    {effectiveTier === "vip" ? (
                      <span className="border-2 border-black bg-[#ffcc00] px-2 py-0.5 font-mono text-[10px] font-black text-black not-italic">
                        ACTIVE
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[9px] text-[#ffcc00]">Elite Access</span>
                </div>
                <div className="p-5">
                  <span className="mb-1 inline-block bg-[#004aad] px-2.5 py-0.5 text-[0.65rem] font-black uppercase text-white">
                    {vip.persona}
                  </span>
                  <p className="mb-4 text-sm font-black leading-tight text-[#004aad]">“{vip.blurb}”</p>
                  <div className="grid grid-cols-2 gap-y-3 border-t-2 border-dashed border-black pt-4">
                    <div className="text-[10px] font-black text-[#004aad]">{vip.read}</div>
                    <div className="text-[10px] font-black text-[#004aad]">{vip.literacy}</div>
                    <div className="text-[10px] font-black text-[#004aad]">{vip.convo}</div>
                    <div className="text-[10px] font-black text-[#004aad]">{vip.feedback}</div>
                    <div className="col-span-2 mt-2 border-2 border-black bg-[#ffcc00] py-2 text-center text-[12px] font-black shadow-[4px_4px_0_black]">
                      {vip.mocks}
                    </div>
                  </div>
                </div>
                <div className="border-t-2 border-black bg-white p-3 text-center">
                  <Link href="/pricing" className="font-mono text-[9px] font-black underline hover:text-[#004aad]">
                    UPGRADE TO VIP ➔
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative border-4 border-black bg-[#111111] p-5 text-white">
              <div className="absolute -top-3 left-4 border-2 border-black bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
                PRO-TIP
              </div>
              <p className="mt-1 text-sm font-bold leading-tight">
                ถ้าเจอศัพท์ที่ยังไม่แม่นในขณะฝึกซ้อม ให้กด{" "}
                <span className="font-black text-[#ffcc00] underline">&quot;Add to Notebook&quot;</span>{" "}
                เพื่อเก็บไว้ทบทวนได้ทันทีที่หน้าสรุปผล!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={close}
            className="w-full border-[3px] border-[#111111] bg-[#004aad] py-5 text-xl font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_#111111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#111111]"
          >
            เริ่มเตรียมตัวกันเลย! (Start Practice)
          </button>
        </div>
      </div>
    </div>
  );
}
