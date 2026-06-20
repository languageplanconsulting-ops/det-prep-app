import {
  scoreReading, scoreListening, scoreSpeaking, scoreWriting, buildReport,
  type WriteItem,
} from "../src/lib/study-plan/diagnostic.ts";
import { generatePlan } from "../src/lib/study-plan/plan.ts";

// ── "I" sit the test (target = 120). A mid-B2 student who slips on advanced grammar. ──

// Reading A — fill-in: present + past correct, but "flourished" (blank 8) typed as "flourish".
const fillIn = ["mixes", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourish", "disclosed"];
// Reading B — passage: all four correct.
const passage = { q1: true, q2: true, q3: true, q4: true };

// Listening — S1 95% (ok), S2 92% (not 100%), S3 85% (missed the long one).
const listeningAcc: [number, number, number] = [0.95, 0.92, 0.85];

// Speaking — clean grammar, 130 words, 5 B1 collocations, no B2.
const speaking = {
  wordCount: 130, presentTenseError: false, pastTenseError: false, articleError: false,
  basicVocabError: false, usesB2Vocab: false, b1CollocationCount: 5, b2CollocationCount: 0,
};

// Writing Ex1 — picks "NO CHANGE" on the picnic article (Q1 wrong), rest right.
const ex1: WriteItem[] = [
  { correct: false, category: "article" },     // Q1 a picnic
  { correct: true, category: "punctuation" },  // Q2
  { correct: true, category: "punctuation" },  // Q3
  { correct: true, category: "verb" },         // Q4 preposition→verb
  { correct: true, category: "punctuation" },  // Q5
  { correct: true, category: "verb" },         // Q6 agreement
];
// Writing Ex2 — only one punctuation slip (Q3).
const ex2: WriteItem[] = [
  { correct: true, category: "verb" },
  { correct: true, category: "article" },
  { correct: false, category: "punctuation" }, // Q3
  { correct: true, category: "verb" },
  { correct: true, category: "punctuation" },
  { correct: true, category: "article" },
];

const skills = [
  scoreReading(fillIn, passage),
  scoreListening(listeningAcc),
  scoreSpeaking(speaking),
  scoreWriting(ex1, ex2),
];

const report = buildReport(skills, 120);

console.log("\n=== DIAGNOSTIC REPORT (target 120) ===\n");
console.log(`Predicted score: ${report.predicted}   (gap to 120: ${report.gap})\n`);
for (const s of report.skills) {
  console.log(`${s.skill.toUpperCase().padEnd(10)} ${String(s.score).padStart(3)}  [${s.band}]`);
  for (const n of s.notes) console.log(`           · ${n}`);
}
console.log(`\nFIX FIRST → ${report.fixFirst.skill} (${report.fixFirst.score})`);

const plan = generatePlan(report, { freeUser: true });
console.log("\n=== STUDY PLAN (free user) ===\n");
plan.items.forEach((it, i) => {
  const lock = it.locked ? "🔒" : "▶ ";
  console.log(`${lock} ${i + 1}. ${it.skill} (from ${it.fromScore}) · ~${it.estMinutes} min`);
  console.log(`     why: ${it.whyTh}`);
  console.log(`     ${it.modules.map((m) => `${m.titleTh} [${m.id}]`).join("  →  ")}`);
});
console.log(`\n🔒 เส้นชัย: ${plan.finishLine.titleTh} [${plan.finishLine.id}]`);
