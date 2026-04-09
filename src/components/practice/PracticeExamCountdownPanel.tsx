"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BrutalPanel } from "@/components/ui/BrutalPanel";

const STORAGE_KEY = "ep-practice-exam-countdown-date";

function parseYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Calendar-day difference: target − today (local timezone). */
function daysFromTodayTo(ymd: string): number | null {
  if (!parseYmd(ymd)) return null;
  const [ys, ms, ds] = ymd.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startTarget.getTime() - startToday.getTime()) / 86_400_000);
}

export function PracticeExamCountdownPanel() {
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && parseYmd(v)) {
      setSaved(v);
      setDraft(v);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((v: string | null) => {
    if (v && parseYmd(v)) {
      localStorage.setItem(STORAGE_KEY, v);
      setSaved(v);
      setDraft(v);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setSaved(null);
      setDraft("");
    }
    setPickerOpen(false);
  }, []);

  const delta = useMemo(() => (saved ? daysFromTodayTo(saved) : null), [saved]);

  const headline = useMemo(() => {
    if (delta === null) return null;
    if (delta > 1) return `${delta} days remaining`;
    if (delta === 1) return "1 day remaining";
    if (delta === 0) return "Exam day";
    if (delta === -1) return "1 day since exam date";
    return `${Math.abs(delta)} days since exam date`;
  }, [delta]);

  const formattedDate = useMemo(() => {
    if (!saved || !parseYmd(saved)) return "";
    return new Date(`${saved}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "long" });
  }, [saved]);

  if (!hydrated) {
    return (
      <BrutalPanel eyebrow="Planned exam date" title="Countdown">
        <p className="text-sm text-neutral-600">Loading…</p>
      </BrutalPanel>
    );
  }

  const showForm = !saved || pickerOpen;
  const canSave = parseYmd(draft);

  return (
    <BrutalPanel eyebrow="Planned exam date" title="Countdown">
      <p className="text-sm text-neutral-600">
        Track your countdown to the big day. Pick your exam date to see how many days are left.
      </p>

      {!showForm && saved && delta !== null ? (
        <>
          <p className="ep-stat mt-4 text-4xl font-black tabular-nums text-neutral-900">
            {delta >= 0 ? delta : Math.abs(delta)}
          </p>
          <p className="mt-1 text-sm font-bold text-neutral-700">{headline}</p>
          <p className="mt-2 text-sm text-neutral-500">{formattedDate}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="border-2 border-black bg-ep-yellow px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
              onClick={() => {
                setDraft(saved);
                setPickerOpen(true);
              }}
            >
              Change date
            </button>
            <button
              type="button"
              className="border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
              onClick={() => persist(null)}
            >
              Clear
            </button>
          </div>
        </>
      ) : (
        <>
          {!saved && <p className="ep-stat mt-4 text-2xl font-bold text-neutral-900">NOT SET</p>}
          <label htmlFor="ep-exam-countdown-date" className="mt-4 block text-xs font-bold uppercase text-ep-blue">
            Exam date
          </label>
          <input
            id="ep-exam-countdown-date"
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1 w-full max-w-xs border-2 border-black bg-white px-2 py-2 text-sm font-bold text-neutral-900 shadow-[2px_2px_0_0_#000]"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSave}
              className="border-2 border-black bg-ep-yellow px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] enabled:hover:translate-x-px enabled:hover:translate-y-px enabled:hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => persist(draft)}
            >
              Save date
            </button>
            {pickerOpen && saved ? (
              <button
                type="button"
                className="border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                onClick={() => {
                  setDraft(saved);
                  setPickerOpen(false);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </>
      )}
    </BrutalPanel>
  );
}
