/**
 * Weekly/monthly planner for the /course page.
 *
 * Pure and deterministic: same settings in, same schedule out. Drag-and-drop
 * moves are stored as a sparse override map keyed by ISO date, so the generated
 * plan stays the source of truth and only the learner's edits are persisted.
 */
import { DEFAULT_TASK_PRIORITY, taskLabel } from "@/lib/course-plan/categories";
import { COURSE_VIDEO_PLAN, type CourseVideoPlan } from "@/lib/course-production";
import type { RungLevel, RungStep } from "@/lib/course-plan/rungs";

export type PlanSettings = {
  /** ISO "YYYY-MM-DD" the plan starts from. */
  startDate: string;
  minutesPerDay: 15 | 20 | 30 | 45 | 60;
  /** Weekday numbers to study on. 0 = Sunday … 6 = Saturday. */
  studyDays: number[];
  /** How many weeks the plan runs. */
  weeks: number;
  /** Skip videos entirely — exercises only (the "practice mode" toggle). */
  practiceOnly: boolean;
};

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  startDate: "",
  minutesPerDay: 20,
  studyDays: [1, 2, 3, 4, 5],
  weeks: 12,
  practiceOnly: false,
};

export const WEEKDAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const WEEKDAY_FULL_TH = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

export const MINUTE_OPTIONS: PlanSettings["minutesPerDay"][] = [15, 20, 30, 45, 60];

/**
 * A video the planner can schedule.
 *
 * Real course lessons come from `course_lessons` (73 of them today) and carry a
 * `lessonId` so the day card can deep-link into the player. Not-yet-recorded
 * videos come from COURSE_VIDEO_PLAN and have no lessonId.
 */
export type TeachableVideo = {
  key: string;
  titleTh: string;
  /** Set for real course lessons; null for planned-but-unrecorded ones. */
  lessonId: string | null;
  status: CourseVideoPlan["status"];
  taskType: string | null;
  /** Difficulty rung this video teaches. */
  level: RungLevel;
  minutes: number;
};

/**
 * Order videos along the learner's own rung path.
 *
 * The path comes from their score vector (rungs.ts), so a student at dictation
 * 90 gets ง่าย → กลาง → ยาก while one at 125 gets ยาก only. Videos for rungs
 * the learner has already cleared are left out of the SCHEDULE — they remain
 * fully accessible in the library, which is what keeps "same price, same
 * access" true without wasting a strong student's weeks on easy content.
 *
 * With no score data the path is empty and every video is scheduled in the
 * given order, which is the right default for a learner who has not been
 * assessed yet.
 */
export function orderVideosByRungPath(
  videos: TeachableVideo[],
  path: RungStep[],
): TeachableVideo[] {
  if (path.length === 0) return videos;

  const rank = new Map<string, number>();
  path.forEach((step, i) => rank.set(`${step.taskType}:${step.level}`, i));

  return videos
    .filter((v) => !v.taskType || rank.has(`${v.taskType}:${v.level}`))
    .sort((a, b) => {
      // Untagged (orientation / full-mock) videos sort last but stay in.
      const ra = a.taskType ? (rank.get(`${a.taskType}:${a.level}`) ?? Infinity) : Infinity;
      const rb = b.taskType ? (rank.get(`${b.taskType}:${b.level}`) ?? Infinity) : Infinity;
      return ra - rb;
    });
}

export type PlannedItem =
  | {
      kind: "video";
      id: string;
      titleTh: string;
      minutes: number;
      /** Null when the video has not been recorded yet. */
      status: CourseVideoPlan["status"];
      taskType: string | null;
      /** Deep-link target in the course player. Null for unrecorded videos. */
      lessonId?: string | null;
    }
  | {
      kind: "exercise";
      id: string;
      titleTh: string;
      minutes: number;
      taskType: string;
    }
  | { kind: "review"; id: string; titleTh: string; minutes: number };

export type PlannedDay = {
  date: string;
  weekday: number;
  weekIndex: number;
  isStudyDay: boolean;
  items: PlannedItem[];
  totalMinutes: number;
};

/** Drag-and-drop edits: date → the items now assigned to that date. */
export type PlanOverrides = Record<string, PlannedItem[]>;

function toUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}
function fromUtcDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

const VIDEO_MINUTES = 7;
const REVIEW_MINUTES = 3;
const EXERCISE_MINUTES = 5;

/**
 * Not-yet-recorded videos from the production plan, in recording order.
 *
 * Used only as a TAIL after the real course lessons run out — the schedule must
 * be built from what actually exists in the course first. Dead entries are
 * excluded: they teach question types Duolingo removed in July 2025.
 */
export function plannedVideos(): TeachableVideo[] {
  const groupOrder: CourseVideoPlan["group"][] = ["A", "B", "D", "C"];
  return COURSE_VIDEO_PLAN.filter(
    (v) => v.status !== "dead" && groupOrder.includes(v.group),
  )
    .sort((a, b) => {
      const ga = groupOrder.indexOf(a.group);
      const gb = groupOrder.indexOf(b.group);
      return ga !== gb ? ga - gb : a.priority - b.priority;
    })
    .map((v) => ({
      key: v.key,
      titleTh: v.titleTh,
      lessonId: null,
      status: v.status,
      taskType: v.weaknessTaskType,
      level: v.level === "beginner" ? "easy" : v.level === "advanced" ? "hard" : "medium",
      minutes: VIDEO_MINUTES,
    }));
}

/**
 * Task order for the plan.
 *
 * `weakestFirst` comes from the mock/mini weakness vector when the learner has
 * been assessed. Tasks it does not mention keep their DEFAULT_TASK_PRIORITY
 * position, so a learner with a partial assessment still gets a full rotation.
 */
export function resolveTaskOrder(weakestFirst: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of weakestFirst) {
    if (DEFAULT_TASK_PRIORITY.includes(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  for (const t of DEFAULT_TASK_PRIORITY) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export function buildPlan(
  settings: PlanSettings,
  weakestFirst: string[] = [],
  overrides: PlanOverrides = {},
  /**
   * Real course lessons, already ordered. Pass the 73 from `course_lessons` —
   * the schedule teaches what actually exists before anything still unrecorded.
   */
  courseVideos: TeachableVideo[] = [],
  /** The learner's rung path. Empty = schedule everything in the given order. */
  rungPathSteps: RungStep[] = [],
): PlannedDay[] {
  const days: PlannedDay[] = [];
  if (!settings.startDate) return days;

  const taskOrder = resolveTaskOrder(weakestFirst);
  // Only videos that actually exist get scheduled. The to-record plan
  // (plannedVideos()) is deliberately NOT appended — putting a lesson a learner
  // cannot open into their calendar is worse than a shorter plan.
  const videos = settings.practiceOnly
    ? []
    : orderVideosByRungPath(courseVideos, rungPathSteps);

  const start = toUtcDay(settings.startDate);
  const totalDays = settings.weeks * 7;

  // FAIRNESS: everyone paying the same price must be scheduled the same whole
  // course. So the course is fixed and the PACE adapts — spread every video
  // across however many study days this learner chose, rather than capping at
  // one a day and leaving short plans with a fraction of the content.
  let studyDayTotal = 0;
  for (let offset = 0; offset < totalDays; offset++) {
    const date = fromUtcDay(start + offset);
    if (overrides[date]) continue; // dragged days keep whatever was dropped on them
    if (settings.studyDays.includes(weekdayOf(date))) studyDayTotal++;
  }
  // Pace needed to finish the course inside the chosen window …
  const paceNeeded =
    videos.length === 0 || studyDayTotal === 0
      ? 0
      : Math.ceil(videos.length / studyDayTotal);

  // … capped by what a day can actually hold. A day must still have room for
  // review plus the drill that reinforces the video, otherwise the learner just
  // watches and never practises. When the cap bites, the plan is too short and
  // planFeasibility() tells them how many weeks it really needs.
  const avgVideoMinutes =
    videos.length === 0
      ? VIDEO_MINUTES
      : Math.max(1, videos.reduce((s, v) => s + v.minutes, 0) / videos.length);
  const roomForVideos = settings.minutesPerDay - REVIEW_MINUTES - EXERCISE_MINUTES;
  const maxByBudget = Math.max(1, Math.floor(roomForVideos / avgVideoMinutes));
  const videosPerDay = Math.min(paceNeeded, maxByBudget);

  let videoCursor = 0;
  let taskCursor = 0;

  for (let offset = 0; offset < totalDays; offset++) {
    const date = fromUtcDay(start + offset);
    const weekday = weekdayOf(date);
    const weekIndex = Math.floor(offset / 7);
    const isStudyDay = settings.studyDays.includes(weekday);

    // A dragged day wins outright — the learner moved it on purpose.
    const override = overrides[date];
    if (override) {
      days.push({
        date,
        weekday,
        weekIndex,
        isStudyDay: override.length > 0,
        items: override,
        totalMinutes: override.reduce((s, it) => s + it.minutes, 0),
      });
      continue;
    }

    if (!isStudyDay) {
      days.push({ date, weekday, weekIndex, isStudyDay: false, items: [], totalMinutes: 0 });
      continue;
    }

    const items: PlannedItem[] = [];
    let budget = settings.minutesPerDay;

    // Videos first, at whatever pace covers the whole course.
    const todaysTasks: string[] = [];
    for (let k = 0; k < videosPerDay && videoCursor < videos.length; k++) {
      const v = videos[videoCursor++];
      items.push({
        kind: "video",
        id: `v-${date}-${v.key}`,
        titleTh: v.titleTh,
        minutes: v.minutes,
        status: v.status,
        taskType: v.taskType,
        lessonId: v.lessonId,
      });
      budget -= v.minutes;
      if (v.taskType && !todaysTasks.includes(v.taskType)) todaysTasks.push(v.taskType);
    }

    if (budget >= REVIEW_MINUTES + EXERCISE_MINUTES) {
      items.push({
        kind: "review",
        id: `r-${date}`,
        titleTh: "ทบทวนของเก่า",
        minutes: REVIEW_MINUTES,
      });
      budget -= REVIEW_MINUTES;
    }

    // COHERENCE: practise what today's video taught, before anything else.
    // Pairing a "write about a photo" video with a "speak about a photo" drill
    // teaches nothing — the drill has to reinforce the lesson.
    for (const task of todaysTasks) {
      if (budget < EXERCISE_MINUTES) break;
      items.push({
        kind: "exercise",
        id: `e-${date}-${task}-paired`,
        titleTh: taskLabel(task),
        minutes: EXERCISE_MINUTES,
        taskType: task,
      });
      budget -= EXERCISE_MINUTES;
    }

    // Remaining minutes rotate through the weakness order, skipping anything
    // already covered above so a day never repeats the same drill.
    while (budget >= EXERCISE_MINUTES && taskOrder.length > 0) {
      let task: string | null = null;
      for (let tries = 0; tries < taskOrder.length; tries++) {
        const candidate = taskOrder[taskCursor % taskOrder.length];
        taskCursor++;
        if (!todaysTasks.includes(candidate)) {
          task = candidate;
          break;
        }
      }
      if (!task) break;
      todaysTasks.push(task);
      items.push({
        kind: "exercise",
        id: `e-${date}-${task}-${items.length}`,
        titleTh: taskLabel(task),
        minutes: EXERCISE_MINUTES,
        taskType: task,
      });
      budget -= EXERCISE_MINUTES;
    }

    days.push({
      date,
      weekday,
      weekIndex,
      isStudyDay: true,
      items,
      totalMinutes: items.reduce((s, it) => s + it.minutes, 0),
    });
  }

  return days;
}

export type PlanTotals = {
  studyDays: number;
  videos: number;
  exercises: number;
  hours: number;
};

export type PlanFeasibility = {
  /** Every course video fits inside the chosen window. */
  coversWholeCourse: boolean;
  scheduledVideos: number;
  totalVideos: number;
  /** Weeks needed to fit the whole course at these settings. */
  recommendedWeeks: number;
  /** Longest single day in the current plan, in minutes. */
  busiestDayMinutes: number;
};

/**
 * Can this plan actually deliver the whole course?
 *
 * Fairness rule: every learner pays the same, so every learner is scheduled the
 * same complete course. When the window is too short we do NOT silently drop
 * videos — we say how many weeks it really needs.
 */
export function planFeasibility(
  days: PlannedDay[],
  settings: PlanSettings,
  courseVideos: TeachableVideo[],
  rungPathSteps: RungStep[] = [],
): PlanFeasibility {
  // Measure against the videos this learner actually needs, not the whole
  // library — a strong student legitimately has a shorter path.
  courseVideos = orderVideosByRungPath(courseVideos, rungPathSteps);
  const scheduled = days.flatMap((d) => d.items).filter((i) => i.kind === "video").length;
  const perWeek = Math.max(1, settings.studyDays.length);
  const usableMinutes = Math.max(
    1,
    settings.minutesPerDay - REVIEW_MINUTES - EXERCISE_MINUTES,
  );
  const totalVideoMinutes = courseVideos.reduce((s, v) => s + v.minutes, 0);
  const daysNeeded = Math.ceil(totalVideoMinutes / usableMinutes);

  return {
    coversWholeCourse: scheduled >= courseVideos.length,
    scheduledVideos: scheduled,
    totalVideos: courseVideos.length,
    recommendedWeeks: Math.max(1, Math.ceil(daysNeeded / perWeek)),
    busiestDayMinutes: days.reduce((m, d) => Math.max(m, d.totalMinutes), 0),
  };
}

export function planTotals(days: PlannedDay[]): PlanTotals {
  const all = days.flatMap((d) => d.items);
  return {
    studyDays: days.filter((d) => d.items.length > 0).length,
    videos: all.filter((i) => i.kind === "video").length,
    exercises: all.filter((i) => i.kind === "exercise").length,
    hours: Math.round(days.reduce((s, d) => s + d.totalMinutes, 0) / 60),
  };
}

/** Apply a drag: move every item from one date to another. */
export function moveDay(
  days: PlannedDay[],
  overrides: PlanOverrides,
  fromDate: string,
  toDate: string,
): PlanOverrides {
  if (fromDate === toDate) return overrides;
  const from = days.find((d) => d.date === fromDate);
  const to = days.find((d) => d.date === toDate);
  if (!from || !to) return overrides;

  return {
    ...overrides,
    [fromDate]: [],
    [toDate]: [...to.items, ...from.items],
  };
}

/** Apply a drag of a single item between dates. */
export function moveItem(
  days: PlannedDay[],
  overrides: PlanOverrides,
  itemId: string,
  fromDate: string,
  toDate: string,
): PlanOverrides {
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

export const PLAN_STORAGE_KEY = "ep-course-plan-v1";
export const OVERRIDES_STORAGE_KEY = "ep-course-plan-overrides-v1";
