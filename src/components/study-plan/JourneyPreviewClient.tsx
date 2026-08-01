"use client";

import { useMemo, useState } from "react";

import { LEVEL_TH, QUESTION_TYPE_TH, STATUS_TH } from "@/lib/course-production";
import type { DailyTier } from "@/lib/study-plan/daily-plan";
import {
  buildJourney,
  itemLabel,
  JOURNEY_PHASES,
  type JourneyDay,
} from "@/lib/study-plan/journey-preview";
import {
  simulateJourney,
  SKILL_KEYS,
  SKILL_TH,
  START_PRESETS,
  type SkillKey,
} from "@/lib/study-plan/journey-progress";

const TONE: Record<string, { bg: string; text: string; ring: string; solid: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", solid: "bg-emerald-500" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200", solid: "bg-sky-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", solid: "bg-amber-500" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", solid: "bg-rose-500" },
};

const KIND_META: Record<JourneyDay["kind"], { emoji: string; th: string; cls: string }> = {
  video: { emoji: "🎬", th: "เรียนเลกเชอร์ใหม่", cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  drill: { emoji: "🏋️", th: "ฝึกโจทย์", cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  mock: { emoji: "📝", th: "สอบจำลอง", cls: "bg-rose-100 text-rose-800 ring-rose-200" },
  rest: { emoji: "😴", th: "วันพัก", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};

const MONTH_OPTIONS = [1, 3, 6] as const;
const MINUTE_OPTIONS: (DailyTier | 60)[] = [10, 20, 30, 60];

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function thaiDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function JourneyPreviewClient({ startDate }: { startDate: string }) {
  const [months, setMonths] = useState<(typeof MONTH_OPTIONS)[number]>(6);
  const [minutes, setMinutes] = useState<DailyTier | 60>(20);
  const [view, setView] = useState<"month" | "week" | "day">("day");
  const [weekIndex, setWeekIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(0);
  const [presetKey, setPresetKey] = useState(START_PRESETS[0].key);

  const preset = START_PRESETS.find((p) => p.key === presetKey) ?? START_PRESETS[0];

  const journey = useMemo(
    () =>
      buildJourney({
        startDate,
        examDate: addMonths(startDate, months),
        minutesPerDay: minutes,
      }),
    [startDate, months, minutes],
  );

  const progress = useMemo(
    () =>
      simulateJourney({
        start: preset.vector,
        goal: preset.goal,
        minutesPerDay: minutes,
        days: journey.days.map((d) => ({ date: d.date, kind: d.kind })),
      }),
    [journey, preset, minutes],
  );

  const day = journey.days[Math.min(dayIndex, journey.days.length - 1)];
  const week = journey.weeks[Math.min(weekIndex, journey.weeks.length - 1)];
  const dayState = progress.days[Math.min(dayIndex, progress.days.length - 1)];

  return (
    <div className="ep-page-shell space-y-5">
      {/* ---------------- controls ---------------- */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Control label="ระยะเวลาแผน">
            {MONTH_OPTIONS.map((m) => (
              <Pill key={m} on={months === m} onClick={() => { setMonths(m); setDayIndex(0); setWeekIndex(0); }}>
                {m} เดือน
              </Pill>
            ))}
          </Control>
          <Control label="เวลาต่อวัน">
            {MINUTE_OPTIONS.map((m) => (
              <Pill key={m} on={minutes === m} onClick={() => setMinutes(m)}>
                {m === 60 ? "60 นาที (สปรินต์)" : `${m} นาที`}
              </Pill>
            ))}
          </Control>
          <Control label="มุมมอง">
            {([["day", "รายวัน"], ["week", "รายสัปดาห์"], ["month", "ภาพรวมทั้งแผน"]] as const).map(
              ([v, th]) => (
                <Pill key={v} on={view === v} onClick={() => setView(v)}>
                  {th}
                </Pill>
              ),
            )}
          </Control>
          <Control label="นักเรียนตัวอย่าง">
            {START_PRESETS.map((p) => (
              <Pill key={p.key} on={presetKey === p.key} onClick={() => setPresetKey(p.key)}>
                {p.th}
              </Pill>
            ))}
          </Control>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat n={journey.totals.days} label="วันทั้งหมด" />
          <Stat n={journey.totals.videoDays} label="วันเรียนเลกเชอร์" />
          <Stat n={journey.totals.mockDays} label="วันสอบจำลอง" />
          <Stat n={Math.round(journey.totals.totalMinutes / 60)} label="ชั่วโมงรวม" />
          <Stat n={journey.totals.totalExercises} label="ข้อฝึกรวม" />
        </div>
      </section>

      {/* ---------------- progression: the 3 lines ---------------- */}
      {dayState && (
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            สิ่งที่นักเรียนเห็นบนปฏิทิน (วันที่ {dayState.dayIndex + 1})
          </p>

          {/* line 1 — days left + projection vs goal */}
          <div
            className={`rounded-xl p-3 ring-1 ${
              progress.willReachGoal
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-rose-50 text-rose-800 ring-rose-200"
            }`}
          >
            <p className="text-sm font-black">
              เหลืออีก {journey.totals.days - dayState.dayIndex - 1} วัน · คาดว่าจะได้{" "}
              {progress.projectedOverall} จากเป้า {progress.goal}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              ตอนนี้ {dayState.overall}
              {dayState.lastMockOverall !== null && ` · สอบจำลองล่าสุดได้ ${dayState.lastMockOverall}`}
              {progress.willReachGoal
                ? " — ไปได้ตามแผน"
                : ` — ยังขาดอีก ${Math.max(0, progress.goal - progress.projectedOverall)} คะแนน`}
            </p>
          </div>

          {/* line 2 — ready skills */}
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-sm font-black text-slate-700">
              ทักษะที่พร้อมแล้ว:{" "}
              {dayState.readySkills.length === 0 ? (
                <span className="font-bold text-slate-400">ยังไม่มี — กำลังไต่ระดับอยู่</span>
              ) : (
                dayState.readySkills
                  .map((k) => `${SKILL_TH[k].emoji} ${SKILL_TH[k].th}`)
                  .join(" · ")
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              พร้อม = ทำได้ถึงเป้าติดกัน 2 ครั้งในสอบจำลอง (ไม่ใช่ต้องได้ 100%)
            </p>
          </div>

          {/* line 3 — current focus */}
          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="text-sm font-black text-amber-900">
              ตอนนี้เน้น:{" "}
              {dayState.focus
                ? `${SKILL_TH[dayState.focus].emoji} ${SKILL_TH[dayState.focus].th}`
                : "🎉 ครบทุกทักษะแล้ว — เหลือแค่ซ้อมจับเวลา"}
            </p>
            {dayState.focus && (
              <p className="mt-0.5 text-[11px] text-amber-700">
                ยังขาดอีก{" "}
                {dayState.skills.find((s) => s.skill === dayState.focus)?.gapToTarget ?? 0} คะแนน
                จึงจะถึงเป้าของทักษะนี้
              </p>
            )}
          </div>

          {/* per-skill bars */}
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
            {dayState.skills.map((s) => {
              const pct = Math.min(100, Math.round((s.current / Math.max(1, s.target)) * 100));
              return (
                <div key={s.skill} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-black text-slate-600">
                      {SKILL_TH[s.skill].emoji} {SKILL_TH[s.skill].th}
                    </p>
                    {s.ready && <span className="text-[10px] font-black text-emerald-600">พร้อม ✓</span>}
                  </div>
                  <p className="mt-0.5 text-lg font-black text-slate-800">
                    {s.current}
                    <span className="text-[11px] font-bold text-slate-400"> / {s.target}</span>
                  </p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${s.ready ? "bg-emerald-500" : s.skill === dayState.focus ? "bg-amber-500" : "bg-slate-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* plateau warning */}
          {progress.plateau.detected && (
            <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
              <p className="text-sm font-black text-rose-800">⚠️ แผนต้องปรับ</p>
              <p className="mt-0.5 text-[12px] text-rose-700">{progress.plateau.messageTh}</p>
              {progress.plateau.needsHumanMarking && (
                <p className="mt-1 text-[11px] font-bold text-rose-600">
                  → นี่คือจุดที่แพ็กเกจมีคนตรวจงานให้คุ้มที่สุด
                </p>
              )}
            </div>
          )}

          {/* milestones */}
          {progress.milestones.length > 0 && (
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500">
                คาดว่าจะผ่านแต่ละทักษะเมื่อไหร่
              </p>
              <ul className="mt-1 space-y-0.5">
                {progress.milestones.map((m) => (
                  <li key={m.skill} className="text-[12px] font-bold text-emerald-800">
                    {SKILL_TH[m.skill].emoji} {SKILL_TH[m.skill].th} → {m.score} คะแนน · วันที่{" "}
                    {m.dayIndex + 1} ({thaiDate(m.date)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ---------------- phase strip ---------------- */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
          4 ช่วงของแผน
        </p>
        <div className="flex gap-1.5">
          {JOURNEY_PHASES.map((p) => {
            const t = TONE[p.tone];
            const count = journey.days.filter((d) => d.phase.key === p.key).length;
            const pct = Math.round((count / Math.max(1, journey.totals.days)) * 100);
            return (
              <div key={p.key} className={`flex-1 rounded-xl p-3 ring-1 ${t.bg} ${t.ring}`} style={{ flexGrow: pct }}>
                <p className={`text-sm font-black ${t.text}`}>{p.th}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{p.detailTh}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">{count} วัน</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- DAY ---------------- */}
      {view === "day" && day && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
              disabled={dayIndex === 0}
            >
              ← เมื่อวาน
            </button>
            <p className="text-sm font-black text-slate-700">
              วันที่ {day.index + 1} · {thaiDate(day.date)} · เหลืออีก {day.daysUntilExam} วันก่อนสอบ
            </p>
            <button
              type="button"
              onClick={() => setDayIndex((i) => Math.min(journey.days.length - 1, i + 1))}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
              disabled={dayIndex >= journey.days.length - 1}
            >
              พรุ่งนี้ →
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className={`flex items-center justify-between px-5 py-3 ${TONE[day.phase.tone].bg}`}>
              <div>
                <p className={`text-xs font-black uppercase tracking-widest ${TONE[day.phase.tone].text}`}>
                  ช่วง{day.phase.th}
                </p>
                <p className="text-[11px] text-slate-500">{day.reasonTh}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${KIND_META[day.kind].cls}`}>
                {KIND_META[day.kind].emoji} {KIND_META[day.kind].th}
              </span>
            </div>

            <div className="space-y-3 p-5">
              {day.kind === "rest" ? (
                <p className="py-6 text-center text-sm font-bold text-slate-400">
                  😴 วันนี้พัก — เจอกันพรุ่งนี้
                </p>
              ) : (
                <>
                  <p className="text-3xl font-black text-slate-800">
                    {day.totalMinutes} <span className="text-base font-bold text-slate-400">นาทีวันนี้</span>
                  </p>

                  {day.video && (
                    <Block
                      emoji="🎬"
                      title={day.video.titleTh}
                      minutes={day.videoMinutes}
                      tone="amber"
                      sub={`${QUESTION_TYPE_TH[day.video.questionType]} · ระดับ${LEVEL_TH[day.video.level]}`}
                      badge={day.video.status !== "live" ? STATUS_TH[day.video.status] : undefined}
                    />
                  )}

                  {day.reviewMinutes > 0 && (
                    <Block
                      emoji="🔁"
                      title="ทบทวนของเก่า"
                      minutes={day.reviewMinutes}
                      tone="slate"
                      sub="คำและโจทย์ที่ถึงกำหนดทวนวันนี้"
                    />
                  )}

                  {day.kind === "mock" ? (
                    <Block
                      emoji="📝"
                      title={day.daysUntilExam <= 14 ? "สอบจำลองเต็มชุด" : "สอบจำลองเช็คคะแนน"}
                      minutes={day.drillMinutes}
                      tone="rose"
                      sub="จบแล้วได้คะแนนรายทักษะใหม่ → แผนปรับให้อัตโนมัติ"
                    />
                  ) : (
                    day.items.length > 0 && (
                      <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-black text-sky-800">🏋️ ฝึกโจทย์</p>
                          <span className="text-xs font-bold text-sky-600">
                            {day.drillMinutes} นาที · {day.exerciseCount} ข้อ
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {day.items.map((it) => (
                            <li
                              key={it.skill}
                              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700"
                            >
                              <span>{itemLabel(it)}</span>
                              <span className="text-slate-300">→</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- WEEK ---------------- */}
      {view === "week" && week && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
              disabled={weekIndex === 0}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
            >
              ← สัปดาห์ก่อน
            </button>
            <p className="text-sm font-black text-slate-700">
              สัปดาห์ที่ {week.weekIndex + 1} / {journey.totals.weeks} · ช่วง{week.phase.th}
            </p>
            <button
              type="button"
              onClick={() => setWeekIndex((i) => Math.min(journey.weeks.length - 1, i + 1))}
              disabled={weekIndex >= journey.weeks.length - 1}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
            >
              สัปดาห์ถัดไป →
            </button>
          </div>

          {week.video && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-500">
                เลกเชอร์ของสัปดาห์นี้
              </p>
              <p className="mt-0.5 text-base font-black text-amber-900">🎬 {week.video.titleTh}</p>
              <p className="text-xs text-amber-700">
                {QUESTION_TYPE_TH[week.video.questionType]} · ระดับ{LEVEL_TH[week.video.level]}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {week.days.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => {
                  setDayIndex(d.index);
                  setView("day");
                }}
                className="rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 hover:ring-slate-400"
              >
                <p className="text-[11px] font-bold text-slate-400">{thaiDate(d.date)}</p>
                <p className="mt-1 text-lg">{KIND_META[d.kind].emoji}</p>
                <p className="mt-0.5 text-[11px] font-black text-slate-700">{KIND_META[d.kind].th}</p>
                {d.kind !== "rest" && (
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {d.totalMinutes} นาที{d.exerciseCount > 0 ? ` · ${d.exerciseCount} ข้อ` : ""}
                  </p>
                )}
                {d.video && (
                  <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-tight text-amber-700">
                    {d.video.titleTh}
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- MONTH / WHOLE PLAN ---------------- */}
      {view === "month" && (
        <section className="space-y-3">
          {journey.weeks.map((w) => (
            <div key={w.weekIndex} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-black text-slate-700">
                  <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${TONE[w.phase.tone].solid}`} />
                  สัปดาห์ {w.weekIndex + 1}
                  <span className="ml-2 text-[11px] font-bold text-slate-400">ช่วง{w.phase.th}</span>
                </p>
                <p className="text-[11px] font-bold text-slate-400">
                  {w.totalMinutes} นาที{w.mockCount > 0 ? ` · สอบจำลอง ${w.mockCount} ครั้ง` : ""}
                </p>
              </div>
              {w.video && (
                <p className="mb-2 truncate text-xs font-bold text-amber-700">🎬 {w.video.titleTh}</p>
              )}
              <div className="flex gap-1">
                {w.days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    title={`${thaiDate(d.date)} · ${KIND_META[d.kind].th}`}
                    onClick={() => {
                      setDayIndex(d.index);
                      setView("day");
                    }}
                    className={`h-8 flex-1 rounded-md text-[11px] ring-1 ${KIND_META[d.kind].cls}`}
                  >
                    {KIND_META[d.kind].emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
        on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-xl font-black text-slate-800">{n}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Block({
  emoji,
  title,
  minutes,
  sub,
  tone,
  badge,
}: {
  emoji: string;
  title: string;
  minutes: number;
  sub?: string;
  tone: "amber" | "slate" | "rose";
  badge?: string;
}) {
  const cls =
    tone === "amber"
      ? "bg-amber-50 ring-amber-200 text-amber-900"
      : tone === "rose"
        ? "bg-rose-50 ring-rose-200 text-rose-900"
        : "bg-slate-50 ring-slate-200 text-slate-700";
  return (
    <div className={`rounded-2xl p-4 ring-1 ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black">
            {emoji} {title}
          </p>
          {sub && <p className="mt-0.5 text-[11px] opacity-80">{sub}</p>}
          {badge && (
            <span className="mt-1.5 inline-block rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black">
              🎥 {badge}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold opacity-70">{minutes} นาที</span>
      </div>
    </div>
  );
}
