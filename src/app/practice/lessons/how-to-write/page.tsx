import Link from "next/link";

const SUB = [
  { key: "read-and-write", th: "อ่านแล้วเขียน", descTh: "สร้างเรียงความจากช่องว่าง — เลือกคำหรือพิมพ์คำ พร้อมเหตุผลไวยากรณ์", bg: "bg-orange-50", icon: "✍️" },
  { key: "write-about-photo", th: "เขียนบรรยายภาพ", descTh: "ดูภาพจริง แล้วสร้างคำบรรยายทีละช่อง", bg: "bg-sky-50", icon: "📸" },
];

export default function HowToWriteHubPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:px-6">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">บทเรียน · บทฝึกสำหรับโจทย์เขียน</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">พื้นฐานการเขียนก่อนสอบจริง</h1>
      <p className="mt-2 text-sm text-slate-500">อ่านแล้วเขียน (ประกอบเรียงความ) และเขียนบรรยายภาพ</p>

      <div className="mt-5 space-y-3">
        {SUB.map((s) => (
          <Link key={s.key} href={`/practice/lessons/how-to-write/${s.key}`} className={`block rounded-2xl ${s.bg} p-4 ring-1 ring-black/5 transition hover:ring-[#004AAD]`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{s.th}</p>
                <p className="mt-0.5 text-xs text-slate-600">{s.descTh}</p>
              </div>
              <span className="text-slate-300">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
