"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { playNotebookSavedSound } from "@/lib/notebook-save-feedback";
import {
  addNotebookEntry,
  loadCustomCategories,
  NOTEBOOK_BUILTIN,
  NOTEBOOK_BUILTIN_LABELS,
  normalizeCategoryIds,
} from "@/lib/notebook-storage";
import type { NotebookCustomCategory, NotebookEntry } from "@/types/writing";

export type SuggestedNotebookPremade =
  | typeof NOTEBOOK_BUILTIN.grammar
  | typeof NOTEBOOK_BUILTIN.vocabulary
  | typeof NOTEBOOK_BUILTIN.productionFeedback
  | "default";

type RadioPremade = SuggestedNotebookPremade;

function premadeToSlug(p: RadioPremade): string {
  if (p === "default") return NOTEBOOK_BUILTIN.productionFeedback;
  return p;
}

const RADIO_OPTIONS: { value: RadioPremade; label: string; hint: string }[] = [
  {
    value: NOTEBOOK_BUILTIN.grammar,
    label: NOTEBOOK_BUILTIN_LABELS[NOTEBOOK_BUILTIN.grammar],
    hint: "Structures, agreement, clauses",
  },
  {
    value: NOTEBOOK_BUILTIN.vocabulary,
    label: NOTEBOOK_BUILTIN_LABELS[NOTEBOOK_BUILTIN.vocabulary],
    hint: "Words, collocations, precision",
  },
  {
    value: NOTEBOOK_BUILTIN.productionFeedback,
    label: NOTEBOOK_BUILTIN_LABELS[NOTEBOOK_BUILTIN.productionFeedback],
    hint: "Task, coherence, examiner-style feedback",
  },
  {
    value: "default",
    label: "Default",
    hint: "General folder — use when unsure (same as production feedback)",
  },
];

export function AddToNotebookButton({
  attemptId,
  suggestedPremade,
  getPayload,
  className = "",
  entrySource = "writing-read-and-write",
  /** Save immediately to Production feedback (no dialog). Use for full submissions on speaking reports. */
  directSaveToProductionFeedback = false,
}: {
  attemptId: string;
  suggestedPremade: SuggestedNotebookPremade;
  getPayload: () => {
    titleEn: string;
    titleTh: string;
    bodyEn: string;
    bodyTh: string;
    excerpt?: string;
  };
  className?: string;
  /** Where this note came from (notebook filter / label). */
  entrySource?: NotebookEntry["source"];
  directSaveToProductionFeedback?: boolean;
}) {
  const dialogTitleId = useId();
  const [open, setOpen] = useState(false);
  const [premade, setPremade] = useState<RadioPremade>(suggestedPremade);
  const [customCats, setCustomCats] = useState<NotebookCustomCategory[]>([]);
  const [extraCustom, setExtraCustom] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const refreshCustom = useCallback(() => {
    setCustomCats(loadCustomCategories());
  }, []);

  useEffect(() => {
    if (open) {
      setPremade(suggestedPremade);
      setExtraCustom(new Set());
      setSaveError(null);
      refreshCustom();
    }
  }, [open, suggestedPremade, refreshCustom]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const runSave = (slug: string, extraIds: string[] = []) => {
    setSaveError(null);
    const ids = normalizeCategoryIds([NOTEBOOK_BUILTIN.all, slug, ...extraIds]);
    const p = getPayload();
    try {
      addNotebookEntry({
        source: entrySource,
        categoryIds: ids,
        titleEn: p.titleEn,
        titleTh: p.titleTh,
        bodyEn: p.bodyEn,
        bodyTh: p.bodyTh,
        userNote: "",
        excerpt: p.excerpt,
        attemptId,
      });
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? e.message
          : "Could not save — check that browser storage is allowed.",
      );
      return false;
    }

    playNotebookSavedSound();
    setOpen(false);
    setToast(true);
    btnRef.current?.classList.add("ep-notebook-flash");
    window.setTimeout(() => {
      btnRef.current?.classList.remove("ep-notebook-flash");
    }, 1200);
    window.setTimeout(() => setToast(false), 4000);
    return true;
  };

  const confirm = () => {
    const slug = premadeToSlug(premade);
    runSave(slug, [...extraCustom]);
  };

  const toggleCustom = (id: string) => {
    setExtraCustom((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (directSaveToProductionFeedback) {
            runSave(premadeToSlug(suggestedPremade));
            return;
          }
          setOpen(true);
        }}
        title={
          directSaveToProductionFeedback
            ? "Saves straight to the suggested folder (no extra step)"
            : undefined
        }
        className={`border-2 border-black bg-ep-yellow px-2 py-1 text-xs font-bold shadow-[2px_2px_0_0_#000] ${className}`}
      >
        Add to notebook
      </button>

      {directSaveToProductionFeedback && saveError && !open ? (
        <p className="mt-1 text-xs font-bold text-red-700">{saveError}</p>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[100] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 border-2 border-black bg-white px-4 py-3 text-center text-sm font-bold shadow-[4px_4px_0_0_#000]"
          role="status"
        >
          added to notebook. don&apos;t forget to study me later! :)
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_#000]"
          >
            <h2 id={dialogTitleId} className="text-lg font-black">
              Save to notebook
            </h2>
            <p className="mt-2 text-xs text-neutral-600">
              Pick a folder. Everything also stays under{" "}
              <strong>{NOTEBOOK_BUILTIN_LABELS[NOTEBOOK_BUILTIN.all]}</strong>. If
              nothing fits, choose <strong>Default</strong>.
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-bold uppercase text-ep-blue">
                Category (required)
              </legend>
              {RADIO_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer gap-2 rounded-sm border-2 border-neutral-200 bg-neutral-50 p-2 text-sm has-[:checked]:border-black has-[:checked]:bg-ep-yellow/30"
                >
                  <input
                    type="radio"
                    name="nb-premade"
                    value={opt.value}
                    checked={premade === opt.value}
                    onChange={() => setPremade(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-bold">{opt.label}</span>
                    <span className="block text-xs text-neutral-600">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            {customCats.length > 0 ? (
              <div className="mt-4 border-t-2 border-neutral-200 pt-3">
                <p className="text-xs font-bold uppercase text-neutral-500">
                  Your categories (optional)
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {customCats.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={extraCustom.has(c.id)}
                        onChange={() => toggleCustom(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {saveError ? (
              <p className="mt-3 text-xs font-bold text-red-700">{saveError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-2 border-black bg-white px-3 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                className="border-2 border-black bg-ep-blue px-3 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_#000]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
