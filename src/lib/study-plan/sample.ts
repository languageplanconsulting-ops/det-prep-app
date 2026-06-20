// Canonical sample student, shared by the demo page and the scenario runner.
// A mid-B2 learner (target 120) who nails basics but slips on advanced grammar,
// misses an article, and mishears the long dictation.

import {
  scoreReading, scoreListening, scoreSpeaking, scoreWriting, buildReport,
  type Report, type SkillResult, type WriteItem, type SpeakingAssessment,
} from "./diagnostic.ts";
import { generatePlan, type Plan } from "./plan.ts";

export const SAMPLE_ANSWERS = {
  fillIn: ["mixes", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourish", "disclosed"],
  passage: { q1: true, q2: true, q3: true, q4: true },
  listeningAcc: [0.95, 0.92, 0.85] as [number, number, number],
  speaking: {
    wordCount: 130, presentTenseError: false, pastTenseError: false, articleError: false,
    basicVocabError: false, usesB2Vocab: false, b1CollocationCount: 5, b2CollocationCount: 0,
  } satisfies SpeakingAssessment,
  ex1: [
    { correct: false, category: "article" }, { correct: true, category: "punctuation" },
    { correct: true, category: "punctuation" }, { correct: true, category: "verb" },
    { correct: true, category: "punctuation" }, { correct: true, category: "verb" },
  ] satisfies WriteItem[],
  ex2: [
    { correct: true, category: "verb" }, { correct: true, category: "article" },
    { correct: false, category: "punctuation" }, { correct: true, category: "verb" },
    { correct: true, category: "punctuation" }, { correct: true, category: "article" },
  ] satisfies WriteItem[],
};

export function scoreSample(a = SAMPLE_ANSWERS): SkillResult[] {
  return [
    scoreReading(a.fillIn, a.passage),
    scoreListening(a.listeningAcc),
    scoreSpeaking(a.speaking),
    scoreWriting(a.ex1, a.ex2),
  ];
}

export function sampleReport(target = 120): Report {
  return buildReport(scoreSample(), target);
}

export function samplePlan(freeUser = true): Plan {
  return generatePlan(sampleReport(), { freeUser });
}
