"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SPEAKING_ROUND_NUMBERS } from "@/lib/speaking-constants";
import { countSpeakingVisibleTopicsInRound } from "@/lib/speaking-storage";
import type { SpeakingRoundNum } from "@/types/speaking";

export function ReadSpeakRoundsHub() {
  const [v, setV] = useState(0);

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

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <Link href="/practice" className="text-sm font-bold text-ep-blue hover:underline">
        ← Practice hub
      </Link>
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Read, then speak</p>
        <h1 className="mt-2 text-3xl font-black">Choose a round</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Admin-uploaded topics appear in <strong>Round 1</strong>. Other rounds are reserved for future content.
          Live captions use your browser (Chrome/Edge). <strong>Grading</strong> uses Gemini — set{" "}
          <code className="ep-stat text-xs">GEMINI_API_KEY</code> in{" "}
          <code className="ep-stat text-xs">.env.local</code> (or your host).
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SPEAKING_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round }: { round: SpeakingRoundNum }) {
  const n = countSpeakingVisibleTopicsInRound(round);
  const empty = n === 0;
  return (
    <Link
      href={`/practice/production/read-and-speak/round/${round}`}
      className="ep-interactive ep-brutal flex flex-col rounded-sm border-4 border-black bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {empty ? "COMING SOON" : `${n} topic${n === 1 ? "" : "s"}`}
      </span>
      <span className="ep-stat mt-3 text-xs text-neutral-600">{empty ? "No content yet" : "Open round"}</span>
    </Link>
  );
}
