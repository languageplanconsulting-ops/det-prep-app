"use client";

import { useEffect, useMemo, useState } from "react";

import { FreeQuotaLockedLink } from "@/components/practice/FreeQuotaLockedLink";
import {
  DICTATION_MAX_SCORE,
  DICTATION_SET_COUNT,
} from "@/lib/dictation-constants";
import { defaultDictationFullBank } from "@/lib/dictationData";
import {
  ensureDictationBankReady,
  getDictationProgress,
  loadDictationBank,
} from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

const DIFFICULTY_THAI: Record<DictationDifficulty, string> = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ยาก",
};

const MASTERY_GATE = 95;

type CellStatus = "mastered" | "retry" | "todo" | "empty";

type SetCell = {
  setNumber: number;
  exists: boolean;
  attempted: boolean;
  pct: number | null;
  status: CellStatus;
};

/**
 * Soft (admin) "Continue + Board" dictation set picker.
 * Title-less by design: a set is only number + score + status. The system
 * recommends the next set; meaning comes from band-mastery-to-95% + status.
 */
export function DictationSetGridSoft({
  round,
  difficulty,
  bankVersion,
}: {
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(() => defaultDictationFullBank());

  useEffect(() => {
    void (async () => {
      await ensureDictationBankReady();
      setBank(loadDictationBank());
    })();
  }, [round, difficulty, bankVersion]);

  const rows = bank[round][difficulty];

  const cells = useMemo<SetCell[]>(() => {
    return Array.from({ length: DICTATION_SET_COUNT }, (_, i) => i + 1).map((setNumber) => {
      const exists = rows.some((s) => s.setNumber === setNumber);
      const prog = getDictationProgress(round, difficulty, setNumber);
      if (!exists) {
        return { setNumber, exists: false, attempted: false, pct: null, status: "empty" as const };
      }
      if (!prog || prog.maxScore <= 0) {
        return { setNumber, exists: true, attempted: false, pct: null, status: "todo" as const };
      }
      const pct = Math.max(0, Math.min(100, Math.round((prog.bestScore / prog.maxScore) * 100)));
      return {
        setNumber,
        exists: true,
        attempted: true,
        pct,
        status: pct >= MASTERY_GATE ? ("mastered" as const) : ("retry" as const),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, round, difficulty, bankVersion]);

  const playable = cells.filter((c) => c.exists);
  const attempted = playable.filter((c) => c.attempted);
  const doneCount = attempted.length;
  const avgAccuracy =
    attempted.length > 0
      ? Math.round(attempted.reduce((sum, c) => sum + (c.pct ?? 0), 0) / attempted.length)
      : 0;
  const gapTo95 = Math.max(0, MASTERY_GATE - avgAccuracy);

  // Recommended next: first un-attempted playable set, else lowest-scoring to retry.
  const recommended =
    playable.find((c) => !c.attempted) ??
    (attempted.length > 0
      ? attempted.reduce((lo, c) => ((c.pct ?? 0) < (lo.pct ?? 0) ? c : lo))
      : null);

  const hrefFor = (setNumber: number) =>
    `/practice/literacy/dictation/round/${round}/${difficulty}/${setNumber}`;

  if (playable.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-base font-bold text-slate-800">ยังไม่มีชุดข้อสอบ</p>
        <p className="mt-1 text-sm text-slate-500">รอบและระดับนี้ยังไม่มีชุดให้ฝึก</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Band-mastery header */}
      <div className="rounded-2xl bg-[#004AAD] p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#FFCC00]">
            ระดับ {difficulty} · {DIFFICULTY_THAI[difficulty]}
          </p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold">
            เต็ม {DICTATION_MAX_SCORE[difficulty]}
          </span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span
            className="text-4xl font-black tracking-tight tabular-nums"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {avgAccuracy}%
          </span>
          <span className="pb-1 text-sm font-semibold text-blue-100">ความแม่นเฉลี่ย → เป้า 95%</span>
        </div>
        <div className="relative mt-3 h-2.5 overflow-visible rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-[#FFCC00] transition-[width] duration-500"
            style={{ width: `${avgAccuracy}%` }}
          />
          <div className="absolute -top-1 h-4 w-0.5 bg-white" style={{ left: "95%" }} />
        </div>
        <p className="mt-2 text-xs text-blue-100">
          {gapTo95 > 0 ? (
            <>
              ขาดอีก <b className="text-white">{gapTo95}%</b> ·{" "}
            </>
          ) : (
            <>
              ถึงเป้าแล้ว 🎉 ·{" "}
            </>
          )}
          ทำแล้ว{" "}
          <b className="text-white tabular-nums">{doneCount}</b>/{playable.length} ชุด
        </p>
      </div>

      {/* Continue hero — the system picks the next set (no title needed) */}
      {recommended ? (
        <div className="rounded-2xl border border-[#FFCC00]/60 bg-white p-5 text-center shadow-sm ring-2 ring-[#FFCC00]/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#004AAD]">
            {recommended.attempted ? "ทำซ้ำเพื่อดันคะแนน · ระบบเลือกให้" : "ทำต่อเลย · ระบบเลือกชุดให้แล้ว"}
          </p>
          <p
            className="mt-2 text-[40px] font-black leading-none tabular-nums text-slate-900"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            ชุดที่ {recommended.setNumber}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            {recommended.attempted
              ? `ครั้งก่อนได้ ${recommended.pct}% · ฟังแล้วพิมพ์ใหม่ให้ดีขึ้น`
              : "ฟังเสียง แล้วพิมพ์ทั้งประโยค · ~1 นาที"}
          </p>
          <FreeQuotaLockedLink
            href={hrefFor(recommended.setNumber)}
            exam="dictation"
            className="mt-4 block w-full rounded-xl bg-[#004AAD] py-3.5 text-base font-bold text-[#FFCC00] transition hover:brightness-110"
          >
            ▶ เริ่มชุดที่ {recommended.setNumber}
          </FreeQuotaLockedLink>
          <p className="mt-2 text-[11px] text-slate-400">
            ทุกชุดคือการฝึกประโยคใหม่ — ทำไปเรื่อย ๆ คะแนนเฉลี่ยจะขึ้นถึง 95%
          </p>
        </div>
      ) : null}

      {/* Board — manual pick. Number + score + status only. */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">หรือเลือกชุดเอง</h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500" />≥95%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-amber-400" />ทำซ้ำ
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded border border-slate-300 bg-white" />ยังไม่ทำ
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
          {cells.map((c) => {
            if (!c.exists) {
              return (
                <div
                  key={c.setNumber}
                  className="flex aspect-square items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300"
                  aria-hidden
                >
                  <span
                    className="text-[13px] tabular-nums"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {c.setNumber}
                  </span>
                </div>
              );
            }
            const isRec = recommended?.setNumber === c.setNumber;
            const palette =
              c.status === "mastered"
                ? { bg: "#ecfdf5", border: "#86efac", num: "#047857", sub: "#059669" }
                : c.status === "retry"
                  ? { bg: "#fffbeb", border: "#fcd34d", num: "#b45309", sub: "#d97706" }
                  : { bg: "#ffffff", border: "#e2e8f0", num: "#475569", sub: "#94a3b8" };
            return (
              <FreeQuotaLockedLink
                key={c.setNumber}
                href={hrefFor(c.setNumber)}
                exam="dictation"
                className={`aspect-square w-full rounded-xl transition hover:-translate-y-0.5 hover:shadow-md ${
                  isRec ? "ring-2 ring-[#004AAD]" : ""
                }`}
              >
                <div
                  className="flex h-full w-full flex-col items-center justify-center rounded-xl border"
                  style={{ background: palette.bg, borderColor: isRec ? "#004AAD" : palette.border }}
                >
                  <span
                    className="text-[13px] font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      color: isRec ? "#004AAD" : palette.num,
                    }}
                  >
                    {c.setNumber}
                  </span>
                  {isRec ? (
                    <span className="text-[8px] font-bold text-[#004AAD]">★ ต่อ</span>
                  ) : c.attempted ? (
                    <span className="text-[8px] font-semibold" style={{ color: palette.sub }}>
                      {c.pct}
                    </span>
                  ) : null}
                </div>
              </FreeQuotaLockedLink>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          แตะชุดไหนก็เริ่มได้ · ตัวเลขมุมล่าง = คะแนน% ครั้งดีสุด
        </p>
      </div>
    </div>
  );
}
