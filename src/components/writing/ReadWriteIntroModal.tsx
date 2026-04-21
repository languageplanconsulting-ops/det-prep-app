"use client";

import { useEffect, useMemo } from "react";

import { IntroModalShell } from "@/components/practice/IntroModalShell";
import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { buildPaywallSpec } from "@/lib/paywall-upsell";
import { getNextLocalMondayLabels } from "@/lib/vip-ai-feedback-quota";

export function ReadWriteIntroModal({
  open,
  onOpenChange,
  onEnter,
  showCredits,
  remaining,
  limit,
  sessionCost,
  canStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnter: () => void;
  showCredits: boolean;
  remaining: number;
  limit: number;
  sessionCost: number;
  canStart: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const resetLabels = useMemo(() => getNextLocalMondayLabels(), []);

  if (!open) return null;

  const dismiss = () => onOpenChange(false);
  const enter = () => {
    onEnter();
    onOpenChange(false);
  };

  return (
    <IntroModalShell
      open={open}
      onDismiss={dismiss}
      labelledBy="read-write-intro-title"
      title={
        <>
          อ่านและเขียนอัจฉริยะ <br />
          <span className="font-mono text-xl font-bold not-italic normal-case text-emerald-500">
            Read and Write
          </span>
        </>
      }
      badge={
        <div className="border-2 border-black bg-emerald-500 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
          GUIDE 07
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={enter}
            disabled={!canStart}
            className={`w-full border-[3px] border-black py-4 text-lg font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#111] transition ${
              canStart
                ? "bg-emerald-500 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                : "cursor-not-allowed bg-neutral-400 opacity-70 shadow-none"
            }`}
          >
            เริ่มแบบฝึกหัด / Start Writing
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full border-2 border-transparent py-2 text-center text-xs font-bold text-neutral-500 underline"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-center font-mono text-[11px] font-black uppercase tracking-widest text-gray-500">
              กระบวนการฝึกฝน / How it works
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="border-2 border-black bg-white p-4">
                <span className="text-xl" aria-hidden>
                  📝
                </span>
                <p className="mt-2 text-sm font-black">อ่านและวิเคราะห์</p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                  คุณจะได้อ่านหัวข้อที่กำหนด จากนั้นต้องเขียนตอบและทำแบบฝึกหัดต่อเนื่องเพื่อวัดความเข้าใจเชิงลึก
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-gray-400">
                  Read the topic &amp; write detailed responses.
                </p>
              </div>

              <div className="border-2 border-black bg-white p-4">
                <span className="text-xl" aria-hidden>
                  🖋️
                </span>
                <p className="mt-2 text-sm font-black">ประเมินทักษะการเขียน</p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                  ระบบจะวิเคราะห์การใช้ไวยากรณ์ การเลือกใช้คำ และให้คำแนะนำเพื่ออัปคะแนนเขียนของคุณ
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-gray-400">
                  Writing analysis &amp; grammar feedback.
                </p>
              </div>
            </div>
          </div>

          <div className="relative border-2 border-dashed border-emerald-500 bg-emerald-50 p-4">
            <div className="absolute -top-3 left-4 bg-emerald-500 px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
              สำคัญมาก / Very Important
            </div>
            <div className="mt-2 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex-1">
                <p className="text-sm font-black text-emerald-600">⚠️ หากกดออกกลางคัน รายงานจะไม่ถูกสร้างให้</p>
                <p className="text-xs font-bold">โควต้า AI สำหรับการตรวจจะใช้ตอนส่งตรวจ กรุณาเขียนให้ครบก่อนกดส่ง</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  AI credit is used when you submit for grading.
                </p>
              </div>
              <div className="min-w-[140px] border-2 border-black bg-white p-2 text-center">
                <p className="font-mono text-[10px] font-bold">CREDITS LEFT</p>
                <p className="text-2xl font-black text-emerald-500">
                  {showCredits ? `${remaining} / ${limit}` : "PLAN-BASED"}
                </p>
                <p className="font-mono text-[9px] font-bold opacity-50">
                  {showCredits ? `RENEW: ${resetLabels.en}` : "CHECK PLAN RULES"}
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-neutral-500">
                  Need {sessionCost} to grade
                </p>
              </div>
            </div>
            {showCredits && !canStart ? (
              <div className="mt-4">
                <PaywallUpsellCard spec={buildPaywallSpec("vip", "ai_limit")} compact />
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-4 border-2 border-black bg-green-50 p-4">
            <div className="font-mono text-3xl font-black text-emerald-500">🎯</div>
            <div>
              <p className="text-lg font-black leading-tight">เป้าหมายคะแนน (Target Score)</p>
              <p className="mt-1 text-sm font-bold text-gray-700">
                คะแนนส่วนนี้จะถูกนำไปคิดในหมวด{" "}
                <span className="text-black underline underline-offset-4">Production &amp; Literacy</span> (เน้นทักษะ Writing)
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase text-emerald-500">
                Focus: Production, Literacy (Writing).
              </p>
            </div>
          </div>

          <div className="border-l-8 border-emerald-500 bg-emerald-50 p-4">
            <p className="text-base font-black leading-snug">
              &quot;ฝึกเขียนให้เหมือนมือโปร: นำศัพท์แนะนำจากรายงานไปใช้ในครั้งถัดไป เพื่อเพิ่มคะแนน Production &amp; Literacy ให้สูงขึ้น!&quot;
            </p>
            <p className="mt-2 font-mono text-xs font-bold uppercase text-gray-500">
              Use recommended vocab to boost your Production &amp; Literacy scores in the next round.
            </p>
          </div>

          <div className="flex items-center gap-2 border-2 border-black bg-gray-100 p-3">
            <span className="text-lg" aria-hidden>
              📓
            </span>
            <p className="text-[11px] font-bold">
              อย่าลืม! กด <span className="text-emerald-600">&quot;Add to Notebook&quot;</span> เพื่อบันทึกศัพท์และรายงานไว้ทบทวน
            </p>
          </div>
      </div>
    </IntroModalShell>
  );
}
