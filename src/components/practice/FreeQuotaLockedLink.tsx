"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getNonApiReminderSnapshot, type NonApiReminderExam } from "@/lib/non-api-practice-usage";
import { buildPaywallSpec } from "@/lib/paywall-upsell";

export function FreeQuotaLockedLink({
  href,
  exam,
  className,
  children,
}: {
  href: string;
  exam: NonApiReminderExam;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  const snapshot = useMemo(() => {
    if (loading || effectiveTier !== "free") return null;
    return getNonApiReminderSnapshot(exam, effectiveTier);
  }, [effectiveTier, exam, loading]);

  const isLocked = snapshot != null && snapshot.remaining <= 0;

  const onOpen = () => {
    if (loading) return;
    if (isLocked) {
      setOpen(true);
      return;
    }
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        disabled={loading}
        className={className}
      >
        {children}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-lock-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-4 border-black bg-[linear-gradient(160deg,#ffffff_0%,#eef7ff_52%,#fff7db_100%)] p-5 shadow-[10px_10px_0_0_#111] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#004AAD]">
                  Free quota used
                </p>
                <h2 id="free-lock-title" className="mt-2 text-2xl font-black tracking-tight text-neutral-900 md:text-3xl">
                  It’s locked for free users.
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700">
                  You already used up your free quota for {snapshot?.examLabel ?? "this exam bank"}.
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-neutral-700">
                  ส่วนนี้ถูกล็อกสำหรับผู้ใช้ฟรี เพราะคุณใช้สิทธิ์ทดลองใช้ฟรีของ {snapshot?.examLabel ?? "แบบฝึกนี้"} ครบแล้ว
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border-2 border-black bg-white/80 p-4">
              <p className="text-sm font-bold leading-6 text-neutral-800">
                You can still browse the exam bank, but starting a new set now needs a paid package.
              </p>
              <p className="mt-1 text-sm font-bold leading-6 text-neutral-800">
                คุณยังดูคลังข้อสอบได้ แต่ถ้าจะเริ่มทำเซ็ตใหม่ตอนนี้ ต้องอัปเกรดแพ็กเกจก่อน
              </p>
            </div>

            <div className="mt-5">
              <PaywallUpsellCard spec={buildPaywallSpec("free", "heavy_free")} compact />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="rounded-[16px] border-4 border-black bg-[#004AAD] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_#111]"
              >
                ดูแพ็กเกจ / Explore packages
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[16px] border-2 border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-neutral-900 shadow-[3px_3px_0_0_#111]"
              >
                ปิด / Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
