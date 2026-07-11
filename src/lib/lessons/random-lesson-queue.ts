/**
 * Randomized บทเรียน (lesson) plan + queue builder.
 *
 * Adapts det-mobile's daily-lesson engine (src/lib/daily-lesson.ts
 * DAILY_LESSON_COMPOSITION) to the web. Mobile's composition is a per-duration
 * list of (skill, count) slots where each slot is an individual lesson ITEM. The
 * web instead has one batching runner per lesson topic, so we collapse mobile's
 * many fine-grained skills onto the 6 web lesson topics and express the workload
 * as ROUNDS per topic (a round = one visit to that topic's runner).
 *
 * Crucially the workload SCALES with the time budget — 5/10/20/30 min are NOT the
 * same set. Longer budgets add topics and rounds, mirroring how mobile's 5-min
 * plan is tiny (dictation + a bit of production) while its 30-min plan is a full
 * sweep across every skill. See LESSON_DURATION_COMPOSITION below.
 */
import { LESSON_TOPICS, lessonTopicHref, type LessonTopic } from "@/lib/lessons/topics";
import type { RandomDifficulty } from "@/lib/practice-random";
import type { QueueItem } from "@/lib/practice-queue-builder";

export type LessonDuration = 5 | 10 | 20 | 30;

export type LessonPlanGroup = {
  slug: string;
  th: string;
  emoji: string;
  href: string;
  /** How many runner visits this topic contributes to the day's plan at this duration. */
  rounds: number;
};

const TOPIC_BY_SLUG: Record<string, LessonTopic> = Object.fromEntries(
  LESSON_TOPICS.map((t) => [t.slug, t]),
);

/**
 * Rounds-per-topic per duration, adapted from mobile's DAILY_LESSON_COMPOSITION
 * (mobile item counts collapsed onto web topics, then scaled down to runner-rounds
 * so a session stays sane). The ORDER here is the run order — dictation first, then
 * reading, production, real-word, campus vocab — matching mobile's slot order.
 *
 * 5 → 4 rounds · 10 → 7 · 20 → 10 · 30 → 13. Each step up adds real work.
 */
const COMPOSITION: Record<LessonDuration, { slug: string; rounds: number }[]> = {
  5: [
    { slug: "dictation", rounds: 1 },
    { slug: "how-to-write", rounds: 1 },
    { slug: "how-to-speak", rounds: 1 },
    { slug: "real-word", rounds: 1 },
  ],
  10: [
    { slug: "dictation", rounds: 2 },
    { slug: "reading-skills", rounds: 1 },
    { slug: "how-to-write", rounds: 1 },
    { slug: "how-to-speak", rounds: 1 },
    { slug: "real-word", rounds: 1 },
    { slug: "campus-vocab", rounds: 1 },
  ],
  20: [
    { slug: "dictation", rounds: 3 },
    { slug: "reading-skills", rounds: 2 },
    { slug: "how-to-write", rounds: 2 },
    { slug: "how-to-speak", rounds: 1 },
    { slug: "real-word", rounds: 1 },
    { slug: "campus-vocab", rounds: 1 },
  ],
  30: [
    { slug: "dictation", rounds: 3 },
    { slug: "reading-skills", rounds: 3 },
    { slug: "how-to-write", rounds: 2 },
    { slug: "how-to-speak", rounds: 2 },
    { slug: "real-word", rounds: 2 },
    { slug: "campus-vocab", rounds: 1 },
  ],
};

/** The grouped plan for a duration (topic + rounds), for a checklist-style display. */
export function lessonPlanForDuration(duration: LessonDuration): LessonPlanGroup[] {
  return COMPOSITION[duration]
    .map(({ slug, rounds }) => {
      const t = TOPIC_BY_SLUG[slug];
      if (!t) return null;
      return { slug, th: t.th, emoji: t.emoji, href: lessonTopicHref(slug), rounds };
    })
    .filter((g): g is LessonPlanGroup => g !== null);
}

/** Total number of runner-rounds in a duration's plan. */
export function lessonPlanTotalRounds(duration: LessonDuration): number {
  return COMPOSITION[duration].reduce((s, g) => s + g.rounds, 0);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Flatten the duration's plan into an ordered queue of runner visits (one QueueItem
 * per round). Used by the 🎲 picker and by the calendar's "ทำทั้งหมด" launch.
 *
 * Rounds are laid out ROUND-ROBIN across a shuffled topic order, so a topic's
 * repeated rounds are always separated by the other topics — never two identical
 * hrefs back to back. That matters for the run: the daily-queue banner advances by
 * pathname, and two adjacent identical steps would make "ต่อไป" a no-op.
 *
 * `difficulty` is accepted for parity with the exam picker but does not filter
 * lesson content (web lesson banks aren't difficulty-tiered, same as mobile where
 * the daily lesson is duration-only).
 */
export function buildRandomLessonQueue(
  _difficulty: RandomDifficulty,
  duration: LessonDuration,
): QueueItem[] {
  const groups = shuffle(lessonPlanForDuration(duration)).map((g) => ({ g, left: g.rounds }));
  const out: QueueItem[] = [];
  let placed = true;
  while (placed) {
    placed = false;
    for (const r of groups) {
      if (r.left <= 0) continue;
      const roundIdx = r.g.rounds - r.left;
      out.push({
        key: `${r.g.href}#${roundIdx}`,
        emoji: r.g.emoji,
        label: r.g.rounds > 1 ? `${r.g.th} · รอบ ${roundIdx + 1}` : r.g.th,
        href: r.g.href,
      });
      r.left -= 1;
      placed = true;
    }
  }
  return out;
}
