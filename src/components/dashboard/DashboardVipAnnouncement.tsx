"use client";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

const VIP_ANNOUNCEMENT_V3 = `ยินดีต้อนรับสู่ Duolingo English Plan Prep Version 3.0 ครับ

พวกเรารู้สึกยินดีและตื่นเต้นมากที่ได้ต้อนรับทุกคนเข้าสู่ Version 3.0 ของ Duolingo English Plan Prep ครับ

ในเวอร์ชันใหม่นี้ เราไม่ได้อัปเดตแค่ข้อสอบให้สอดคล้องกับ รูปแบบล่าสุดของปี 2026 เท่านั้น แต่เรายังพัฒนาประสบการณ์การเรียนของนักเรียนให้ดีขึ้นอย่างมาก โดยเฉพาะในส่วนของ AI feedback ครับ

สำหรับนักเรียนคอร์ส Duolingo ของ English Plan นักเรียนจะได้รับสิทธิ์ใช้ AI feedback ได้ 15 ครั้งต่อสัปดาห์ ครอบคลุมทุกพาร์ตที่รองรับ โดยสิทธิ์นี้จะ รีเซ็ตใหม่ทุกวันจันทร์ และ จะไม่สะสมไปสัปดาห์ถัดไป นะครับ ดังนั้นแนะนำให้วางแผนใช้ให้คุ้มค่าในแต่ละสัปดาห์ครับ

AI feedback นี้พัฒนาขึ้นจากฐานข้อมูลและประสบการณ์การสอนที่ English Plan สะสมมาตลอด 4 ปี เพื่อช่วยให้นักเรียนได้ฝึกอย่างมีทิศทางมากขึ้น ได้รับคำแนะนำที่เฉพาะเจาะจงมากขึ้น และพัฒนาได้อย่างมีประสิทธิภาพยิ่งขึ้นครับ

นักเรียนสามารถใช้ 15 submissions ต่อสัปดาห์ นี้กับข้อสอบประเภทต่อไปนี้ครับ

Write About Photo
Speak About Photo
Read, then Write
Read, then Speak
Dialog Summary

ข้อสอบกลุ่มนี้เป็นพาร์ตที่ต้องใช้การวิเคราะห์เชิงลึกจากฐานข้อมูลของสถาบันเรา จึงเป็นส่วนที่นักเรียนจะได้รับ feedback ที่ละเอียดและมีคุณค่ามากที่สุดครับ

นอกจากนี้ ตอนนี้ในแอปก็มีข้อสอบและแบบฝึกหัดที่อัปโหลดไว้แล้วหลายส่วน นักเรียนสามารถเริ่มฝึกได้ทันที เช่น

Reading Skills
Fill in the Blank
Dictation (Listen, then Type)
Interactive Conversation
Production Score component

และตลอดเดือนเมษายนนี้ โดยเฉพาะจนถึงวันที่ 15 เมษายน ทีมงานจะทยอยอัปโหลดคลังข้อสอบเพิ่มเติมอย่างต่อเนื่อง เพื่อให้นักเรียนได้ฝึกมากขึ้น เช่น Vocabulary Practice และชุดข้อสอบอื่น ๆ ที่สำคัญครับ

นอกจากนี้ ในวันที่ 22 เมษายน จะมีฟีเจอร์ใหม่ที่สำคัญมากเพิ่มเข้ามา คือ Mock Tests ครับ

นักเรียนจะสามารถจำลองการสอบเสมือนจริงเป็นเวลา 1 ชั่วโมงเต็ม และได้รับ รายงานผลเฉพาะบุคคล เพื่อช่วยวิเคราะห์จุดแข็ง จุดที่ควรพัฒนา และแนวทางในการเตรียมตัวต่อไปได้อย่างชัดเจนมากขึ้น ซึ่งจะช่วยให้นักเรียนเตรียมตัวสำหรับการสอบจริงได้อย่างมีประสิทธิภาพมากขึ้นครับ

ขอแจ้งให้ทราบว่า ขณะนี้แอปยังอยู่ในช่วง beta version นะครับ ทีมงานของเรากำลังตั้งใจทำงานอย่างเต็มที่ เพื่อพัฒนาและปรับปรุงแอปให้สมบูรณ์ที่สุดโดยเร็วครับ

หากนักเรียนมีคำถาม พบปัญหา หรืออยากรายงาน bug ใด ๆ สามารถติดต่อเราได้ทางอีเมล languageplanconsulting@gmail.com
 หรือผ่านทาง LINE ของทีมงานได้เลยครับ ซึ่งนักเรียนทุกคนน่าจะมีช่องทางติดต่อไว้เรียบร้อยแล้วครับ

ขอบคุณมากที่เรียนกับ English Plan ครับ และพวกเราหวังว่า Version 3.0 จะช่วยให้นักเรียนเตรียมสอบได้อย่างมั่นใจขึ้น มีทิศทางมากขึ้น และได้ผลลัพธ์ที่ดีขึ้นครับ`;

/**
 * Shown on the Practice hub for VIP users (course or paid subscription).
 */
export function DashboardVipAnnouncement() {
  const { vipGrantedByCourse, loading } = useEffectiveTier();

  if (loading || !vipGrantedByCourse) {
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

      <div className="mt-4 text-sm leading-relaxed text-neutral-900">
        <pre className="whitespace-pre-wrap font-sans">{VIP_ANNOUNCEMENT_V3}</pre>
      </div>
    </section>
  );
}
