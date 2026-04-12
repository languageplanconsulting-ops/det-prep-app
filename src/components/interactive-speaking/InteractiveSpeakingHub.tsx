"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import { loadInteractiveSpeakingScenarios } from "@/lib/interactive-speaking-storage";
import type { InteractiveSpeakingScenario } from "@/types/interactive-speaking";

export function InteractiveSpeakingHub() {
  const [scenarios, setScenarios] = useState<InteractiveSpeakingScenario[]>([]);

  useEffect(() => {
    const load = () => setScenarios(loadInteractiveSpeakingScenarios());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("ep-interactive-speaking-storage", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("ep-interactive-speaking-storage", load);
    };
  }, []);

  return (
    <main className={`min-h-screen ${LANDING_PAGE_GRID_BG}`}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <Link
          href="/practice"
          className="mb-6 inline-flex text-sm font-bold text-ep-blue underline-offset-4 hover:underline"
        >
          ← Practice hub
        </Link>

        <header className="border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
          <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
            Production
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            Interactive speaking
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-neutral-600">
            Six short turns per scenario. You only see the first question from your teacher — the app
            asks follow-ups based on what you say. Listen once, prepare 10 seconds, then speak (max
            ~35 seconds per turn).
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {scenarios.length === 0 ? (
            <p className="text-sm font-bold text-neutral-600">
              No scenarios yet. Ask your admin to upload JSON from the admin panel.
            </p>
          ) : (
            scenarios.map((s) => (
              <Link
                key={s.id}
                href={`/practice/production/interactive-speaking/${s.id}`}
                className="block"
              >
                <BrutalPanel
                  variant="elevated"
                  title={s.titleEn}
                  className="transition-transform hover:-translate-y-0.5"
                >
                  <p className="text-sm text-neutral-600">{s.titleTh}</p>
                  <p className="mt-3 ep-stat text-[10px] font-bold uppercase text-ep-blue">
                    Open scenario →
                  </p>
                </BrutalPanel>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
