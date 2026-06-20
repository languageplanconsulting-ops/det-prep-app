import {
  PASSAGE_P1, PASSAGE_Q2_TARGET, DICTATION, dictationAccuracy,
  passageAnswersFrom, writeItemsFrom, WRITING_EX1, PASSAGE_Q1, PASSAGE_Q3, PASSAGE_Q4,
} from "../src/lib/study-plan/content-data.ts";

const ok = (label: string, cond: boolean) => console.log(`${cond ? "✓" : "✗ FAIL"}  ${label}`);

// dictation accuracy: perfect = 1, empty = 0
ok("dictation perfect = 1", dictationAccuracy(DICTATION[0], DICTATION[0]) === 1);
ok("dictation empty = 0", dictationAccuracy("", DICTATION[0]) === 0);
ok("dictation ~half < 1", dictationAccuracy("I really enjoyed my trip", DICTATION[0]) < 1);

// highlight target phrase actually exists in P1 (NWORDS-style match)
const nw = (s: string) => s.toLowerCase().replace(/[“”".,!?;:]/g, "").split(/\s+/).filter(Boolean);
const p1 = PASSAGE_P1.split(/\s+/).map((w) => nw(w)[0] ?? "");
const tw = nw(PASSAGE_Q2_TARGET);
let found = -1;
for (let i = 0; i + tw.length <= p1.length; i++) if (tw.every((w, k) => p1[i + k] === w)) { found = i; break; }
ok("Q2 highlight phrase found in P1", found >= 0);

// passage all-correct selections → all true
const pa = passageAnswersFrom({ q1: PASSAGE_Q1.correct, q3: PASSAGE_Q3.correct, q4: PASSAGE_Q4.correct }, true);
ok("passage all-correct", pa.q1 && pa.q2 && pa.q3 && pa.q4);

// writing: choosing each question's correct option → all correct
const items = writeItemsFrom(WRITING_EX1, WRITING_EX1.questions.map((q) => q.correct));
ok("writing all-correct selections", items.every((it) => it.correct));
ok("writing wrong selection flips", !writeItemsFrom(WRITING_EX1, [0, 0, 0, 0, 0, 0])[0].correct);
