import type { Metadata } from "next";
import Link from "next/link";

import { PRACTICE_CATALOG, PRACTICE_FAQ } from "@/lib/seo/practice-catalog";
import { absoluteUrl } from "@/lib/site-metadata";

// Static segment wins over the sibling [slug] dynamic route, so this page owns
// /duolingo-english-test/practice. "practice" is intentionally NOT in DET_PAGE_ORDER.
const CANONICAL_PATH = "/duolingo-english-test/practice";
const TITLE = "ฝึกทำข้อสอบ Duolingo English Test ฟรี ครบทุกพาร์ท";
const DESCRIPTION =
  "ฝึกทำข้อสอบ Duolingo English Test ครบ 12 ประเภท ทั้งพูด เขียน อ่าน ฟัง และพื้นฐานภาษา พร้อมเฉลยและคำอธิบายภาษาไทย สมัครฟรี ไม่ต้องใช้บัตรเครดิต";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl(CANONICAL_PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(CANONICAL_PATH),
    type: "website",
  },
};

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

export default function PublicPracticeLandingPage() {
  const totalExercises = PRACTICE_CATALOG.reduce((n, c) => n + c.items.length, 0);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Duolingo English Test Thailand",
        item: absoluteUrl("/duolingo-english-test"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "ฝึกทำข้อสอบ",
        item: absoluteUrl(CANONICAL_PATH),
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRACTICE_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-4 py-12 text-neutral-900 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />

      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm font-semibold text-neutral-600">
          <Link href="/" className="underline">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/duolingo-english-test" className="underline">
            Duolingo English Test Thailand
          </Link>{" "}
          / <span>ฝึกทำข้อสอบ</span>
        </nav>

        <section className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.26em] text-[#004aad]">
            DET Practice
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            ฝึกทำข้อสอบ Duolingo English Test ฟรี
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-neutral-700">
            English Plan รวมแบบฝึกหัด Duolingo English Test ไว้ {totalExercises} ประเภท
            ครอบคลุมทุกพาร์ทที่ออกสอบจริง ทุกข้อมีเฉลยและคำอธิบายเป็นภาษาไทย
            สมัครสมาชิกฟรีแล้วเริ่มฝึกได้ทันที ไม่ต้องกรอกบัตรเครดิต
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111]"
            >
              สมัครฟรีเพื่อเริ่มฝึก
            </Link>
            <Link
              href="/mini-diagnosis/start"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              เช็กระดับก่อนเริ่ม
            </Link>
            <Link
              href="/pricing"
              className="border-4 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              ดูแพ็กเกจ
            </Link>
          </div>
        </section>

        {PRACTICE_CATALOG.map((category) => (
          <section
            key={category.kicker}
            className="mt-10 border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]"
          >
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#004aad]">
              {category.kicker}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">{category.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-700">
              {category.blurb}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {category.items.map((item) => (
                <div key={item.href} className="border-2 border-black bg-neutral-50 p-5">
                  <h3 className="text-xl font-black tracking-tight">{item.label}</h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-700">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-10 border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight">คำถามที่พบบ่อย</h2>
          <dl className="mt-6 space-y-6">
            {PRACTICE_FAQ.map((item) => (
              <div key={item.question}>
                <dt className="text-lg font-black tracking-tight">{item.question}</dt>
                <dd className="mt-2 text-base leading-7 text-neutral-700">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 border-4 border-black bg-[#004aad] p-8 text-white shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight">พร้อมเริ่มฝึกแล้วหรือยัง?</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/90">
            สมัครสมาชิกฟรี แล้วเริ่มจากพาร์ทที่คุณอ่อนที่สุด
            ระบบจะจำความคืบหน้าและคำศัพท์ที่คุณจดไว้ให้อัตโนมัติ
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              สมัครฟรี
            </Link>
            <Link
              href="/duolingo-english-test"
              className="border-4 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              กลับไปหน้ารวมคู่มือ DET
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
