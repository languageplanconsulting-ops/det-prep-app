import Link from "next/link";

import type { DetPageContent } from "@/lib/seo/det-content";
import { absoluteUrl } from "@/lib/site-metadata";

function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data) };
}

export function DetArticlePage({
  page,
  relatedPages,
}: {
  page: DetPageContent;
  relatedPages: DetPageContent[];
}) {
  const canonicalPath = `/duolingo-english-test/${page.slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    inLanguage: "th-TH",
    mainEntityOfPage: absoluteUrl(canonicalPath),
    publisher: {
      "@type": "Organization",
      name: "English Plan",
      url: absoluteUrl("/"),
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-4 py-12 text-neutral-900 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(articleLd)} />
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
          / <span>{page.h1}</span>
        </nav>

        <section className="border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.26em] text-[#004aad]">
            {page.heroLabel}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{page.h1}</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-neutral-700">{page.intro}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={page.ctaHref}
              className="border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111]"
            >
              {page.ctaLabel}
            </Link>
            <Link
              href="/pricing"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              ดูแพลนเตรียมสอบ
            </Link>
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="space-y-8">
            {page.sections.map((section) => (
              <section
                key={section.title}
                className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111]"
              >
                <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-neutral-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-3 text-base font-semibold leading-7 text-neutral-800">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>- {bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section className="border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#111]">
              <h2 className="text-2xl font-black tracking-tight">คำถามที่พบบ่อย</h2>
              <div className="mt-5 space-y-5">
                {page.faq.map((item) => (
                  <div key={item.question} className="border-t-2 border-black pt-4 first:border-t-0 first:pt-0">
                    <h3 className="text-lg font-black">{item.question}</h3>
                    <p className="mt-2 text-base leading-7 text-neutral-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>

          <aside className="space-y-6">
            <section className="border-4 border-black bg-[#fff7d6] p-5 shadow-[8px_8px_0_0_#111]">
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#004aad]">
                Primary Keyword
              </p>
              <p className="mt-3 text-lg font-black">{page.primaryKeyword}</p>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                หน้านี้ออกแบบมาเพื่ออธิบายหัวข้อนี้แบบเจาะลึก พร้อมเชื่อมไปยังหน้าฝึกและหน้าราคาเพื่อให้ทั้งผู้ใช้และ Google เข้าใจโครงสร้างของเว็บไซต์
              </p>
            </section>

            <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111]">
              <h2 className="text-xl font-black">Related DET Guides</h2>
              <div className="mt-4 flex flex-col gap-3">
                {relatedPages.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/duolingo-english-test/${related.slug}`}
                    className="border-2 border-black bg-neutral-50 px-4 py-3 text-sm font-bold leading-6 text-neutral-900 transition hover:bg-[#e8f1ff]"
                  >
                    {related.h1}
                  </Link>
                ))}
              </div>
            </section>

            <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111]">
              <h2 className="text-xl font-black">Start Practicing</h2>
              <div className="mt-4 flex flex-col gap-3 text-sm font-bold">
                <Link href="/mock-test/start" className="underline">
                  Mock test
                </Link>
                <Link href="/mini-diagnosis/start" className="underline">
                  Mini diagnosis
                </Link>
                <Link href="/practice/production/write-about-photo" className="underline">
                  Write about photo practice
                </Link>
                <Link href="/practice/production/speak-about-photo" className="underline">
                  Speak about photo practice
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
