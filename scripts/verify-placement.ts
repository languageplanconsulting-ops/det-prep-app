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
  blocksForSkillPlacement,
  EASY_TRACK,
  gateLabel,
  HARD_TRACK,
  MEDIUM_TRACK,
  fillBlankWarmup,
  WARMUP_ITEM_COUNT,
} from "../src/lib/course-plan/curriculum";
import {
  AI_GRADED_PLACEMENT_TASKS,
  CORE_AI_PLACEMENT_TASKS,
  CORE_OBJECTIVE_PLACEMENT_TASKS,
  CORE_PLACEMENT_TASKS,
  INFERRED_FROM,
  OBJECTIVE_PLACEMENT_TASKS,
  allPlacements,
  estimatedProbeMinutes,
  inferPlacements,
  nextProbe,
  placementFor,
  type ProbeResult,
} from "../src/lib/course-plan/placement";
import type { RungLevel, RungStep } from "../src/lib/course-plan/rungs";

/** The 12 task types the course schedules against. */
const ALL_TASK_TYPES: string[] = [
  ...OBJECTIVE_PLACEMENT_TASKS,
  ...AI_GRADED_PLACEMENT_TASKS,
];

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
  check("fail easy → easy", placementFor("dictation", [r("easy", 1)]) === "easy");
  check("miss everything → easy", placementFor("dictation", [r("easy", 0)]) === "easy");
  check("pass easy, fail medium → medium",
    placementFor("dictation", [r("easy", 2), r("medium", 1)]) === "medium");
  check("pass easy+medium, fail hard → MEDIUM (not hard)",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 1)]) === "medium",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 1)]));
  check("clean sweep → hard",
    placementFor("dictation", [r("easy", 2), r("medium", 2), r("hard", 2)]) === "hard");
  check("no results at all → easy", placementFor("dictation", []) === "easy");
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
      "easy");
}

// ----------------------------------------------- blocksForSkillPlacement
{
  check("no rung path → plain EASY_TRACK",
    blocksForSkillPlacement([]) === EASY_TRACK);

  // A learner placed medium ONLY in dictation, easy everywhere else — the
  // whole reason blocksForTracks' +100 offset was wrong for this feature.
  const mixed: RungStep[] = [
    { taskType: "dictation", level: "medium", goalScore: 120, fromScore: 95, check: null },
    { taskType: "fill_in_blanks", level: "easy", goalScore: 100, fromScore: 0, check: null },
  ];
  const mixedBlocks = blocksForSkillPlacement(mixed);
  const easyDictationOrder = EASY_TRACK.find((b) => b.key === "dictation")!.order;
  const swappedDictation = mixedBlocks.find((b) => b.taskType === "dictation")!;

  check("medium dictation block is swapped in", swappedDictation.key === "m-dictation",
    swappedDictation.key);
  check("swapped block keeps EASY's order (stays in its natural sequence slot)",
    swappedDictation.order === easyDictationOrder,
    `swapped order ${swappedDictation.order}, easy order ${easyDictationOrder}`);
  check("every other block is untouched (still the EASY_TRACK object)",
    mixedBlocks.filter((b) => b.taskType && b.taskType !== "dictation")
      .every((b) => EASY_TRACK.includes(b)));
  check("block count matches EASY_TRACK (one-for-one swap, not appended)",
    mixedBlocks.length === EASY_TRACK.length, `${mixedBlocks.length}`);
  check("taskType-less blocks (orientation, grammar-foundation) always stay EASY",
    mixedBlocks.filter((b) => !b.taskType).every((b) => EASY_TRACK.includes(b)));

  // A learner placed hard in dictation.
  const hardOnly: RungStep[] = [
    { taskType: "dictation", level: "hard", goalScore: 150, fromScore: 120, check: null },
  ];
  const hardBlocks = blocksForSkillPlacement(hardOnly);
  check("hard dictation block is swapped in",
    hardBlocks.find((b) => b.taskType === "dictation")!.key === "h-dictation");
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

  // write/speak-topic are now 3 guided drills + 3 real attempts each, all at 110.
  const wtReal = ["mwt-real1", "mwt-real2", "mwt-real3"].map((k) => gateOf("m-write-topic", k));
  check("write about topic real attempts rise to 110",
    wtReal.every((g) => g?.kind === "min_score" && g.minScore === 110));
  const stReal = ["mst-real1", "mst-real2", "mst-real3"].map((k) => gateOf("m-speak-topic", k));
  check("speak about topic real attempts rise to 110",
    stReal.every((g) => g?.kind === "min_score" && g.minScore === 110));
  const is = gateOf("m-interactive-speaking", "mis-real");
  check("interactive speaking stays at 100", is?.kind === "min_score" && is.minScore === 100);

  // Photo production exercises (excluding the typed-rewrite pattern drill) share
  // one group: any single answer at 110+ clears them all.
  const photoGates = [...MEDIUM_TRACK.filter((b) => b.key.includes("photo"))]
    .flatMap((b) => b.exercises)
    .filter((e) => e.gate.kind === "min_score_group")
    .map((e) => e.gate);
  check("all six photo production exercises share one group",
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
      placements.find((p) => p.taskType === "real_english_word")!.placement === "easy");

  check("two objective skills alone stay near 5 minutes",
    estimatedProbeMinutes(["dictation", "real_english_word"], []) <= 5,
    `${estimatedProbeMinutes(["dictation", "real_english_word"], [])} min worst case`);
  check("all 12 real task types land near the ~22min worst case this plan expects",
    estimatedProbeMinutes(OBJECTIVE_PLACEMENT_TASKS, AI_GRADED_PLACEMENT_TASKS) <= 25,
    `${estimatedProbeMinutes(OBJECTIVE_PLACEMENT_TASKS, AI_GRADED_PLACEMENT_TASKS)} min worst case`);
  check("OBJECTIVE_PLACEMENT_TASKS + AI_GRADED_PLACEMENT_TASKS cover all 12 task types",
    OBJECTIVE_PLACEMENT_TASKS.length + AI_GRADED_PLACEMENT_TASKS.length === 12);
}

// ------------------------------------------------- the 3-skill core probe
// The whole point of the cut is that a learner reaches their plan in minutes
// instead of the twenty-two above, WITHOUT the plan losing any of the twelve
// skills it schedules against.
{
  check("only three skills are actually measured",
    CORE_PLACEMENT_TASKS.length === 3, CORE_PLACEMENT_TASKS.join(", "));

  const coreMinutes = estimatedProbeMinutes(
    CORE_OBJECTIVE_PLACEMENT_TASKS,
    CORE_AI_PLACEMENT_TASKS,
  );
  check("the core probe stays under 7 minutes worst case",
    coreMinutes <= 7, `${coreMinutes} min worst case`);

  const full = inferPlacements(
    new Map<string, RungLevel>([
      ["fill_in_blanks", "hard"],
      ["dictation", "easy"],
      ["write_about_photo", "medium"],
    ]),
  );
  check("three answers still produce all 12 placements", full.length === 12, `${full.length}`);
  check("every placed task is a real DET task type",
    full.every((p) => ALL_TASK_TYPES.includes(p.taskType)),
    full.map((p) => p.taskType).filter((t) => !ALL_TASK_TYPES.includes(t)).join(", ") || "ok");
  check("no task is placed twice",
    new Set(full.map((p) => p.taskType)).size === 12);
  check("measured skills keep exactly what they scored",
    full.find((p) => p.taskType === "fill_in_blanks")!.level === "hard" &&
      full.find((p) => p.taskType === "dictation")!.level === "easy" &&
      full.find((p) => p.taskType === "write_about_photo")!.level === "medium");
  check("a reading skill follows written accuracy",
    full.find((p) => p.taskType === "reading_comprehension")!.level === "hard");
  check("a listening skill follows dictation",
    full.find((p) => p.taskType === "interactive_conversation_mcq")!.level === "easy");

  // The conservative rule: a mixed skill takes the LOWER of its two sources, so
  // a strong writer who cannot hear the prompt is not dropped into hard
  // dialogue summary.
  check("a mixed skill takes the lower of its two sources",
    full.find((p) => p.taskType === "dialogue_summary")!.level === "easy" &&
      full.find((p) => p.taskType === "read_and_write")!.level === "medium");

  const skipped = inferPlacements(new Map<string, RungLevel>());
  check("skipping the whole probe still places all 12 at easy",
    skipped.length === 12 && skipped.every((p) => p.level === "easy"));

  check("every core task can actually be probed",
    CORE_PLACEMENT_TASKS.every(
      (t) =>
        (OBJECTIVE_PLACEMENT_TASKS as readonly string[]).includes(t) ||
        (AI_GRADED_PLACEMENT_TASKS as readonly string[]).includes(t),
    ));
  check("core + inferred is exactly the 12 the course schedules against",
    new Set([...CORE_PLACEMENT_TASKS, ...Object.keys(INFERRED_FROM)]).size === 12);
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

  const photo = HARD_TRACK.filter((b) => b.key.includes("photo"))
    .flatMap((b) => b.exercises)
    .filter((e) => e.gate.kind === "min_score_group")
    .map((e) => e.gate);
  check("hard photo bar is 120 across one shared group",
    photo.length === 6 &&
      photo.every((g) => g.kind === "min_score_group" && g.minScore === 120 && g.groupKey === "photo-120"),
    `${photo.length}`);

  const gateOf = (bk: string, ek: string) =>
    HARD_TRACK.find((b) => b.key === bk)?.exercises.find((e) => e.key === ek)?.gate;

  const wtReal = ["hwt-real1", "hwt-real2", "hwt-real3"].map((k) => gateOf("h-write-topic", k));
  check("write about topic real attempts require every topic at 120",
    wtReal.every((g) => g?.kind === "min_score_all_topics" && g.minScore === 120 && g.redeemLowest === true));
  const stReal = ["hst-real1", "hst-real2", "hst-real3"].map((k) => gateOf("h-speak-topic", k));
  check("speak about topic real attempts require every topic at 120",
    stReal.every((g) => g?.kind === "min_score_all_topics" && g.minScore === 120));

  const is = gateOf("h-interactive-speaking", "his-real");
  check("interactive speaking still 100 at hard",
    is?.kind === "min_score" && is.minScore === 100);

  check("hard bars sit above medium",
    HARD_TRACK.filter((b) => b.key.includes("photo"))
      .flatMap((b) => b.exercises)
      .filter((e) => e.gate.kind === "min_score_group")
      .every((e) => e.gate.kind === "min_score_group" && e.gate.minScore === 120) &&
      MEDIUM_TRACK.filter((b) => b.key.includes("photo"))
        .flatMap((b) => b.exercises)
        .filter((e) => e.gate.kind === "min_score_group")
        .every((e) => e.gate.kind === "min_score_group" && e.gate.minScore === 110));

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
  [1, null, null, "miss easy"],
  [2, 1, null, "clear easy, miss medium"],
  [2, 2, 1, "clear easy+medium, miss hard"],
  [2, 2, 2, "clear all three"],
] as [number, number | null, number | null, string][]) {
  const results = [r("easy", e)];
  if (m !== null) results.push(r("medium", m));
  if (h !== null) results.push(r("hard", h));
  const p = placementFor("dictation", results);
  console.log(`    ${label.padEnd(30)} → placed ${p}`);
}
console.log("");
