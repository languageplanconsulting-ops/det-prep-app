"use client";

import Link from "next/link";

import { taskLabel } from "@/lib/course-plan/categories";

/**
 * Shown at the end of any track, once the core lectures are done.
 *
 * The message is deliberately "core knowledge complete", not "you are finished"
 * — the skills below are the ones that keep improving with self-study, and
 * saying so is more honest than a congratulations screen that implies the work
 * is over.
 */

/**
 * Skills the founder identifies as needing the most ongoing practice: the ones
 * that depend on self-study, and on exposure to new topics and vocabulary.
 */
export const SELF_STUDY_SKILLS = [
  "fill_in_blanks",
  "vocabulary_reading",
  "interactive_speaking",
  "interactive_conversation_mcq",
  "dialogue_summary",
] as const;

export const SUPPORT_EMAIL = "languageplanconsulting@gmail.com";

export function CourseCompletion({
  /** Weakest-first task types from the learner's own scores, if assessed. */
  weakestFirst = [],
  onRevise,
  onPractice,
}: {
  weakestFirst?: string[];
  onRevise?: () => void;
  onPractice?: () => void;
}) {
  // Their own weak skills lead, then the general self-study set fills in.
  const recommended = [
    ...weakestFirst.filter((t) => (SELF_STUDY_SKILLS as readonly string[]).includes(t)),
    ...SELF_STUDY_SKILLS.filter((t) => !weakestFirst.includes(t)),
  ].slice(0, 4);

  return (
    <section className="ep-stagger-in overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-emerald-500 p-6 text-center text-white">
        <p className="text-5xl">🎓</p>
        <h2 className="mt-3 text-2xl font-extrabold">เรียนเนื้อหาหลักครบแล้ว</h2>
        <p className="mt-1 text-sm text-white/90">
          บทเรียนและเลกเชอร์หลักทั้งหมดของคุณจบแล้ว — จากนี้เลือกได้ว่าจะไปทางไหนต่อ
        </p>
      </div>

      <div className="space-y-3 p-5">
        <Link
          href="/course/duolingo-fast-track"
          onClick={onRevise}
          className="block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:ring-slate-400"
        >
          <p className="text-sm font-bold text-slate-800">📚 ทบทวนบทเรียน</p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            เข้าไปที่คอร์ส แล้วเลือกบทที่อยากดูซ้ำได้เลย
          </p>
        </Link>

        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
          <p className="text-sm font-bold text-sky-900">
            🏋️ ฝึกต่อ <span className="ml-1 rounded-full bg-sky-600 px-2 py-0.5 text-[13px] text-white">แนะนำ</span>
          </p>
          <p className="mt-0.5 text-[13px] text-sky-700">
            จากผลประเมินของคุณ ทักษะเหล่านี้ควรฝึกต่อมากที่สุด —
            เป็นทักษะที่ต้องอาศัยการฝึกเอง และการเจอหัวข้อกับคำศัพท์ใหม่ ๆ
          </p>
          <ul className="mt-2.5 space-y-1">
            {recommended.map((t) => (
              <li
                key={t}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-700"
              >
                <span>{taskLabel(t)}</span>
                <span className="text-slate-300">→</span>
              </li>
            ))}
          </ul>
          <Link
            href="/practice"
            onClick={onPractice}
            className="mt-3 block rounded-full bg-[#004AAD] py-2.5 text-center text-sm font-bold text-white"
          >
            ไปฝึกต่อ
          </Link>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4 text-[12px] text-amber-900 ring-1 ring-amber-200">
          <p className="font-bold">ต้องการคำแนะนำเพิ่มเติม?</p>
          <p className="mt-0.5">
            ติดต่อ English Plan ได้ที่{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            — พี่ดอยและทีมยินดีช่วยเสมอ
          </p>
        </div>
      </div>
    </section>
  );
}
