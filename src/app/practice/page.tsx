"use client";

import Link from "next/link";
import { PracticePageOverview } from "@/components/practice/PracticePageOverview";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { canAccessSkill } from "@/lib/access-control";

const hubs = [
  {
    title: "Production",
    subtitle: "Writing & speaking tasks",
    items: [
      {
        label: "Write about photo",
        progress: "5 rounds",
        href: "/practice/production/write-about-photo",
      },
      {
        label: "Read, then write",
        progress: "0/1",
        href: "/practice/production/read-and-write",
      },
      {
        label: "Speak about photo",
        progress: "5 rounds",
        href: "/practice/production/speak-about-photo",
      },
      {
        label: "Read, then speak",
        progress: "0/1",
        href: "/practice/production/read-and-speak",
      },
    ],
  },
  {
    title: "Comprehension",
    subtitle: "Reading: vocab & passages",
    items: [
      {
        label: "Vocabulary",
        progress: "0/1",
        href: "/practice/comprehension/vocabulary",
      },
      {
        label: "Reading",
        progress: "0/1",
        href: "/practice/comprehension/reading",
      },
    ],
  },
  {
    title: "Conversation",
    subtitle: "Interactive listening",
    items: [
      {
        label: "Interactive conversation",
        progress: "0/1",
        href: "/practice/listening/interactive",
        skillGate: "conversation" as const,
      },
      {
        label: "Dialogue → summary (AI)",
        progress: "5 rounds",
        href: "/practice/listening/dialogue-summary",
      },
    ],
  },
  {
    title: "Literacy",
    subtitle: "Dictation, FITB, real word",
    items: [
      {
        label: "Dictation",
        progress: "0/1",
        href: "/practice/literacy/dictation",
      },
      {
        label: "Fill in the blank",
        progress: "0/1",
        href: "/practice/literacy/fill-in-blank",
      },
      {
        label: "Real word",
        progress: "0/1",
        href: "/practice/literacy/real-word",
      },
    ],
  },
  {
    title: "Mock test",
    subtitle: "Full exam simulation",
    items: [
      {
        label: "Full mock test",
        progress: "Opens 22 Apr 2026",
        href: "/mock-test/start",
      },
    ],
  },
] as const;

export default function PracticeHubPage() {
  const { effectiveTier } = useEffectiveTier();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PracticePageOverview />

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Practice hub
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Live academic portal</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Each tile mirrors your practice skill lanes. Thumbnails will show last score /
          redeem / review once attempts exist. Your plan and study stats are above.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {hubs.map((hub) => (
          <BrutalPanel
            key={hub.title}
            eyebrow={hub.subtitle}
            title={hub.title}
          >
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-600">Average score</span>
              <span className="ep-stat text-neutral-400">—</span>
            </div>
            <ul className="space-y-2">
              {hub.items.map((item) => {
                const gate =
                  "skillGate" in item && item.skillGate
                    ? canAccessSkill(effectiveTier, item.skillGate)
                    : null;
                const locked = gate && !gate.allowed;

                if (locked) {
                  return (
                    <li key={item.label}>
                      <div className="flex cursor-not-allowed items-center justify-between rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-100 px-3 py-2 text-sm font-bold text-neutral-500">
                        <span>{item.label}</span>
                        <span className="ep-stat text-xs uppercase text-red-700">
                          Locked
                        </span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between rounded-sm border-2 border-black bg-neutral-50 px-3 py-2 text-sm font-bold hover:bg-ep-yellow/30"
                    >
                      <span>{item.label}</span>
                      <span className="ep-stat text-xs text-neutral-500">
                        {item.progress}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </BrutalPanel>
        ))}
      </div>
    </main>
  );
}
