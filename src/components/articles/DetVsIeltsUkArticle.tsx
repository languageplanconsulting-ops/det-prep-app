import Link from "next/link";

import { getArticle } from "@/lib/articles";

/** Solid yellow highlighter (rule-compliant: solid color, not a gradient). */
function Hl({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-semibold text-gray-900"
      style={{ backgroundColor: "#FFE680", padding: "0 0.15em", borderRadius: "2px" }}
    >
      {children}
    </span>
  );
}

const UNIS: Array<[string, string, string]> = [
  ["Imperial College London", "Russell Group", "115–130"],
  ["King's College London", "Russell Group", "120–135"],
  ["University of Edinburgh", "Russell Group", "115–130"],
  ["University of Manchester", "Russell Group", "115–130"],
  ["University of Bristol", "Russell Group", "115–130"],
  ["University of Birmingham", "Russell Group", "115–125"],
  ["University of Glasgow", "Russell Group", "115–130"],
  ["University of Leeds", "Russell Group", "115–125"],
  ["University of Southampton", "Russell Group", "110–125"],
  ["University of Warwick", "Russell Group", "115–130"],
  ["University of Exeter", "Russell Group", "110–125"],
  ["University of Surrey", "—", "120"],
  ["University of Reading", "—", "110–120"],
];

const DET_IELTS: Array<[string, string, string]> = [
  ["120–125", "6.5", "เกณฑ์มาตรฐานของหลักสูตรส่วนใหญ่ (ป.ตรี/ป.โท)"],
  ["130–135", "7.0", "หลักสูตรที่แข่งขันสูง"],
  ["140–145", "7.5", "หลักสูตรเฉพาะทางที่ต้องการภาษาแน่น ๆ"],
  ["150–160", "8.0–9.0", "ระดับใช้ภาษาได้คล่องแคล่วมาก"],
];

const RULED: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(#fff, #fff 31px, #e8edf6 32px)",
};

export function DetVsIeltsUkArticle() {
  const meta = getArticle("det-vs-ielts-uk")!;

  return (
    <article className="bg-white px-5 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        {/* Header band */}
        <div className="rounded-t-3xl bg-ep-blue px-7 py-8 text-white sm:px-10">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-xs text-blue-200 transition-colors hover:text-white"
          >
            ← กลับหน้าแรก
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-ep-yellow">
            บันทึกของครู · No.1
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {meta.title}: {meta.subtitle}
          </h1>
          <p className="mt-3 text-sm text-blue-100">
            โดย P&apos;Doy — {meta.authorRole} · อ่าน ~{meta.readingMinutes} นาที
          </p>
        </div>

        {/* Body (ruled paper) */}
        <div
          className="rounded-b-3xl bg-white px-7 py-9 shadow-sm ring-1 ring-gray-200 sm:px-10"
          style={RULED}
        >
          <div className="space-y-5 text-[16.5px] leading-[2] text-gray-800">
            <h2 className="text-xl font-bold text-ep-blue">เรื่องเล่าจากเมื่อก่อน ที่หลายคนยังจำได้ดี</h2>
            <p>
              ครับ ผมอยากให้ทุกคนลองนึกภาพย้อนกลับไปสักหน่อย เมื่อก่อน น้อง ๆ ที่ฝันจะไปเรียนต่อที่อังกฤษ
              เส้นทางมันค่อนข้าง &quot;ตายตัว&quot; ครับ พอตัดสินใจว่าจะไป สิ่งแรกที่เจอเหมือนกันหมดคือคำสามคำ —{" "}
              <Hl>IELTS</Hl>
            </p>
            <p>
              น้องบางคนอยู่ต่างจังหวัด ต้องนั่งรถเข้ามาสอบที่กรุงเทพฯ จองที่พักล่วงหน้า ตื่นแต่เช้ามืดไปนั่งในห้องสอบที่ตึงเครียด
              สอบทั้งวัน แล้วต้อง<strong>รอผลเป็นสัปดาห์</strong> ถ้าคะแนนไม่ถึงก็จ่ายค่าสอบใหม่อีกรอบ — ครั้งละเกือบ{" "}
              <strong>7,000–8,000 บาท</strong>
            </p>
            <p>
              มันเป็นกำแพงที่สูงมากครับ บางคนเก่งภาษาอังกฤษจริง ๆ แต่ติดที่ &quot;ระบบการสอบ&quot; ไม่ใช่ที่ &quot;ความสามารถ&quot;
            </p>
            <p className="rounded-r-lg border-l-4 border-ep-yellow bg-yellow-50 py-2 pl-4 font-semibold italic">
              นั่นคือภาพของเมื่อก่อนครับ — แต่วันนี้ ทุกอย่างกำลังเปลี่ยนไปแล้ว
            </p>

            <h2 className="text-xl font-bold text-ep-blue">ทางเลือกใหม่ที่ชื่อ Duolingo English Test (DET)</h2>
            <p>
              ในช่วงไม่กี่ปีที่ผ่านมา มีผู้เล่นหน้าใหม่เข้ามาเขย่าวงการนี้อย่างเงียบ ๆ แต่ทรงพลังมาก นั่นคือ{" "}
              <Hl>Duolingo English Test (DET)</Hl> จุดที่ทำให้ต่างจาก IELTS แบบหน้ามือเป็นหลังมือ:
            </p>

            <div className="my-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 font-bold text-gray-500">📋 IELTS เมื่อก่อน</p>
                <ul className="space-y-1.5 text-gray-600">
                  <li>สอบที่ศูนย์ ต้องเดินทาง</li>
                  <li>รอผลเป็นสัปดาห์</li>
                  <li>~7,500 บาท/ครั้ง</li>
                  <li>เกือบทั้งวัน</li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-ep-blue bg-blue-50 p-4">
                <p className="mb-2 font-bold text-ep-blue">💻 DET ตอนนี้</p>
                <ul className="space-y-1.5 text-gray-700">
                  <li>สอบที่บ้านผ่านคอมฯ</li>
                  <li>รู้ผลใน 48 ชม.</li>
                  <li>~2,400 บาท (ถูกกว่า ~3 เท่า)</li>
                  <li>ไม่ถึง 1 ชั่วโมง</li>
                </ul>
              </div>
            </div>
            <p>
              เดิม DET ถูกมองว่าเป็นแค่ &quot;ทางเลือกสำรอง&quot; แต่หลังโควิด มหาวิทยาลัยทั่วโลกเปิดรับ
              พอเปิดแล้วก็พบว่า &quot;มันเวิร์ก&quot; จนกลายเป็นมาตรฐานที่ได้รับการยอมรับอย่างกว้างขวาง
            </p>

            <h2 className="text-xl font-bold text-ep-blue">มหาวิทยาลัยอังกฤษรับ DET จริงไหม?</h2>
            <p>
              คำถามที่ถามบ่อยสุด: &quot;รับแค่มหาวิทยาลัยเล็ก ๆ หรือเปล่า?&quot; คำตอบคือ <Hl>ไม่ใช่เลยครับ</Hl>{" "}
              ตอนนี้มีในสหราชอาณาจักร <strong>กว่า 130 แห่ง</strong> รวมกลุ่ม <strong>Russell Group</strong>
            </p>

            <div className="my-6 overflow-hidden rounded-xl border-2 border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">มหาวิทยาลัย</th>
                    <th className="px-2 py-2.5 font-semibold">กลุ่ม</th>
                    <th className="px-2 py-2.5 text-right font-semibold">DET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {UNIS.map(([name, group, score], i) => (
                    <tr key={name} className={i % 2 === 1 ? "bg-gray-50" : undefined}>
                      <td className="px-4 py-2">{name}</td>
                      <td className={`px-2 py-2 text-xs ${group === "—" ? "text-gray-400" : "text-ep-blue"}`}>
                        {group === "Russell Group" ? "Russell" : group}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="bg-yellow-50 px-4 py-2.5 text-xs text-gray-600">
                📌 ตัวเลขเป็นช่วงโดยประมาณ คะแนนจริงขึ้นกับคณะ/หลักสูตร เช็กหน้าเว็บหลักสูตรเสมอครับ
              </p>
            </div>

            <h2 className="text-xl font-bold text-ep-blue">เทียบ DET ↔ IELTS</h2>
            <p>
              ตัวเลข DET (สเกล 10–160 ไล่ทีละ 5 คะแนน) อาจดูแปลกตาสำหรับคนที่ชินกับ band 0–9 ของ IELTS
              ผมเลยทำตัวเทียบคร่าว ๆ ไว้ให้ครับ
            </p>
            <div className="my-6 overflow-hidden rounded-xl border-2 border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-ep-blue text-white">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">DET</th>
                    <th className="px-2 py-2.5 font-semibold">IELTS</th>
                    <th className="px-2 py-2.5 font-semibold">ความหมาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {DET_IELTS.map(([det, ielts, meaning], i) => (
                    <tr key={det} className={i % 2 === 1 ? "bg-gray-50" : undefined}>
                      <td className="px-4 py-2 font-mono font-bold text-ep-blue">{det}</td>
                      <td className="px-2 py-2 font-mono">{ielts}</td>
                      <td className="px-2 py-2 text-gray-600">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              ถ้าเล็งหลักสูตรที่ขอ IELTS 6.5 ทำ DET ได้ 120 ขึ้นไปก็ถือว่าแข็งแรงแล้ว แต่ผมแนะนำให้ตั้งเป้า{" "}
              <Hl>125–130</Hl> เผื่อไว้ เพราะ &quot;คะแนนขั้นต่ำ&quot; กับ &quot;คะแนนที่แข่งขันได้&quot; มันคนละเรื่องกัน
            </p>

            <h2 className="text-xl font-bold text-ep-blue">เรื่องสำคัญสุด: เส้นแบ่ง &quot;รับเข้าเรียน&quot; กับ &quot;วีซ่า&quot;</h2>
            <p>
              ตรงนี้คนเข้าใจผิดกันเยอะที่สุดครับ DET ใช้สำหรับ <strong>&quot;รับเข้าเรียน&quot; (admission)</strong> ได้สบาย
              แต่เรื่อง <strong>วีซ่านักเรียน</strong> มีรายละเอียด ความจริงคือ DET ยังไม่อยู่ในรายชื่อ{" "}
              <strong>SELT</strong> ที่ UKVI รับรองอย่างเป็นทางการ — ฟังดูน่าตกใจ แต่ใจเย็น ๆ สำหรับนักเรียนส่วนใหญ่{" "}
              <Hl>ไม่ใช่ปัญหา</Hl>:
            </p>
            <div className="my-6 space-y-3">
              <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50 p-4 text-sm">
                <b className="text-emerald-700">✅ เข้าเรียน:</b> ใช้ DET → ได้ offer → มหาวิทยาลัยประเมินภาษาเอง → ออก{" "}
                <b>CAS</b> (โดยทั่วไปครอบคลุมเกณฑ์ภาษาสำหรับวีซ่าด้วย ไม่ต้องสอบ SELT แยก)
              </div>
              <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-sm">
                <b className="text-amber-700">⚠️ วีซ่า:</b> ส่วนใหญ่ CAS ครอบคลุมให้ แต่ <b>บางกรณี/บางเส้นทาง</b> อาจถูกขอให้ยื่น SELT เพิ่ม
              </div>
            </div>
            <p className="rounded-r-lg border-l-4 border-ep-blue bg-blue-50 py-2 pl-4 font-semibold">
              กฎเหล็กของพี่ดอย: ก่อนจองสอบ DET ทุกครั้ง เช็กหน้าเว็บ &quot;หลักสูตรนั้น ๆ&quot; โดยตรง +
              ยืนยันกับมหาวิทยาลัยว่า CAS ครอบคลุมเรื่องภาษาสำหรับวีซ่าไหม อย่าเชื่อแค่ตารางเทียบลอย ๆ บนอินเทอร์เน็ตครับ
            </p>

            <h2 className="text-xl font-bold text-ep-blue">ทำไมเรื่องนี้สำคัญกับน้อง ๆ คนไทย</h2>
            <p>
              กลับมาที่ภาพเด็กต่างจังหวัดตอนต้นนะครับ วันนี้ น้องคนนั้นนั่งสอบที่โต๊ะในห้องนอนตัวเองได้
              จ่ายในราคาที่ครอบครัวไม่ลำบาก รู้ผลในสองวัน และส่งหลายมหาวิทยาลัยพร้อมกันได้ฟรี — นี่คือ{" "}
              <Hl>โอกาสที่เปิดกว้างขึ้นจริง ๆ</Hl>
            </p>
            <p>
              แต่สิ่งที่ไม่เคยเปลี่ยนคือ <strong>ความสามารถภาษาอังกฤษที่แท้จริง</strong> ของเรา DET เป็นระบบ adaptive
              วัดทักษะแบบบูรณาการ (อ่าน เขียน ฟัง พูด พร้อมกัน) มันจะ &quot;จับโป๊ะ&quot; คนที่ท่องเทคนิคมาแต่ใช้จริงไม่ได้
              ทางลัดที่ดีที่สุดจึงยังเป็นทางเดิม — พัฒนาภาษาให้เก่งขึ้นจริง ๆ ครับ โลกกำลังเปิดประตูกว้างขึ้น
              หน้าที่ของเราคือเตรียมตัวให้พร้อมก้าวผ่านไปอย่างมั่นใจ
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-dashed border-gray-200 pt-5">
              <div className="text-right text-sm">
                <div className="font-semibold">— พี่ดอย</div>
                <div className="text-gray-500">Academic Director, English Plan</div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ep-yellow font-bold text-gray-900">
                {meta.authorInitial}
              </span>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-xs italic text-gray-500">
              เรียบเรียงจากข้อมูล ณ ปี 2026 ครับ เนื่องจากนโยบายของแต่ละมหาวิทยาลัยและกฎวีซ่ามีการอัปเดตอยู่เสมอ
              ก่อนตัดสินใจทุกครั้ง ขอให้น้อง ๆ ตรวจสอบข้อมูลล่าสุดจากหน้าเว็บหลักสูตรและ GOV.UK โดยตรงนะครับ
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl bg-gray-900 p-6 text-center text-white">
          <p className="text-lg font-bold">อยากรู้ว่าภาษาอังกฤษเราอยู่ตรงไหน?</p>
          <p className="mt-1 text-sm text-gray-300">ลองแบบวินิจฉัยฟรี รู้ผลทันที + ฟีดแบ็กภาษาไทย</p>
          <Link
            href="/mini-diagnosis/start"
            className="mt-4 inline-block rounded-full bg-ep-yellow px-6 py-2.5 font-bold text-gray-900 transition-colors hover:bg-yellow-300"
          >
            เริ่มแบบวินิจฉัยฟรี →
          </Link>
        </div>
      </div>
    </article>
  );
}
