"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FLAG = "ep-show-mini-diagnosis-prompt";

/**
 * Shown on /practice for a free user who chose "ลองข้อสอบฟรี" at login — tells them they
 * also get a free Mini-Diagnosis and why it's worth doing. Self-gates on a sessionStorage
 * flag set by the LoginWelcomeModal.
 */
export function MiniDiagnosisPromptModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(FLAG) === "1") {
      window.sessionStorage.removeItem(FLAG);
      setOpen(true);
    }
  }, []);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mini-diagnosis-prompt-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md rounded-[20px] border-2 border-[#111111] bg-white p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 inline-block rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500">
          ฟรีสำหรับคุณ
        </div>
        <h2 id="mini-diagnosis-prompt-title" className="text-xl font-black leading-tight text-[#004aad]">
          คุณมีสิทธิ์ทำ Mini-Diagnosis ฟรี!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          ก่อนฝึกมั่ว ลองวัดระดับเร็ว ๆ เพื่อ<span className="font-black text-black">รู้จุดแข็ง / จุดอ่อน</span>ของคุณ
          จะได้<span className="font-black text-black">พัฒนาคะแนนได้เร็วขึ้น</span> — รู้ว่าควรฝึกอะไรก่อน ไม่เสียเวลา
        </p>
        <ul className="mt-3 space-y-1.5 text-sm font-medium text-gray-700">
          <li className="flex items-center gap-2"><span className="text-[#004aad]">✓</span> รู้คะแนนคาดการณ์ + จุดที่ต้องแก้ก่อน</li>
          <li className="flex items-center gap-2"><span className="text-[#004aad]">✓</span> ได้แผนเรียนเฉพาะคุณ</li>
          <li className="flex items-center gap-2"><span className="text-[#004aad]">✓</span> ใช้เวลาแค่ ~15 นาที</li>
        </ul>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-sm border-2 border-gray-300 bg-white py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            ดูข้อสอบก่อน
          </button>
          <button
            type="button"
            onClick={() => { close(); router.push("/mini-diagnosis/start"); }}
            className="flex-[2] rounded-sm border-2 border-[#111111] bg-[#004aad] py-3 text-sm font-bold text-white shadow-[3px_3px_0px_0px_#111111] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            เริ่ม Mini-Diagnosis →
          </button>
        </div>
      </div>
    </div>
  );
}
