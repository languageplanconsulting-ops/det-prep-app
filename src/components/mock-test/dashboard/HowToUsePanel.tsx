"use client";

const CHUNKS: Array<{ n: number; title: string; body: React.ReactNode }> = [
  {
    n: 1,
    title: "เกี่ยวกับชุดข้อสอบ",
    body: (
      <>
        ข้อสอบ Mock Test อัปโหลดชุดใหม่<b>ทุกเดือน</b>ตั้งแต่ ม.ค. 2026 จากข้อสอบ DET จริงในเดือนนั้น ๆ
        เลือกเริ่มจากชุดไหนก็ได้ <b>ไม่มีลำดับบังคับ</b>
      </>
    ),
  },
  {
    n: 2,
    title: "ก่อนเริ่มทำ",
    body: (
      <>
        ใช้เวลา <b>1 ชม. – 1 ชม. 15 นาที</b> ต่อชุด · จัดเวลาให้พร้อมก่อน{" "}
        <span className="font-bold text-red-700">
          ออกระบบกลางคัน = นับว่าใช้โควต้าแล้ว
        </span>
        <br />
        ตัวเลขชุดไม่ใช่ระดับความยาก ทุกชุดเป็น Adaptive — เจอข้อยากแปลว่าระบบกำลังหาขีดจำกัด ไม่ต้องตกใจ
      </>
    ),
  },
  {
    n: 3,
    title: "นี่คือการฝึก ไม่ใช่สอบจริง",
    body: (
      <>
        ไม่ต้องตั้งกล้อง เปิดอินเทอร์เน็ตค้นได้ ไม่มีบันทึก —{" "}
        <b>แต่ในสอบจริง</b> Duolingo เข้มมากเรื่องกล้องและสภาพแวดล้อม ควรอ่านกฎก่อนสอบจริง
      </>
    ),
  },
  {
    n: 4,
    title: "Feedback & แจ้งปัญหา",
    body: (
      <>
        หลังจบแต่ละชุดได้ Feedback แบบเฉพาะบุคคล บันทึกเก็บได้ติดตามพัฒนาการ — ปัญหาแจ้งที่{" "}
        <b>languageplan.consulting@gmail.com</b>
      </>
    ),
  },
];

function ChunkCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {CHUNKS.map((c) => (
        <div
          key={c.n}
          className="relative border-[2.5px] border-black bg-white p-3 pl-12 shadow-[3px_3px_0_0_#111]"
        >
          <span
            className="absolute -left-3 -top-3 grid h-9 w-9 place-items-center rounded-full border-[2.5px] border-black bg-[#FFD600] font-mono text-sm font-black shadow-[2px_2px_0_0_#111]"
            aria-hidden
          >
            {c.n}
          </span>
          <h3 className="text-sm font-extrabold leading-snug">{c.title}</h3>
          <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-neutral-800">
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}

type PanelProps = {
  /** First-time only: name of the recommended starter set, used by the welcome CTA. */
  firstSetName?: string;
  /** First-time only: callback to launch the welcome CTA. */
  onStartFirst?: () => void;
};

/**
 * Info panel — always rendered on the Mock Test page so the 4 chunks are
 * permanently visible. The yellow welcome banner + "Start first set" CTA
 * only render when `onStartFirst` is provided (i.e. for first-time users).
 */
export function HowToUsePanel({ firstSetName, onStartFirst }: PanelProps) {
  const showWelcomeCta = !!(firstSetName && onStartFirst);
  return (
    <section
      className={`border-[3px] border-black p-5 shadow-[8px_8px_0_0_#111] ${
        showWelcomeCta ? "bg-gradient-to-b from-[#FFD600]/35 to-white" : "bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
          <span
            className="grid h-7 w-7 place-items-center rounded-full border-2 border-black bg-[#FFD600] text-base font-black"
            aria-hidden
          >
            ℹ
          </span>
          วิธีใช้ Mock Test · How it works
        </h2>
        {showWelcomeCta ? (
          <span className="border-2 border-black bg-black px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#FFD600]">
            START HERE · เริ่มที่นี่
          </span>
        ) : null}
      </div>
      <p className="mt-2 max-w-prose text-sm font-medium leading-relaxed text-neutral-700">
        {showWelcomeCta
          ? "ก่อนเริ่ม อ่าน 4 ข้อสั้น ๆ นี้ก่อนนะครับ — ใช้เวลาไม่ถึง 2 นาที แล้วกดเริ่มชุดแรกได้เลย"
          : "ทบทวน 4 ข้อสำคัญก่อนเริ่ม Mock Test แต่ละชุด"}
      </p>
      <div className="mt-4">
        <ChunkCards />
      </div>
      {showWelcomeCta ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t-2 border-dashed border-black pt-4">
          <button
            type="button"
            onClick={onStartFirst}
            className="border-[3px] border-black bg-[#0055FF] px-5 py-3 font-mono text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111]"
          >
            ▶ Start {firstSetName} · ใช้ 1 credit
          </button>
          <span className="text-xs font-bold text-neutral-600">
            หรือเลือกชุดอื่นจาก archive ด้านล่าง
          </span>
        </div>
      ) : null}
    </section>
  );
}
