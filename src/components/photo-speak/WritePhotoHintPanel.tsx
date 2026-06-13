"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * WritePhotoHintPanel — course-only ("Fast Track" VIP) answer-pattern scaffold for
 * the Write-about-photo exam. Unlocked for VIP (incl. course-granted VIP);
 * everyone else sees a locked teaser with a peek of step 1 (ethical show-value).
 *
 * Photo-independent by design: a 3-sentence pattern + click-to-expand vocab banks
 * (people / places / things / feelings, B1–C1, with Thai glosses) that work for
 * almost any photo.
 */

const PATTERN: { en: string; th: string }[] = [
  { en: "This photo depicts ______.", th: "บอกสิ่งที่เห็นในภาพ (ใคร/อะไร/ที่ไหน)" },
  { en: "Judging from the background, I believe that ______.", th: "เดาบริบทจากฉากหลัง" },
  { en: "If I were to be there, I would feel ______.", th: "บอกความรู้สึกของคุณ" },
];

type Word = { w: string; th: string };
type Bank = { key: string; icon: string; label: string; sub: string; words: Word[] };

const BANKS: Bank[] = [
  {
    key: "people",
    icon: "👤",
    label: "บรรยายคน",
    sub: "People",
    words: [
      { w: "elderly", th: "สูงอายุ" }, { w: "middle-aged", th: "วัยกลางคน" },
      { w: "youthful", th: "ดูอ่อนเยาว์" }, { w: "cheerful", th: "ร่าเริง" },
      { w: "confident", th: "มั่นใจ" }, { w: "focused", th: "จดจ่อ มีสมาธิ" },
      { w: "relaxed", th: "ผ่อนคลาย" }, { w: "energetic", th: "มีพลัง" },
      { w: "elegant", th: "สง่างาม" }, { w: "casual", th: "แต่งตัวสบาย ๆ" },
      { w: "athletic", th: "ดูแข็งแรง/นักกีฬา" }, { w: "weary", th: "เหนื่อยล้า" },
      { w: "friendly", th: "เป็นมิตร" }, { w: "curious", th: "อยากรู้อยากเห็น" },
      { w: "determined", th: "มุ่งมั่น" }, { w: "graceful", th: "เคลื่อนไหวสง่า" },
      { w: "well-dressed", th: "แต่งตัวดี" }, { w: "thoughtful", th: "ครุ่นคิด" },
      { w: "lively", th: "มีชีวิตชีวา" }, { w: "content", th: "พึงพอใจ" },
    ],
  },
  {
    key: "places",
    icon: "🏞️",
    label: "บรรยายสถานที่",
    sub: "Places",
    words: [
      { w: "spacious", th: "กว้างขวาง" }, { w: "crowded", th: "แออัด คนเยอะ" },
      { w: "bustling", th: "คึกคัก" }, { w: "peaceful", th: "สงบ" },
      { w: "scenic", th: "วิวสวย" }, { w: "urban", th: "ในเมือง" },
      { w: "rural", th: "ชนบท" }, { w: "modern", th: "ทันสมัย" },
      { w: "historic", th: "มีประวัติศาสตร์" }, { w: "cozy", th: "อบอุ่นน่าอยู่" },
      { w: "vast", th: "กว้างใหญ่" }, { w: "lush", th: "เขียวชอุ่ม" },
      { w: "deserted", th: "เงียบร้าง" }, { w: "vibrant", th: "สีสันสดใส" },
      { w: "tranquil", th: "เงียบสงบ" }, { w: "picturesque", th: "สวยเหมือนภาพวาด" },
      { w: "industrial", th: "แบบอุตสาหกรรม" }, { w: "well-lit", th: "แสงสว่างดี" },
      { w: "narrow", th: "แคบ" }, { w: "sprawling", th: "แผ่กว้าง" },
    ],
  },
  {
    key: "things",
    icon: "📦",
    label: "บรรยายสิ่งของ",
    sub: "Things",
    words: [
      { w: "sturdy", th: "แข็งแรงทนทาน" }, { w: "delicate", th: "บอบบาง" },
      { w: "antique", th: "เก่าแก่ โบราณ" }, { w: "colourful", th: "มีสีสัน" },
      { w: "worn-out", th: "เก่าทรุดโทรม" }, { w: "polished", th: "ขัดเงา" },
      { w: "handmade", th: "ทำด้วยมือ" }, { w: "shiny", th: "เป็นเงาวับ" },
      { w: "fragile", th: "แตกหักง่าย" }, { w: "bulky", th: "เทอะทะ ใหญ่" },
      { w: "compact", th: "กะทัดรัด" }, { w: "ornate", th: "ประดับประดา" },
      { w: "rustic", th: "ดิบ แบบบ้านนา" }, { w: "transparent", th: "โปร่งใส" },
      { w: "sleek", th: "เพรียวเรียบหรู" }, { w: "vintage", th: "ย้อนยุค" },
      { w: "faded", th: "สีซีด" }, { w: "lightweight", th: "น้ำหนักเบา" },
      { w: "intricate", th: "รายละเอียดซับซ้อน" }, { w: "weathered", th: "ผุกร่อนตามกาล" },
    ],
  },
  {
    key: "feelings",
    icon: "😊",
    label: "ความรู้สึก",
    sub: "Feelings",
    words: [
      { w: "peaceful", th: "สงบใจ" }, { w: "nostalgic", th: "คิดถึงอดีต" },
      { w: "energized", th: "เต็มไปด้วยพลัง" }, { w: "relaxed", th: "ผ่อนคลาย" },
      { w: "overwhelmed", th: "ท่วมท้น รับมือไม่ไหว" }, { w: "content", th: "พอใจ" },
      { w: "inspired", th: "มีแรงบันดาลใจ" }, { w: "curious", th: "อยากรู้" },
      { w: "amazed", th: "ทึ่ง" }, { w: "at ease", th: "สบายใจ" },
      { w: "refreshed", th: "สดชื่น" }, { w: "anxious", th: "กังวล" },
      { w: "joyful", th: "เปี่ยมสุข" }, { w: "homesick", th: "คิดถึงบ้าน" },
      { w: "motivated", th: "มีแรงจูงใจ" }, { w: "grateful", th: "รู้สึกขอบคุณ" },
      { w: "excited", th: "ตื่นเต้น" }, { w: "calm", th: "สงบ" },
      { w: "melancholic", th: "เศร้าสร้อย" }, { w: "hopeful", th: "มีความหวัง" },
    ],
  },
];

export function WritePhotoHintPanel({
  unlocked,
  mode = "write",
}: {
  unlocked: boolean;
  mode?: "write" | "speak";
}) {
  const [openBank, setOpenBank] = useState<string | null>(null);

  if (!unlocked) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#FFCC00]/60 bg-[#fffaf0] p-5 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-sm font-bold text-slate-800">
            แพตเทิร์นคำตอบ + คลังคำศัพท์ — เฉพาะนักเรียนคอร์ส Fast Track (VIP)
          </p>
        </div>
        {/* peek: step 1 visible, rest blurred */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-sm text-slate-800">1. This photo depicts ______.</p>
          <div className="mt-2 select-none space-y-1.5 blur-[5px]" aria-hidden>
            <p className="font-mono text-sm text-slate-700">2. Judging from the background, I believe that ______.</p>
            <p className="font-mono text-sm text-slate-700">3. If I were to be there, I would feel ______.</p>
            <p className="text-xs text-slate-500">+ คลังคำ 80 คำ (คน · สถานที่ · สิ่งของ · ความรู้สึก) ระดับ B1–C1 พร้อมคำแปลไทย</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-600">
          ตัวช่วยนี้เป็นสิทธิ์ของนักเรียนคอร์ส Duolingo Fast Track — ได้แพตเทิร์นคำตอบครบใน 1 นาที พร้อมคลังคำที่ใช้ได้เกือบทุกภาพ
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
        >
          ปลดล็อกด้วย VIP / Fast Track →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">แพตเทิร์นคำตอบจากพี่ดอย</p>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">
        {mode === "speak"
          ? "พูดตาม 3 ประโยคนี้จากภาพ → ได้คำตอบที่มีโครงสร้างครบใน 1 นาที"
          : "เติมช่องว่าง 3 ประโยคนี้ตามภาพ → ได้คำตอบที่มีโครงสร้างครบใน 1 นาที"}
      </p>

      {/* 3-step scaffold */}
      <div className="mt-3 space-y-2">
        {PATTERN.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-slate-900">{p.en}</p>
              <p className="mt-0.5 text-xs text-slate-500">{p.th}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vocab banks — click to expand */}
      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        คลังคำที่ใช้ได้เกือบทุกภาพ · แตะเพื่อดู (B1–C1)
      </p>
      <div className="space-y-2">
        {BANKS.map((bank) => {
          const isOpen = openBank === bank.key;
          return (
            <div key={bank.key} className="overflow-hidden rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setOpenBank(isOpen ? null : bank.key)}
                className="flex w-full items-center justify-between gap-3 bg-white px-4 py-2.5 text-left hover:bg-slate-50"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span>{bank.icon}</span>
                  {bank.label}
                  <span className="text-xs font-normal text-slate-400">{bank.sub} · {bank.words.length} คำ</span>
                </span>
                <span className={`text-[#004AAD] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {isOpen ? (
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
                  {bank.words.map((word) => (
                    <span
                      key={word.w}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{word.w}</span>
                      <span className="text-slate-400"> · {word.th}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        💡 พี่ดอย: {mode === "speak" ? "พูด 3 ประโยคนี้ก่อน แล้วหยิบคำจากคลังมาเสริม" : "ใส่ 3 ประโยคก่อน แล้วหยิบคำจากคลังมาเติม"} — ครบโครงเร็ว ไม่ตัน
      </p>
    </div>
  );
}
