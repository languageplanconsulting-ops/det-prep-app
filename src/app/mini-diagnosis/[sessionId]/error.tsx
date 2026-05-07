"use client";

export default function MiniDiagnosisSessionError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-10">
      <div className="mx-auto max-w-xl border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0_0_#111111]">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-[#004AAD]">
          Mini diagnosis
        </p>
        <h1 className="mt-3 text-2xl font-black text-[#111111]">หน้านี้โหลดไม่สำเร็จ</h1>
        <p className="mt-3 text-sm font-bold text-neutral-700">
          ถ้าปัญหานี้เกิดหลังส่งคำตอบ โดยเฉพาะพาร์ทเขียนจากภาพ ให้กดโหลดใหม่ก่อนหนึ่งครั้ง
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="border-4 border-black bg-[#004AAD] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#111111]"
          >
            Reload / โหลดใหม่
          </button>
          <a
            href="/mini-diagnosis/start"
            className="border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#111111]"
          >
            Back / กลับ
          </a>
        </div>
      </div>
    </main>
  );
}
