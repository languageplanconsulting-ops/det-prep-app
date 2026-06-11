"use client";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * V2 "Explained grid": a one-line answer to "what is a round?" — the missing
 * piece that made the rounds hub confusing. Self-gating to admins/preview for
 * now; real users see the current hub unchanged.
 */
export function RoundsExplainer() {
  const { isAdmin, previewEligible } = useEffectiveTier();
  if (!(isAdmin || previewEligible)) return null;
  return (
    <div className="rounded-xl bg-[#eef4ff] px-4 py-3 text-[13px] leading-6 text-slate-700 ring-1 ring-[#004AAD]/15">
      <b className="text-[#004AAD]">รอบคืออะไร?</b> แต่ละรอบ = ชุดเนื้อหาใหม่ (มีครบ ง่าย/กลาง/ยาก) ·{" "}
      <b>ทำเรียงกันไปเรื่อย ๆ</b> หรือข้ามก็ได้ · เริ่มที่รอบ ⭐ ที่แนะนำได้เลย
    </div>
  );
}
