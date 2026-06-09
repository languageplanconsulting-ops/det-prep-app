"use client";

import Link from "next/link";
import { useState } from "react";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import type { MiniStudySession } from "@/lib/mini-study/content";
import { MiniStudyDictationPhase } from "./MiniStudyDictationPhase";
import { MiniStudyEssayClozePhase } from "./MiniStudyEssayClozePhase";
import { MiniStudyEssayPickPhase } from "./MiniStudyEssayPickPhase";
import { MiniStudyExplanation } from "./MiniStudyExplanation";
import { MiniStudyListenRespondPhase } from "./MiniStudyListenRespondPhase";
import { MiniStudyListeningMcPhase } from "./MiniStudyListeningMcPhase";
import { MiniStudyPhotoSpeakPhase } from "./MiniStudyPhotoSpeakPhase";
import { MiniStudyPhotoWritePhase } from "./MiniStudyPhotoWritePhase";
import { MiniStudySummaryPhase } from "./MiniStudySummaryPhase";

type Props = { session: MiniStudySession };

export function MiniStudySessionClient({ session }: Props) {
  const { isAdmin, loading } = useEffectiveTier();
  const [started, setStarted] = useState(false);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-sm border-4 border-black bg-[#fff7d1] p-6 shadow-[6px_6px_0_0_#111]">
          <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
            Admin only
          </p>
          <h1 className="mt-2 text-2xl font-black">Mini Study Session</h1>
          <p className="mt-2 text-sm text-neutral-700">
            This feature is in admin preview.
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-block rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
          >
            ← Back to Practice
          </Link>
        </div>
      </main>
    );
  }

  if (!started) {
    const startLabel =
      session.kind === "dictation"
        ? "Start dictation →"
        : session.kind === "write-about-photo"
          ? "Start writing →"
          : session.kind === "speak-about-photo"
            ? "Start speaking →"
            : session.kind === "interactive-listening-mc"
              ? "Start listening →"
              : session.kind === "listen-respond"
                ? "Start exercises →"
                : session.kind === "essay-pick"
                  ? "Start essay practice →"
                  : session.kind === "essay-cloze"
                    ? "Start cloze exercises →"
                    : "Start practice →";
    return (
      <MiniStudyExplanation
        sessionIndex={session.index}
        durationLabel={session.durationLabel}
        title={session.title}
        subtitle={session.subtitle}
        blocks={session.explanation}
        startLabel={startLabel}
        onStart={() => setStarted(true)}
      />
    );
  }

  if (session.kind === "dictation") {
    return <MiniStudyDictationPhase session={session} />;
  }
  if (session.kind === "write-about-photo") {
    return <MiniStudyPhotoWritePhase session={session} />;
  }
  if (session.kind === "speak-about-photo") {
    return <MiniStudyPhotoSpeakPhase session={session} />;
  }
  if (session.kind === "interactive-listening-mc") {
    return <MiniStudyListeningMcPhase session={session} />;
  }
  if (session.kind === "listen-respond") {
    return <MiniStudyListenRespondPhase session={session} />;
  }
  if (session.kind === "conversation-summary") {
    return <MiniStudySummaryPhase session={session} />;
  }
  if (session.kind === "essay-pick") {
    return <MiniStudyEssayPickPhase session={session} />;
  }
  return <MiniStudyEssayClozePhase session={session} />;
}
