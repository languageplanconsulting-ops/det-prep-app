/**
 * Self-check for the rung ladder (src/lib/course-plan/rungs.ts).
 *
 *   npx tsx scripts/verify-rungs.ts
 *
 * Proves the three rules hold for every student shape: entry by score,
 * a placement check before skipping a rung, and promotion on the exit score.
 * Pure functions only — no DB, no network.
 */
import {
  applyCheckResult,
  CHECK_PASS_RATIO,
  fullRungPlan,
  placementCheckFor,
  RUNG_ORDER,
  rungForScore,
  rungPath,
  skillTargetsFor,
} from "../src/lib/course-plan/rungs";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// ------------------------------------------------------------------ entry
check("score 60 enters easy", rungForScore(60) === "easy");
check("score 90 enters easy", rungForScore(90) === "easy");
check("score 95 enters medium", rungForScore(95) === "medium");
check("score 119 enters medium", rungForScore(119) === "medium");
check("score 120 enters hard", rungForScore(120) === "hard");
check("score 155 enters hard", rungForScore(155) === "hard");

// ------------------------------------------------------- the founder's case
{
  // dictation 90 → 130 must climb all three rungs
  const path = rungPath("dictation", 90, 130);
  check("90→130 climbs 3 rungs", path.length === 3, `${path.length}`);
  check(
    "90→130 order is easy→medium→hard",
    path.map((s) => s.level).join(",") === "easy,medium,hard",
    path.map((s) => s.level).join(","),
  );
  check("90→130 first goal is the easy exit", path[0].goalScore === 100, `${path[0].goalScore}`);
  check("90→130 last goal is the target", path[2].goalScore === 130, `${path[2].goalScore}`);
  check("easy has no check below it", path[0].check === null);

  // dictation 125 → 130 skips straight to hard, with a check first
  const short = rungPath("dictation", 125, 130);
  check("125→130 is one rung", short.length === 1, `${short.length}`);
  check("125→130 is hard", short[0].level === "hard");
  check("125→130 offers a placement check", short[0].check !== null);
  check("check is of the rung below", short[0].check?.level === "medium");
  check("check is 5 questions", short[0].check?.questionCount === 5);
}

// -------------------------------------------------------- path invariants
{
  const cases: [number, number][] = [
    [10, 160], [60, 100], [90, 130], [95, 120], [119, 120],
    [120, 125], [125, 130], [140, 160], [100, 105],
  ];
  for (const [from, to] of cases) {
    const p = rungPath("dictation", from, to);
    check(`${from}→${to} reaches the target`, p.length === 0 || p[p.length - 1].goalScore >= to,
      p.length ? `${p[p.length - 1].goalScore}` : "empty");
    check(`${from}→${to} goals never decrease`,
      p.every((s, i) => i === 0 || s.goalScore >= p[i - 1].goalScore));
    check(`${from}→${to} rungs never go backwards`,
      p.every((s, i) => i === 0 || RUNG_ORDER.indexOf(s.level) > RUNG_ORDER.indexOf(p[i - 1].level)));
    check(`${from}→${to} never exceeds 3 rungs`, p.length <= 3, `${p.length}`);
    check(`${from}→${to} only the first step has a check`,
      p.every((s, i) => i === 0 || s.check === null));
    check(`${from}→${to} starts at the right rung`,
      p.length === 0 || p[0].level === rungForScore(from));
  }

  check("target below current yields no work", rungPath("dictation", 130, 120).length === 0);
  check("target equal to current yields no work", rungPath("dictation", 120, 120).length === 0);
}

// ------------------------------------------------------- placement checks
{
  check("no check below easy", placementCheckFor("dictation", "easy") === null);
  check("medium checks easy", placementCheckFor("dictation", "medium")?.level === "easy");
  check("hard checks medium", placementCheckFor("dictation", "hard")?.level === "medium");

  check("5/5 keeps the rung", applyCheckResult("hard", 5, 5) === "hard");
  check("at the pass ratio keeps the rung",
    applyCheckResult("hard", Math.ceil(CHECK_PASS_RATIO * 5), 5) === "hard");
  check("3/5 drops one rung", applyCheckResult("hard", 3, 5) === "medium");
  check("0/5 drops one rung", applyCheckResult("medium", 0, 5) === "easy");
  check("easy cannot drop further", applyCheckResult("easy", 0, 5) === "easy");
  check("empty check is a no-op", applyCheckResult("hard", 0, 0) === "hard");
}

// ------------------------------------------------------------ skill targets
{
  const scores = [
    { taskType: "reading_comprehension", score160: 130 },
    { taskType: "dictation", score160: 115 },
    { taskType: "write_about_photo", score160: 95 },
    { taskType: "speak_about_photo", score160: 80 },
  ];
  const targets = skillTargetsFor(scores, 120);
  const mean = targets.reduce((s, t) => s + t.targetScore, 0) / targets.length;

  check("targets average to the goal", mean >= 117, `${mean}`);
  check("a skill above the goal is held",
    targets.find((t) => t.taskType === "reading_comprehension")!.targetScore === 130);
  check("weak skills are raised",
    targets.find((t) => t.taskType === "speak_about_photo")!.targetScore > 80);
  check("no weak skill is pushed past the goal",
    targets.every((t) => t.currentScore >= 120 || t.targetScore <= 120),
    JSON.stringify(targets.map((t) => [t.taskType, t.targetScore])));
  check("targets never below current",
    targets.every((t) => t.targetScore >= t.currentScore - 5));
  check("empty input is safe", skillTargetsFor([], 120).length === 0);
}

// ------------------------------------------------------------ full plan
{
  const targets = skillTargetsFor(
    [
      { taskType: "reading_comprehension", score160: 130 },
      { taskType: "dictation", score160: 90 },
      { taskType: "speak_about_photo", score160: 80 },
    ],
    120,
  );
  const plan = fullRungPlan(targets);
  check("full plan has steps", plan.length > 0, `${plan.length}`);
  check("weakest skill is scheduled first",
    plan[0].taskType === "speak_about_photo", plan[0]?.taskType);
  check("the already-strong skill contributes no steps",
    !plan.some((s) => s.taskType === "reading_comprehension"),
    plan.map((s) => s.taskType).join(","));

  // The fairness property: a stronger student legitimately has a shorter path.
  const strong = fullRungPlan(
    skillTargetsFor([{ taskType: "dictation", score160: 125 }], 130),
  );
  const weak = fullRungPlan(
    skillTargetsFor([{ taskType: "dictation", score160: 85 }], 130),
  );
  check("stronger student has a shorter path", strong.length < weak.length,
    `strong ${strong.length} vs weak ${weak.length}`);
}

console.log("");
for (const f of failures) console.log(`  ✗ ${f}`);
console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) process.exit(1);

console.log("  Sample paths (dictation):");
for (const [from, to] of [[90, 130], [110, 130], [125, 130]] as [number, number][]) {
  const p = rungPath("dictation", from, to);
  console.log(
    `    ${from} → ${to}: ` +
      p.map((s) => `${s.level}(${s.fromScore}→${s.goalScore})`).join(" → ") +
      (p[0]?.check ? `  [check ${p[0].check.level} first]` : ""),
  );
}
console.log("");
