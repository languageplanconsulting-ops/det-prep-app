import Link from "next/link";

const SUB = [
  { key: "read-and-speak", th: "อ่านแล้วพูด", descTh: "สร้างคำตอบจากช่องว่าง แล้วฝึกพูดตามให้ได้อย่างน้อย 90%", bg: "bg-orange-50", icon: "🎤" },
  { key: "speak-about-photo", th: "พูดบรรยายภาพ", descTh: "ดูภาพจริง สร้างคำบรรยาย แล้วฝึกพูดให้ชัด", bg: "bg-sky-50", icon: "📸" },
];

export default function HowToSpeakHubPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:px-6">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">บทเรียน · บทฝึกสำหรับโจทย์พูด</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">พื้นฐานการพูดก่อนสอบจริง</h1>
      <p className="mt-2 text-sm text-slate-500">อ่านแล้วพูด (พร้อมฝึกออกเสียง) และพูดจากภาพ</p>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">🎙 ต้องอนุญาตให้เว็บไซต์ใช้ไมโครโฟนเพื่อฝึกออกเสียง</p>

      <div className="mt-5 space-y-3">
        {SUB.map((s) => (
          <Link key={s.key} href={`/practice/lessons/how-to-speak/${s.key}`} className={`block rounded-2xl ${s.bg} p-4 ring-1 ring-black/5 transition hover:ring-[#004AAD]`}>
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
