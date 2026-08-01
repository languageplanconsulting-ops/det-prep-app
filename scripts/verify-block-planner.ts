/**
 * Self-check for the block-by-block planner.
 *
 *   npx tsx scripts/verify-block-planner.ts
 *
 * The invariant that matters most: an exercise never appears before the videos
 * of its own block. That is the bug this planner exists to fix — the old one
 * scheduled "speak about a photo" days before the speaking lesson was taught.
 */
import {
  addToCarryOver,
  blockFeasibility,
  blockTotals,
  buildItemStream,
  carryOverMinutes,
  clearFromCarryOver,
  EMPTY_CARRY_OVER,
  itemsForChoice,
  moveBlockDay,
  applyCustomisation,
  dedupeById,
  applyOverrides,
  blocksInStream,
  EMPTY_CUSTOMISATION,
  EMPTY_PROGRESS,
  completionOf,
  markCompleted,
  moveInOrder,
  pourIntoDays,
  projectBoth,
  projectFinish,
  splitDayByTime,
  type StudyItem,
} from "../src/lib/course-plan/block-planner";
import { EASY_TRACK } from "../src/lib/course-plan/curriculum";
import { fullRungPlan, skillTargetsFor } from "../src/lib/course-plan/rungs";
import type { TeachableVideo } from "../src/lib/course-plan/planner";

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) passed++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

/** Stand-in for the real course: a few videos per block task type. */
function fakeVideos(): TeachableVideo[] {
  const out: TeachableVideo[] = [];
  for (const b of EASY_TRACK) {
    if (!b.taskType) continue;
    for (let i = 1; i <= 3; i++) {
      out.push({
        key: `${b.key}-v${i}`,
        titleTh: `${b.titleTh} คลิป ${i}`,
        lessonId: `${b.key}-v${i}`,
        status: "live",
        taskType: b.taskType,
        level: "easy",
        minutes: i === 3 ? 34 : 8, // one deliberately oversized video per block
      });
    }
  }
  return out;
}

const SETTINGS = {
  startDate: "2026-08-03", // a Monday
  minutesPerDay: 30,
  studyDays: [1, 2, 3, 4, 5],
  weeks: 40,
};

const videos = fakeVideos();
const stream = buildItemStream(videos);
const days = pourIntoDays([...stream], SETTINGS);
const scheduled = days.flatMap((d) => d.items);

// ------------------------------------------------------------- stream shape
{
  check("stream is non-empty", stream.length > 0, `${stream.length}`);
  check("stream ids are unique", new Set(stream.map((i) => i.id)).size === stream.length);

  // Inside every block, all videos come before all exercises.
  for (const b of EASY_TRACK) {
    const idx = stream
      .map((it, i) => ({ it, i }))
      .filter((x) => x.it.blockKey === b.key);
    const lastVideo = Math.max(-1, ...idx.filter((x) => x.it.kind === "video").map((x) => x.i));
    const firstDrill = Math.min(
      Infinity,
      ...idx.filter((x) => x.it.kind !== "video").map((x) => x.i),
    );
    check(`${b.key}: videos precede exercises`, lastVideo < firstDrill,
      `lastVideo ${lastVideo} firstDrill ${firstDrill}`);
  }

  // Blocks appear in curriculum order.
  const firstIndex = new Map<string, number>();
  stream.forEach((it, i) => {
    if (!firstIndex.has(it.blockKey)) firstIndex.set(it.blockKey, i);
  });
  const ordered = [...EASY_TRACK].sort((a, b) => a.order - b.order).map((b) => b.key);
  const seen = ordered.filter((k) => firstIndex.has(k));
  check("blocks appear in curriculum order",
    seen.every((k, i) => i === 0 || firstIndex.get(k)! > firstIndex.get(seen[i - 1])!),
    seen.join(","));
}

// ----------------------------------------------------- THE headline property
{
  const firstVideoOfBlock = new Map<string, number>();
  const firstDrillOfBlock = new Map<string, number>();
  scheduled.forEach((it, i) => {
    if (it.kind === "video" && !firstVideoOfBlock.has(it.blockKey)) {
      firstVideoOfBlock.set(it.blockKey, i);
    }
    if (it.kind !== "video" && !firstDrillOfBlock.has(it.blockKey)) {
      firstDrillOfBlock.set(it.blockKey, i);
    }
  });
  for (const [blockKey, drillAt] of firstDrillOfBlock) {
    const videoAt = firstVideoOfBlock.get(blockKey);
    if (videoAt === undefined) continue; // block has no videos in this fixture
    check(`${blockKey}: no drill before its own video`, videoAt < drillAt,
      `video@${videoAt} drill@${drillAt}`);
  }
}

// ------------------------------------------------------------- pouring rules
{
  check("no item is scheduled twice",
    new Set(scheduled.map((i) => i.id)).size === scheduled.length,
    `${scheduled.length} scheduled, ${new Set(scheduled.map((i) => i.id)).size} unique`);

  check("everything in the stream gets scheduled",
    scheduled.length === stream.length,
    `${scheduled.length}/${stream.length}`);

  check("days never exceed the budget unless a single item does",
    days.every((d) =>
      d.totalMinutes <= SETTINGS.minutesPerDay ||
      (d.items.length === 1 && d.items[0].minutes > SETTINGS.minutesPerDay)),
    days.filter((d) => d.totalMinutes > SETTINGS.minutesPerDay && d.items.length > 1)
      .map((d) => `${d.date}:${d.totalMinutes}`).join(","));

  check("oversized videos still get scheduled",
    stream.filter((i) => i.minutes > SETTINGS.minutesPerDay)
      .every((i) => scheduled.some((s) => s.id === i.id)));

  check("rest days are empty",
    days.filter((d) => !SETTINGS.studyDays.includes(d.weekday))
      .every((d) => d.items.length === 0 && d.totalMinutes === 0));

  check("dates strictly increase",
    days.every((d, i) => i === 0 || d.date > days[i - 1].date));

  check("day.blocks matches the items on that day",
    days.every((d) => {
      const keys = [...new Set(d.items.map((i) => i.blockKey))];
      return keys.length === d.blocks.length && keys.every((k) => d.blocks.some((b) => b.key === k));
    }));
}

// ----------------------------------------------------------------- countdown
{
  const items: StudyItem[] = scheduled.slice(0, 6);
  const total = items.reduce((s, i) => s + i.minutes, 0);
  const { fits, overflow } = splitDayByTime(items, Math.floor(total / 2));
  check("split keeps every item", fits.length + overflow.length === items.length);
  check("split never exceeds the limit",
    fits.reduce((s, i) => s + i.minutes, 0) <= Math.floor(total / 2));
  check("nothing is lost at zero minutes",
    splitDayByTime(items, 0).overflow.length === items.length);
  check("everything fits with a huge limit",
    splitDayByTime(items, 99_999).overflow.length === 0);
}

// ---------------------------------------------------------------- carry-over
{
  const a = scheduled.slice(0, 3);
  const b = scheduled.slice(3, 5);

  let carry = addToCarryOver(EMPTY_CARRY_OVER, "2026-08-03", a);
  check("carry-over collects items", carry.entries.length === 3);

  carry = addToCarryOver(carry, "2026-08-04", b);
  check("carry-over accumulates across days", carry.entries.length === 5);

  carry = addToCarryOver(carry, "2026-08-05", a);
  check("carry-over never duplicates", carry.entries.length === 5);

  check("carry-over minutes sum correctly",
    carryOverMinutes(carry) === [...a, ...b].reduce((s, i) => s + i.minutes, 0));

  const cleared = clearFromCarryOver(carry, a.map((i) => i.id));
  check("finishing items clears them", cleared.entries.length === 2);

  check("oldest carry-over is first",
    carry.entries[0].fromDate === "2026-08-03");

  // Choosing "today" leaves the backlog untouched — it is offered again later.
  const todays = scheduled.slice(10, 13);
  const pickToday = itemsForChoice("today", carry, todays, 999);
  check("choosing today runs only today's work",
    pickToday.every((i) => todays.some((t) => t.id === i.id)));

  const pickCarry = itemsForChoice("carry_over", carry, todays, 999);
  check("choosing carry-over puts the backlog first",
    pickCarry[0].id === carry.entries[0].item.id, pickCarry[0]?.id);
  check("choosing carry-over still includes today's work",
    todays.every((t) => pickCarry.some((i) => i.id === t.id)));

  check("empty carry-over falls back to today",
    itemsForChoice("carry_over", EMPTY_CARRY_OVER, todays, 999).length === todays.length);
}

// ------------------------------------------------------------------ totals
{
  const t = blockTotals(days);
  check("totals count videos", t.videos === stream.filter((i) => i.kind === "video").length);
  check("totals count exercises", t.exercises === stream.filter((i) => i.kind === "exercise").length);
  check("totals count lessons", t.lessons === stream.filter((i) => i.kind === "lesson").length);

  const f = blockFeasibility(days, SETTINGS, stream);
  check("40 weeks covers the whole track", f.coversWholeTrack, `${f.scheduledItems}/${f.totalItems}`);

  const shortDays = pourIntoDays([...stream], { ...SETTINGS, weeks: 1 });
  const shortF = blockFeasibility(shortDays, { ...SETTINGS, weeks: 1 }, stream);
  check("a 1-week plan is flagged as short", !shortF.coversWholeTrack);
  check("a short plan recommends more weeks", shortF.recommendedWeeks > 1, `${shortF.recommendedWeeks}`);
}

// ------------------------------------------------------------- drag and drop
{
  const withItems = days.filter((d) => d.items.length > 0);
  const from = withItems[0];
  const to = days.find((d) => d.items.length === 0 && d.date > from.date)!;
  const ov = moveBlockDay(days, {}, from.date, to.date);
  const moved = applyOverrides(days, ov);
  const newFrom = moved.find((d) => d.date === from.date)!;
  const newTo = moved.find((d) => d.date === to.date)!;
  check("drag empties the source day", newFrom.items.length === 0);
  check("drag fills the target day", newTo.items.length === from.items.length);
  check("drag recomputes minutes", newTo.totalMinutes === from.totalMinutes);
  check("drag recomputes the block heading", newTo.blocks.length === from.blocks.length);
  check("dragging onto itself is a no-op",
    Object.keys(moveBlockDay(days, {}, from.date, from.date)).length === 0);
}

// ------------------------------------------------------------------- edges
{
  check("no videos still yields the exercise track",
    buildItemStream([]).length === EASY_TRACK.reduce((s, b) => s + b.exercises.length, 0));
  check("no study days yields no work",
    pourIntoDays([...stream], { ...SETTINGS, studyDays: [] }).every((d) => d.items.length === 0));
  check("missing start date is safe",
    pourIntoDays([...stream], { ...SETTINGS, startDate: "" }).length === 0);

  const a = pourIntoDays([...stream], SETTINGS);
  const b = pourIntoDays([...stream], SETTINGS);
  check("pouring is deterministic", JSON.stringify(a) === JSON.stringify(b));
}

// ------------------------------------------------- personalisation by rung
{
  // Strong at dictation, weak at speaking → the dictation block must drop out
  // of the SCHEDULE while speaking stays.
  const path = fullRungPlan(
    skillTargetsFor(
      [
        { taskType: "dictation", score160: 130 },
        { taskType: "speak_about_photo", score160: 80 },
      ],
      120,
    ),
  );
  const personal = buildItemStream(videos, EASY_TRACK, path);
  const allTasks = new Set(personal.map((i) => i.taskType));

  check("a cleared skill is dropped from the schedule",
    !personal.some((i) => i.blockKey === "dictation"),
    [...allTasks].join(","));
  check("a weak skill stays in the schedule",
    personal.some((i) => i.blockKey === "speak-photo"));
  check("personalised stream is smaller than the full track",
    personal.length < stream.length, `${personal.length} vs ${stream.length}`);

  // Fairness property: stronger student, shorter schedule.
  const weakPath = fullRungPlan(
    skillTargetsFor([{ taskType: "dictation", score160: 80 }], 120),
  );
  const strongPath = fullRungPlan(
    skillTargetsFor([{ taskType: "dictation", score160: 115 }], 120),
  );
  check("stronger learner gets fewer scheduled items",
    buildItemStream(videos, EASY_TRACK, strongPath).length <
      buildItemStream(videos, EASY_TRACK, weakPath).length);

  check("no rung path means teach everything",
    buildItemStream(videos, EASY_TRACK, []).length === stream.length);

  // Untagged videos survive personalisation — nothing paid for disappears.
  check("orientation videos are never dropped",
    buildItemStream(videos, EASY_TRACK, path).some((i) => i.blockKey === "extra") ===
      buildItemStream(videos, EASY_TRACK, []).some((i) => i.blockKey === "extra"));

  // Block-by-block must still hold after filtering.
  const poured = pourIntoDays([...personal], SETTINGS).flatMap((d) => d.items);
  const firstVid = new Map<string, number>();
  const firstDrill = new Map<string, number>();
  poured.forEach((it, i) => {
    if (it.kind === "video" && !firstVid.has(it.blockKey)) firstVid.set(it.blockKey, i);
    if (it.kind !== "video" && !firstDrill.has(it.blockKey)) firstDrill.set(it.blockKey, i);
  });
  check("personalised plan still teaches before it drills",
    [...firstDrill].every(([k, at]) => !firstVid.has(k) || firstVid.get(k)! < at));
}

// --------------------------------------------- real-course ordering sanity
{
  // Titles taken from the actual Thinkific export, so this guards the exact
  // complaint: C-Test walkthroughs were being taught before the learner had
  // seen what the exam even looks like.
  const real: TeachableVideo[] = [
    ["ภาพรวมข้อสอบ", null],
    ["Update ข้อสอบปี 2026", null],
    ["วิธีการใช้ APP เพื่อฝึกเพิ่มคะแนน", null],
    ["ปูพื้นฐานแกรมม่าร์", "write_about_photo"],
    ["เทคนิคการเขียนอธิบายคน + สถานที่", "write_about_photo"],
    ["เทคนิคการพูดเกี่ยวกับรูปใน 1 นาที", "speak_about_photo"],
    ["พื้นฐานการทำ C TEST", "fill_in_blanks"],
    ["ตลุยโจทย์ (15 ข้อ)", "fill_in_blanks"],
    ["เทคนิคการทำ Listen and Type", "dictation"],
  ].map(([titleTh, taskType], i) => ({
    key: `r${i}`,
    titleTh: titleTh as string,
    lessonId: `r${i}`,
    status: "live" as const,
    taskType: taskType as string | null,
    level: "easy" as const,
    minutes: 8,
  }));

  const st = buildItemStream(real);
  const at = (t: string) => st.findIndex((i) => i.titleTh === t);

  check("the exam overview is taught first", at("ภาพรวมข้อสอบ") === 0, `${at("ภาพรวมข้อสอบ")}`);
  check("all three orientation clips come before any technique",
    Math.max(at("ภาพรวมข้อสอบ"), at("Update ข้อสอบปี 2026"), at("วิธีการใช้ APP เพื่อฝึกเพิ่มคะแนน")) <
      at("ปูพื้นฐานแกรมม่าร์"));
  check("grammar is taught before writing technique",
    at("ปูพื้นฐานแกรมม่าร์") < at("เทคนิคการเขียนอธิบายคน + สถานที่"));
  check("C-Test is NOT at the start",
    at("พื้นฐานการทำ C TEST") > at("เทคนิคการพูดเกี่ยวกับรูปใน 1 นาที"),
    `c-test@${at("พื้นฐานการทำ C TEST")} speak@${at("เทคนิคการพูดเกี่ยวกับรูปใน 1 นาที")}`);
  check("C-Test walkthroughs come after dictation",
    at("ตลุยโจทย์ (15 ข้อ)") > at("เทคนิคการทำ Listen and Type"),
    `drill@${at("ตลุยโจทย์ (15 ข้อ)")} dictation@${at("เทคนิคการทำ Listen and Type")}`);
  check("every real video is scheduled somewhere", real.every((v) => at(v.titleTh) >= 0));
}

// -------------------------------------------------------- finish projection
{
  const p = projectFinish(stream, SETTINGS);
  check("projection returns a date", p !== null);
  check("finish date is on a chosen study weekday",
    p !== null && SETTINGS.studyDays.includes(new Date(`${p.date}T00:00:00Z`).getUTCDay()),
    p?.date);
  check("finish date is on or after the start", p !== null && p.date >= SETTINGS.startDate);
  check("study days match the minutes required",
    p !== null && p.studyDays === Math.ceil(p.totalMinutes / SETTINGS.minutesPerDay));

  // Fewer study days per week must push the date out, never pull it in.
  const fri = projectFinish(stream, { ...SETTINGS, studyDays: [5] });
  check("one day a week finishes later than five",
    fri !== null && p !== null && fri.date > p.date, `${fri?.date} vs ${p?.date}`);
  check("one day a week needs the same number of sessions",
    fri !== null && p !== null && fri.studyDays === p.studyDays);

  // More minutes a day must pull the date in.
  const longer = projectFinish(stream, { ...SETTINGS, minutesPerDay: 60 });
  check("longer sessions finish sooner", longer !== null && p !== null && longer.date <= p.date);

  const both = projectBoth(stream, SETTINGS);
  check("videos-only finishes before the whole curriculum",
    both.videosOnly !== null && both.full !== null && both.videosOnly.date <= both.full.date,
    `${both.videosOnly?.date} vs ${both.full?.date}`);
  check("videos-only counts fewer minutes",
    both.videosOnly !== null && both.full !== null &&
      both.videosOnly.totalMinutes < both.full.totalMinutes);

  check("no study days yields no projection",
    projectFinish(stream, { ...SETTINGS, studyDays: [] }) === null);
  check("no start date yields no projection",
    projectFinish(stream, { ...SETTINGS, startDate: "" }) === null);
  check("an empty stream yields no projection", projectFinish([], SETTINGS) === null);
  check("a practice-only plan has no video projection",
    projectBoth(stream.filter((i) => i.kind !== "video"), SETTINGS).videosOnly === null);
}

// ------------------------------------------------- arbitrary daily minutes
{
  const { clampMinutes, MIN_MINUTES_PER_DAY, MAX_MINUTES_PER_DAY } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../src/lib/course-plan/planner") as typeof import("../src/lib/course-plan/planner");

  check("clamp keeps a normal value", clampMinutes(65) === 65);
  check("clamp rounds fractions", clampMinutes(72.4) === 72);
  check("clamp raises below the floor", clampMinutes(1) === MIN_MINUTES_PER_DAY);
  check("clamp caps above the ceiling", clampMinutes(10_000) === MAX_MINUTES_PER_DAY);
  check("clamp survives NaN", Number.isFinite(clampMinutes(Number.NaN)));

  // Odd budgets must schedule and stay inside their own limit.
  for (const minutes of [7, 23, 65, 72, 92, 137]) {
    const d = pourIntoDays([...stream], { ...SETTINGS, minutesPerDay: minutes });
    const sched = d.flatMap((x) => x.items);
    check(`${minutes} min/day schedules something`, sched.length > 0);
    check(`${minutes} min/day never exceeds its own budget`,
      d.every((x) => x.totalMinutes <= minutes || (x.items.length === 1 && x.items[0].minutes > minutes)),
      d.filter((x) => x.totalMinutes > minutes && x.items.length > 1).map((x) => x.totalMinutes).join(","));
    check(`${minutes} min/day never duplicates an item`,
      new Set(sched.map((i) => i.id)).size === sched.length);
  }

  // More minutes must never finish later.
  const a = projectFinish(stream, { ...SETTINGS, minutesPerDay: 65 });
  const b = projectFinish(stream, { ...SETTINGS, minutesPerDay: 92 });
  check("a bigger odd budget finishes no later", a !== null && b !== null && b.date <= a.date,
    `${b?.date} vs ${a?.date}`);
}

// ------------------------------------------------ learner-authored programme
{
  const blocks = blocksInStream(stream).map((b) => b.key);

  check("no customisation changes nothing",
    JSON.stringify(applyCustomisation(stream, EMPTY_CUSTOMISATION)) === JSON.stringify(stream));

  // Run the last block first.
  const last = blocks[blocks.length - 1];
  const reordered = applyCustomisation(stream, { ...EMPTY_CUSTOMISATION, mode: "custom" as const, blockOrder: [last] });
  check("a chosen block runs first", reordered[0].blockKey === last, reordered[0]?.blockKey);
  check("reordering keeps every item",
    reordered.length === stream.length &&
      new Set(reordered.map((i) => i.id)).size === stream.length);
  check("unlisted blocks keep their curriculum order",
    blocksInStream(reordered).slice(1).map((b) => b.key).join(",") ===
      blocks.filter((k) => k !== last).join(","));

  // Run only two blocks.
  const keepTwo = blocks.slice(0, 2);
  const only = applyCustomisation(stream, {
    ...EMPTY_CUSTOMISATION,
    mode: "custom" as const,
    excludedBlocks: blocks.filter((k) => !keepTwo.includes(k)),
  });
  check("excluding blocks leaves only the chosen ones",
    blocksInStream(only).map((b) => b.key).join(",") === keepTwo.join(","));
  check("a two-block programme is shorter", only.length < stream.length);

  // Excluding everything is survivable, not a crash.
  check("excluding every block yields an empty programme",
    applyCustomisation(stream, { ...EMPTY_CUSTOMISATION, mode: "custom" as const, excludedBlocks: blocks }).length === 0);
  check("an empty programme pours into empty days",
    pourIntoDays(applyCustomisation(stream, { ...EMPTY_CUSTOMISATION, mode: "custom" as const, excludedBlocks: blocks }), SETTINGS)
      .every((d) => d.items.length === 0));

  // Reorder inside one block.
  const target = blocksInStream(stream).find((b) => b.items.length > 2)!;
  const flipped = [...target.items.map((i) => i.id)].reverse();
  const inner = applyCustomisation(stream, {
    ...EMPTY_CUSTOMISATION,
    mode: "custom" as const,
    itemOrder: { [target.key]: flipped },
  });
  const innerItems = inner.filter((i) => i.blockKey === target.key).map((i) => i.id);
  check("items inside a block follow the chosen order",
    innerItems.join(",") === flipped.join(","), innerItems.slice(0, 3).join(","));
  check("reordering inside a block does not move other blocks",
    blocksInStream(inner).map((b) => b.key).join(",") === blocks.join(","));

  // Combined: reorder blocks AND items, drop one.
  const combo = applyCustomisation(stream, {
    mode: "custom" as const,
    blockOrder: [last, target.key],
    excludedBlocks: [blocks[1]],
    itemOrder: { [target.key]: flipped },
  });
  check("combined customisation applies all three", combo[0].blockKey === last);
  check("combined customisation still drops the excluded block",
    !combo.some((i) => i.blockKey === blocks[1]));
  check("combined customisation is deterministic",
    JSON.stringify(combo) ===
      JSON.stringify(applyCustomisation(stream, {
        mode: "custom" as const,
        blockOrder: [last, target.key],
        excludedBlocks: [blocks[1]],
        itemOrder: { [target.key]: flipped },
      })));

  // A customised programme must still teach before it drills.
  const poured = pourIntoDays([...combo], SETTINGS).flatMap((d) => d.items);
  check("customised programme still schedules everything it kept",
    poured.length === combo.length, `${poured.length}/${combo.length}`);

  // moveInOrder edges
  check("move up swaps", moveInOrder(["a", "b", "c"], "b", -1).join(",") === "b,a,c");
  check("move down swaps", moveInOrder(["a", "b", "c"], "b", 1).join(",") === "a,c,b");
  check("move past the top is a no-op", moveInOrder(["a", "b"], "a", -1).join(",") === "a,b");
  check("move past the bottom is a no-op", moveInOrder(["a", "b"], "b", 1).join(",") === "a,b");
  check("moving an unknown key is a no-op", moveInOrder(["a", "b"], "z", 1).join(",") === "a,b");
}

// -------------------------------------------------------------- completion
{
  // The bug this replaces: completion was inferred from the plan fitting the
  // calendar, so a brand-new learner was congratulated on day one.
  check("a fresh plan is NOT complete", !completionOf(stream, EMPTY_PROGRESS).isComplete);
  check("a fresh plan reports zero done", completionOf(stream, EMPTY_PROGRESS).done === 0);
  check("a fresh plan reports 0%", completionOf(stream, EMPTY_PROGRESS).percent === 0);

  const half = markCompleted(EMPTY_PROGRESS, stream.slice(0, Math.floor(stream.length / 2)).map((i) => i.id));
  const mid = completionOf(stream, half);
  check("half done is not complete", !mid.isComplete);
  check("half done reports roughly 50%", mid.percent >= 45 && mid.percent <= 55, `${mid.percent}%`);

  const all = markCompleted(EMPTY_PROGRESS, stream.map((i) => i.id));
  check("finishing everything completes", completionOf(stream, all).isComplete);
  check("finishing everything reports 100%", completionOf(stream, all).percent === 100);

  check("marking the same item twice does not double-count",
    markCompleted(markCompleted(EMPTY_PROGRESS, ["a"]), ["a"]).completedIds.length === 1);
  check("an empty programme is never 'complete'",
    !completionOf([], EMPTY_PROGRESS).isComplete);

  // Completing items from a DIFFERENT arrangement must not falsely complete this one.
  check("unrelated completed ids do not count",
    completionOf(stream, markCompleted(EMPTY_PROGRESS, ["not-a-real-id"])).done === 0);
}

// ------------------------------------------------------------------ dedupe
{
  const a = scheduled[0];
  check("dedupe removes a repeat", dedupeById([a, a]).length === 1);
  check("dedupe keeps order", dedupeById([scheduled[1], a, scheduled[1]]).map((i) => i.id).join(",") ===
    `${scheduled[1].id},${a.id}`);
  check("dedupe leaves distinct items alone", dedupeById(scheduled.slice(0, 4)).length === 4);
  check("dedupe handles empty", dedupeById([]).length === 0);

  // The bug: the plan now schedules only outstanding work, so a backlog item is
  // also in today's plan. Concatenating them double-counted it.
  const carry = addToCarryOver(EMPTY_CARRY_OVER, "2026-08-03", [a]);
  const picked = itemsForChoice("carry_over", carry, [a, scheduled[1]], 9999);
  check("carry-over never duplicates today's items",
    new Set(picked.map((i) => i.id)).size === picked.length, picked.map((i) => i.id).join(","));
  check("carry-over still includes both distinct items", picked.length === 2);
}

console.log("");
for (const f of failures) console.log(`  ✗ ${f}`);
console.log(`\n  ${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) process.exit(1);

console.log("  First 5 study days:");
for (const d of days.filter((x) => x.items.length > 0).slice(0, 5)) {
  console.log(
    `    ${d.date} (${d.totalMinutes}m) [${d.blocks.map((b) => b.titleTh).join(" → ")}]`,
  );
  for (const it of d.items) console.log(`        ${it.kind.padEnd(8)} ${it.minutes}m  ${it.titleTh}`);
}
console.log("");
