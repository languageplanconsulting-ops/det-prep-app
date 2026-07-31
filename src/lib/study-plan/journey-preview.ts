/**
 * Journey composer for the /preview/journey page.
 *
 * Takes the REAL engines — generateCalendar() for study/mock days,
 * buildDailyPlanItems() for the exercise sequence, COURSE_VIDEO_PLAN for the
 * teaching videos — and composes the day/week/month view a student would see
 * after logging in.
 *
 * IMPORTANT: the video slot is a PROPOSAL. The shipped daily plan
 * (src/lib/study-plan/daily-plan.ts) is exercises-only; nothing here writes to
 * study_plan_daily_plans. This module exists so the shape can be reviewed
 * before it is wired into the real engine.
 */
import {
  buildDailyPlanItems,
  DAILY_SKILL_META,
  planTotalCount,
  type DailyPlanItem,
  type DailyTier,
} from "@/lib/study-plan/daily-plan";
import { COURSE_VIDEO_PLAN, type CourseVideoPlan } from "@/lib/course-production";
import { generateCalendar } from "@/lib/study-plan/schedule";

export type JourneyPhase = {
  key: "foundation" | "build" | "compete" | "peak";
  th: string;
  detailTh: string;
  /** Tailwind-ish tone token consumed by the preview UI. */
  tone: string;
};

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    key: "foundation",
    th: "ปูพื้นฐาน",
    detailTh: "รู้จักโจทย์ทุกแบบ + เก็บคะแนนง่ายก่อน",
    tone: "emerald",
  },
  { key: "build", th: "สร้างทักษะ", detailTh: "เรียนเทคนิคครบทุกประเภทโจทย์", tone: "sky" },
  { key: "compete", th: "ไล่คะแนน", detailTh: "เน้นจุดอ่อน + โจทย์ที่กินคะแนนเยอะ", tone: "amber" },
  { key: "peak", th: "ซ้อมจริง", detailTh: "จับเวลาเต็มรูปแบบ ทำ mock ถี่ขึ้น", tone: "rose" },
];

/** Share of the plan each phase occupies. Sums to 1. */
const PHASE_WEIGHTS: Record<JourneyPhase["key"], number> = {
  foundation: 0.15,
  build: 0.3,
  compete: 0.3,
  peak: 0.25,
};

export type JourneyDayKind = "video" | "drill" | "mock" | "rest";

export type JourneyDay = {
  date: string;
  /** 0-based index across the whole plan. */
  index: number;
  weekIndex: number;
  phase: JourneyPhase;
  kind: JourneyDayKind;
  daysUntilExam: number;
  /** Present only on `kind === "video"` days. */
  video: CourseVideoPlan | null;
  videoMinutes: number;
  reviewMinutes: number;
  drillMinutes: number;
  totalMinutes: number;
  /** Exercise groups for the day. Empty on rest days. */
  items: DailyPlanItem[];
  exerciseCount: number;
  reasonTh: string;
};

export type JourneyWeek = {
  weekIndex: number;
  phase: JourneyPhase;
  days: JourneyDay[];
  video: CourseVideoPlan | null;
  totalMinutes: number;
  mockCount: number;
};

export type JourneyInput = {
  startDate: string;
  examDate: string;
  /** Daily budget the learner picked. 60 = the "sprint" tier. */
  minutesPerDay: DailyTier | 60;
  /** Which recording groups to draw videos from, in order. */
  videoGroups?: CourseVideoPlan["group"][];
};

export type Journey = {
  days: JourneyDay[];
  weeks: JourneyWeek[];
  totals: {
    days: number;
    weeks: number;
    studyDays: number;
    videoDays: number;
    mockDays: number;
    totalMinutes: number;
    totalExercises: number;
  };
};

const VIDEO_MINUTES = 7;
const REVIEW_MINUTES = 3;

/** The exercise tier used to fill the remaining minutes after video/review. */
function drillTierFor(minutes: number): DailyTier {
  if (minutes >= 28) return 30;
  if (minutes >= 18) return 20;
  if (minutes >= 8) return 10;
  return 5;
}

function phaseForIndex(index: number, total: number): JourneyPhase {
  if (total <= 0) return JOURNEY_PHASES[0];
  const ratio = index / total;
  let acc = 0;
  for (const phase of JOURNEY_PHASES) {
    acc += PHASE_WEIGHTS[phase.key];
    if (ratio < acc) return phase;
  }
  return JOURNEY_PHASES[JOURNEY_PHASES.length - 1];
}

/**
 * Videos to teach, in the order a learner should meet them: fixes first, then
 * the beginner ladder, then depth, then advanced and pronunciation.
 */
export function orderedTeachingVideos(
  groups: CourseVideoPlan["group"][] = ["A", "B", "D", "C"],
): CourseVideoPlan[] {
  return COURSE_VIDEO_PLAN.filter(
    (v) => v.status !== "dead" && groups.includes(v.group),
  ).sort((a, b) => {
    const ga = groups.indexOf(a.group);
    const gb = groups.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.priority - b.priority;
  });
}

export function buildJourney(input: JourneyInput): Journey {
  const calendar = generateCalendar({
    startDate: input.startDate,
    examDate: input.examDate,
    cadenceDays: 1,
    defaultDurationMinutes: (input.minutesPerDay === 60
      ? 30
      : input.minutesPerDay) as Exclude<DailyTier, never>,
  });

  const videos = orderedTeachingVideos(input.videoGroups);
  const total = calendar.length;
  const days: JourneyDay[] = [];
  let videoCursor = 0;

  for (let i = 0; i < total; i++) {
    const cal = calendar[i];
    const weekIndex = Math.floor(i / 7);
    const phase = phaseForIndex(i, total);
    const dow = i % 7;

    // Sunday (index 6 of each block) is rest unless it is a mock day.
    let kind: JourneyDayKind;
    if (cal.isMockTestDay) kind = "mock";
    else if (dow === 6) kind = "rest";
    else if (dow === 0) kind = "video";
    else kind = "drill";

    let video: CourseVideoPlan | null = null;
    if (kind === "video") {
      video = videos[videoCursor] ?? null;
      if (video) videoCursor++;
      // Ran out of new videos: the week becomes a pure drill week.
      else kind = "drill";
    }

    const budget = input.minutesPerDay;
    let videoMinutes = 0;
    let reviewMinutes = 0;
    let drillMinutes = 0;
    let items: DailyPlanItem[] = [];
    let reasonTh = "";

    if (kind === "mock") {
      drillMinutes = budget >= 30 ? 60 : 30;
      reasonTh =
        cal.daysUntilExam <= 14
          ? "ใกล้สอบแล้ว — ซ้อมจับเวลาเต็มรูปแบบ"
          : "เช็คคะแนนกลางทาง แล้วปรับแผนให้ตรงจุดอ่อน";
    } else if (kind === "rest") {
      reasonTh = "วันพัก — สมองต้องได้เรียบเรียงสิ่งที่เรียนมา";
    } else if (kind === "video") {
      videoMinutes = VIDEO_MINUTES;
      reviewMinutes = REVIEW_MINUTES;
      drillMinutes = Math.max(0, budget - videoMinutes - reviewMinutes);
      items = buildDailyPlanItems(drillTierFor(drillMinutes), "exam");
      reasonTh = "วันเรียนเทคนิคใหม่ แล้วลองทำทันทีในวันเดียวกัน";
    } else {
      reviewMinutes = REVIEW_MINUTES;
      drillMinutes = Math.max(0, budget - reviewMinutes);
      items = buildDailyPlanItems(drillTierFor(drillMinutes), "exam");
      reasonTh = "ทบทวนของเก่า แล้วฝึกจุดอ่อนต่อ";
    }

    days.push({
      date: cal.date,
      index: i,
      weekIndex,
      phase,
      kind,
      daysUntilExam: cal.daysUntilExam,
      video,
      videoMinutes,
      reviewMinutes,
      drillMinutes,
      totalMinutes: videoMinutes + reviewMinutes + drillMinutes,
      items,
      exerciseCount: planTotalCount(items),
      reasonTh,
    });
  }

  const weekCount = Math.ceil(days.length / 7);
  const weeks: JourneyWeek[] = Array.from({ length: weekCount }, (_, w) => {
    const slice = days.filter((d) => d.weekIndex === w);
    return {
      weekIndex: w,
      phase: slice[0]?.phase ?? JOURNEY_PHASES[0],
      days: slice,
      video: slice.find((d) => d.video)?.video ?? null,
      totalMinutes: slice.reduce((s, d) => s + d.totalMinutes, 0),
      mockCount: slice.filter((d) => d.kind === "mock").length,
    };
  });

  return {
    days,
    weeks,
    totals: {
      days: days.length,
      weeks: weekCount,
      studyDays: days.filter((d) => d.kind !== "rest").length,
      videoDays: days.filter((d) => d.kind === "video").length,
      mockDays: days.filter((d) => d.kind === "mock").length,
      totalMinutes: days.reduce((s, d) => s + d.totalMinutes, 0),
      totalExercises: days.reduce((s, d) => s + d.exerciseCount, 0),
    },
  };
}

/** Human label for an exercise group, e.g. "🎧 ตามคำบอก ×3". */
export function itemLabel(item: DailyPlanItem): string {
  const meta = DAILY_SKILL_META[item.skill];
  return `${meta.emoji} ${meta.th} ×${item.count}`;
}
