"use client";

import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";

export type MockTestTransitionVariant = "adapting" | "nextSection" | "submittingStage";

const COPY: Record<
  MockTestTransitionVariant,
  { enHead: string; enSub: string; thHead: string; thSub: string }
> = {
  adapting: {
    enHead: "ADAPTING THE DIFFICULTY",
    enSub: "of your next question according to your performance.",
    thHead: "กำลังปรับระดับความยาก",
    thSub: "ของข้อถัดไปให้สอดคล้องกับผลการทำข้อของคุณ",
  },
  nextSection: {
    enHead: "NEXT SECTION",
    enSub: "Preparing the next part of your mock test…",
    thHead: "ส่วนถัดไป",
    thSub: "กำลังเตรียมส่วนถัดไปของแบบทดสอบ…",
  },
  submittingStage: {
    enHead: "PROCESSING YOUR STAGE",
    enSub: "Updating your test and calibrating what comes next…",
    thHead: "กำลังประมวลผลเฟสของคุณ",
    thSub: "กำลังอัปเดตและเตรียมส่วนถัดไป…",
  },
};

/**
 * Full-screen modal for mock test transitions — brutalist + grid aligned with the landing page.
 */
export function MockTestTransitionOverlay({
  open,
  variant,
}: {
  open: boolean;
  variant: MockTestTransitionVariant;
}) {
  if (!open) return null;
  const c = COPY[variant];
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`relative w-full max-w-lg border-4 border-black bg-white p-8 shadow-[8px_8px_0_0_#000] sm:p-10 ${LANDING_PAGE_GRID_BG}`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-black bg-ep-blue text-lg font-black text-white shadow-[4px_4px_0_0_#000]">
            EP
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-600">
              English Plan · DET Mock Test
            </p>
            <p className="text-[11px] font-semibold text-neutral-500">แบบทดสอบจำลอง DET</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase leading-tight tracking-tight text-ep-blue sm:text-3xl">
            {c.enHead}
          </h2>
          <p className="text-base font-semibold leading-snug text-neutral-800">{c.enSub}</p>
          <p className="pt-4 text-xl font-black leading-snug text-neutral-900">{c.thHead}</p>
          <p className="text-base font-semibold leading-snug text-neutral-700">{c.thSub}</p>
        </div>

        <div className="mt-8 flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 flex-1 animate-pulse border-2 border-black bg-ep-yellow"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
