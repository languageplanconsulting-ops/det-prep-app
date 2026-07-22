"use client";

import Link from "next/link";
import { SPEAKING_PATTERNS, patternPartSentence } from "@/lib/speaking-pattern";

/**
 * SpeakingHintPanel — course-only ("Fast Track" VIP) answer-pattern scaffold for
 * the Read-and-then-speak (1–3 min speaking) exam. Unlocked for VIP (incl.
 * course-granted Fast Track VIP); everyone else sees a locked teaser.
 *
 * From P'Doy's speaking framework: a 4-part structure + transition/grammar
 * banks + adjective banks (situations / feelings / people / places / objects,
 * with Thai glosses) + common prompts + a worked sample.
 */

type Step = { en: string; th: string };
type PatternBlock = { label: string; useWhen: string; signal: string; steps: Step[] };

const PATTERN_BLOCKS: PatternBlock[] = SPEAKING_PATTERNS.map((pattern) => ({
  label: pattern.label,
  useWhen: pattern.useWhen,
  signal: pattern.signal,
  steps: pattern.parts.map((p) => ({ en: patternPartSentence(p), th: p.th })),
}));

const TRANSITIONS = [
  "However", "On the other hand", "Moreover", "In addition", "Additionally",
  "in terms of", "when it comes to", "speaking about + noun", "For example", "For instance",
];

const GRAMMAR = [
  "If …", "even though …", "therefore", "instead",
  "used to + V.1 (= เคย)", "not only … but also …",
];

type Word = { w: string; th: string };
type Bank = { key: string; icon: string; label: string; sub: string; words: Word[] };

const BANKS: Bank[] = [
  {
    key: "situations", icon: "🌪️", label: "บรรยายสถานการณ์", sub: "Situations",
    words: [
      { w: "challenging", th: "ยาก ท้าทาย" }, { w: "frustrating", th: "น่าหงุดหงิด" },
      { w: "confusing", th: "สับสน" }, { w: "stressful", th: "เครียด" },
      { w: "urgent", th: "เร่งด่วน" }, { w: "unpredictable", th: "คาดเดาไม่ได้" },
      { w: "complicated", th: "ซับซ้อน" }, { w: "promising", th: "มีแววดี" },
      { w: "rewarding", th: "คุ้มค่า" }, { w: "demanding", th: "เรียกร้องสูง" },
    ],
  },
  {
    key: "feelings", icon: "😊", label: "บอกความรู้สึก", sub: "Feelings",
    words: [
      { w: "satisfied", th: "พอใจ" }, { w: "happy", th: "มีความสุข" },
      { w: "over the moon", th: "ดีใจสุด ๆ" }, { w: "sad", th: "เศร้า" },
      { w: "depressed", th: "หดหู่" }, { w: "angry", th: "โกรธ" },
      { w: "anxious", th: "กังวล" }, { w: "excited", th: "ตื่นเต้น" },
      { w: "frustrated", th: "หงุดหงิด" }, { w: "impressed", th: "ประทับใจ" },
      { w: "content", th: "พอใจ สงบใจ" },
    ],
  },
  {
    key: "people", icon: "👤", label: "นิสัยคน", sub: "Character",
    words: [
      { w: "kind", th: "ใจดี" }, { w: "generous", th: "ใจกว้าง" },
      { w: "determined", th: "มุ่งมั่น" }, { w: "reliable", th: "เชื่อถือได้" },
      { w: "creative", th: "สร้างสรรค์" }, { w: "humble", th: "ถ่อมตน" },
      { w: "patient", th: "อดทน" },
    ],
  },
  {
    key: "places", icon: "🏞️", label: "สถานที่", sub: "Places",
    words: [
      { w: "picturesque", th: "สวยเหมือนภาพวาด" }, { w: "bustling", th: "คึกคัก" },
      { w: "crowded", th: "คนเยอะ" }, { w: "serene", th: "เงียบสงบ" },
      { w: "majestic", th: "ยิ่งใหญ่อลังการ" }, { w: "remote", th: "ห่างไกล" },
      { w: "exotic", th: "แปลกตา" }, { w: "vibrant", th: "มีชีวิตชีวา" },
    ],
  },
  {
    key: "objects", icon: "📦", label: "สิ่งของ", sub: "Objects",
    words: [
      { w: "sleek", th: "เพรียวเรียบหรู" }, { w: "robust", th: "แข็งแรง" },
      { w: "compact", th: "กะทัดรัด" }, { w: "lightweight", th: "น้ำหนักเบา" },
      { w: "versatile", th: "ใช้ได้หลากหลาย" }, { w: "durable", th: "ทนทาน" },
      { w: "modern", th: "ทันสมัย" }, { w: "elegant", th: "สง่างาม" },
      { w: "functional", th: "ใช้งานได้ดี" }, { w: "innovative", th: "ล้ำสมัย" },
    ],
  },
];

const PROMPTS = [
  "Describe a memorable vacation you took and why it was special.",
  "Explain your favorite book or movie and what you like about it.",
  "Describe a challenge you have faced and how you overcame it.",
  "Talk about your future goals and the steps you are taking to achieve them.",
  "Describe your hometown and what makes it unique.",
  "Discuss a current event that caught your attention and your opinion on it.",
  "Explain a time when you had to make a difficult decision.",
  "Talk about a person who has influenced you and how.",
  "Describe your favorite food and why you enjoy it.",
  "Describe a place you have visited that you would recommend.",
  "Talk about a book or movie that had a significant impact on you.",
  "Describe a time when you received excellent customer service.",
];

const SAMPLE = [
  "PART 1 — Throughout my life, I have been on many vacations with friends and family. However, today I will describe a vacation I took with my family to Phuket two years ago.",
  "PART 2 — To start, we used to go to Phuket quite often, and we decided to go during our New Year's break. In terms of the city, Phuket is in the south of Thailand and is known for its beautiful beaches; therefore, even though it's small, it can be very crowded.",
  "PART 3 — It was memorable for several reasons. First of all, it was the first time I could relax after working hard. Secondly, the southern food was tastier and spicier than in Bangkok. Lastly, the people were friendly and kind — for example, they always smiled when I asked for help.",
  "PART 4 — In the future, I would definitely go back, even though I am busy with work. Moreover, I want to explore the cultural scene. If I could turn back time, I would do those things.",
];

export function SpeakingHintPanel({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) {
    return (
      <div className="rounded-2xl border border-[#FFCC00]/60 bg-[#fffaf0] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-sm font-bold text-slate-800">
            แพตเทิร์นพูด 1–3 นาที + คลังคำ — เฉพาะนักเรียนคอร์ส Fast Track (VIP)
          </p>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-sm text-slate-800">PART 1 — Throughout my life, I have ______. However, today I will describe ______.</p>
          <div className="mt-2 select-none space-y-1.5 blur-[5px]" aria-hidden>
            <p className="font-mono text-sm text-slate-700">PART 2 — To start, ___. The reason why ___ was that ___.</p>
            <p className="font-mono text-sm text-slate-700">PART 3 — First of all, ___. Secondly, ___. Lastly, ___.</p>
            <p className="text-xs text-slate-500">+ คำเชื่อม · ไวยากรณ์ · คลังคำ 46 คำ (สถานการณ์/ความรู้สึก/คน/สถานที่/สิ่งของ) · ตัวอย่างเต็ม</p>
          </div>
        </div>
        <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90">
          ปลดล็อกด้วย VIP / Fast Track →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">แพตเทิร์นพูด 1–3 นาที จากพี่ดอย</p>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">
        เลือกโครงให้ตรงกับโจทย์ → พูดตามพาร์ต → ครบ ลื่น และตรงเวลา
      </p>

      {/* One scaffold per pattern (เล่า/บรรยาย · แสดงความเห็น) */}
      <div className="mt-3 space-y-4">
        {PATTERN_BLOCKS.map((block) => (
          <div key={block.label}>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-bold text-[#004AAD]">{block.label}</p>
              <p className="text-[11px] text-slate-400">{block.signal}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">{block.useWhen}</p>
            <div className="mt-2 space-y-2">
              {block.steps.map((p, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold leading-6 text-slate-900 break-words">{p.en}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{p.th}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <details className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">🔁 คำเชื่อม / เปลี่ยนเรื่อง</summary>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
          {TRANSITIONS.map((w) => (
            <span key={w} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800">{w}</span>
          ))}
        </div>
      </details>

      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">✏️ คำ/ไวยากรณ์ที่ควรใช้</summary>
        <ul className="space-y-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-700">
          {GRAMMAR.map((g) => <li key={g} className="font-mono">• {g}</li>)}
        </ul>
      </details>

      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">คลังคำ · แตะเพื่อดู (มี Thai)</p>
      <div className="space-y-2">
        {BANKS.map((bank) => (
          <details key={bank.key} className="overflow-hidden rounded-xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">
              <span>{bank.icon}</span>{bank.label}
              <span className="text-xs font-normal text-slate-400">{bank.sub} · {bank.words.length} คำ</span>
            </summary>
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
              {bank.words.map((word) => (
                <span key={word.w} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs">
                  <span className="font-semibold text-slate-800">{word.w}</span>
                  <span className="text-slate-400"> · {word.th}</span>
                </span>
              ))}
            </div>
          </details>
        ))}
      </div>

      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">🔥 ตัวอย่างโจทย์พูดที่เจอบ่อย (12)</summary>
        <ol className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-700">
          {PROMPTS.map((p, i) => <li key={p}>{i + 1}. {p}</li>)}
        </ol>
      </details>

      <details className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50">📄 ตัวอย่างคำตอบเต็ม (Phuket · 125+)</summary>
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {SAMPLE.map((para, i) => (
            <p key={i} className="text-[13px] leading-6 text-slate-700">{para}</p>
          ))}
        </div>
      </details>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        💡 พี่ดอย: เตรียมในช่วงจับเวลาให้พอ → พูดตาม 4 พาร์ต → ใส่คำเชื่อม &amp; คำจากคลังให้ลื่น
      </p>
    </div>
  );
}
