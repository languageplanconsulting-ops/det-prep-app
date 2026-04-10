"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

const VIP_COURSE_ANNOUNCEMENT = `ยินดีต้อนรับสู่ Duolingo English Plan Prep Version 3.0 ครับ

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

export function VipCourseAnnouncementGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { vipGrantedByCourse, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !vipGrantedByCourse) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (!href.startsWith("/practice/")) return;
      if (href === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [loading, vipGrantedByCourse, pathname]);

  const onContinue = () => {
    if (!pendingHref) {
      setOpen(false);
      return;
    }
    const target = pendingHref;
    setOpen(false);
    setPendingHref(null);
    router.push(target);
  };

  const onClose = () => {
    setOpen(false);
    setPendingHref(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="vip-course-announcement-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[4px] border-4 border-black bg-white shadow-[8px_8px_0_0_#000]">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#004AAD] px-4 py-3 text-white">
          <h2 id="vip-course-announcement-title" className="text-sm font-black uppercase tracking-wide sm:text-base">
            VIP Course Announcement
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] border-2 border-white px-2 py-1 text-xs font-bold hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-neutral-900 sm:px-6">
          <pre className="whitespace-pre-wrap font-sans">{VIP_COURSE_ANNOUNCEMENT}</pre>
        </div>

        <div className="flex items-center justify-end gap-3 border-t-2 border-black bg-neutral-50 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-[2px] border-2 border-black bg-ep-yellow px-4 py-2 text-sm font-black text-neutral-900 shadow-[3px_3px_0_0_#000] hover:bg-[#ffe033]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

