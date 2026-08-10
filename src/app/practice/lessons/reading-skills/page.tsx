import Link from "next/link";
import { DRILLS, DRILL_ORDER } from "@/lib/reading-drills";
import { IR_SETS, IR_TIERS, irSeconds, irSetsByTier, irSubItemCount } from "@/lib/interactive-reading";

export default function ReadingSkillsHubPage() {
  const totalSubItems = IR_SETS.reduce((a, s) => a + irSubItemCount(s), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:px-6">
      <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">บทเรียน · ทักษะการอ่าน</p>
      <h1 className="mt-1 text-xl font-black text-slate-900">Interactive Reading</h1>
      <p className="mt-2 text-sm text-slate-500">
        บทอ่านเดียว ตอบ 6 ขั้นตอน จับเวลาชุดเดียว — หน้าจอ คำสั่ง และเกณฑ์ตรวจ เหมือนข้อสอบจริงทุกจุด
      </p>
      <p className="mt-1 text-xs font-bold text-[#004AAD]">
        {IR_SETS.length} บทอ่าน · {totalSubItems} ข้อย่อย
      </p>

      <h2 className="mt-7 text-sm font-black text-slate-900">ฝึกทีละขั้น</h2>
      <p className="mt-1 text-xs text-slate-500">หน้าจอเดียวกับข้อสอบจริง เปิดเฉพาะขั้นที่เลือก แล้วไล่ไปทีละบทอ่าน</p>
      <div className="mt-3 space-y-3">
        {DRILL_ORDER.map((k) => {
          const d = DRILLS[k];
          return (
            <Link
              key={k}
              href={`/practice/lessons/reading-skills/${d.slug}`}
              className={`block rounded-2xl ${d.bg} p-4 ring-1 ring-black/5 transition hover:ring-[#004AAD]`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{d.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{d.th}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{d.blurbTh}</p>
                </div>
                <span className="text-slate-300">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-8 text-sm font-black text-slate-900">ทำเต็มชุด 6 ขั้น</h2>
      <p className="mt-1 text-xs text-slate-500">เลือกระดับ แล้วเลือกบทอ่าน — จับเวลาเหมือนสอบจริง</p>

      {IR_TIERS.map((t) => {
        const sets = irSetsByTier(t.key);
        if (!sets.length) return null;
        return (
          <section key={t.key} className="mt-5">
            <div className="flex items-baseline gap-2">
              <span className="text-lg">{t.icon}</span>
              <h3 className="text-sm font-black" style={{ color: t.color }}>
                {t.th} · {t.cefr}
              </h3>
              <span className="text-[11px] font-bold text-slate-400">{sets.length} บทอ่าน</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{t.blurbTh}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sets.map((s) => (
                <Link
                  key={s.id}
                  href={`/practice/lessons/reading-skills/interactive/${s.id}`}
                  className="block rounded-xl p-3 ring-1 ring-black/5 transition hover:ring-[#004AAD]"
                  style={{ background: t.soft }}
                >
                  <p className="text-[13px] font-bold leading-5 text-slate-900">{s.topicTh}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600">{s.blurbTh}</p>
                  <p className="mt-1 text-[10px] font-bold" style={{ color: t.color }}>
                    {irSubItemCount(s)} ข้อย่อย · {Math.round(irSeconds(s) / 60)} นาที
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
