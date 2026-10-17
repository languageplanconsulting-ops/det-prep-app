"use client";

import { useEffect, useState } from "react";

import { IntroModalShell } from "@/components/practice/IntroModalShell";

type PersistentTopic = {
  topicEn: string;
  topicTh: string;
  occurrenceCount: number;
};

function warnedKey(skill: string): string {
  return `ep-weakness-warned:${skill}`;
}

/** Local day stamp, so "today" means the learner's today, not UTC's. */
function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function alreadyWarnedToday(skill: string): boolean {
  try {
    return window.localStorage.getItem(warnedKey(skill)) === todayStamp();
  } catch {
    return false;
  }
}

function markWarnedToday(skill: string): void {
  try {
    window.localStorage.setItem(warnedKey(skill), todayStamp());
  } catch {
    /* private mode — showing it again is better than crashing */
  }
}

/**
 * "You keep making this mistake — watch for it this time."
 *
 * Shown once, before a production exercise starts, for the grammar habits this
 * learner has repeated across earlier writing AND speaking attempts. Renders
 * nothing at all unless there is a real confirmed pattern, so a new learner —
 * or one who has fixed their habits — never sees it.
 *
 * It mounts before any prep timer is started, so it can't eat planning time.
 */
export function PersistentWeaknessModal({
  skill,
  previewTopics,
}: {
  skill: "writing" | "speaking";
  /** Design preview only — skips the fetch and shows these instead. */
  previewTopics?: PersistentTopic[];
}) {
  const [topics, setTopics] = useState<PersistentTopic[]>(previewTopics ?? []);
  const [open, setOpen] = useState(Boolean(previewTopics?.length));

  useEffect(() => {
    if (previewTopics) return;
    // Once a day per skill. A learner doing five exercises in one sitting should
    // be reminded, not nagged five times — and a warning that always appears
    // stops being read at all.
    if (alreadyWarnedToday(skill)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/production-weakness?skill=${skill}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { topics?: PersistentTopic[] };
        const found = data.topics ?? [];
        if (cancelled || found.length === 0) return;
        setTopics(found);
        setOpen(true);
        markWarnedToday(skill);
      } catch {
        // Never block the exercise over a warning that failed to load.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skill, previewTopics]);

  if (topics.length === 0) return null;

  return (
    <IntroModalShell
      open={open}
      onDismiss={() => setOpen(false)}
      labelledBy="persistent-weakness-title"
      title="จุดที่คุณผิดซ้ำบ่อย"
      badge={
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          ระวังรอบนี้
        </span>
      }
      maxWidthClassName="max-w-xl"
      footer={
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
        >
          เข้าใจแล้ว เริ่มเลย
        </button>
      }
    >
      <p className="text-sm text-slate-700">
        จากข้อสอบเขียนและพูดครั้งก่อน ๆ ของคุณ เราเจอข้อผิดพลาดเดิมซ้ำหลายครั้ง
        ลองตั้งใจเลี่ยงจุดนี้ในรอบนี้ดู
      </p>
      <ul className="mt-4 space-y-3">
        {topics.map((t) => (
          <li
            key={`${t.topicEn}-${t.topicTh}`}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="font-bold text-slate-900">{t.topicTh || t.topicEn}</p>
            {t.topicEn && t.topicTh ? (
              <p className="mt-0.5 text-sm text-slate-600">{t.topicEn}</p>
            ) : null}
            <p className="mt-2 text-xs font-bold text-amber-800">
              เจอในข้อสอบของคุณ {t.occurrenceCount} ครั้ง
            </p>
          </li>
        ))}
      </ul>
    </IntroModalShell>
  );
}
