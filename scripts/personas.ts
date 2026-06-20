import {
  scoreReading, scoreListening, scoreSpeaking, scoreWriting, buildReport,
  type PassageAnswers, type SpeakingAssessment, type WriteItem,
} from "../src/lib/study-plan/diagnostic.ts";
import { generatePlan } from "../src/lib/study-plan/plan.ts";
import { thaiReason, thaiReadingInsight, SKILL_TH } from "../src/lib/study-plan/explain.ts";
import { dictationAccuracy, DICTATION } from "../src/lib/study-plan/content-data.ts";

const BAKERY = ["mixes", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourished", "disclosed"];
const allW = (): WriteItem[] => [
  { correct: true, category: "verb" }, { correct: true, category: "article" }, { correct: true, category: "punctuation" },
  { correct: true, category: "verb" }, { correct: true, category: "punctuation" }, { correct: true, category: "article" },
];
const cleanSpeak: SpeakingAssessment = { wordCount: 140, presentTenseError: false, pastTenseError: false, articleError: false, basicVocabError: false, usesB2Vocab: true, b1CollocationCount: 5, b2CollocationCount: 1 };

function show(name: string, target: number, skills: ReturnType<typeof scoreReading>[]) {
  const report = buildReport(skills, target);
  const plan = generatePlan(report, { freeUser: true });
  console.log(`\n████ ${name} (target ${target}) ████`);
  console.log(`predicted ${report.predicted} · gap ${report.gap}`);
  for (const s of report.skills) console.log(`  ${SKILL_TH[s.skill]} ${s.score} [${s.band}] — ${thaiReason(s)}`);
  console.log(`  insight: ${thaiReadingInsight(report) ?? "—"}`);
  console.log(`  fix-first: ${SKILL_TH[report.fixFirst.skill]}`);
  console.log(`  plan: ${plan.items.map((i) => `${SKILL_TH[i.skill]}(${i.fromScore})${i.locked ? "🔒" : "▶"}`).join(" → ")}`);
}

// HIGH
show("HIGH", 130, [
  scoreReading(BAKERY, { q1: true, q2: true, q3: true, q4: true }),
  scoreListening([1, 1, 0.95]),
  scoreSpeaking(cleanSpeak),
  scoreWriting(allW(), allW()),
]);

// MEDIUM
show("MEDIUM", 120, [
  scoreReading(["mixes", "bakes", "decorating", "studied", "worked", "saved", "crafted", "flourish", "disclosed"], { q1: true, q2: true, q3: true, q4: true }),
  scoreListening([0.95, 0.92, 0.85]),
  scoreSpeaking({ ...cleanSpeak, usesB2Vocab: false, b1CollocationCount: 5, b2CollocationCount: 0 }),
  scoreWriting([{ correct: false, category: "article" }, ...allW().slice(1)], [{ correct: true, category: "verb" }, { correct: true, category: "article" }, { correct: false, category: "punctuation" }, ...allW().slice(3)]),
]);

// LOW
show("LOW", 90, [
  scoreReading(["mix", "bakes", "decorating", "study", "work", "save", "craft", "flourish", "disclose"], { q1: false, q2: false, q3: false, q4: false }),
  scoreListening([0.6, 0.5, 0.4]),
  scoreSpeaking({ ...cleanSpeak, presentTenseError: true, wordCount: 55, usesB2Vocab: false, b1CollocationCount: 0, b2CollocationCount: 0 }),
  scoreWriting([{ correct: false, category: "verb" }, ...allW().slice(1)], allW()),
]);

// ── dictation accuracy: dropped word should NOT crater the score ──
const t = DICTATION[0];
const dropped = "I enjoyed my trip to Japan because we ate traditional food every single day."; // dropped "really"
console.log(`\nDICTATION robustness — dropped one word ("really"):`);
console.log(`  accuracy = ${Math.round(dictationAccuracy(dropped, t) * 100)}%  (positional compare would give ~14%)`);
