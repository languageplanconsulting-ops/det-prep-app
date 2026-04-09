"use client";

import { useEffect, useState } from "react";
import { countVocabSetsInBank } from "@/lib/vocab-storage";

/**
 * Shown when no vocabulary sets have been uploaded via admin yet
 * (loadVocabVisibleBank is empty everywhere).
 */
export function VocabularyBuilderAvailabilityBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const sync = () => setHidden(countVocabSetsInBank() > 0);
    sync();
    window.addEventListener("ep-vocab-storage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ep-vocab-storage", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className="rounded-sm border-4 border-black bg-gradient-to-r from-ep-yellow/90 to-ep-yellow p-5 shadow-[4px_4px_0_0_#000]"
      role="status"
    >
      <p className="text-center text-base font-black uppercase tracking-wide text-neutral-900 md:text-lg">
        Vocabulary builder will be available 14 April 2026
      </p>
      <p className="mt-2 text-center text-sm font-semibold text-neutral-800">
        ระบบ Vocabulary builder จะพร้อมใช้งานวันที่ 14 เมษายน 2026 — ขณะนี้ยังไม่มีชุดคำศัพท์จากผู้ดูแลระบบ
      </p>
    </div>
  );
}
