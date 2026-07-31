/**
 * Self-check for the journey planner + progression simulation.
 *
 *   npx tsx scripts/verify-journey-progress.ts
 *
 * Pure functions only — no DB, no network, safe to run anywhere.
 *
 * WHAT THIS PROVES: the logic is internally consistent (scores never go
 * backwards or past the ceiling, "ready" needs two mocks, focus always picks
 * the weakest open skill, targets average to the goal, output is deterministic).
 *
 * WHAT THIS CANNOT PROVE: that the gain curve matches reality. Whether a real
 * student gains ~2 points/day of focused study is an empirical question that
 * needs mock-to-mock deltas from actual users. Until that data exists, treat
 * every projected number as illustrative and never publish it as a promise.
 */
import {
  buildJourney,
  orderedTeachingVideos,
} from "../src/lib/study-plan/journey-preview";
import {
  overallOf,
  round5,
  simulateJourney,
  SKILL_KEYS,
  START_PRESETS,
  targetVectorFor,
  type ScoreVector,
} from "../src/lib/study-plan/journey-progress";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

const START = "2026-08-01";

function journeyFor(months: number, minutes: 10 | 20 | 30 | 60) {
  return buildJourney({
    startDate: START,
    examDate: addMonths(START, months),
    minutesPerDay: minutes,
  });
}

function simFor(presetKey: string, months = 6, minutes: 10 | 20 | 30 | 60 = 20) {
  const preset = START_PRESETS.find((p) => p.key === presetKey)!;
  const j = journeyFor(months, minutes);
  return {
    preset,
    journey: j,
    progress: simulateJourney({
      start: preset.vector,
      goal: preset.goal,
      minutesPerDay: minutes,
      days: j.days.map((d) => ({ date: d.date, kind: d.kind })),
    }),
  };
}

// ---------------------------------------------------------------- scoring math
{
  check("round5 rounds to nearest 5", round5(112) === 110 && round5(113) === 115);
  check("round5 clamps low", round5(-40) === 10);
  check("round5 clamps high", round5(999) === 160);

  const v: ScoreVector = { reading: 130, listening: 120, writing: 110, speaking: 100 };
  check("overallOf = mean of four subscores", overallOf(v) === 115, `got ${overallOf(v)}`);
}

// ------------------------------------------------------- target vector maths
{
  for (const preset of START_PRESETS) {
    const t = targetVectorFor(preset.goal, preset.vector);
    const mean = SKILL_KEYS.reduce((s, k) => s + t[k], 0) / 4;

    check(
      `target mean reaches the goal (${preset.key})`,
      mean >= preset.goal - 3,
      `mean ${mean} vs goal ${preset.goal}`,
    );
    check(
      `targets never below current (${preset.key})`,
      SKILL_KEYS.every((k) => t[k] >= round5(preset.vector[k]) - 5),
    );
    check(
      `already-strong skills are not pushed higher (${preset.key})`,
      SKILL_KEYS.every((k) => preset.vector[k] < preset.goal || t[k] <= round5(preset.vector[k])),
      JSON.stringify(t),
    );
    check(
      `no skill is asked to exceed the goal (${preset.key})`,
      SKILL_KEYS.every((k) => t[k] <= Math.max(preset.goal, round5(preset.vector[k]))),
      JSON.stringify(t),
    );
  }

  // The headline claim: when one skill already sits ABOVE the goal, its surplus
  // buys slack for the weak ones — so the goal is NOT required in every skill.
  const reader = START_PRESETS.find((p) => p.key === "reader105")!; // reading 130, goal 120
  const tr = targetVectorFor(reader.goal, reader.vector);
  check(
    "a skill above the goal buys slack for the weak ones",
    SKILL_KEYS.some((k) => tr[k] < reader.goal),
    JSON.stringify(tr),
  );
  check(
    "the strong skill is held, not raised",
    tr.reading === round5(reader.vector.reading),
    `reading target ${tr.reading} vs current ${reader.vector.reading}`,
  );

  // The opposite case, which the product must be honest about: when NO skill is
  // above the goal there is no slack, and every skill must reach it. That is a
  // signal the goal may be unrealistic, not a bug.
  const stuck = START_PRESETS.find((p) => p.key === "stuck115")!; // best skill == goal
  const ts = targetVectorFor(130, stuck.vector);
  check(
    "no slack when nothing exceeds the goal",
    SKILL_KEYS.every((k) => ts[k] >= 130),
    JSON.stringify(ts),
  );
}

// ------------------------------------------------------------- calendar shape
{
  for (const months of [1, 3, 6]) {
    const j = journeyFor(months, 20);
    check(`journey has days (${months}mo)`, j.days.length > 20, `${j.days.length} days`);
    check(
      `weeks cover all days (${months}mo)`,
      j.weeks.reduce((s, w) => s + w.days.length, 0) === j.days.length,
    );
    check(
      `day indexes are contiguous (${months}mo)`,
      j.days.every((d, i) => d.index === i),
    );
    check(
      `dates strictly increase (${months}mo)`,
      j.days.every((d, i) => i === 0 || d.date > j.days[i - 1].date),
    );
    check(
      `rest days have no work (${months}mo)`,
      j.days.filter((d) => d.kind === "rest").every((d) => d.totalMinutes === 0 && d.exerciseCount === 0),
    );
    check(
      `study days have minutes (${months}mo)`,
      j.days.filter((d) => d.kind !== "rest").every((d) => d.totalMinutes > 0),
    );
    check(
      `video days carry a video (${months}mo)`,
      j.days.filter((d) => d.kind === "video").every((d) => d.video !== null),
    );
  }

  // No video is ever taught twice.
  const j6 = journeyFor(6, 20);
  const used = j6.days.filter((d) => d.video).map((d) => d.video!.key);
  check("no repeated videos", new Set(used).size === used.length, `${used.length} used`);

  // Dead videos must never be scheduled — they teach removed question types.
  check(
    "no dead videos scheduled",
    j6.days.every((d) => !d.video || d.video.status !== "dead"),
  );
  check(
    "orderedTeachingVideos excludes dead",
    orderedTeachingVideos().every((v) => v.status !== "dead"),
  );
}

// ----------------------------------------------------------- progression rules
{
  for (const preset of START_PRESETS) {
    const { progress } = simFor(preset.key);

    check(
      `scores never decrease (${preset.key})`,
      progress.days.every(
        (d, i) => i === 0 || SKILL_KEYS.every((k) => d.vector[k] >= progress.days[i - 1].vector[k] - 1e-9),
      ),
    );
    check(
      `scores never exceed 160 (${preset.key})`,
      progress.days.every((d) => SKILL_KEYS.every((k) => d.vector[k] <= 160)),
    );
    check(
      `focus is the weakest open skill (${preset.key})`,
      progress.days.every((d) => {
        if (!d.focus) return d.skills.every((s) => s.ready);
        const open = d.skills.filter((s) => !s.ready);
        const min = Math.min(...open.map((s) => s.current));
        return open.find((s) => s.skill === d.focus)!.current === min;
      }),
    );
    check(
      `ready skills never un-ready (${preset.key})`,
      progress.days.every(
        (d, i) => i === 0 || progress.days[i - 1].readySkills.every((k) => d.readySkills.includes(k)),
      ),
    );
    check(
      `milestones are unique per skill (${preset.key})`,
      new Set(progress.milestones.map((m) => m.skill)).size === progress.milestones.length,
    );
    check(
      `every ready skill has a milestone (${preset.key})`,
      progress.days[progress.days.length - 1].readySkills.every((k) =>
        progress.milestones.some((m) => m.skill === k),
      ),
    );
  }

  // "Ready" must need TWO mocks at target, never one.
  const { progress } = simFor("beginner90");
  for (const m of progress.milestones) {
    const mocksBefore = progress.mocks.filter((mk) => mk.dayIndex <= m.dayIndex);
    check(
      `milestone ${m.skill} needed >= 2 mocks`,
      mocksBefore.length >= 2,
      `${mocksBefore.length} mocks`,
    );
  }
}

// ------------------------------------------------------------ diminishing returns
{
  const low = simFor("low70", 3, 20).progress;
  const high = simFor("stuck115", 3, 20).progress;
  const lowGain = low.projectedOverall - overallOf(low.days[0].vector);
  const highGain = high.projectedOverall - overallOf(high.days[0].vector);
  check(
    "low starters gain more than high starters",
    lowGain > highGain,
    `low +${lowGain} vs high +${highGain}`,
  );
}

// ------------------------------------------------------------------- plateau
{
  const stuck = simFor("stuck115", 3, 10).progress;
  check(
    "plateau detected for a hard goal on a short low-effort plan",
    stuck.plateau.detected,
    `projected ${stuck.projectedOverall} vs goal ${stuck.goal}`,
  );
  check(
    "plateau names a capping skill",
    stuck.plateau.cappingSkill !== null,
  );
  check(
    "productive-skill cap flags human marking",
    !stuck.plateau.needsHumanMarking ||
      ["writing", "speaking"].includes(stuck.plateau.cappingSkill ?? ""),
  );

  const easy = simFor("beginner90", 6, 30).progress;
  check(
    "no plateau when the goal is comfortably reached",
    !easy.plateau.detected || easy.projectedOverall < easy.goal,
    `projected ${easy.projectedOverall} vs goal ${easy.goal}`,
  );
}

// ------------------------------------------------------------- determinism
{
  const a = JSON.stringify(simFor("reader105").progress);
  const b = JSON.stringify(simFor("reader105").progress);
  check("simulation is deterministic", a === b);
}

// ------------------------------------------------------------------- edges
{
  const oneDay = simulateJourney({
    start: { reading: 100, listening: 100, writing: 100, speaking: 100 },
    goal: 120,
    minutesPerDay: 20,
    days: [{ date: START, kind: "drill" }],
  });
  check("single-day plan does not crash", oneDay.days.length === 1);

  const zeroDay = simulateJourney({
    start: { reading: 100, listening: 100, writing: 100, speaking: 100 },
    goal: 120,
    minutesPerDay: 20,
    days: [],
  });
  check("empty plan does not crash", zeroDay.days.length === 0);
  check("empty plan reports start as projection", zeroDay.projectedOverall === 100);

  const alreadyThere = simulateJourney({
    start: { reading: 140, listening: 140, writing: 140, speaking: 140 },
    goal: 120,
    minutesPerDay: 20,
    days: journeyFor(1, 20).days.map((d) => ({ date: d.date, kind: d.kind })),
  });
  check("goal already met is flagged reached", alreadyThere.willReachGoal);
  check(
    "all skills ready ends with no focus",
    alreadyThere.days[alreadyThere.days.length - 1].focus === null,
  );

  const zeroExam = buildJourney({ startDate: START, examDate: START, minutesPerDay: 20 });
  check("same-day exam yields one day", zeroExam.days.length === 1, `${zeroExam.days.length}`);
}

// ------------------------------------------------------------------- report
console.log("");
for (const f of failures) console.log(`  ✗ ${f}`);
console.log("");
console.log(`  ${passed} passed, ${failures.length} failed`);
console.log("");

if (failures.length > 0) process.exit(1);

// A quick human-readable snapshot so regressions in the *numbers* are visible
// even when every assertion still passes.
console.log("  Snapshot (6 months @ 20 min/day):");
for (const preset of START_PRESETS) {
  const { progress } = simFor(preset.key);
  const start = overallOf(progress.days[0].vector);
  console.log(
    `    ${preset.th.padEnd(28)} ${start} → ${progress.projectedOverall} (goal ${progress.goal}) ` +
      `${progress.willReachGoal ? "✓ reaches" : "✗ short"} · ready ${progress.milestones.length}/4` +
      `${progress.plateau.detected ? ` · plateau: ${progress.plateau.cappingSkill}` : ""}`,
  );
}
console.log("");
