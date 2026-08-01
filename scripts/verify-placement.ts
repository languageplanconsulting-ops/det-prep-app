/**
 * Self-check for the 5-minute placement probe and the MEDIUM track.
 *
 *   npx tsx scripts/verify-placement.ts
 *
 * The probe rule that is easy to get wrong: clearing basic and medium but
 * failing hard still places the learner at MEDIUM, not advanced.
 */
import {
  blocksForTracks,
  EASY_TRACK,
  gateLabel,
  HARD_TRACK,
  MEDIUM_TRACK,
  fillBlankWarmup,
  WARMUP_ITEM_COUNT,
} from "../src/lib/course-plan/curriculum";
import {
  allPlacements,
  estimatedProbeMinutes,
  nextProbe,
  placementFor,
  tracksFor,
  type ProbeResult,
} from "../src/lib/course-plan/placement";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const r = (level: "easy" | "medium" | "hard", correct: number): ProbeResult => ({
  taskType: "dictation",
  level,
  correct,
  total: 2,
});

// ------------------------------------------------------------ the four paths
{
  check("fail basic → basic", placementFor("dictation", [r("easy", 1)]) === "basic");
  check("miss everything → basic", placementFor("dictation", [r("easy", 0)]) === "basic");
  check("pass basic, fail medium → medium",
    placementFor("dictation", [r("easy", 2), r("medium", 1)]) === "medium");
  check("pass basic+medium, fail hard → MEDIUM (not advanced)",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 1)]) === "medium",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 1)]));
  check("clean sweep → advanced",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 2)]) === "advanced");
  check("no results at all → basic", placementFor("dictation", []) === "basic");
}

// ------------------------------------------------------------- probe ladder
{
  check("first probe is basic", nextProbe("dictation", [])?.level === "easy");
  check("probe asks 2 items", nextProbe("dictation", [])?.itemCount === 2);
  check("perfect basic → probe medium",
    nextProbe("dictation", [r("easy", 2)])?.level === "medium");
  check("imperfect basic → stop",
    nextProbe("dictation", [r("easy", 1)]) === null);
  check("perfect basic+medium → probe hard",
    nextProbe("dictation", [r("easy", 2), r("medium", 2)])?.level === "hard");
  check("imperfect medium → stop",
    nextProbe("dictation", [r("easy", 2), r("medium", 1)]) === null);
  check("all three done → stop",
    nextProbe("dictation", [r("easy", 2), r("medium", 2), r("hard", 2)]) === null);
  check("a zero-item probe never counts as a pass",
    placementFor("dictation", [{ taskType: "dictation", level: "easy", correct: 0, total: 0 }]) ===
      "basic");
}

// ------------------------------------------------------------------- tracks
{
  check("basic runs easy then medium",
    tracksFor("basic").join(",") === "basic,medium");
  check("medium skips the easy track", tracksFor("medium").join(",") === "medium");
  check("advanced is its own track", tracksFor("advanced").join(",") === "advanced");

  const basicBlocks = blocksForTracks(tracksFor("basic"));
  check("basic placement schedules both curriculums",
    basicBlocks.length === EASY_TRACK.length + MEDIUM_TRACK.length,
    `${basicBlocks.length}`);

  const firstMedium = basicBlocks.findIndex((b) => b.key.startsWith("m-"));
  const lastEasy = basicBlocks.map((b) => b.key.startsWith("m-")).lastIndexOf(false);
  check("every easy block precedes every medium block", lastEasy < firstMedium,
    `lastEasy ${lastEasy} firstMedium ${firstMedium}`);

  const sorted = [...basicBlocks].sort((a, b) => a.order - b.order);
  check("orders keep the two tracks separated",
    sorted.findIndex((b) => b.key.startsWith("m-")) ===
      sorted.map((b) => b.key.startsWith("m-")).lastIndexOf(false) + 1);

  check("medium placement schedules only the medium blocks",
    blocksForTracks(tracksFor("medium")).length === MEDIUM_TRACK.length);
}

// ------------------------------------------------------- medium raises bars
{
  const gateOf = (blockKey: string, exKey: string) =>
    MEDIUM_TRACK.find((b) => b.key === blockKey)?.exercises.find((e) => e.key === exKey)?.gate;

  const dic = MEDIUM_TRACK.find((b) => b.key === "m-dictation")!;
  check("medium dictation has three tiers", dic.exercises.length === 3, `${dic.exercises.length}`);
  const hard = dic.exercises.find((e) => e.key === "mdic-hard")!.gate;
  check("hard dictation passes at 80%", hard.kind === "pass_ratio" && hard.ratio === 0.8);
  const med = dic.exercises.find((e) => e.key === "mdic-medium")!.gate;
  check("medium dictation still demands perfect punctuation",
    med.kind === "pass_ratio" && med.strictPunctuation === true);

  const wt = gateOf("m-write-topic", "mwt-real");
  check("write about topic rises to 110", wt?.kind === "min_score" && wt.minScore === 110);
  const st = gateOf("m-speak-topic", "mst-real");
  check("speak about topic rises to 110", st?.kind === "min_score" && st.minScore === 110);
  const is = gateOf("m-interactive-speaking", "mis-real");
  check("interactive speaking stays at 100", is?.kind === "min_score" && is.minScore === 100);

  // Photo blocks share one group: any single answer at 110+ clears them all.
  const photoGates = [...MEDIUM_TRACK.filter((b) => b.key.includes("photo"))]
    .flatMap((b) => b.exercises.map((e) => e.gate));
  check("all six photo exercises share one group",
    photoGates.length === 6 &&
      photoGates.every((g) => g.kind === "min_score_group" && g.groupKey === "photo-110"),
    `${photoGates.length}`);
  check("the photo bar is 110",
    photoGates.every((g) => g.kind === "min_score_group" && g.minScore === 110));

  const rw = MEDIUM_TRACK.find((b) => b.key === "m-real-word")!;
  check("real word gains a hard stage", rw.exercises.length === 2);
  const rwHard = rw.exercises[1].gate;
  check("hard real word needs 3 in a row",
    rwHard.kind === "consecutive" && rwHard.needed === 3);

  check("every medium gate renders a label",
    MEDIUM_TRACK.every((b) => b.exercises.every((e) => gateLabel(e.gate).length > 0)));
}

// -------------------------------------------------------------------- misc
{
  const placements = allPlacements([
    r("easy", 2),
    r("medium", 1),
    { taskType: "real_english_word", level: "easy", correct: 1, total: 2 },
  ]);
  check("placements cover every probed skill", placements.length === 2);
  check("each skill is placed independently",
    placements.find((p) => p.taskType === "dictation")!.placement === "medium" &&
      placements.find((p) => p.taskType === "real_english_word")!.placement === "basic");

  check("the probe stays near its 5-minute promise",
    estimatedProbeMinutes(["dictation", "real_english_word"]) <= 5,
    `${estimatedProbeMinutes(["dictation", "real_english_word"])} min worst case`);
}

// ------------------------------------------------------------- HARD track
{
  check("advanced placement runs the hard track",
    blocksForTracks(["advanced"]).length === HARD_TRACK.length);

  const dic = HARD_TRACK.find((b) => b.key === "h-dictation")!;
  check("hard dictation has four stages", dic.exercises.length === 4, `${dic.exercises.length}`);
  const adv = dic.exercises.find((e) => e.key === "hdic-advanced")!.gate;
  check("advanced dictation runs 6 times",
    adv.kind === "pass_ratio" && adv.count === 6, JSON.stringify(adv));
  check("advanced dictation passes at 90% or a clean comma run",
    adv.kind === "pass_ratio" && adv.ratio === 0.9 && adv.orNoPunctuationErrors === true);

  const photo = HARD_TRACK.filter((b) => b.key.includes("photo")).flatMap((b) =>
    b.exercises.map((e) => e.gate),
  );
  check("hard photo bar is 120 across one shared group",
    photo.length === 6 &&
      photo.every((g) => g.kind === "min_score_group" && g.minScore === 120 && g.groupKey === "photo-120"),
    `${photo.length}`);

  const gateOf = (bk: string, ek: string) =>
    HARD_TRACK.find((b) => b.key === bk)?.exercises.find((e) => e.key === ek)?.gate;

  const wt = gateOf("h-write-topic", "hwt-real");
  check("write about topic requires every topic at 120",
    wt?.kind === "min_score_all_topics" && wt.minScore === 120 && wt.redeemLowest === true);
  const st = gateOf("h-speak-topic", "hst-real");
  check("speak about topic requires every topic at 120",
    st?.kind === "min_score_all_topics" && st.minScore === 120);

  const is = gateOf("h-interactive-speaking", "his-real");
  check("interactive speaking still 100 at hard",
    is?.kind === "min_score" && is.minScore === 100);

  check("hard bars sit above medium",
    HARD_TRACK.filter((b) => b.key.includes("photo"))
      .flatMap((b) => b.exercises.map((e) => e.gate))
      .every((g) => g.kind === "min_score_group" && g.minScore === 120) &&
      MEDIUM_TRACK.filter((b) => b.key.includes("photo"))
        .flatMap((b) => b.exercises.map((e) => e.gate))
        .every((g) => g.kind === "min_score_group" && g.minScore === 110));

  check("every hard gate renders a label",
    HARD_TRACK.every((b) => b.exercises.every((e) => gateLabel(e.gate).length > 0)));

  check("block keys are unique across all three tracks",
    new Set([...EASY_TRACK, ...MEDIUM_TRACK, ...HARD_TRACK].map((b) => b.key)).size ===
      EASY_TRACK.length + MEDIUM_TRACK.length + HARD_TRACK.length);
}

// -------------------------------------------- fill-in-the-blank sequencing
{
  // FITB must sit directly after dictation in every track.
  for (const [name, track] of [
    ["easy", EASY_TRACK],
    ["medium", MEDIUM_TRACK],
    ["hard", HARD_TRACK],
  ] as const) {
    const sorted = [...track].sort((a, b) => a.order - b.order);
    const dictAt = sorted.findIndex((b) => b.taskType === "dictation");
    const fitbAt = sorted.findIndex((b) => b.taskType === "fill_in_blanks" && b.key.includes("test"));
    check(`${name}: fill-in-the-blank follows dictation`, fitbAt === dictAt + 1,
      `dictation@${dictAt} fitb@${fitbAt}`);
  }

  // The daily warm-up always offers two, mixed one rung up.
  for (const t of ["basic", "medium", "advanced"] as const) {
    check(`${t} warm-up offers two items`, fillBlankWarmup(t).length === WARMUP_ITEM_COUNT);
  }
  check("basic warm-up is easy + medium",
    fillBlankWarmup("basic").map((w) => w.level).join(",") === "easy,medium");
  check("medium warm-up is medium + hard",
    fillBlankWarmup("medium").map((w) => w.level).join(",") === "medium,hard");
  check("advanced warm-up is medium + hard",
    fillBlankWarmup("advanced").map((w) => w.level).join(",") === "medium,hard");
  check("no warm-up ever sits entirely at the learner's own floor",
    fillBlankWarmup("basic").some((w) => w.level !== "easy"));
}

console.log("");
for (const f of failures) console.log(`  ✗ ${f}`);
console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) process.exit(1);

console.log("  Dictation probe outcomes:");
for (const [e, m, h, label] of [
  [1, null, null, "miss basic"],
  [2, 1, null, "clear basic, miss medium"],
  [2, 2, 1, "clear basic+medium, miss hard"],
  [2, 2, 2, "clear all three"],
] as [number, number | null, number | null, string][]) {
  const results = [r("easy", e)];
  if (m !== null) results.push(r("medium", m));
  if (h !== null) results.push(r("hard", h));
  const p = placementFor("dictation", results);
  console.log(`    ${label.padEnd(30)} → ${p.padEnd(9)} runs [${tracksFor(p).join(" → ")}]`);
}
console.log("");
