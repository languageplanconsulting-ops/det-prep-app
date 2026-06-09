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
import { MiniStudyPassageMcPhase } from "./MiniStudyPassageMcPhase";
import { MiniStudyPhotoSpeakPhase } from "./MiniStudyPhotoSpeakPhase";
import { MiniStudyPhotoWritePhase } from "./MiniStudyPhotoWritePhase";
import { MiniStudySummaryPhase } from "./MiniStudySummaryPhase";

type Props = { session: MiniStudySession };

export function MiniStudySessionClient({ session }: Props) {
  const { isAdmin, previewEligible, loading } = useEffectiveTier();
  const adminLike = isAdmin || previewEligible;
  const [started, setStarted] = useState(false);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 text-sm text-neutral-500">
        กำลังโหลด…
      </main>
    );
  }

  if (!adminLike) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-[#fff7d1] p-6 shadow-sm ring-1 ring-[#FFCC00]/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            Admin only
          </p>
          <h1 className="mt-2 text-2xl font-black">Mini Study Session</h1>
          <p className="mt-2 text-sm text-neutral-700">
            This feature is in admin preview.
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
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
                    : session.kind === "passage-mc"
                      ? "Start reading practice →"
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
  if (session.kind === "essay-cloze") {
    return <MiniStudyEssayClozePhase session={session} />;
  }
  return <MiniStudyPassageMcPhase session={session} />;
}
