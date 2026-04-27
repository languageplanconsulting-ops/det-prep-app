"use client";

import { useEffect, useState } from "react";
import type { AiRewardBonus } from "@/types/writing";

export function AiRewardBonusNotice({ reward }: { reward?: AiRewardBonus }) {
  if (!reward) return null;

  return <AiRewardBonusNoticeInner reward={reward} />;
}

function AiRewardBonusNoticeInner({ reward }: { reward: AiRewardBonus }) {
  const [open, setOpen] = useState(true);

  const expires = new Date(reward.expiresAt);
  const expiresLabel = Number.isFinite(expires.getTime())
    ? expires.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : reward.expiresAt;

  useEffect(() => {
    setOpen(true);
  }, [reward.expiresAt, reward.currentScore160, reward.previousScore160]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-bonus-title"
            className="w-full max-w-xl border-4 border-black bg-white shadow-[14px_14px_0_0_#000]"
          >
            <div className="h-3 bg-[linear-gradient(90deg,#ffcc00_0%,#004aad_55%,#ffcc00_100%)]" aria-hidden />
            <div className="p-6 sm:p-7">
              <p className="ep-stat text-[11px] font-black uppercase tracking-[0.28em] text-ep-blue">
                Bonus unlocked / ปลดล็อกรางวัล
              </p>
              <h2
                id="reward-bonus-title"
                className="mt-3 text-3xl font-black uppercase leading-none tracking-tight text-neutral-950 sm:text-4xl"
              >
                Congratulations!
              </h2>
              <p className="mt-2 text-xl font-black text-neutral-900">
                ยินดีด้วย คุณได้รับ AI credit เพิ่มฟรี
              </p>

              <div className="mt-5 border-4 border-black bg-ep-yellow px-5 py-4 shadow-[6px_6px_0_0_#000]">
                <p className="text-base font-bold text-neutral-950">
                  You received <span className="ep-stat text-2xl font-black">1 more AI credit</span> this
                  week because your score improved by more than 5 points.
                </p>
                <p className="mt-2 text-sm font-medium text-neutral-900">
                  คุณได้รับ <span className="ep-stat font-black">AI credit ฟรีเพิ่ม 1 ครั้ง</span> ภายในสัปดาห์นี้
                  เพราะคะแนนของคุณดีขึ้นมากกว่า 5 คะแนนจากรอบก่อน
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                  <p className="ep-stat text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
                    Score jump
                  </p>
                  <p className="mt-2 text-lg font-black text-neutral-900">
                    {reward.previousScore160}/160 → {reward.currentScore160}/160
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">+{reward.scoreGain} points</p>
                </div>
                <div className="border-2 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]">
                  <p className="ep-stat text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
                    Use by / ใช้ก่อน
                  </p>
                  <p className="mt-2 text-lg font-black text-neutral-900">{expiresLabel}</p>
                  <p className="mt-1 text-sm text-neutral-700">Valid for 7 days / ใช้ได้ 7 วัน</p>
                </div>
              </div>

              <p className="mt-5 text-sm text-neutral-700">{reward.messageEn}</p>
              <p className="mt-1 text-sm text-neutral-700">{reward.messageTh}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border-2 border-black bg-ep-blue px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
                >
                  Awesome / เยี่ยมเลย
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-4 border-black bg-ep-yellow p-4 shadow-[6px_6px_0_0_#000]">
        <p className="ep-stat text-[11px] font-black uppercase tracking-[0.22em] text-neutral-800">
          Reward unlocked / รับรางวัลเพิ่ม
        </p>
        <p className="mt-2 text-sm font-bold text-neutral-900">
          Congratulations — you received 1 more AI credit this week because your score improved by more than 5 points.
        </p>
        <p className="mt-1 text-sm text-neutral-800">
          ยินดีด้วย คุณได้รับ AI credit เพิ่มฟรี 1 ครั้งในสัปดาห์นี้ เพราะคะแนนของคุณดีขึ้นมากกว่า 5 คะแนน
        </p>
        <p className="ep-stat mt-3 text-xs font-bold text-neutral-700">
          +{reward.creditsGranted} AI credit · expires {expiresLabel}
        </p>
        <p className="ep-stat mt-1 text-xs font-bold text-neutral-700">
          เดิม {reward.previousScore160}/160 → ตอนนี้ {reward.currentScore160}/160
        </p>
      </div>
    </>
  );
}
