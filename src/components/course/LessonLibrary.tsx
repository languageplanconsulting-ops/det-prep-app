"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  blockForChapter,
  isRetiredChapter,
  STUDY_BLOCKS,
} from "@/lib/course-plan/categories";
import type { StudyItem } from "@/lib/course-plan/block-planner";
import type { StudentCourse, StudentLesson } from "@/lib/course-student-data";

/**
 * The lesson library, grouped by skill.
 *
 * Section 2 answers "what order do I study in?"; this answers "where is the
 * lesson about X?". Those are different questions, so the two groupings are
 * deliberate rather than a duplication — but the search box is what makes
 * browsing 67 lessons workable either way.
 */
export function LessonLibrary({
  course,
  stream,
  completedIds,
  goalScore,
}: {
  course: StudentCourse;
  /** The learner's programme, which defines block order and membership. */
  stream: StudyItem[];
  completedIds: Set<string>;
  /** Target score, so the library can say what the plan is built for. */
  goalScore: number;
}) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const lessonById = useMemo(() => {
    const map = new Map<string, StudentLesson & { chapterTitle: string }>();
    for (const ch of course.chapters) {
      for (const l of ch.lessons) map.set(l.id, { ...l, chapterTitle: ch.title });
    }
    return map;
  }, [course]);

  /** Which programme item each lesson maps to, so completion stays in step. */
  const itemIdByLesson = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of stream) {
      if (item.kind === "video" && item.lessonId) map.set(item.lessonId, item.id);
    }
    return map;
  }, [stream]);

  /** Skill buckets, in STUDY_BLOCKS order. Retired chapters are left out. */
  const blocks = useMemo(() => {
    return STUDY_BLOCKS.map((sb) => {
      const lessons = course.chapters
        .filter(
          (c) =>
            !isRetiredChapter(c.title, c.studyBlock) &&
            blockForChapter(c.title, c.studyBlock) === sb.key,
        )
        .flatMap((c) =>
          c.lessons.map((l) => ({
            ...l,
            chapterTitle: c.title,
            itemId: itemIdByLesson.get(l.id) ?? l.id,
          })),
        );
      // Lessons the plan schedules for this goal, and the rest — which stay
      // openable, just not part of the path.
      const inPlan = lessons.filter((l) => itemIdByLesson.has(l.id));
      const extra = lessons.filter((l) => !itemIdByLesson.has(l.id));
      return {
        key: sb.key,
        titleTh: sb.th,
        subtitleTh: sb.subtitleTh,
        emoji: sb.emoji,
        tone: sb.tone,
        lessons: inPlan,
        extra,
      };
    }).filter((b) => b.lessons.length + b.extra.length > 0);
  }, [course, itemIdByLesson]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return blocks;
    return blocks
      .map((b) => ({
        ...b,
        lessons: b.lessons.filter((l) => l.title.toLowerCase().includes(q)),
        extra: b.extra.filter((l) => l.title.toLowerCase().includes(q)),
      }))
      .filter((b) => b.lessons.length + b.extra.length > 0);
  }, [blocks, q]);

  const totalLessons = blocks.reduce((s, b) => s + b.lessons.length, 0);
  const totalDone = blocks.reduce(
    (s, b) => s + b.lessons.filter((l) => completedIds.has(l.itemId) || l.completed).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อบทเรียน…"
          className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-slate-300"
        />
        <span className="shrink-0 text-[11px] font-black text-slate-400">
          {totalDone}/{totalLessons} บทเรียน
        </span>
      </div>

      <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
        แสดงบทเรียนที่แผนของคุณใช้เพื่อไปถึง{" "}
        <strong className="text-slate-700">{goalScore} คะแนน</strong> —
        บทที่เกินระดับคุณแล้วจะอยู่ใต้หัวข้อ “ไม่อยู่ในแผน” แต่เปิดดูได้เสมอ
      </p>

      {filtered.length === 0 && (
        <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500 ring-1 ring-slate-200">
          ไม่พบบทเรียนที่ค้นหา
        </p>
      )}

      <ul className="space-y-1.5">
        {filtered.map((block, i) => {
          // Searching expands everything, so results are visible without extra taps.
          const open = q.length > 0 || openKey === block.key;
          const done = block.lessons.filter(
            (l) => completedIds.has(l.itemId) || l.completed,
          ).length;
          const pct = block.lessons.length
            ? Math.round((done / block.lessons.length) * 100)
            : 0;

          return (
            <li key={block.key} className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setOpenKey(open && !q ? null : block.key)}
                className="flex w-full items-center gap-3 bg-white p-3.5 text-left transition hover:bg-slate-50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg">
                  {block.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-black text-slate-800">
                    {block.titleTh}
                  </span>
                  <span className="block truncate text-[10px] text-slate-400">
                    {block.subtitleTh}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full bg-emerald-500 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {done}/{block.lessons.length}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                  {block.lessons.map((l) => {
                    const isDone = completedIds.has(l.itemId) || l.completed;
                    return (
                      <li key={l.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                            isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-slate-300 ring-1 ring-slate-200"
                          }`}
                        >
                          {isDone ? "✓" : ""}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[12px] font-bold ${
                              isDone ? "text-slate-400" : "text-slate-700"
                            }`}
                          >
                            {l.title}
                          </span>
                          <span className="block truncate text-[10px] text-slate-400">
                            {l.chapterTitle}
                            {l.durationSeconds
                              ? ` · ${Math.max(1, Math.round(l.durationSeconds / 60))} นาที`
                              : ""}
                          </span>
                        </span>

                        {l.downloads.length > 0 && (
                          <span
                            className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200"
                            title={`${l.downloads.length} ไฟล์แนบ`}
                          >
                            📄 {l.downloads.length}
                          </span>
                        )}

                        {l.bunnyVideoGuid ? (
                          <Link
                            href={`/course/duolingo-fast-track?lesson=${l.id}`}
                            className="shrink-0 rounded-full bg-[#004AAD] px-3 py-1 text-[10px] font-black text-white transition hover:bg-[#003a87]"
                          >
                            ดู
                          </Link>
                        ) : (
                          <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-500">
                            ยังไม่มี
                          </span>
                        )}
                      </li>
                    );
                  })}

                  {block.extra.length > 0 && (
                    <li className="bg-white/60 px-3.5 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        ไม่อยู่ในแผน ({block.extra.length}) · เปิดดูได้
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {block.extra.map((l) => (
                          <li key={l.id} className="flex items-center gap-2.5">
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-400">
                              {l.title}
                            </span>
                            {l.bunnyVideoGuid ? (
                              <Link
                                href={`/course/duolingo-fast-track?lesson=${l.id}`}
                                className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500 transition hover:bg-slate-200"
                              >
                                ดู
                              </Link>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
