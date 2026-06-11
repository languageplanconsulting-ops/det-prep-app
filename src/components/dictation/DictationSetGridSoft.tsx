"use client";

import { useEffect, useMemo, useState } from "react";

import { NonApiExamQuotaReminder } from "@/components/practice/NonApiExamQuotaReminder";
import { SoftSetPicker, softPct, type SoftSetItem } from "@/components/practice/SoftSetPicker";
import { DICTATION_DIFFICULTY_LABEL, DICTATION_SET_COUNT } from "@/lib/dictation-constants";
import { defaultDictationFullBank } from "@/lib/dictationData";
import {
  ensureDictationBankReady,
  getDictationProgress,
  loadDictationBank,
} from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

/** Admin "Clean Grid" dictation set picker (shared SoftSetPicker). */
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

  const items = useMemo<SoftSetItem[]>(() => {
    return Array.from({ length: DICTATION_SET_COUNT }, (_, i) => i + 1)
      .filter((n) => rows.some((s) => s.setNumber === n))
      .map((n) => ({
        key: String(n),
        label: `ชุด ${n}`,
        href: `/practice/literacy/dictation/round/${round}/${difficulty}/${n}`,
        pct: softPct(getDictationProgress(round, difficulty, n)),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, round, difficulty, bankVersion]);

  return (
    <SoftSetPicker
      round={round}
      difficultyLabel={DICTATION_DIFFICULTY_LABEL[difficulty]}
      title="ฟังแล้วพิมพ์"
      noun="ชุด"
      items={items}
      lockExam="dictation"
      changeDifficultyHref={`/practice/literacy/dictation/round/${round}`}
      allRoundsHref="/practice/literacy/dictation"
      notice={<NonApiExamQuotaReminder exam="dictation" />}
    />
  );
}
