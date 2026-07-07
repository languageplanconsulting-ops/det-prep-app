"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DET_TARGET, lockExplainTh, type LessonTierKey } from "@/lib/lesson-tiers";
import { useLessonUserId } from "@/lib/lesson-user";
import { fetchSeenKeys, itemKey, type LessonSkillTag } from "@/lib/lesson-seen";
import {
  getLessonProgress,
  loadLessonProgress,
  stars,
  unitKey,
  unitSeenState,
  type UnitScores,
} from "@/lib/lessons-progress";

export type LessonTierConfig = {
  key: LessonTierKey;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  ink: string;
  icon: string;
  blurbTh: string;
};

export function LessonPathHub({
  topic,
  skillTag,
  heroKicker,
  heroTitle,
  heroSub,
  unitSize,
  tiers,
  unitsForTier,
  idOf,
  hrefForUnit,
}: {
  topic: string;
  skillTag: LessonSkillTag;
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  unitSize: number;
  tiers: LessonTierConfig[];
  unitsForTier: (tier: LessonTierKey) => { id: string }[][];
  idOf: (item: { id: string }) => string;
  hrefForUnit: (tier: LessonTierKey, unit: number) => string;
}) {
  const uid = useLessonUserId();
  const [scores, setScores] = useState<UnitScores>(getLessonProgress());
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    loadLessonProgress(uid).then((s) => alive && setScores({ ...s }));
    fetchSeenKeys(uid).then((k) => alive && setSeenKeys(k));
    return () => {
      alive = false;
    };
  }, [uid]);

  let totalUnits = 0;
  let doneUnits = 0;
  for (const t of tiers) {
    const n = unitsForTier(t.key).length;
    totalUnits += n;
    for (let u = 0; u < n; u++) if (unitKey(topic, t.key, u) in scores) doneUnits++;
  }
  const overallPct = totalUnits ? Math.round((doneUnits / totalUnits) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#FFCC00]">{heroKicker}</p>
          <p className="mt-2 text-xl font-black leading-tight">{heroTitle}</p>
          <p className="mt-2 text-xs text-slate-300">{heroSub}</p>
        </div>
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-[#FFCC00] bg-white/5 text-center">
          <span className="text-lg font-black">{overallPct}%</span>
          <span className="text-[9px] font-bold text-slate-300">{doneUnits}/{totalUnits} ด่าน</span>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-indigo-50 p-3.5 text-xs font-semibold leading-relaxed text-indigo-900">
        {lockExplainTh(unitSize)}
      </p>

      {tiers.map((tier) => {
        const units = unitsForTier(tier.key);
        const done = units.reduce((n, _u, i) => n + (unitKey(topic, tier.key, i) in scores ? 1 : 0), 0);
        return (
          <div key={tier.key} className="mt-6">
            <div className="flex items-center gap-3 rounded-xl border p-3.5" style={{ backgroundColor: tier.soft, borderColor: tier.color }}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">{tier.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black" style={{ color: tier.ink }}>{tier.th}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: tier.color }}>{tier.cefr}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{tier.blurbTh}</p>
                <p className="mt-1 text-xs font-bold" style={{ color: tier.ink }}>🎯 {DET_TARGET[tier.key].th}</p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${units.length ? (done / units.length) * 100 : 0}%`, backgroundColor: tier.color }} />
              </div>
              <span className="text-xs font-bold text-slate-500">{done}/{units.length}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-3.5">
              {units.map((u, i) => {
                const seenCount = u.filter((l) => seenKeys.has(itemKey(skillTag, idOf(l)))).length;
                const st = unitSeenState(scores, topic, tier.key, i, seenCount);
                const key = unitKey(topic, tier.key, i);
                const sc = scores[key];
                const star = typeof sc === "number" ? stars(sc) : 0;
                const locked = st === "locked";
                const doneU = st === "done";
                const partial = st === "partial";
                const node = (
                  <div className="flex w-[62px] flex-col items-center">
                    <div
                      className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[2.5px] text-xl font-black shadow-sm transition-transform hover:scale-105"
                      style={
                        locked
                          ? { backgroundColor: "#EDE8DD", borderColor: "#E0DACD" }
                          : { backgroundColor: doneU ? tier.color : partial ? tier.soft : "#fff", borderColor: tier.color, color: doneU ? "#fff" : tier.ink }
                      }
                    >
                      {locked ? "🔒" : i + 1}
                    </div>
                    <div className="mt-1 flex h-4 items-center justify-center">
                      {doneU ? (
                        <span className="text-[11px] text-amber-400">
                          {[0, 1, 2].map((k) => (
                            <span key={k} style={{ opacity: k < star ? 1 : 0.22 }}>★</span>
                          ))}
                        </span>
                      ) : partial ? (
                        <span className="text-[10px] font-bold text-slate-500">{u.length - seenCount} เหลือ</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{locked ? "" : "เริ่ม"}</span>
                      )}
                    </div>
                  </div>
                );
                return locked ? (
                  <div key={i} className="cursor-not-allowed opacity-90">{node}</div>
                ) : (
                  <Link key={i} href={hrefForUnit(tier.key, i)}>{node}</Link>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="mt-8 text-center text-xs text-slate-400">ผ่านด่านเพื่อปลดล็อกด่านถัดไป · ทำซ้ำเพื่อเก็บ ★ ให้ครบ</p>
    </div>
  );
}
