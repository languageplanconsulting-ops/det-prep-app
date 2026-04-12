"use client";

import { useRef, useState } from "react";

import { playNotebookSavedSound } from "@/lib/notebook-save-feedback";
import {
  addNotebookEntry,
  NOTEBOOK_BUILTIN,
  normalizeCategoryIds,
} from "@/lib/notebook-storage";
import type { NotebookEntry } from "@/types/writing";

const BTN_CLASS =
  "inline-flex items-center border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none";

const COPY = {
  en: {
    add: "Add to notebook",
    toast: "added to notebook. don't forget to study me later! :)",
    error: "Could not save — check that browser storage is allowed.",
  },
  th: {
    add: "เพิ่มรายงานเต็มในสมุด",
    toast: "บันทึกในสมุดแล้ว อย่าลืมกลับมาทบทวนนะ :)",
    error: "บันทึกไม่สำเร็จ — ตรวจสอบว่าอนุญาตการเก็บข้อมูลในเบราว์เซอร์",
  },
} as const;

export function FullReportNotebookButton({
  attemptId,
  entrySource,
  build,
  className = BTN_CLASS,
  uiLocale = "en",
}: {
  attemptId: string;
  entrySource: NotebookEntry["source"];
  build: () => {
    titleEn: string;
    titleTh: string;
    bodyEn: string;
    bodyTh: string;
    excerpt: string;
    fullBodyEn: string;
    fullBodyTh: string;
  };
  className?: string;
  /** `th` = Thai button label and toasts (production report full view). */
  uiLocale?: "en" | "th";
}) {
  const t = COPY[uiLocale];
  const btnRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    const preview = build();
    try {
      addNotebookEntry({
        source: entrySource,
        categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback]),
        titleEn: preview.titleEn,
        titleTh: preview.titleTh,
        bodyEn: preview.bodyEn,
        bodyTh: preview.bodyTh,
        fullBodyEn: preview.fullBodyEn,
        fullBodyTh: preview.fullBodyTh,
        userNote: "",
        excerpt: preview.excerpt,
        attemptId,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t.error,
      );
      return;
    }
    playNotebookSavedSound();
    btnRef.current?.classList.add("ep-notebook-flash");
    window.setTimeout(() => btnRef.current?.classList.remove("ep-notebook-flash"), 1200);
    setToast(true);
    window.setTimeout(() => setToast(false), 4000);
  };

  return (
    <>
      <button ref={btnRef} type="button" onClick={onClick} className={className}>
        {t.add}
      </button>
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[100] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 border-2 border-black bg-white px-4 py-3 text-center text-sm font-bold shadow-[4px_4px_0_0_#000]"
          role="status"
        >
          {t.toast}
        </div>
      ) : null}
    </>
  );
}
