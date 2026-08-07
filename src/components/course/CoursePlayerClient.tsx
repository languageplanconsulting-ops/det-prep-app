"use client";

import { useCallback, useMemo, useState } from "react";

import { BunnyVideoEmbed } from "@/components/course/BunnyVideoEmbed";
import type { StudentCourse, StudentLesson } from "@/lib/course-student-data";
import { saveLessonWatchProgress } from "@/lib/course-video-progress";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function CoursePlayerClient({
  course,
  initialLessonId = null,
}: {
  course: StudentCourse;
  /** Deep-link target (e.g. from the study-plan calendar's ?lesson=). Falls back to resume. */
  initialLessonId?: string | null;
}) {
  const flatLessons = useMemo(() => course.chapters.flatMap((c) => c.lessons), [course]);

  // Deep link wins; otherwise resume where they left off (first unfinished, else first).
  const initialId = useMemo(() => {
    const linked = initialLessonId ? flatLessons.find((l) => l.id === initialLessonId) : null;
    if (linked) return linked.id;
    const next = flatLessons.find((l) => !l.completed);
    return (next ?? flatLessons[0])?.id ?? null;
  }, [flatLessons, initialLessonId]);

  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(flatLessons.filter((l) => l.completed).map((l) => l.id)),
  );
  const [openChapters, setOpenChapters] = useState<Set<string>>(() => {
    const activeChapter = course.chapters.find((c) => c.lessons.some((l) => l.id === initialId));
    return new Set(activeChapter ? [activeChapter.id] : course.chapters.slice(0, 1).map((c) => c.id));
  });

  const active: StudentLesson | null = useMemo(
    () => flatLessons.find((l) => l.id === activeId) ?? null,
    [flatLessons, activeId],
  );

  const markComplete = useCallback(
    async (lessonId: string, done: boolean) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (done) next.add(lessonId);
        else next.delete(lessonId);
        return next;
      });
      try {
        const lesson = flatLessons.find((l) => l.id === lessonId);
        await saveLessonWatchProgress({
          lessonId,
          watchedSeconds: lesson?.watchedSeconds ?? 0,
          completed: done,
        });
      } catch {
        setCompleted((prev) => {
          const next = new Set(prev);
          if (done) next.delete(lessonId);
          else next.add(lessonId);
          return next;
        });
      }
    },
    [flatLessons],
  );

  function goNext() {
    if (!activeId) return;
    const i = flatLessons.findIndex((l) => l.id === activeId);
    const next = flatLessons[i + 1];
    if (next) setActiveId(next.id);
  }

  const isDone = active ? completed.has(active.id) : false;

  return (
    // Sidebar sits left on desktop via order utilities; on mobile the player
    // still comes first, which is what a student on a phone wants.
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="ep-brutal rounded-sm border-black bg-white p-4 lg:order-2">
        {active?.bunnyVideoGuid ? (
          <>
            <BunnyVideoEmbed
              guid={active.bunnyVideoGuid}
              title={active.title}
              brutal
              lessonId={active.id}
              startSeconds={active.watchedSeconds ?? 0}
              onEnded={() => {
                if (!completed.has(active.id)) {
                  void markComplete(active.id, true);
                }
              }}
            />
            <h2 className="mt-4 text-xl font-extrabold tracking-tight">{active.title}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {isDone && (
                <span
                  className="inline-flex items-center gap-2 rounded-[4px] border-4 border-black bg-emerald-300 px-4 py-2 text-sm font-bold uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000]"
                  style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                >
                  ✓ เรียนจบแล้ว
                </span>
              )}
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                style={{ fontFamily: "var(--font-jetbrains), monospace" }}
              >
                บทต่อไป →
              </button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center border-4 border-dashed border-neutral-400 bg-neutral-50 p-8 text-center text-sm font-bold text-neutral-600">
            เลือกบทเรียนจากรายการ
          </div>
        )}

        {active && active.downloads.length > 0 && (
          <div className="mt-5 border-t-4 border-black pt-4">
            <h3
              className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              เอกสารประกอบ ({active.downloads.length})
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {active.downloads.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/api/course/download/${d.id}`}
                    className="flex items-center justify-between gap-3 rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2.5 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="shrink-0 font-bold">
                        PDF
                      </span>
                      <span className="truncate text-sm font-bold text-neutral-900">{d.label}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-neutral-700">
                      {formatBytes(d.fileSize)} ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="ep-brutal max-h-[80vh] overflow-y-auto rounded-sm border-black bg-white p-3 lg:order-1">
        {course.chapters.map((chapter, ci) => {
          const open = openChapters.has(chapter.id);
          const done = chapter.lessons.filter((l) => completed.has(l.id)).length;
          const pct =
            chapter.lessons.length === 0 ? 0 : Math.round((done / chapter.lessons.length) * 100);
          return (
            <div key={chapter.id} className="mb-3 border-2 border-black">
              <button
                type="button"
                onClick={() =>
                  setOpenChapters((prev) => {
                    const next = new Set(prev);
                    if (next.has(chapter.id)) next.delete(chapter.id);
                    else next.add(chapter.id);
                    return next;
                  })
                }
                className="w-full bg-[#004AAD] px-3 py-2.5 text-left text-white"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold leading-snug">
                    {ci + 1}. {chapter.title}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[13px]">{open ? "▾" : "▸"}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-2 flex-1 border border-black/40 bg-white/25">
                    <span className="block h-full bg-[#FFCC00]" style={{ width: `${pct}%` }} />
                  </span>
                  <span
                    className="shrink-0 text-[13px] font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {done}/{chapter.lessons.length}
                  </span>
                </span>
              </button>

              {open && (
                <ul className="divide-y divide-neutral-200">
                  {chapter.lessons.map((lesson, li) => {
                    const selected = lesson.id === activeId;
                    const finished = completed.has(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(lesson.id)}
                          className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs ${
                            selected ? "bg-[#FFCC00]" : "bg-white hover:bg-neutral-100"
                          }`}
                        >
                          <span
                            aria-label={finished ? "เรียนจบแล้ว" : "ยังไม่ได้เรียน"}
                            title={finished ? "เรียนจบแล้ว" : "ยังไม่ได้เรียน"}
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold leading-none ${
                              finished
                                ? "border-emerald-600 bg-emerald-500 text-white"
                                : "border-neutral-300 bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-neutral-900">
                              {ci + 1}.{li + 1} {lesson.title}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {lesson.downloads.length > 0 && (
                                <span className="rounded-sm bg-amber-200 px-1.5 py-0.5 text-[13px] font-bold text-amber-900">
                                  PDF ×{lesson.downloads.length}
                                </span>
                              )}
                              {lesson.freePreview && (
                                <span className="rounded-sm bg-sky-200 px-1.5 py-0.5 text-[13px] font-bold text-sky-900">
                                  ทดลองเรียน
                                </span>
                              )}
                              <span className="text-[13px] text-neutral-500">
                                {formatDuration(lesson.durationSeconds)}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </aside>
    </div>
  );
}
