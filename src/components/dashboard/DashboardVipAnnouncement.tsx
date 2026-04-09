"use client";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

const ANNOUNCEMENT_PARAGRAPHS: string[] = [
  "นี่คือเวอร์ชัน 3.0 ของ English Plan DET PREP APP ครับ",
  "ขณะนี้เรากำลังอัปเดตรูปแบบข้อสอบให้สอดคล้องกับแนวข้อสอบปี 2026 ครับ การอัปเดตจะดำเนินการตั้งแต่วันที่ 10 เมษายน ถึง 25 เมษายน ครับ",
];

const AVAILABLE_FEATURES = [
  "Fill in the blank question",
  "Interactive conversation",
  "Dialogue summary",
  "Vocabulary building",
  "Reading skill building",
  "Listen and write",
  "Write about photo",
  "Read, then write",
  "Read, then speak",
  "Speak about photo",
];

const AI_FEEDBACK_FEATURES = [
  "Write about photo",
  "Read, then write",
  "Read, then speak",
  "Speak about photo",
  "Dialogue summary",
];

const AI_INTRO_TH =
  "สิ่งใหม่ที่สำคัญคือ ตอนนี้นักเรียนสามารถใช้ AI feedback ที่พัฒนาจากฐานข้อมูลของ English Plan ตลอด 4 ปีที่ผ่านมาได้แล้วครับ สำหรับ";

const AI_SCORE_TH =
  "AI จะช่วยประเมิน production score ของนักเรียน พร้อมทั้งให้คำแนะนำว่าควรพัฒนาอย่างไรในด้านต่าง ๆ เช่น grammar, vocabulary, coherence และองค์ประกอบสำคัญอื่น ๆ ครับ";

const CLOSING_PARAGRAPHS: string[] = [
  "นอกจากนี้ นักเรียนยังสามารถใช้ฟังก์ชัน notebook ได้ด้วยครับ โดยสามารถเพิ่มคำศัพท์ใหม่ที่ต้องการเรียนรู้ รวมถึงบันทึก production feedback ไว้ใช้ทบทวนในภายหลังได้ครับ",
  "แบบทดสอบจำลองเต็มชุด (Mock test) มีกำหนดพร้อมให้บริการในวันที่ 22 เมษายน 2026 ครับ ทีม English Plan กำลังทำงานอย่างหนักเพื่อพัฒนาและปรับปรุงระบบให้เกิดประโยชน์สูงสุดแก่นักเรียน โดยอิงฐานข้อมูลจากข้อสอบจริง",
];

/**
 * Shown on the Practice hub for VIP users (course or paid subscription).
 */
export function DashboardVipAnnouncement() {
  const { effectiveTier, loading } = useEffectiveTier();

  if (loading || effectiveTier !== "vip") {
    return null;
  }

  return (
    <section
      className="ep-brutal rounded-sm border-black bg-gradient-to-b from-ep-yellow/35 to-white p-5 shadow-[4px_4px_0_0_#000]"
      aria-labelledby="practice-vip-announcement-title"
    >
      <h2
        id="practice-vip-announcement-title"
        className="border-b-4 border-black pb-2 text-lg font-black text-ep-blue"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        ประกาศแก่นักเรียน · English Plan · Version 3.0
      </h2>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-900">
        {ANNOUNCEMENT_PARAGRAPHS.map((p, i) => (
          <p key={`vip-ann-intro-${i}`}>{p}</p>
        ))}

        <div>
          <p className="font-black text-neutral-900">ตอนนี้นักเรียนสามารถเข้าใช้งานได้ในส่วนต่อไปนี้ครับ</p>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-1 font-medium text-neutral-800">
            {AVAILABLE_FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium text-neutral-900">{AI_INTRO_TH}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-1 font-medium text-neutral-800">
            {AI_FEEDBACK_FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-neutral-900">{AI_SCORE_TH}</p>
        </div>

        {CLOSING_PARAGRAPHS.map((p, i) => (
          <p key={`vip-ann-close-${i}`}>{p}</p>
        ))}

        <p className="font-medium text-neutral-900">
          นักเรียนสามารถลองสำรวจฟังก์ชันต่าง ๆ ในแอปได้ตามสะดวกเลยครับ หากมีคำถาม ติดต่อทางอีเมลได้ที่{" "}
          <a
            href="mailto:languageplanconsulting@gmail.com"
            className="font-black text-ep-blue underline decoration-2 underline-offset-2 hover:text-ep-blue/90"
          >
            languageplanconsulting@gmail.com
          </a>{" "}
          หรือทาง LINE ของผมได้เลยครับ
        </p>
      </div>
    </section>
  );
}
