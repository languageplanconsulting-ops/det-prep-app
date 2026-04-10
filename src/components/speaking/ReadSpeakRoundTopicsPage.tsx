"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { isSpeakingRound } from "@/lib/speaking-constants";
import { loadSpeakingVisibleTopicsForRound } from "@/lib/speaking-storage";
import type { SpeakingRoundNum } from "@/types/speaking";

export function ReadSpeakRoundTopicsPage({ round }: { round: number }) {
  const [v, setV] = useState(0);
  const valid = isSpeakingRound(round);
  const r = valid ? round : (1 as SpeakingRoundNum);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-speaking-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-speaking-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round.</p>
        <Link href="/practice/production/read-and-speak" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </div>
    );
  }

  const topics = loadSpeakingVisibleTopicsForRound(r);

  return (
    <div key={v} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/practice/production/read-and-speak"
        className="text-sm font-bold text-ep-blue hover:underline"
      >
        ← Rounds
      </Link>
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Read, then speak</p>
        <h1 className="mt-2 text-3xl font-black">Round {r}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {topics.length === 0
            ? "COMING SOON — no admin-uploaded topics in this round yet."
            : "Choose a topic. Plan 1–5 minutes, pick a question card, then record or type your answer."}
        </p>
      </header>
      {topics.length === 0 ? (
        <BrutalPanel title="COMING SOON">
          <p className="text-sm text-neutral-700">
            Topics for this round will appear here after they are uploaded in the admin panel. Round 1 is used for
            current uploads.
          </p>
        </BrutalPanel>
      ) : (
        <ul className="space-y-3">
          {topics.map((t) => (
            <li key={t.id}>
              <Link href={`/practice/production/read-and-speak/round/${r}/${t.id}`}>
                <BrutalPanel className="hover:bg-ep-yellow/20">
                  <p className="text-lg font-extrabold">{t.titleEn}</p>
                  <p className="text-sm text-neutral-600">{t.titleTh}</p>
                  <p className="ep-stat mt-2 text-xs text-neutral-500">
                    {t.questions.length} question card{t.questions.length === 1 ? "" : "s"}
                  </p>
                </BrutalPanel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
