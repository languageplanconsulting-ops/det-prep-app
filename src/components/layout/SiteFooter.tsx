import Link from "next/link";

import { ARTICLES } from "@/lib/articles";
import { DET_PAGE_ORDER, type DetPageSlug } from "@/lib/seo/det-content";
import { SITE_NAME } from "@/lib/site-metadata";

/**
 * Server-rendered, site-wide footer.
 *
 * This exists for crawlability as much as for navigation. `MainNav` is a client
 * component gated on auth state and never links to the DET guide pages, which left
 * every /duolingo-english-test/* page reachable only from sitemap.xml — orphan pages
 * that Google crawls rarely and ranks poorly. Linking them from every page is the
 * strongest internal signal we can send about which content matters.
 *
 * Keep the links plain server-rendered <Link>s: no auth gating, no conditional
 * rendering, so an anonymous crawler sees exactly what a signed-in user sees.
 */

/** Short nav labels. Typed against DetPageSlug so a new page fails the build until labelled. */
const DET_NAV_LABEL: Record<DetPageSlug, string> = {
  "what-is-det": "DET คืออะไร",
  "score-guide": "คะแนน DET",
  "subscores-guide": "Subscores",
  "cost-thailand": "ค่าสอบ DET",
  "mock-test": "Mock Test",
  "accepted-universities": "ใช้ยื่นที่ไหนได้",
  "vs-ielts": "DET vs IELTS",
  "vs-toefl": "DET vs TOEFL",
  "write-about-photo": "Write About Photo",
  "speak-about-photo": "Speak About Photo",
  "how-to-register": "วิธีสมัครสอบ",
  "score-conversion": "เทียบคะแนน IELTS",
  "thai-universities": "มหาวิทยาลัยไทย",
  "exam-rules": "กฎการสอบ",
  "vs-toeic": "DET vs TOEIC",
  "preparation-plan": "แผนเตรียมตัว",
};

const START_LINKS = [
  { href: "/duolingo-english-test", label: "คู่มือ DET ทั้งหมด" },
  { href: "/duolingo-english-test/practice", label: "แบบฝึกหัด DET" },
  { href: "/mini-diagnosis/start", label: "เช็กระดับฟรี" },
  { href: "/duolingo-level-test", label: "วัดระดับ Duolingo" },
  { href: "/#course", label: "คอร์สติว DET" },
  { href: "/about", label: "เกี่ยวกับเรา" },
];

const HEADING = "text-xs font-black uppercase tracking-wide text-neutral-500";
const LINK =
  "block py-1 text-sm font-semibold text-neutral-800 underline decoration-neutral-300 decoration-2 underline-offset-4 hover:text-ep-blue hover:decoration-ep-blue";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-4 border-black bg-white" aria-label="Site footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <nav aria-label="เริ่มต้นใช้งาน">
          <h2 className={HEADING}>เริ่มต้น</h2>
          <ul className="mt-3">
            {START_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="คู่มือ Duolingo English Test" className="sm:col-span-2">
          <h2 className={HEADING}>คู่มือ Duolingo English Test</h2>
          <ul className="mt-3 sm:columns-2">
            {DET_PAGE_ORDER.map((slug) => (
              <li key={slug} className="break-inside-avoid">
                <Link href={`/duolingo-english-test/${slug}`} className={LINK}>
                  {DET_NAV_LABEL[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="บทความ">
          <h2 className={HEADING}>บทความ</h2>
          <ul className="mt-3">
            {ARTICLES.map((article) => (
              <li key={article.slug}>
                <Link href={`/articles/${article.slug}`} className={LINK}>
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className={`${HEADING} mt-6`}>คอร์สอื่นของเรา</h2>
          <ul className="mt-3">
            <li>
              <a
                href="https://www.language-plan.com/"
                className={LINK}
                target="_blank"
                rel="noopener"
              >
                IELTS &amp; SAT — Language Plan
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t-2 border-black px-5 py-4">
        <p className="mx-auto max-w-6xl text-xs font-semibold text-neutral-600">
          {SITE_NAME} — เตรียมสอบ Duolingo English Test สำหรับผู้เรียนไทย
        </p>
      </div>
    </footer>
  );
}
