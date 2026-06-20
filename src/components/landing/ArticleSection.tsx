import Link from "next/link";

import { getFeaturedArticle } from "@/lib/articles";

/**
 * "บันทึกของครู" — Teacher's Note styled article section for the landing page.
 * Features the newest article (ARTICLES[0]) as a note card linking to /articles/<slug>.
 */
export function ArticleSection() {
  const a = getFeaturedArticle();

  return (
    <section id="articles" className="px-5 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ep-blue">
            จดหมายจากพี่ดอย
          </p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">บันทึกของครู</h2>
          <p className="mt-1 text-sm text-gray-500">เรื่องที่พี่อยากเล่าให้น้อง ๆ ฟัง ก่อนตัดสินใจสอบ</p>
        </div>

        <Link
          href={`/articles/${a.slug}`}
          className="group relative mx-auto block max-w-3xl rounded-3xl bg-white p-7 shadow-sm ring-1 ring-gray-200 transition hover:shadow-lg sm:p-9"
        >
          {/* washi tape */}
          <span
            className="absolute left-6 top-[-9px] h-[18px] w-[74px] rounded-sm bg-ep-yellow"
            style={{ opacity: 0.55, transform: "rotate(-4deg)" }}
            aria-hidden
          />
          <span className="absolute right-6 top-6 -rotate-2 rounded bg-ep-blue px-3 py-1 font-mono text-[11px] font-bold text-white">
            บทความล่าสุด
          </span>
          <p className="font-mono text-xs uppercase tracking-widest text-gray-400">
            {a.kicker} · {a.dateLabel}
          </p>
          <h3 className="mt-2 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">{a.title}</h3>
          <p className="mt-2 text-base text-gray-500">
            เมื่อ{" "}
            <span
              className="font-medium text-gray-800"
              style={{ backgroundColor: "#FFE680", padding: "0 0.15em", borderRadius: "2px" }}
            >
              &quot;ใบเบิกทาง&quot;
            </span>{" "}
            สู่มหาวิทยาลัยอังกฤษกำลังเปลี่ยนไป
          </p>
          <p className="mt-4 leading-relaxed text-gray-600">{a.excerpt}</p>
          <div className="mt-6 flex items-center justify-between border-t border-dashed border-gray-200 pt-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ep-yellow text-base font-bold text-gray-900">
                {a.authorInitial}
              </span>
              <div className="text-sm">
                <div className="font-semibold text-gray-800">{a.author}</div>
                <div className="text-gray-500">Academic Director · อ่าน ~{a.readingMinutes} นาที</div>
              </div>
            </div>
            <span className="font-semibold text-ep-blue">
              อ่านต่อ <span className="inline-block transition group-hover:translate-x-1">→</span>
            </span>
          </div>
        </Link>
        <p className="mt-5 text-center text-sm text-gray-400">
          บทความถัดไปกำลังจะมา — เจาะพาร์ท Speaking, อ่านผลคะแนน, วางแผนสอบ
        </p>
      </div>
    </section>
  );
}
