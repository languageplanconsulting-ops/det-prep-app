/**
 * Block-by-block planner.
 *
 * The old planner put one video on a day and then filled the rest with a
 * rotation of unrelated drills — so a learner could be asked to "speak about a
 * photo" days before that lesson existed. This one finishes a block before
 * starting the next: the block's videos, then the exercises that practise
 * exactly what those videos taught.
 *
 * Everything is a single ordered stream poured into days by time budget, which
 * gives carry-over for free: whatever does not fit today is simply the front of
 * tomorrow's stream. Nothing is dropped.
 */
import {
  EASY_TRACK,
  gateLabel,
  type CurriculumBlock,
} from "@/lib/course-plan/curriculum";
import type { TeachableVideo } from "@/lib/course-plan/planner";
import type { RungStep } from "@/lib/course-plan/rungs";

export type StudyItemKind = "video" | "lesson" | "exercise" | "review";

export type StudyItem = {
  id: string;
  kind: StudyItemKind;
  titleTh: string;
  minutes: number;
  blockKey: string;
  blockTitleTh: string;
  blockOrder: number;
  taskType: string | null;
  /** Deep-link into the course player. Videos only. */
  lessonId?: string | null;
  /** How the learner proves they are done. Exercises only. */
  gateTh?: string;
  /** Curriculum exercise key, so the session can look up its fixed questions. */
  exerciseKey?: string;
  /** Spread hint from the curriculum: keep at least this many days apart. */
  spreadDays?: number;
};

export type BlockDay = {
  date: string;
  weekday: number;
  weekIndex: number;
  isStudyDay: boolean;
  items: StudyItem[];
  totalMinutes: number;
  /** Blocks touched today, in order — drives the day card heading. */
  blocks: { key: string; titleTh: string }[];
};

function toUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}
function fromUtcDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/**
 * The full ordered curriculum as one stream: block 1's videos, block 1's
 * exercises, block 2's videos, block 2's exercises, and so on.
 *
 * Videos are matched to a block by task type. A video whose task type is not in
 * the track (orientation, full-mock guides) is appended at the end rather than
 * dropped, so nothing the learner paid for disappears from the schedule.
 */
export function buildItemStream(
  courseVideos: TeachableVideo[],
  blocks: CurriculumBlock[] = EASY_TRACK,
  /**
   * The learner's rung path (rungs.ts). Rungs it does not mention are ones they
   * have already cleared, so those videos and exercises are left OUT of the
   * schedule — a student at dictation 125 should not be walked through easy
   * dictation again. Everything stays openable in the library; only the
   * schedule is personal.
   *
   * Empty (no assessment yet) means teach the whole track, which is the right
   * default for someone with no scores.
   */
  rungPath: RungStep[] = [],
): StudyItem[] {
  const stream: StudyItem[] = [];
  const used = new Set<string>();
  const personalised = rungPath.length > 0;
  const needed = new Set(rungPath.map((s) => `${s.taskType}:${s.level}`));

  for (const block of [...blocks].sort((a, b) => a.order - b.order)) {
    // A block whose rung the learner has already cleared is skipped entirely.
    const blockNeeded =
      !personalised || !block.taskType || needed.has(`${block.taskType}:${block.level}`);

    const videos = courseVideos.filter((v) => {
      if (used.has(v.key)) return false;
      // Title match wins where it is set — chapter task types are too coarse
      // for orientation and grammar, which have no task type of their own.
      const belongs = block.videoMatch
        ? block.videoMatch.test(v.titleTh)
        : Boolean(v.taskType) && v.taskType === block.taskType;
      if (!belongs) return false;
      // A video is kept if its own rung is on the path — a block can hold
      // videos at several levels once the library is fully tagged.
      if (personalised && v.taskType && !needed.has(`${v.taskType}:${v.level}`)) return false;
      return true;
    });

    if (!blockNeeded && videos.length === 0) continue;
    for (const v of videos) {
      used.add(v.key);
      stream.push({
        id: `v-${block.key}-${v.key}`,
        kind: "video",
        titleTh: v.titleTh,
        minutes: v.minutes,
        blockKey: block.key,
        blockTitleTh: block.titleTh,
        blockOrder: block.order,
        taskType: v.taskType,
        lessonId: v.lessonId,
      });
    }

    for (const ex of blockNeeded ? block.exercises : []) {
      stream.push({
        id: `e-${block.key}-${ex.key}`,
        kind: ex.isLesson ? "lesson" : "exercise",
        titleTh: ex.titleTh,
        minutes: ex.minutes,
        blockKey: block.key,
        blockTitleTh: block.titleTh,
        blockOrder: block.order,
        taskType: ex.taskType,
        gateTh: gateLabel(ex.gate),
        exerciseKey: ex.key,
        spreadDays: ex.spreadDays,
      });
    }
  }

  // Anything the track does not cover (orientation, mock guides) goes last.
  const trackTasks = new Set(blocks.map((b) => b.taskType).filter(Boolean));
  for (const v of courseVideos) {
    if (used.has(v.key)) continue;
    // A video the curriculum DOES cover but the rung path excluded was skipped
    // on purpose. Without this it would fall through and be smuggled back in
    // as "extra", quietly undoing the personalisation.
    if (personalised && v.taskType && trackTasks.has(v.taskType)) continue;
    stream.push({
      id: `v-extra-${v.key}`,
      kind: "video",
      titleTh: v.titleTh,
      minutes: v.minutes,
      blockKey: "extra",
      blockTitleTh: "ภาพรวม & ซ้อมจริง",
      blockOrder: 999,
      taskType: v.taskType,
      lessonId: v.lessonId,
    });
  }

  return stream;
}

export type PourSettings = {
  startDate: string;
  minutesPerDay: number;
  /** Weekday numbers to study on. 0 = Sunday … 6 = Saturday. */
  studyDays: number[];
  weeks: number;
};

/**
 * Pour the stream into study days.
 *
 * An item never splits across days, and a day never exceeds its budget, so what
 * a learner sees is honestly what they signed up for. Items that do not fit
 * roll forward — which is exactly the carry-over behaviour, without a separate
 * mechanism.
 */
export function pourIntoDays(stream: StudyItem[], settings: PourSettings): BlockDay[] {
  const days: BlockDay[] = [];
  if (!settings.startDate) return days;

  const start = toUtcDay(settings.startDate);
  const totalDays = settings.weeks * 7;
  let cursor = 0;
  /** Last day index an item key was scheduled on, for spreadDays. */
  const lastScheduled = new Map<string, number>();

  for (let offset = 0; offset < totalDays; offset++) {
    const date = fromUtcDay(start + offset);
    const weekday = weekdayOf(date);
    const weekIndex = Math.floor(offset / 7);

    if (!settings.studyDays.includes(weekday)) {
      days.push({
        date,
        weekday,
        weekIndex,
        isStudyDay: false,
        items: [],
        totalMinutes: 0,
        blocks: [],
      });
      continue;
    }

    const items: StudyItem[] = [];
    let budget = settings.minutesPerDay;
    let look = cursor;

    while (look < stream.length && budget > 0) {
      const item = stream[look];

      // A single item can be longer than the whole daily budget — some course
      // videos run 30+ minutes. Videos cannot be split, so an oversized item
      // takes a day of its own rather than blocking the queue forever.
      const oversized = item.minutes > settings.minutesPerDay;
      if (item.minutes > budget && !(oversized && items.length === 0)) break;

      // Respect a spread hint by skipping ahead if this item ran too recently.
      const last = lastScheduled.get(item.id);
      if (item.spreadDays && last !== undefined && offset - last < item.spreadDays) {
        look++;
        continue;
      }

      items.push(item);
      budget -= item.minutes;
      lastScheduled.set(item.id, offset);
      if (look === cursor) {
        // Consumed the head of the queue — advance both, or the same item is
        // read again next iteration and lands on the day twice.
        cursor++;
        look++;
      } else {
        stream.splice(look, 1); // pulled forward out of order — remove it
      }
    }

    const blocks: { key: string; titleTh: string }[] = [];
    for (const it of items) {
      if (!blocks.some((b) => b.key === it.blockKey)) {
        blocks.push({ key: it.blockKey, titleTh: it.blockTitleTh });
      }
    }

    days.push({
      date,
      weekday,
      weekIndex,
      isStudyDay: true,
      items,
      totalMinutes: items.reduce((s, i) => s + i.minutes, 0),
      blocks,
    });
  }

  return days;
}

/**
 * Split a day at the time limit — what the countdown actually enforces.
 *
 * `fits` is what the learner can finish inside their chosen minutes; `overflow`
 * is what they are asked about when the timer runs out: finish now, or send it
 * to next time.
 */
export function splitDayByTime(
  items: StudyItem[],
  minutes: number,
): { fits: StudyItem[]; overflow: StudyItem[] } {
  const fits: StudyItem[] = [];
  const overflow: StudyItem[] = [];
  let budget = minutes;
  for (const item of items) {
    if (item.minutes <= budget) {
      fits.push(item);
      budget -= item.minutes;
    } else {
      overflow.push(item);
    }
  }
  return { fits, overflow };
}

// ---------------------------------------------------------------------------
// Carry-over — work the learner ran out of time for
// ---------------------------------------------------------------------------

export type CarryOverEntry = {
  /** Day the item was originally scheduled for. */
  fromDate: string;
  item: StudyItem;
};

export type CarryOver = {
  entries: CarryOverEntry[];
};

export const EMPTY_CARRY_OVER: CarryOver = { entries: [] };

/** Move a day's unfinished items into the carry-over queue, oldest first. */
export function addToCarryOver(
  carry: CarryOver,
  fromDate: string,
  items: StudyItem[],
): CarryOver {
  const existing = new Set(carry.entries.map((e) => e.item.id));
  return {
    entries: [
      ...carry.entries,
      ...items.filter((i) => !existing.has(i.id)).map((item) => ({ fromDate, item })),
    ],
  };
}

export function clearFromCarryOver(carry: CarryOver, itemIds: string[]): CarryOver {
  const drop = new Set(itemIds);
  return { entries: carry.entries.filter((e) => !drop.has(e.item.id)) };
}

export function carryOverMinutes(carry: CarryOver): number {
  return carry.entries.reduce((s, e) => s + e.item.minutes, 0);
}

/**
 * What to offer at the start of a session.
 *
 * The learner chooses: clear the backlog first, or run today's block. Choosing
 * today keeps the backlog — and it is offered again next time, which is why the
 * count is surfaced rather than hidden.
 */
export type SessionChoice = "carry_over" | "today";

export function itemsForChoice(
  choice: SessionChoice,
  carry: CarryOver,
  todaysItems: StudyItem[],
  minutes: number,
): StudyItem[] {
  if (choice === "carry_over" && carry.entries.length > 0) {
    const queued = carry.entries.map((e) => e.item);
    // The plan now schedules only what is still outstanding, so a backlog item
    // can also appear in today's plan. Without deduping it would be counted
    // twice — the session showed "3/5 done" alongside "50/50 minutes".
    return splitDayByTime(dedupeById([...queued, ...todaysItems]), minutes).fits;
  }
  return splitDayByTime(dedupeById(todaysItems), minutes).fits;
}

/** First occurrence wins, order preserved. */
export function dedupeById(items: StudyItem[]): StudyItem[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

export const CARRY_OVER_STORAGE_KEY = "ep-course-carryover-v1";

// ---------------------------------------------------------------------------
// Totals, feasibility and drag-and-drop over the block schedule
// ---------------------------------------------------------------------------

/** Drag-and-drop edits: date → the items now assigned to that date. */
export type BlockOverrides = Record<string, StudyItem[]>;

export function applyOverrides(days: BlockDay[], overrides: BlockOverrides): BlockDay[] {
  if (Object.keys(overrides).length === 0) return days;
  return days.map((d) => {
    const items = overrides[d.date];
    if (!items) return d;
    const blocks: { key: string; titleTh: string }[] = [];
    for (const it of items) {
      if (!blocks.some((b) => b.key === it.blockKey)) {
        blocks.push({ key: it.blockKey, titleTh: it.blockTitleTh });
      }
    }
    return {
      ...d,
      items,
      isStudyDay: items.length > 0,
      totalMinutes: items.reduce((s, i) => s + i.minutes, 0),
      blocks,
    };
  });
}

export type BlockTotals = {
  studyDays: number;
  videos: number;
  exercises: number;
  lessons: number;
  hours: number;
};

export function blockTotals(days: BlockDay[]): BlockTotals {
  const all = days.flatMap((d) => d.items);
  return {
    studyDays: days.filter((d) => d.items.length > 0).length,
    videos: all.filter((i) => i.kind === "video").length,
    exercises: all.filter((i) => i.kind === "exercise").length,
    lessons: all.filter((i) => i.kind === "lesson").length,
    hours: Math.round(days.reduce((s, d) => s + d.totalMinutes, 0) / 60),
  };
}

export type BlockFeasibility = {
  coversWholeTrack: boolean;
  scheduledItems: number;
  totalItems: number;
  /** Weeks needed to fit the whole track at these settings. */
  recommendedWeeks: number;
  busiestDayMinutes: number;
};

export function blockFeasibility(
  days: BlockDay[],
  settings: PourSettings,
  stream: StudyItem[],
): BlockFeasibility {
  const scheduled = days.reduce((s, d) => s + d.items.length, 0);
  const totalMinutes = stream.reduce((s, i) => s + i.minutes, 0);
  const perWeek = Math.max(1, settings.studyDays.length);
  const daysNeeded = Math.ceil(totalMinutes / Math.max(1, settings.minutesPerDay));
  return {
    coversWholeTrack: scheduled >= stream.length,
    scheduledItems: scheduled,
    totalItems: stream.length,
    recommendedWeeks: Math.max(1, Math.ceil(daysNeeded / perWeek)),
    busiestDayMinutes: days.reduce((mx, d) => Math.max(mx, d.totalMinutes), 0),
  };
}

export function moveBlockDay(
  days: BlockDay[],
  overrides: BlockOverrides,
  fromDate: string,
  toDate: string,
): BlockOverrides {
  if (fromDate === toDate) return overrides;
  const from = days.find((d) => d.date === fromDate);
  const to = days.find((d) => d.date === toDate);
  if (!from || !to) return overrides;
  return { ...overrides, [fromDate]: [], [toDate]: [...to.items, ...from.items] };
}

export function moveBlockItem(
  days: BlockDay[],
  overrides: BlockOverrides,
  itemId: string,
  fromDate: string,
  toDate: string,
): BlockOverrides {
  if (fromDate === toDate) return overrides;
  const from = days.find((d) => d.date === fromDate);
  const to = days.find((d) => d.date === toDate);
  if (!from || !to) return overrides;
  const item = from.items.find((i) => i.id === itemId);
  if (!item) return overrides;
  return {
    ...overrides,
    [fromDate]: from.items.filter((i) => i.id !== itemId),
    [toDate]: [...to.items, item],
  };
}

// ---------------------------------------------------------------------------
// Finish-date projection
// ---------------------------------------------------------------------------

export type FinishProjection = {
  /** ISO date the last item lands on. */
  date: string;
  /** Study sessions required. */
  studyDays: number;
  /** Calendar days from the start, inclusive. */
  calendarDays: number;
  totalMinutes: number;
};

/**
 * When a body of work actually finishes.
 *
 * Walks the calendar honouring the chosen weekdays rather than dividing by 7,
 * so "Saturdays only" projects a real date instead of an optimistic one. Not
 * capped by `weeks` — this answers "how long will this take?", which is exactly
 * the question the plan length is supposed to be set FROM.
 */
export function projectFinish(
  items: StudyItem[],
  settings: Pick<PourSettings, "startDate" | "minutesPerDay" | "studyDays">,
): FinishProjection | null {
  const totalMinutes = items.reduce((s, i) => s + i.minutes, 0);
  if (!settings.startDate || totalMinutes === 0 || settings.studyDays.length === 0) return null;

  const perDay = Math.max(1, settings.minutesPerDay);
  const studyDaysNeeded = Math.ceil(totalMinutes / perDay);

  const start = toUtcDay(settings.startDate);
  let seen = 0;
  // Ten years is a safety stop; a real plan resolves in a few hundred days.
  for (let offset = 0; offset < 3650; offset++) {
    const date = fromUtcDay(start + offset);
    if (settings.studyDays.includes(weekdayOf(date))) {
      seen++;
      if (seen >= studyDaysNeeded) {
        return {
          date,
          studyDays: studyDaysNeeded,
          calendarDays: offset + 1,
          totalMinutes,
        };
      }
    }
  }
  return null;
}

/**
 * Two projections: the whole curriculum, and the videos on their own.
 *
 * The video-only figure answers "how long if I just watch the course?" — useful
 * because the exercises roughly triple the calendar, and a learner deciding on
 * a plan length deserves to see both numbers rather than only the long one.
 */
export function projectBoth(
  stream: StudyItem[],
  settings: Pick<PourSettings, "startDate" | "minutesPerDay" | "studyDays">,
): { full: FinishProjection | null; videosOnly: FinishProjection | null } {
  return {
    full: projectFinish(stream, settings),
    videosOnly: projectFinish(
      stream.filter((i) => i.kind === "video"),
      settings,
    ),
  };
}

// ---------------------------------------------------------------------------
// Learner-authored programme
// ---------------------------------------------------------------------------

/**
 * The learner's own arrangement of the curriculum.
 *
 * Everything is optional and additive: an empty customisation means "use the
 * track exactly as authored". That keeps the default path intact for the many
 * learners who will never touch this, while letting anyone who wants to run
 * Production first, skip blocks entirely, or reorder inside a block do so.
 */
export type Customisation = {
  /**
   * "guided" runs English Plan's own recommended order — the arrangement below
   * is kept but ignored, so switching back and forth never loses their work.
   * "custom" applies it.
   */
  mode: "guided" | "custom";
  /** Block keys in the learner's order. Unlisted blocks follow, in track order. */
  blockOrder: string[];
  /** Block keys the learner has switched off. */
  excludedBlocks: string[];
  /** Per block key: item ids in the learner's order. Unlisted items follow. */
  itemOrder: Record<string, string[]>;
};

export const EMPTY_CUSTOMISATION: Customisation = {
  mode: "guided",
  blockOrder: [],
  excludedBlocks: [],
  itemOrder: {},
};

/** Rank by position in `order`; anything unlisted sorts after, keeping its own order. */
function rankIn(order: string[], key: string): number {
  const i = order.indexOf(key);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Apply a customisation to an already-built stream.
 *
 * Runs after buildItemStream rather than inside it, so the personalisation
 * rules (rung path, block-by-block ordering) stay in one place and this only
 * ever rearranges or removes what those produced.
 */
export function applyCustomisation(
  stream: StudyItem[],
  custom: Customisation = EMPTY_CUSTOMISATION,
): StudyItem[] {
  // Guided is the default: English Plan's own order, untouched.
  if (custom.mode !== "custom") return stream;

  const excluded = new Set(custom.excludedBlocks);
  const kept = stream.filter((i) => !excluded.has(i.blockKey));

  // Group by block so within-block ordering is independent of block ordering.
  const byBlock = new Map<string, StudyItem[]>();
  for (const item of kept) {
    const list = byBlock.get(item.blockKey) ?? [];
    list.push(item);
    byBlock.set(item.blockKey, list);
  }

  const blockKeys = [...byBlock.keys()].sort((a, b) => {
    const ra = rankIn(custom.blockOrder, a);
    const rb = rankIn(custom.blockOrder, b);
    if (ra !== rb) return ra - rb;
    // Unlisted blocks fall back to the curriculum's own order.
    const oa = byBlock.get(a)![0]?.blockOrder ?? 0;
    const ob = byBlock.get(b)![0]?.blockOrder ?? 0;
    return oa - ob;
  });

  const out: StudyItem[] = [];
  for (const key of blockKeys) {
    const items = byBlock.get(key)!;
    const order = custom.itemOrder[key];
    if (!order || order.length === 0) {
      out.push(...items);
      continue;
    }
    // Stable: listed items in the learner's order, then the rest untouched.
    const indexed = items.map((item, i) => ({ item, i }));
    indexed.sort((a, b) => {
      const ra = rankIn(order, a.item.id);
      const rb = rankIn(order, b.item.id);
      return ra !== rb ? ra - rb : a.i - b.i;
    });
    out.push(...indexed.map((x) => x.item));
  }
  return out;
}

/** Blocks present in a stream, in their current order — what the UI lists. */
export function blocksInStream(
  stream: StudyItem[],
): { key: string; titleTh: string; items: StudyItem[] }[] {
  const seen = new Map<string, { key: string; titleTh: string; items: StudyItem[] }>();
  for (const item of stream) {
    const hit = seen.get(item.blockKey);
    if (hit) hit.items.push(item);
    else seen.set(item.blockKey, { key: item.blockKey, titleTh: item.blockTitleTh, items: [item] });
  }
  return [...seen.values()];
}

/** Move a key one place up or down in an explicit order list. */
export function moveInOrder(order: string[], key: string, delta: -1 | 1): string[] {
  const list = [...order];
  const i = list.indexOf(key);
  if (i === -1) return list;
  const j = i + delta;
  if (j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return list;
}

export const CUSTOMISATION_STORAGE_KEY = "ep-course-customisation-v1";


// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

/** Item ids the learner has actually finished, newest last. */
export type Progress = { completedIds: string[] };

export const EMPTY_PROGRESS: Progress = { completedIds: [] };

export function markCompleted(progress: Progress, ids: string[]): Progress {
  const seen = new Set(progress.completedIds);
  return { completedIds: [...progress.completedIds, ...ids.filter((id) => !seen.has(id))] };
}

export type CompletionState = {
  total: number;
  done: number;
  percent: number;
  /** True only when every scheduled item has actually been finished. */
  isComplete: boolean;
};

/**
 * How far through the programme the learner really is.
 *
 * Deliberately based on finished items, NOT on whether the plan fits the
 * calendar — an earlier version checked schedulability and so congratulated
 * everyone on day one.
 */
export function completionOf(stream: StudyItem[], progress: Progress): CompletionState {
  const done = new Set(progress.completedIds);
  const total = stream.length;
  const finished = stream.filter((i) => done.has(i.id)).length;
  return {
    total,
    done: finished,
    percent: total === 0 ? 0 : Math.round((finished / total) * 100),
    isComplete: total > 0 && finished >= total,
  };
}

export const PROGRESS_STORAGE_KEY = "ep-course-progress-v1";
