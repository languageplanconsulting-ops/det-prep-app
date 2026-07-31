"use client";

import { useMemo, useState } from "react";

import type { CourseSnapshot, CourseLessonRow } from "@/lib/admin-course-data";

const BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? "715227";

function embedUrl(guid: string): string {
  return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${guid}?autoplay=false&preload=false`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const MIGRATION_BADGE: Record<CourseLessonRow["migrationStatus"], { label: string; cls: string }> = {
  pending: { label: "รอย้าย", cls: "bg-neutral-200 text-neutral-700" },
  uploading: { label: "กำลังอัปโหลด", cls: "bg-amber-200 text-amber-900" },
  done: { label: "พร้อม", cls: "bg-emerald-200 text-emerald-900" },
  failed: { label: "ล้มเหลว", cls: "bg-red-300 text-red-900" },
  skipped: { label: "ไม่มีวิดีโอ", cls: "bg-neutral-200 text-neutral-500" },
};

export function CourseAdminClient({ snapshot }: { snapshot: CourseSnapshot }) {
  const firstPlayable = useMemo(() => {
    for (const chapter of snapshot.chapters) {
      const hit = chapter.lessons.find((l) => l.bunnyVideoGuid);
      if (hit) return hit.id;
    }
    return null;
  }, [snapshot]);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(firstPlayable);
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => new Set(snapshot.chapters.slice(0, 1).map((c) => c.id)),
  );

  const activeLesson = useMemo(() => {
    for (const chapter of snapshot.chapters) {
      const hit = chapter.lessons.find((l) => l.id === activeLessonId);
      if (hit) return hit;
    }
    return null;
  }, [snapshot, activeLessonId]);

  function toggleChapter(id: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    // Sidebar sits left on desktop via order utilities; on mobile the player
    // still comes first.
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Player + handouts */}
      <section className="ep-brutal rounded-sm border-black bg-white p-4 lg:order-2">
        {activeLesson?.bunnyVideoGuid ? (
          <>
            <div className="relative w-full overflow-hidden border-4 border-black bg-black pt-[56.25%]">
              <iframe
                key={activeLesson.bunnyVideoGuid}
                src={embedUrl(activeLesson.bunnyVideoGuid)}
                title={activeLesson.title}
                loading="lazy"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <h2 className="mt-4 text-xl font-black tracking-tight">{activeLesson.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {formatDuration(activeLesson.durationSeconds)}
              {activeLesson.freePreview ? " · Free preview" : ""}
            </p>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 border-4 border-dashed border-neutral-400 bg-neutral-50 p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              {activeLesson
                ? "บทเรียนนี้ไม่มีวิดีโอ"
                : snapshot.totals.withVideo === 0
                  ? "ยังไม่มีวิดีโอที่ย้ายมา"
                  : "เลือกบทเรียนจากด้านขวา"}
            </p>
          </div>
        )}

        {/* Download buttons below the video */}
        {activeLesson && activeLesson.downloads.length > 0 && (
          <div className="mt-5 border-t-4 border-black pt-4">
            <h3
              className="text-xs font-black uppercase tracking-[0.15em] text-neutral-500"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              เอกสารประกอบ ({activeLesson.downloads.length})
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {activeLesson.downloads.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/api/course/download/${d.id}`}
                    className="flex items-center justify-between gap-3 rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2.5 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="shrink-0 font-black">
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

      {/* Chapter / lesson sidebar */}
      <aside className="ep-brutal max-h-[80vh] overflow-y-auto rounded-sm border-black bg-white p-3 lg:order-1">
        {snapshot.chapters.map((chapter, ci) => {
          const open = openChapters.has(chapter.id);
          return (
            <div key={chapter.id} className="mb-3 border-2 border-black">
              <button
                type="button"
                onClick={() => toggleChapter(chapter.id)}
                className="w-full bg-[#004AAD] px-3 py-2.5 text-left text-white"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-black leading-snug">
                    {ci + 1}. {chapter.title}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[10px]">{open ? "▾" : "▸"}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-2 flex-1 border border-black/40 bg-white/25">
                    <span
                      className="block h-full bg-[#FFCC00]"
                      style={{ width: `${chapter.progressPercent}%` }}
                    />
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-bold tabular-nums"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {chapter.progressPercent}% · {chapter.lessons.length} บท
                  </span>
                </span>
              </button>

              <ChapterBlockPicker chapter={chapter} />

              {open && (
                <ul className="divide-y divide-neutral-200">
                  {chapter.lessons.length === 0 && (
                    <li className="px-3 py-2 text-xs italic text-neutral-500">ไม่มีบทเรียน</li>
                  )}
                  {chapter.lessons.map((lesson, li) => {
                    const badge = MIGRATION_BADGE[lesson.migrationStatus];
                    const selected = lesson.id === activeLessonId;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setActiveLessonId(lesson.id)}
                          className={`flex w-full flex-col gap-1 px-3 py-2 text-left text-xs ${
                            selected ? "bg-[#FFCC00]" : "bg-white hover:bg-neutral-100"
                          }`}
                        >
                          <span className="flex gap-1.5">
                            {/* Aggregate across students: filled once anyone has
                                completed this lesson, hollow while nobody has. */}
                            <span
                              aria-label={
                                lesson.completedCount > 0
                                  ? `มีนักเรียนเรียนจบแล้ว ${lesson.completedCount} คน`
                                  : "ยังไม่มีนักเรียนเรียนจบ"
                              }
                              title={
                                lesson.completedCount > 0
                                  ? `เรียนจบแล้ว ${lesson.completedCount} คน`
                                  : "ยังไม่มีนักเรียนเรียนจบ"
                              }
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black leading-none ${
                                lesson.completedCount > 0
                                  ? "border-emerald-600 bg-emerald-500 text-white"
                                  : "border-neutral-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="shrink-0 font-bold text-neutral-400 tabular-nums">
                              {ci + 1}.{li + 1}
                            </span>
                            <span className="font-bold text-neutral-900">{lesson.title}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5 pl-6">
                            <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                              {badge.label}
                            </span>
                            {lesson.downloads.length > 0 && (
                              <span className="rounded-sm bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                PDF ×{lesson.downloads.length}
                              </span>
                            )}
                            {lesson.freePreview && (
                              <span className="rounded-sm bg-sky-200 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                                Free
                              </span>
                            )}
                            {lesson.status === "draft" && (
                              <span className="rounded-sm bg-neutral-300 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800">
                                Draft
                              </span>
                            )}
                            <span className="text-[10px] text-neutral-500">
                              {formatDuration(lesson.durationSeconds)}
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

/**
 * Sets which DET study block a chapter teaches (migration 043).
 *
 * Blank = "เดาจากชื่อบท", which falls back to the title-matching rules in
 * course-plan/categories.ts. "retired" marks chapters teaching question types
 * Duolingo removed in July 2025 — they stay visible but are excluded from
 * study plans.
 */
function ChapterBlockPicker({
  chapter,
}: {
  chapter: { id: string; studyBlock: string | null };
}) {
  const [value, setValue] = useState(chapter.studyBlock ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setValue(next);
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/course-chapter-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id, studyBlock: next || null }),
      });
      const json = (await res.json()) as { error?: string };
      setMsg(res.ok ? "บันทึกแล้ว" : (json.error ?? "บันทึกไม่สำเร็จ"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-black bg-neutral-50 px-3 py-2">
      <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
        หมวด
      </span>
      <select
        value={value}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        className="rounded-[3px] border-2 border-black bg-white px-2 py-1 text-xs font-bold disabled:opacity-50"
      >
        <option value="">เดาจากชื่อบท</option>
        <option value="production">Production (พูด+เขียน)</option>
        <option value="conversation">Conversation (ฟัง+พูด)</option>
        <option value="comprehension">Comprehension (อ่าน+ฟัง)</option>
        <option value="literacy">Literacy (อ่าน+เขียน)</option>
        <option value="general">ภาพรวม / ซ้อมจริง</option>
        <option value="retired">ข้อสอบตัดออกแล้ว</option>
      </select>
      {msg && <span className="text-[10px] font-bold text-neutral-600">{msg}</span>}
    </div>
  );
}
