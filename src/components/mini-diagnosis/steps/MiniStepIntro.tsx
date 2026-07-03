"use client";

import { sfxTap } from "@/lib/exam-sfx";

/**
 * Pre-exam introduction panel — พี่ดอย explains what each task REALLY
 * measures (Thai first, English under) before the learner starts.
 * The step timer stays paused until "เริ่มเลย" is tapped.
 */

type IntroMeta = {
  icon: string;
  titleTh: string;
  titleEn: string;
  /** พี่ดอย's explanation of what the task really measures. */
  bubbleTh: string;
  bubbleEn: string;
  /** Skill chips — which report scores this task feeds. */
  skills: Array<{ icon: string; th: string; en: string }>;
  /** One-line how-to. */
  howTh: string;
};

const SKILL = {
  listening: { icon: "🎧", th: "ฟัง", en: "Listening" },
  speaking: { icon: "🗣️", th: "พูด", en: "Speaking" },
  reading: { icon: "📖", th: "อ่าน", en: "Reading" },
  writing: { icon: "✍️", th: "เขียน", en: "Writing" },
} as const;

export const MINI_STEP_INTRO: Record<string, IntroMeta> = {
  dictation: {
    icon: "🎧",
    titleTh: "ฟังแล้วพิมพ์",
    titleEn: "Dictation",
    bubbleTh:
      "ข้อนี้ไม่ได้วัดแค่การฟังนะ! การพิมพ์ตามเสียงวัดแกรมมาร์ด้วย — เช่น รู้ไหมว่าตรงไหนต้องใส่ comma หรือกริยาต้องผันเป็นรูปไหน คะแนนข้อนี้เลยนับเข้าทักษะ \"เขียน\" ด้วย",
    bubbleEn:
      "Dictation tests more than listening — commas and verb forms count too, so this score also feeds your Writing skill.",
    skills: [SKILL.listening, SKILL.writing],
    howTh: "ฟังได้สูงสุด 3 ครั้ง แล้วพิมพ์ให้ตรงที่สุด รวมเครื่องหมาย , ด้วย",
  },
  real_english_word: {
    icon: "🔤",
    titleTh: "คำอังกฤษจริง",
    titleEn: "Real English Word",
    bubbleTh:
      "ข้อนี้วัดว่าคุณจับคำสะกดผิดได้ไหม และรู้ไหมว่าคำศัพท์ขั้นสูงคำไหนมีอยู่จริง — ทักษะนี้ช่วยทั้งการเขียนและการอ่านของคุณ",
    bubbleEn:
      "Can you spot misspellings and recognise which advanced words really exist? This supports your Writing and Reading.",
    skills: [SKILL.writing, SKILL.reading],
    howTh: "แตะเฉพาะคำที่มีอยู่จริง — เลือกคำมั่วจะโดนหักคะแนน",
  },
  vocabulary_reading: {
    icon: "📖",
    titleTh: "คำศัพท์ + การอ่าน",
    titleEn: "Vocabulary + Reading",
    bubbleTh:
      "ข้อนี้วัดการอ่านตรงๆ เลย — จับใจความ เดาศัพท์จากบริบท และหาว่าข้อมูลอยู่ตรงไหนในเนื้อเรื่อง",
    bubbleEn: "A direct reading test: main ideas, vocabulary in context, and locating information.",
    skills: [SKILL.reading],
    howTh: "แตะช่องว่างในเนื้อเรื่องเพื่อเติมคำ เสร็จแล้วตอบคำถามการอ่านต่อ",
  },
  fill_in_blanks: {
    icon: "✏️",
    titleTh: "เติมคำในช่องว่าง",
    titleEn: "Fill in the Blanks",
    bubbleTh:
      "ข้อนี้วัดทั้งคลังคำศัพท์และแกรมมาร์ — ต้องรู้ว่าใช้คำไหน และผันรูปให้ถูกด้วย (เช่น เติม -ing หรือ -ed) คะแนนเลยนับทั้ง \"อ่าน\" และ \"เขียน\"",
    bubbleEn:
      "Vocabulary AND grammar — you need the right word in the right form, so this feeds both Reading and Writing.",
    skills: [SKILL.reading, SKILL.writing],
    howTh: "ดูตัวอักษรที่ให้มา แล้วพิมพ์ตัวที่เหลือให้ครบทุกช่อง",
  },
  interactive_listening: {
    icon: "🎙️",
    titleTh: "มินิเทสต์การฟัง",
    titleEn: "Listening Mini Test",
    bubbleTh:
      "ข้อนี้วัดการฟังตรงๆ — ฟังบทสนทนาในแคมปัส 3 สถานการณ์ แล้วตอบคำถามจากสิ่งที่ได้ยิน",
    bubbleEn: "A direct listening test: 3 campus scenarios, answer from what you hear.",
    skills: [SKILL.listening],
    howTh: "ฟังได้สถานการณ์ละ 3 ครั้ง — ใส่หูฟังช่วยได้มาก",
  },
  write_about_photo: {
    icon: "🖼️",
    titleTh: "เขียนจากภาพ",
    titleEn: "Write About Photo",
    bubbleTh: "ข้อนี้วัดการเขียนตรงๆ — บรรยายภาพเป็นประโยคภาษาอังกฤษของคุณเอง",
    bubbleEn: "A direct writing test: describe the photo in your own English sentences.",
    skills: [SKILL.writing],
    howTh: "เขียนเป็นประโยคเต็มๆ ยิ่งเขียนได้เยอะและชัด ยิ่งดี",
  },
  read_then_speak: {
    icon: "🗣️",
    titleTh: "อ่านแล้วพูด",
    titleEn: "Read Then Speak",
    bubbleTh: "ข้อสุดท้าย! ข้อนี้วัดการพูดตรงๆ — อ่านโจทย์แล้วพูดเป็นประโยคต่อเนื่อง ไม่ต้องกลัวผิด",
    bubbleEn: "A direct speaking test: read the prompt, then speak in connected sentences.",
    skills: [SKILL.speaking],
    howTh: "แตะไมค์แล้วพูดอย่างน้อย 15 คำ — แก้ข้อความก่อนส่งได้",
  },
};

function fallbackIntro(): IntroMeta {
  return {
    icon: "📝",
    titleTh: "ข้อสอบเช็กระดับ",
    titleEn: "Mini diagnosis task",
    bubbleTh: "ตั้งใจตอบตามที่ทำได้จริง ระบบจะได้วัดระดับให้แม่นๆ",
    bubbleEn: "Answer honestly so the system can measure your real level.",
    skills: [],
    howTh: "อ่านโจทย์ให้ครบ แล้วเริ่มได้เลย",
  };
}

function formatLimit(sec: number): string {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m} นาที ${s} วิ` : `${m} นาที`;
  }
  return `${sec} วินาที`;
}

export function MiniStepIntro({
  taskType,
  stepIndex,
  stepCount,
  timeLimitSec,
  onStart,
}: {
  taskType: string;
  stepIndex: number;
  stepCount: number;
  timeLimitSec: number;
  onStart: () => void;
}) {
  const meta = MINI_STEP_INTRO[taskType] ?? fallbackIntro();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl sm:rounded-3xl sm:pb-6 animate-[minidiag-intro-up_0.25s_ease-out]">
        {/* step position */}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-ep-blue/10 px-3 py-1 font-mono text-xs font-bold text-ep-blue">
            ข้อ {stepIndex}/{stepCount}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-500">
            ⏱ {formatLimit(timeLimitSec)}
          </span>
        </div>

        {/* title */}
        <p className="mt-4 text-2xl font-bold text-slate-900">
          {meta.icon} {meta.titleTh}
        </p>
        <p className="text-sm font-semibold text-slate-400">{meta.titleEn}</p>

        {/* mascot explains what this really measures */}
        <div className="mt-4 flex items-start gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
          <img src="/mascot-doy.png" alt="" className="h-14 w-14 shrink-0 object-contain" />
          <div className="flex-1 rounded-2xl rounded-tl-md border border-blue-100 bg-blue-50 px-3.5 py-3">
            <p className="text-sm font-semibold leading-relaxed text-slate-800">{meta.bubbleTh}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{meta.bubbleEn}</p>
          </div>
        </div>

        {/* which scores this feeds */}
        {meta.skills.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              ข้อนี้นับคะแนนเข้าทักษะ
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.skills.map((s) => (
                <span
                  key={s.en}
                  className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-800 ring-1 ring-slate-200"
                >
                  {s.icon} {s.th} <span className="text-xs font-semibold text-slate-400">{s.en}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* how-to */}
        <p className="mt-3 rounded-xl bg-ep-yellow/20 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-slate-700">
          💡 {meta.howTh}
        </p>

        <button
          type="button"
          onClick={() => {
            sfxTap();
            onStart();
          }}
          className="mt-5 w-full rounded-2xl bg-ep-blue px-4 py-3.5 text-base font-bold text-white shadow-sm transition active:scale-[0.99]"
        >
          เข้าใจแล้ว เริ่มเลย →
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">เวลาจะเริ่มนับหลังกดปุ่มนี้</p>
      </div>
      <style>{`@keyframes minidiag-intro-up { from { transform: translateY(30px); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
