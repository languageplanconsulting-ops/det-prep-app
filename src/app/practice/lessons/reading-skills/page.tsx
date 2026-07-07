import Link from "next/link";

const SUB = [
  { key: "missing-paragraph", th: "หาย่อหน้าที่หายไป", descTh: "เลือกประโยคเชื่อมสองย่อหน้า แตะคำใบ้เพื่อดูเหตุผล แล้วจับคู่คำศัพท์", bg: "bg-orange-50", icon: "🧩" },
  { key: "find-info", th: "หาข้อมูลเฉพาะ", descTh: "แตะไฮไลต์ประโยคในเนื้อเรื่องที่ตรงกับคำถามแบบพาราเฟรส", bg: "bg-sky-50", icon: "🔎" },
  { key: "main-idea", th: "ใจความสำคัญ + ชื่อเรื่อง", descTh: "ตามคำใบ้ทีละจุด แล้วเลือกใจความสำคัญที่ไม่ใช่แค่รายละเอียด", bg: "bg-violet-50", icon: "💡" },
];

export default function ReadingSkillsHubPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:px-6">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">บทเรียน · ทักษะการอ่าน</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">ฝึกอ่านให้เก็บคะแนนได้ทุกข้อ</h1>
      <p className="mt-2 text-sm text-slate-500">60 บทอ่าน · 3 ทักษะ ใช้เนื้อเรื่องเดียวกัน</p>

      <div className="mt-5 space-y-3">
        {SUB.map((s) => (
          <Link key={s.key} href={`/practice/lessons/reading-skills/${s.key}`} className={`block rounded-2xl ${s.bg} p-4 ring-1 ring-black/5 transition hover:ring-[#004AAD]`}>
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
