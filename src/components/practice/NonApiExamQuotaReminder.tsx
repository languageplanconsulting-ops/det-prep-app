"use client";

import { useEffect, useMemo, useState } from "react";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  getNonApiReminderSnapshot,
  type NonApiReminderExam,
  type NonApiReminderSnapshot,
} from "@/lib/non-api-practice-usage";

const STORAGE_EVENTS = [
  "storage",
  "focus",
  "ep-reading-storage",
  "ep-vocab-storage",
  "ep-dictation-storage",
  "ep-fitb-storage",
  "ep-realword-storage",
  "ep-conversation-storage",
] as const;

function toneForSnapshot(snapshot: NonApiReminderSnapshot) {
  if (snapshot.remaining <= 3) {
    return {
      panel:
        "border-[#7a0f0f] bg-[linear-gradient(135deg,#fff6ea_0%,#ffe1d7_55%,#fff7f2_100%)] text-[#4b1610]",
      badge: "border-[#7a0f0f] bg-[#fff] text-[#7a0f0f]",
      meter: "from-[#d94841] via-[#ef7b6a] to-[#ffb17e]",
      dot: "bg-[#d94841]",
    };
  }

  if (snapshot.remaining <= Math.ceil(snapshot.limit * 0.4)) {
    return {
      panel:
        "border-[#8a5b00] bg-[linear-gradient(135deg,#fff7d1_0%,#ffe9a4_55%,#fffdfa_100%)] text-[#4f3900]",
      badge: "border-[#8a5b00] bg-[#fff] text-[#8a5b00]",
      meter: "from-[#f3b400] via-[#ffcc00] to-[#ffd96a]",
      dot: "bg-[#f3b400]",
    };
  }

  return {
    panel:
      "border-[#004aad] bg-[linear-gradient(135deg,#eef7ff_0%,#dff1ff_48%,#fff9df_100%)] text-[#0b2240]",
    badge: "border-[#004aad] bg-white text-[#004aad]",
    meter: "from-[#004aad] via-[#277fe8] to-[#ffcc00]",
    dot: "bg-[#0f62c9]",
  };
}

export function NonApiExamQuotaReminder({ exam }: { exam: NonApiReminderExam }) {
  const { effectiveTier, loading } = useEffectiveTier();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    for (const eventName of STORAGE_EVENTS) {
      window.addEventListener(eventName, refresh);
    }
    return () => {
      for (const eventName of STORAGE_EVENTS) {
        window.removeEventListener(eventName, refresh);
      }
    };
  }, []);

  const snapshot = useMemo(() => {
    if (loading || (effectiveTier !== "basic" && effectiveTier !== "free")) return null;
    return getNonApiReminderSnapshot(exam, effectiveTier);
  }, [effectiveTier, exam, loading, tick]);

  if (!snapshot) return null;

  const tone = toneForSnapshot(snapshot);
  const isLifetime = snapshot.cycleKind === "lifetime";
  const isFree = effectiveTier === "free";
  const progress = snapshot.limit > 0 ? Math.min(100, Math.round((snapshot.used / snapshot.limit) * 100)) : 0;

  // Thai-forward copy (exam names stay in English as proper labels).
  const headingLabel =
    snapshot.remaining <= 0
      ? `ใช้สิทธิ์ทดลองฟรีของ ${snapshot.examLabel} ครบแล้ว`
      : `เหลือสิทธิ์ทดลองฟรี ${snapshot.examLabel} อีก ${snapshot.remaining} ครั้ง`;

  const descriptionLabel = isLifetime
    ? "ผู้ใช้แพ็กฟรีทดลองแต่ละบทเรียนได้ 1 ครั้ง หลังจากนั้นยังเปิดดูคลังข้อสอบได้ แต่แต่ละชุดจะล็อกจนกว่าจะอัปเกรด"
    : snapshot.sharesPool
      ? "Dictation, Fill in the Blank และ Real Word ใช้โควต้า Literacy ก้อนเดียวกันในแพ็ก Basic"
      : `โควต้าของ ${snapshot.examLabel} ในรอบนี้`;

  const planLabel = isFree ? "สิทธิ์ทดลองฟรี" : "แพ็ก Basic";
  const cycleChipLabel = isLifetime ? "ทดลองฟรี 1 ครั้ง/บทเรียน" : snapshot.cycleLabel;
  const usageLabel = `ใช้ไป ${snapshot.used}/${snapshot.limit}`;
  const quotaSideLabel = isLifetime ? "โควต้าฟรี" : "เดือนนี้";
  const windowLabel = isLifetime ? "ใช้ไปแล้ว" : "ใช้เดือนนี้";
  const helperLabel =
    snapshot.remaining <= 0
      ? "อยากฝึกต่อแบบไม่จำกัด? อัปเกรดเพื่อปลดล็อกทุกชุด"
      : "ลองฟรีได้เลย — ใช้สิทธิ์ตามจำนวนที่เหลือ";
  const footerLabel = isLifetime
    ? "ทดลองฟรีได้ 1 ครั้ง ต่อ 1 คลังข้อสอบ"
    : "รีเซ็ตเมื่อขึ้นรอบเดือนใหม่";

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out md:p-6 ${tone.panel}`}
      aria-label={`${snapshot.examLabel} remaining ${snapshot.cycleKind === "lifetime" ? "lifetime" : "monthly"} tests`}
    >
      <div className="pointer-events-none absolute -right-10 top-[-72px] h-40 w-40 rounded-full bg-white/55 blur-3xl" />
      <div className="pointer-events-none absolute -left-8 bottom-[-60px] h-28 w-28 rounded-full bg-[#ffcc00]/25 blur-2xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${tone.badge}`}>
              {planLabel}
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/65">
              {cycleChipLabel}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
            {headingLabel}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-black/70">
            {descriptionLabel}
          </p>
        </div>

        <div className="grid min-w-0 gap-3 rounded-[24px] border border-black/10 bg-white/70 p-4 backdrop-blur-[1px] sm:min-w-[220px] lg:min-w-[260px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                คงเหลือ
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums">{snapshot.remaining}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/45">
                {quotaSideLabel}
              </p>
              <p className="mt-1 text-sm font-bold text-black/70">{usageLabel}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              <span>{windowLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${tone.meter}`}
                style={{ width: `${Math.max(progress, snapshot.used > 0 ? 10 : 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-black/65">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
          {helperLabel}
        </span>
        <span className="rounded-full bg-white/60 px-3 py-1.5">
          {footerLabel}
        </span>
      </div>
    </section>
  );
}
