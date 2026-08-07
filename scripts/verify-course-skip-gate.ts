/**
 * Self-check for the skip-to-video debt gate and the skill-transfer map.
 *
 *   npx tsx scripts/verify-course-skip-gate.ts
 *
 * The rule that is easy to get wrong: skipping must never mark work as done.
 * A skipped set stays outstanding, keeps counting toward the gate, and is
 * cleared only by actually finishing it.
 */
import {
  EMPTY_PROGRESS,
  GATE_MAX_MINUTES,
  GATE_MIN_MINUTES,
  GATE_MIN_SETS,
  VIDEO_DEBT_LIMIT_MINUTES,
  gateRequirement,
  markCompleted,
  markSkipped,
  videoDebt,
  type Progress,
  type StudyItem,
} from "../src/lib/course-plan/block-planner";
import {
  CORE_PLACEMENT_TASKS,
} from "../src/lib/course-plan/placement";
import {
  TRANSFER_LABEL_TH,
  baseExerciseKey,
  transfersFor,
} from "../src/lib/course-plan/skill-transfer";
import { SPEAK_PHOTO_DRILLS } from "../src/lib/course-plan/speak-photo-drill-bank";
import { PATTERN_ITEMS } from "../src/lib/course-plan/grammar-writing-bank";
import { getPhoto } from "../src/lib/lesson-photo-bank";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function ex(id: string, minutes: number): StudyItem {
  return {
    id,
    kind: "exercise",
    titleTh: id,
    minutes,
    blockKey: "b",
    blockTitleTh: "b",
    blockOrder: 1,
    taskType: "fill_in_blanks",
    exerciseKey: id,
  };
}

// ------------------------------------------------------------- the debt
{
  const stream = [ex("e1", 20), ex("e2", 20), ex("e3", 20), ex("e4", 6)];
  let p: Progress = EMPTY_PROGRESS;

  check("nothing skipped means no debt and no lock",
    videoDebt(stream, p).minutes === 0 && !videoDebt(stream, p).locked);

  p = markSkipped(p, "e1");
  check("one skip is counted but does not lock",
    videoDebt(stream, p).minutes === 20 && !videoDebt(stream, p).locked,
    `${videoDebt(stream, p).minutes} min`);

  // THE rule: skipping is a reordering, not a discount.
  check("a skipped set is NOT marked complete",
    !p.completedIds.includes("e1"));

  p = markSkipped(p, "e1");
  check("skipping the same set twice does not double-count",
    videoDebt(stream, p).minutes === 20);

  p = markSkipped(p, "e2");
  check(`${VIDEO_DEBT_LIMIT_MINUTES} minutes is the lock threshold`,
    videoDebt(stream, p).minutes === 40 && !videoDebt(stream, p).locked,
    "40 min should still be open");

  p = markSkipped(p, "e4");
  const locked = videoDebt(stream, p);
  check("crossing the threshold locks videos",
    locked.minutes === 46 && locked.locked, `${locked.minutes} min`);

  // Finishing settles it however it got onto the list.
  p = markCompleted(p, ["e1"], { e1: { correct: 4, total: 5 } });
  const after = videoDebt(stream, p);
  check("finishing a skipped set clears it from the debt",
    !p.skippedIds.includes("e1") && after.minutes === 26, `${after.minutes} min`);
  check("…and unlocks videos once back under the limit", !after.locked);
  check("…while still recording the score",
    p.accuracy.e1?.correct === 4 && p.completedIds.includes("e1"));

  // A set that leaves the programme stops being owed.
  const shrunk = [ex("e4", 6)];
  check("a skipped set no longer in the stream is not owed",
    videoDebt(shrunk, p).minutes === 6, `${videoDebt(shrunk, p).minutes} min`);
}

// ------------------------------------------------------- the gate ticket
{
  const short = { items: [ex("a", 6), ex("b", 6), ex("c", 6), ex("d", 6)], minutes: 24, locked: true };
  const g1 = gateRequirement(short);
  check(`short sets: gate asks for at least ${GATE_MIN_MINUTES} minutes`,
    g1.minutes >= GATE_MIN_MINUTES, `${g1.minutes} min`);
  check("short sets: gate asks for whole sets, not a fraction",
    g1.items.length === 2 && g1.minutes === 12, `${g1.items.length} sets / ${g1.minutes} min`);

  const long = { items: [ex("w1", 20), ex("w2", 20), ex("w3", 20)], minutes: 60, locked: true };
  const g2 = gateRequirement(long);
  check("one long set is enough — never three 20-minute writing tasks at once",
    g2.items.length === GATE_MIN_SETS && g2.minutes === 20,
    `${g2.items.length} sets / ${g2.minutes} min`);
  check(`the ask never exceeds ${GATE_MAX_MINUTES} minutes by more than one set`,
    g2.minutes <= GATE_MAX_MINUTES, `${g2.minutes} min`);

  const one = { items: [ex("only", 6)], minutes: 6, locked: true };
  check("a gate can never ask for more than is actually owed",
    gateRequirement(one).items.length === 1 && gateRequirement(one).minutes === 6);

  check("an empty debt produces an empty ticket",
    gateRequirement({ items: [], minutes: 0, locked: false }).items.length === 0);
}

// -------------------------------------------------- the skill-transfer map
{
  // The founder's own example, verbatim: subordinating conjunctions pay off in
  // dictation, write about photo, read and write, and the writing sample.
  const sub = transfersFor("gr-sub", "fill_in_blanks");
  for (const expected of ["listen_and_type", "write_about_photo", "read_and_write", "writing_sample"]) {
    check(`gr-sub transfers to ${expected}`, sub.includes(expected), sub.join(", "));
  }

  check("the medium track shares the easy track's transfer list",
    JSON.stringify(transfersFor("mgr-sub", "fill_in_blanks")) === JSON.stringify(sub));
  check("the hard track does too",
    JSON.stringify(transfersFor("hgr-sub", "fill_in_blanks")) === JSON.stringify(sub));
  check("base key strips the track prefix", baseExerciseKey("hgr-sub") === "gr-sub");
  check("…but leaves an unprefixed key alone", baseExerciseKey("gr-sub") === "gr-sub");
  check("…and does not mangle an unknown key", baseExerciseKey("mystery") === "mystery");

  check("every transfer target has a Thai label",
    sub.every((t) => Boolean(TRANSFER_LABEL_TH[t])),
    sub.filter((t) => !TRANSFER_LABEL_TH[t]).join(", ") || "ok");

  // Every real exercise must say something — a panel that sometimes vanishes
  // reads as a bug.
  const everyTask = [
    "fill_in_blanks", "dictation", "real_english_word", "reading_comprehension",
    "vocabulary_reading", "write_about_photo", "speak_about_photo", "read_and_write",
    "read_then_speak", "interactive_speaking", "interactive_conversation_mcq",
    "dialogue_summary",
  ];
  for (const t of everyTask) {
    check(`unknown key still resolves for ${t}`, transfersFor("no-such-key", t).length > 0);
  }
  check("a totally unknown exercise says nothing rather than guessing",
    transfersFor("no-such-key", null).length === 0);

  check("no list repeats a target", (() => {
    for (const t of everyTask) {
      const l = transfersFor(null, t);
      if (new Set(l).size !== l.length) return false;
    }
    return true;
  })());

  check("grammar is sold as the high-transfer block it is",
    transfersFor("gr-tenses", "fill_in_blanks").length >= 4,
    `${transfersFor("gr-tenses", "fill_in_blanks").length} targets`);

  // The 3 placement probes are all real exercises the map must cover.
  check("every core placement skill has a transfer list",
    CORE_PLACEMENT_TASKS.every((t) => transfersFor(null, t).length > 0));
}

// ------------------------------------------------- photos are actually there
// Every drill that describes a picture must HAVE that picture, and the id must
// resolve — a missing id renders nothing, which is the original bug.
{
  for (const d of SPEAK_PHOTO_DRILLS) {
    check(`${d.id} names a photo`, Boolean(d.photoId), d.photoId ?? "MISSING");
    check(`${d.id}'s photo exists in the bank`, Boolean(getPhoto(d.photoId)), d.photoId);
  }
  for (const it of PATTERN_ITEMS) {
    check(`${it.id} names a photo`, Boolean(it.photoId), it.photoId ?? "MISSING");
    check(`${it.id}'s photo exists in the bank`, Boolean(getPhoto(it.photoId!)), it.photoId ?? "-");
  }

  // Both banks describe the same two scenes, so they must show the same two
  // photos — a learner meeting the lake in the pattern drill and a different
  // lake in the speak drill would think they had misread one of them.
  const lake = PATTERN_ITEMS.find((i) => i.id === "pt-4")!.photoId;
  check("the lake pattern items and the lake speak drill share one photo",
    lake === SPEAK_PHOTO_DRILLS.find((d) => d.id === "spd-places")!.photoId,
    `${lake} vs ${SPEAK_PHOTO_DRILLS.find((d) => d.id === "spd-places")!.photoId}`);
  const people = PATTERN_ITEMS.find((i) => i.id === "pt-1")!.photoId;
  check("the people pattern items and the people speak drill share one photo",
    people === SPEAK_PHOTO_DRILLS.find((d) => d.id === "spd-people")!.photoId);

  // The model answer has to describe the photo the learner is looking at.
  const p1 = PATTERN_ITEMS.find((i) => i.id === "pt-1")!;
  check("the people model answer is singular, matching its one-jogger photo",
    p1.answers.every((a) => !/\b2 women\b|\bwomen who\b/.test(a)), p1.answers[0]);
  const spd = SPEAK_PHOTO_DRILLS.find((d) => d.id === "spd-people")!;
  check("the people speak drill essay is singular too",
    !/two women|they are probably/.test(spd.essay), spd.essay.slice(0, 60));
}

console.log(`\n  ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`
  Debt gate:
    skip 20 min                    → owed 20, videos open
    skip 20 + 20 + 6               → owed 46, videos LOCKED
    finish one 20-min set          → owed 26, videos open again
  Gate ticket:
    six-minute sets                → 2 sets / 12 min
    twenty-minute writing sets     → 1 set  / 20 min
`);
