"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { getVocabPassageFromSet, getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { VocabPassageUnit, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { InteractiveReadingRunner } from "@/components/reading/InteractiveReadingRunner";
import { vocabToIrSet } from "@/lib/vocab-to-ir";
import { VOCAB_SESSION_MAX } from "@/lib/vocab-constants";
import { saveVocabAttempt } from "@/lib/vocab-storage";

export function VocabSessionGate({
  round,
  sessionLevel,
  setNumber,
  passageNumber,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
}) {
  const [passage, setPassage] = useState<VocabPassageUnit | null | undefined>(undefined);
  const [nextPassageNumber, setNextPassageNumber] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureCanonicalPracticeContent();
      if (cancelled) return;
      const set = getVocabVisibleSetByNumber(setNumber, round);
      if (!set) {
        setPassage(null);
        return;
      }
      const levelPassages = set.passages
        .filter((p) => p.contentLevel === sessionLevel)
        .sort((a, b) => a.passageNumber - b.passageNumber);
      const idx = levelPassages.findIndex((p) => p.passageNumber === passageNumber);
      setNextPassageNumber(idx >= 0 && idx + 1 < levelPassages.length ? levelPassages[idx + 1]!.passageNumber : null);
      setPassage(getVocabPassageFromSet(set, passageNumber) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [round, sessionLevel, setNumber, passageNumber]);

  const setListHref = `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}`;

  if (passage === undefined) {
    return <LuxuryLoader label="Opening this passage…" />;
  }

  if (passage === null) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Passage {passageNumber} was not found in set {setNumber}.
        </p>
        <Link
          href={setListHref}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to passage list
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="comprehension"
      exerciseType="vocabulary"
      difficulty={sessionLevel}
      setId={`voc-r${round}-s${setNumber}-l${sessionLevel}-p${passageNumber}`}
    >
      <VocabExamRunner
        key={`${round}-${sessionLevel}-${setNumber}-${passageNumber}`}
        round={round}
        setNumber={setNumber}
        sessionLevel={sessionLevel}
        passageNumber={passageNumber}
        passage={passage}
      />
    </StudySessionBoundary>
  );
}

/**
 * The vocabulary exercise IS the real test's word-fill step, so it runs the same screen the reading
 * exam runs — split passage, numbered gaps, one SUBMIT, per-blank partial credit and the answer key
 * laid out blank by blank. The reading exam no longer runs this step; it belongs here.
 */
function VocabExamRunner({
  round,
  setNumber,
  sessionLevel,
  passageNumber,
  passage,
}: {
  round: VocabRoundNum;
  setNumber: number;
  sessionLevel: VocabSessionLevel;
  passageNumber: number;
  passage: VocabPassageUnit;
}) {
  const { set, steps } = vocabToIrSet(passage, `voc-r${round}-s${setNumber}-p${passageNumber}`);
  const backHref = `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}`;
  return (
    <InteractiveReadingRunner
      sets={[set]}
      steps={steps}
      progressTopic="vocab-exam"
      backHref={backHref}
      celebrateTitle="จบชุดคำศัพท์แล้ว!"
      celebrateSub="รูปแบบเดียวกับขั้นเติมคำของ Interactive Reading ในข้อสอบจริง"
      hostOwnsProgress
      onFinish={(results) => {
        // Vocabulary keeps its own progress store — the passage list ticks and the round summary
        // read it, and it posts the practice attempt the study plan uses.
        const maxScore = VOCAB_SESSION_MAX[sessionLevel];
        const cloze = results.find((r) => r.step === 0);
        const totalBlanks = cloze?.chosen.length ?? 0;
        const correctCount = cloze ? Math.round(cloze.score * totalBlanks) : 0;
        saveVocabAttempt({
          round,
          sessionLevel,
          setNumber,
          passageNumber,
          attainedScore: totalBlanks ? Math.round((correctCount / totalBlanks) * maxScore) : 0,
          maxScore,
          correctCount,
        });
      }}
    />
  );
}
