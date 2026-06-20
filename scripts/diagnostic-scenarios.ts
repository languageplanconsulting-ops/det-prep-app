import {
  scoreReading, scoreListening, scoreSpeaking, scoreWriting, buildReport,
  type PassageAnswers, type SpeakingAssessment, type WriteItem,
} from "../src/lib/study-plan/diagnostic.ts";
import { generatePlan } from "../src/lib/study-plan/plan.ts";

type Inputs = {
  fillIn: string[]; passage: PassageAnswers; listeningAcc: [number, number, number];
  speaking: SpeakingAssessment; ex1: WriteItem[]; ex2: WriteItem[];
};

const CLEAN_SPEAK: SpeakingAssessment = {
  wordCount: 140, presentTenseError: false, pastTenseError: false, articleError: false,
  basicVocabError: false, usesB2Vocab: true, b1CollocationCount: 5, b2CollocationCount: 1,
};
const allCorrectWrite = (): WriteItem[] => [
  { correct: true, category: "verb" }, { correct: true, category: "article" }, { correct: true, category: "punctuation" },
  { correct: true, category: "verb" }, { correct: true, category: "punctuation" }, { correct: true, category: "article" },
];

function run(name: string, target: number, x: Inputs) {
  const skills = [scoreReading(x.fillIn, x.passage), scoreListening(x.listeningAcc), scoreSpeaking(x.speaking), scoreWriting(x.ex1, x.ex2)];
  const report = buildReport(skills, target);
  const plan = generatePlan(report, { freeUser: true });
  console.log(`\n■ ${name}  (target ${target})`);
  console.log(`  predicted ${report.predicted}  | ` + report.skills.map((s) => `${s.skill[0].toUpperCase()}:${s.score}`).join(" "));
  console.log(`  fix-first: ${report.fixFirst.skill}  | plan: ${plan.items.map((i) => `${i.skill}${i.locked ? "🔒" : "▶"}`).join(" → ") || "(none — at/above target!)"}`);
}

const BAKERY = ["mixes", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourished", "disclosed"];
const ALL_PASS_PASSAGE: PassageAnswers = { q1: true, q2: true, q3: true, q4: true };

// 1) Total beginner — fails the most basic thing in every skill.
run("Total beginner", 90, {
  fillIn: ["mix", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourished", "disclosed"], // tier-1 error
  passage: { q1: false, q2: false, q3: false, q4: false },
  listeningAcc: [0.6, 0.5, 0.4],
  speaking: { ...CLEAN_SPEAK, presentTenseError: true, wordCount: 60, b1CollocationCount: 0, b2CollocationCount: 0, usesB2Vocab: false },
  ex1: [{ correct: false, category: "verb" }, ...allCorrectWrite().slice(1)],
  ex2: allCorrectWrite(),
});

// 2) Near-target high performer — only a punctuation slip in writing.
run("Near-target", 120, {
  fillIn: BAKERY,
  passage: ALL_PASS_PASSAGE,
  listeningAcc: [1.0, 1.0, 0.95],
  speaking: CLEAN_SPEAK,
  ex1: [{ correct: true, category: "verb" }, { correct: true, category: "article" }, { correct: false, category: "punctuation" }, ...allCorrectWrite().slice(3)],
  ex2: allCorrectWrite(),
});

// 3) Strong reader, weak speaker — past-tense errors when speaking.
run("Strong reader / weak speaker", 110, {
  fillIn: BAKERY,
  passage: ALL_PASS_PASSAGE,
  listeningAcc: [1.0, 1.0, 0.95],
  speaking: { ...CLEAN_SPEAK, pastTenseError: true },
  ex1: allCorrectWrite(),
  ex2: allCorrectWrite(),
});
