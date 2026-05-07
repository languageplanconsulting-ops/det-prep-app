import type { Metadata } from "next";
import Link from "next/link";

import { DET_PAGE_ORDER, DET_PAGES } from "@/lib/seo/det-content";
import { absoluteUrl } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Duolingo English Test Thailand: Guide, Mock Test, Prep",
  description:
    "คู่มือ Duolingo English Test สำหรับนักเรียนไทย พร้อม mock test, แนวข้อสอบ, ราคา, score guide และแผนเตรียมสอบแบบครบ",
  alternates: {
    canonical: absoluteUrl("/duolingo-english-test"),
  },
  openGraph: {
    title: "Duolingo English Test Thailand: Guide, Mock Test, Prep",
    description:
      "คู่มือ Duolingo English Test สำหรับนักเรียนไทย พร้อม mock test, แนวข้อสอบ, ราคา, score guide และแผนเตรียมสอบแบบครบ",
    url: absoluteUrl("/duolingo-english-test"),
    type: "article",
  },
};

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

export default function DuolingoEnglishTestHubPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Duolingo English Test Thailand",
    description:
      "Thai-first guide hub for Duolingo English Test prep, score, cost, mock tests, and task strategies.",
    url: absoluteUrl("/duolingo-english-test"),
  };

  return (
    <main className="min-h-screen bg-[#eef4ff] px-4 py-12 text-neutral-900 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(itemListLd)} />

      <div className="mx-auto max-w-6xl">
        <section className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.26em] text-[#004aad]">
            DET Thailand Hub
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Duolingo English Test Thailand
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-neutral-700">
            This is the main English Plan resource hub for Thai learners preparing for the Duolingo
            English Test. Use it to understand the exam, score targets, cost, mock tests, and the
            tasks that most often decide your final result.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mock-test/start"
              className="border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111]"
            >
              Start mock test
            </Link>
            <Link
              href="/pricing"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              View pricing
            </Link>
            <Link
              href="/mini-diagnosis/start"
              className="border-4 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              Mini diagnosis
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {DET_PAGE_ORDER.map((slug) => {
            const page = DET_PAGES[slug];
            return (
              <Link
                key={page.slug}
                href={`/duolingo-english-test/${page.slug}`}
                className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111] transition hover:-translate-y-1 hover:bg-[#fffbe6]"
              >
                <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-[#004aad]">
                  {page.heroLabel}
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight">{page.h1}</h2>
                <p className="mt-3 text-sm leading-7 text-neutral-700">{page.description}</p>
                <p className="mt-5 text-sm font-black uppercase text-[#004aad]">Read guide</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-10 border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <h2 className="text-3xl font-black tracking-tight">Where to go next</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/practice" className="border-2 border-black bg-neutral-50 px-5 py-4 font-bold">
              Practice hub
            </Link>
            <Link href="/practice/production/write-about-photo" className="border-2 border-black bg-neutral-50 px-5 py-4 font-bold">
              Write about photo
            </Link>
            <Link href="/practice/production/speak-about-photo" className="border-2 border-black bg-neutral-50 px-5 py-4 font-bold">
              Speak about photo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
