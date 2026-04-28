"use client";

import { useEffect, useMemo, useState } from "react";

import { VIP_API_CREDIT_NOTICE_EVENT, VIP_AI_FEEDBACK_WEEKLY_LIMIT } from "@/lib/vip-ai-feedback-quota";

type NoticeState = {
  remaining: number;
  limit: number;
  resetOn: { th: string; en: string };
};

export function VipApiCreditNotebookNotice() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: number | null = null;
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<NoticeState>).detail;
      if (!detail) return;
      setNotice({
        remaining: Math.max(0, Number(detail.remaining) || 0),
        limit: Number(detail.limit) || VIP_AI_FEEDBACK_WEEKLY_LIMIT,
        resetOn: detail.resetOn ?? { th: "วันจันทร์หน้า", en: "next Monday" },
      });
      setVisible(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 7000);
    };
    window.addEventListener(VIP_API_CREDIT_NOTICE_EVENT, onNotice as EventListener);
    return () => {
      window.removeEventListener(VIP_API_CREDIT_NOTICE_EVENT, onNotice as EventListener);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  const pillClass = useMemo(
    () =>
      notice && notice.remaining <= 3
        ? "bg-red-700 text-white"
        : "bg-[#004AAD] text-[#FFCC00]",
    [notice],
  );

  if (!notice || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-4">
      <div className="w-full max-w-xl rounded-[6px] border-4 border-black bg-[#fffdf2] p-4 shadow-[8px_8px_0_0_#000]">
        <p className="ep-stat text-[11px] font-black uppercase tracking-[0.18em] text-ep-blue">
          VIP API Credits Notebook
        </p>
        <p className="mt-1 text-sm font-extrabold text-neutral-900">
          เครดิต AI คงเหลือ {notice.remaining}/{notice.limit} ครั้ง
        </p>
        <p className="text-sm font-bold text-neutral-800">
          Remaining AI credits: {notice.remaining}/{notice.limit}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className={`rounded-full px-2.5 py-1 ${pillClass}`}>Reset {notice.resetOn.en}</span>
          <span className="rounded-full border-2 border-black bg-white px-2.5 py-1 text-neutral-800">
            รีเซ็ต {notice.resetOn.th}
          </span>
          <span className="rounded-full border-2 border-black bg-yellow-100 px-2.5 py-1 text-neutral-900">
            Weekly cap: {notice.limit || VIP_AI_FEEDBACK_WEEKLY_LIMIT}
          </span>
        </div>
      </div>
    </div>
  );
}
