"use client";

import { useEffect, useMemo } from "react";

import { IntroModalShell } from "@/components/practice/IntroModalShell";
import {
  GUIDE_ACCENT,
  GuideRevampBody,
  GuideRevampFooter,
} from "@/components/practice/GuideRevampContent";
import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { buildPaywallSpec } from "@/lib/paywall-upsell";
import { getNextLocalMondayLabels } from "@/lib/vip-ai-feedback-quota";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

export function InteractiveSpeakingIntroModal({
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
  const { isAdmin, previewEligible } = useEffectiveTier();
  const showRevamp = true;

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

  if (showRevamp) {
    return (
      <IntroModalShell
        open={open}
        onDismiss={dismiss}
        labelledBy="interactive-speaking-intro-title"
        title={
          <>
            พูดโต้ตอบอัจฉริยะ <br />
            <span className="font-mono text-xl font-bold not-italic normal-case text-rose-500">
              Interactive Speaking
            </span>
          </>
        }
        badge={
          <span className="rounded-full bg-rose-50 px-3 py-1 font-mono text-[11px] font-bold text-rose-500">
            GUIDE 06
          </span>
        }
        footer={
          <GuideRevampFooter
            accent={GUIDE_ACCENT.speaking}
            primaryLabel="เริ่มการสนทนา →"
            onEnter={enter}
            onDismiss={dismiss}
            canStart={canStart}
          />
        }
      >
        <GuideRevampBody
          accent={GUIDE_ACCENT.speaking}
          outcomeTitle="ฝึกพูดโต้ตอบสด ดันคะแนนกลุ่ม Conversation & Production"
          outcomeSub="ระบบถามต่อเนื่องตามที่คุณพูด 5–6 รอบ แล้วให้ฟีดแบ็กรายบุคคล"
          steps={[
            { n: "1", title: "เลือกหัวข้อ & คุยโต้ตอบ", desc: "ระบบฟังคำตอบแล้วถามต่อตามสิ่งที่คุณพูด (5–6 รอบ)" },
            { n: "2", title: "รับฟีดแบ็กรายบุคคล", desc: "คะแนนประเมิน วิธีอัปคะแนน และศัพท์แนะนำเฉพาะคุณ" },
            { n: "3", title: "เก็บลง Notebook ไปใช้รอบหน้า", desc: "นำศัพท์ที่แนะนำไปฝึกต่อ คะแนนจะขยับไวขึ้น" },
          ]}
          mechanics={{
            title: "ก่อนเริ่ม รู้ไว้",
            showCredits,
            remaining,
            limit,
            resetLabel: resetLabels.th,
            canStart,
            bullets: [
              <>
                เป็นบทสนทนาสด — <strong>กดออกกลางคันจะเสียโควตาทันที</strong> เตรียมตัวให้พร้อมก่อนเริ่ม
              </>,
              <>ใช้โควตาสูงสุด {sessionCost} ต่อรอบ</>,
            ],
          }}
          mini={{
            label: "เป็นนักเรียนคอร์ส? ทบทวนเทคนิคการพูดก่อนเริ่ม",
            sub: "มินิเซสชันสอนทีละจุด ~15 นาที · ไว้ทบทวนก่อนลงมือ",
            href: "/practice/mini-study#speaking",
          }}
        />
      </IntroModalShell>
    );
  }

  return (
    <IntroModalShell
      open={open}
      onDismiss={dismiss}
      labelledBy="interactive-speaking-intro-title"
      title={
        <>
          พูดโต้ตอบอัจฉริยะ <br />
          <span className="font-mono text-xl font-bold not-italic normal-case text-rose-500">
            Interactive Speaking
          </span>
        </>
      }
      badge={
        <div className="border-2 border-black bg-rose-500 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
          GUIDE 06
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
                ? "bg-rose-500 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                : "cursor-not-allowed bg-neutral-400 opacity-70 shadow-none"
            }`}
          >
            เริ่มการสนทนา / Start Speaking
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
                  💬
                </span>
                <p className="mt-2 text-sm font-black">คุยแบบ Dynamic</p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                  คุณเลือกหัวข้อที่อยากคุย จากนั้นระบบจะฟังคำตอบและถามคำถามต่อเนื่องตามสิ่งที่คุณพูด (5-6 รอบ)
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-gray-400">
                  Listen &amp; ask based on your response.
                </p>
              </div>

              <div className="border-2 border-black bg-white p-4">
                <span className="text-xl" aria-hidden>
                  📊
                </span>
                <p className="mt-2 text-sm font-black">ฟีดแบ็กรายบุคคล</p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                  วิเคราะห์คะแนนประเมิน, วิธีการอัปคะแนน, และศัพท์แนะนำเฉพาะคุณ
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-gray-400">
                  Personalized score &amp; improvement tips.
                </p>
              </div>
            </div>
          </div>

          <div className="relative border-2 border-dashed border-rose-500 bg-rose-50 p-4">
            <div className="absolute -top-3 left-4 bg-rose-500 px-2.5 py-0.5 text-[0.8rem] font-extrabold uppercase text-white">
              สำคัญมาก / Very Important
            </div>
            <div className="mt-2 flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex-1">
                <p className="text-sm font-black text-rose-500">⚠️ หากกดออกกลางคัน จะเสียโควตาทันที!</p>
                <p className="text-xs font-bold">กรุณาเตรียมตัวให้พร้อมก่อนเริ่มการสนทนา</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase text-gray-400">
                  If you quit mid-way, your credit is lost.
                </p>
              </div>
              <div className="min-w-[140px] border-2 border-black bg-white p-2 text-center">
                <p className="font-mono text-[10px] font-bold">CREDITS LEFT</p>
                <p className="text-2xl font-black text-rose-500">
                  {showCredits ? `${remaining} / ${limit}` : "PLAN-BASED"}
                </p>
                <p className="font-mono text-[9px] font-bold opacity-50">
                  {showCredits ? `RENEW: ${resetLabels.en}` : "CHECK PLAN RULES"}
                </p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase text-neutral-500">
                  Need up to {sessionCost}
                </p>
              </div>
            </div>
            {showCredits && !canStart ? (
              <div className="mt-4">
                <PaywallUpsellCard spec={buildPaywallSpec("vip", "feedback_limit")} compact />
              </div>
            ) : null}
          </div>

          <div className="border-l-8 border-rose-500 bg-rose-50 p-4">
            <p className="text-base font-black leading-snug">
              &quot;อย่าลืมบันทึกรายงานและคำศัพท์แนะนำลง Notebook เพื่อนำไปใช้ฝึกอัปคะแนนในรอบหน้า!&quot;
            </p>
            <p className="mt-2 font-mono text-xs font-bold uppercase text-gray-500">
              Add the report &amp; recommended vocab to your notebook to improve your next score.
            </p>
          </div>
      </div>
    </IntroModalShell>
  );
}
