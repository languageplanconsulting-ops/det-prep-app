import type { Metadata } from "next";
import Link from "next/link";

import { absoluteUrl } from "@/lib/site-metadata";

const PAGE_PATH = "/duolingo-level-test";
const TITLE = "วัดระดับ Duolingo English Test ฟรีใน 12 นาที | English Plan";
const DESCRIPTION =
  "ทำแบบวัดระดับภาษาอังกฤษฟรี รู้คะแนน Duolingo English Test โดยประมาณ (10–160) พร้อมจุดอ่อนรายทักษะ ฟัง พูด อ่าน เขียน และแผนเตรียมสอบ ภายใน 12 นาที";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "วัดระดับภาษาอังกฤษ ฟรี",
    "วัดระดับ Duolingo",
    "เช็คคะแนน Duolingo",
    "Duolingo English Test คะแนน",
    "ข้อสอบ Duolingo English Test",
    "Duolingo English Test คือ",
    "เตรียมสอบ Duolingo",
    "Duolingo English Test ฟรี",
    "วัดระดับ ฟัง พูด อ่าน เขียน",
  ],
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "แบบวัดระดับนี้ฟรีจริงไหม?",
    a: "ฟรีจริง ใช้เวลาประมาณ 12 นาที เมื่อทำเสร็จคุณจะได้คะแนน Duolingo English Test โดยประมาณ พร้อมจุดอ่อนรายทักษะทันที",
  },
  {
    q: "คะแนนที่ได้แม่นยำแค่ไหน?",
    a: "เป็นคะแนนประเมิน (predicted score) เทียบกับสเกล Duolingo English Test 10–160 จากตัวอย่างข้อสอบจริงทั้ง 4 ทักษะ ใช้เป็นจุดเริ่มต้นในการวางแผนเตรียมสอบได้ดีมาก แต่ไม่ใช่คะแนนทางการจาก Duolingo",
  },
  {
    q: "ต้องสมัครสมาชิกก่อนไหม?",
    a: "เริ่มทำแบบวัดระดับได้เลยโดยไม่ต้องสมัคร กรอกอีเมลเฉพาะตอนที่อยากดูผลแบบเต็มและรับแผนเตรียมสอบส่วนตัว",
  },
  {
    q: "Duolingo English Test คืออะไร?",
    a: "เป็นการทดสอบภาษาอังกฤษออนไลน์ที่ทำที่บ้านได้ ใช้เวลาประมาณ 1 ชั่วโมง คะแนนเต็ม 160 และมหาวิทยาลัยทั่วโลกหลายพันแห่งยอมรับใช้สมัครเรียน",
  },
  {
    q: "ต้องได้กี่คะแนนถึงสมัครมหาวิทยาลัยได้?",
    a: "ส่วนใหญ่อยู่ที่ 90–120 ขึ้นอยู่กับมหาวิทยาลัยและคณะที่สมัคร หลักสูตรนานาชาติหลายแห่งขอประมาณ 105–120 ทำแบบวัดระดับเพื่อดูว่าคุณห่างจากเป้าหมายเท่าไหร่",
  },
];

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

const SKILLS: { th: string; en: string; sample: number }[] = [
  { th: "ฟัง", en: "Listening", sample: 105 },
  { th: "พูด", en: "Speaking", sample: 95 },
  { th: "อ่าน", en: "Reading", sample: 120 },
  { th: "เขียน", en: "Writing", sample: 100 },
];

export default function DuolingoLevelTestPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const quizLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "วัดระดับ Duolingo English Test ฟรี",
    description: DESCRIPTION,
    url: absoluteUrl(PAGE_PATH),
    educationalLevel: "CEFR A2–C1",
    about: { "@type": "Thing", name: "Duolingo English Test" },
    inLanguage: "th",
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "วัดระดับ Duolingo English Test",
        item: absoluteUrl(PAGE_PATH),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#eef4ff] px-4 py-12 text-neutral-900 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(quizLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)} />

      <div className="mx-auto max-w-6xl">
        {/* HERO */}
        <section className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.26em] text-[#004aad]">
            วัดระดับฟรี · 12 นาที · ได้คะแนนทันที
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            รู้คะแนน Duolingo English Test
            <br />
            ของคุณใน 12 นาที — ฟรี
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-700">
            ทำแบบวัดระดับสั้น ๆ แล้วรับคะแนนโดยประมาณบนสเกล 10–160 พร้อมจุดอ่อนรายทักษะ{" "}
            <span className="font-black">ฟัง พูด อ่าน เขียน</span> และแผนพิชิตคะแนนเป้าหมาย
            ออกแบบมาเพื่อผู้เรียนไทยโดยเฉพาะ
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mini-diagnosis/start"
              className="border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5"
            >
              เริ่มวัดระดับฟรี
            </Link>
            <Link
              href="/duolingo-english-test"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5"
            >
              คู่มือ DET ฉบับเต็ม
            </Link>
            <Link
              href="/pricing"
              className="border-4 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5"
            >
              ดูแพ็กเกจ
            </Link>
          </div>
          <p className="mt-5 text-sm font-bold text-neutral-500">
            ไม่ต้องสมัครก่อนเริ่ม · ไม่มีบัตรเครดิต · ภาษาไทยทั้งหมด
          </p>
        </section>

        {/* SAMPLE RESULT PREVIEW */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#004aad]">
              ตัวอย่างผลลัพธ์ที่คุณจะได้รับ
            </p>
            <div className="mt-5 flex items-end gap-4">
              <span className="text-6xl font-black tracking-tight">≈ 110</span>
              <span className="mb-2 border-2 border-black bg-[#ffcc00] px-3 py-1 text-sm font-black uppercase">
                B2
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-neutral-500">
              คะแนนประเมิน Duolingo English Test (10–160)
            </p>
            {/* 0-160 scale */}
            <div className="mt-4 h-5 w-full border-2 border-black bg-neutral-100">
              <div className="h-full bg-[#004aad]" style={{ width: "68.75%" }} />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] font-black text-neutral-500">
              <span>10</span>
              <span>85</span>
              <span>160</span>
            </div>

            {/* skill bars */}
            <div className="mt-7 space-y-4">
              {SKILLS.map((s) => (
                <div key={s.en}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black">
                      {s.th}{" "}
                      <span className="text-xs font-bold uppercase text-neutral-400">
                        {s.en}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-black text-[#004aad]">
                      {s.sample}
                    </span>
                  </div>
                  <div className="mt-1 h-3.5 w-full border-2 border-black bg-neutral-100">
                    <div
                      className="h-full bg-[#004aad]"
                      style={{ width: `${(s.sample / 160) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#004aad]">
              ในรายงานของคุณจะมี
            </p>
            <ul className="mt-5 space-y-4 text-base font-bold leading-7 text-neutral-800">
              <li className="border-l-4 border-[#004aad] pl-4">
                คะแนนรวมโดยประมาณบนสเกล 10–160 + ระดับ CEFR
              </li>
              <li className="border-l-4 border-[#004aad] pl-4">
                คะแนนแยกราย 4 ทักษะ — ฟัง พูด อ่าน เขียน
              </li>
              <li className="border-l-4 border-[#004aad] pl-4">
                จุดอ่อนที่ฉุดคะแนนคุณมากที่สุด ควรซ่อมก่อน
              </li>
              <li className="border-l-4 border-[#004aad] pl-4">
                ระยะห่างจากคะแนนเป้าหมายที่มหาวิทยาลัยต้องการ
              </li>
              <li className="border-l-4 border-[#004aad] pl-4">
                แผนเริ่มต้นว่าควรฝึกอะไรก่อน เพื่อขยับคะแนนเร็วที่สุด
              </li>
            </ul>
            <Link
              href="/mini-diagnosis/start"
              className="mt-7 inline-block border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5"
            >
              เริ่มวัดระดับฟรี
            </Link>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-10 border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight">ทำงานยังไง</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "ทำแบบวัดระดับ 12 นาที",
                body: "ตัวอย่างข้อสอบจริงครบทั้ง ฟัง พูด อ่าน เขียน ทำบนมือถือหรือคอมก็ได้",
              },
              {
                step: "02",
                title: "รับคะแนนทันที",
                body: "เห็นคะแนน Duolingo โดยประมาณ พร้อมจุดอ่อนรายทักษะแบบเข้าใจง่าย",
              },
              {
                step: "03",
                title: "รับแผนเตรียมสอบ",
                body: "รู้ว่าต้องฝึกอะไรก่อน เพื่อไปให้ถึงคะแนนเป้าหมายของคุณ",
              },
            ].map((c) => (
              <div key={c.step} className="border-2 border-black bg-neutral-50 p-6">
                <p className="font-mono text-2xl font-black text-[#004aad]">{c.step}</p>
                <h3 className="mt-2 text-xl font-black tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-700">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10 border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight">คำถามที่พบบ่อย</h2>
          <div className="mt-6 space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group border-2 border-black bg-neutral-50 p-5 [&_summary]:cursor-pointer"
              >
                <summary className="flex items-center justify-between text-lg font-black tracking-tight">
                  {item.q}
                  <span className="ml-4 font-mono text-[#004aad] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-neutral-700">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mt-10 border-4 border-black bg-[#004aad] p-8 text-white shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            ยังไม่รู้คะแนนตัวเอง? วัดฟรีเลยตอนนี้
          </h2>
          <p className="mt-3 max-w-2xl text-lg font-bold leading-8 text-white/90">
            ใช้เวลาแค่ 12 นาที แล้วคุณจะรู้ว่าอยู่ตรงไหน และต้องทำอะไรต่อ
          </p>
          <Link
            href="/mini-diagnosis/start"
            className="mt-7 inline-block border-4 border-black bg-[#ffcc00] px-8 py-4 text-base font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111] transition hover:-translate-y-0.5"
          >
            เริ่มวัดระดับฟรี
          </Link>
        </section>
      </div>
    </main>
  );
}
