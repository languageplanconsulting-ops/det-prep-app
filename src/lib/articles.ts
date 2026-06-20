/**
 * Landing-page article registry.
 * Metadata only — the rendered body for each article lives in
 * src/components/articles/<Component>.tsx and is wired up in
 * src/app/articles/[slug]/page.tsx.
 */
export type ArticleMeta = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  authorInitial: string;
  authorRole: string;
  readingMinutes: number;
  tags: string[];
  dateLabel: string;
  kicker: string;
};

export const ARTICLES: ArticleMeta[] = [
  {
    slug: "det-vs-ielts-uk",
    title: "จากห้องสอบที่กรุงเทพฯ สู่โต๊ะทำงานที่บ้าน",
    subtitle: 'เมื่อ "ใบเบิกทาง" สู่มหาวิทยาลัยอังกฤษกำลังเปลี่ยนไป',
    excerpt:
      '"ผมยังจำภาพเด็กต่างจังหวัดที่ต้องนั่งรถเข้ากรุงเทพฯ มาสอบ IELTS ทั้งวันได้ดี… วันนี้ทุกอย่างเปลี่ยนไปแล้วครับ" — มาดูกันว่า DET เปลี่ยนเกมยังไง และอะไรคือเส้นแบ่ง "วีซ่า" ที่ห้ามพลาด',
    author: "พี่ดอย",
    authorInitial: "ด",
    authorRole: "Academic Director, English Plan",
    readingMinutes: 6,
    tags: ["DET vs IELTS", "130+ มหาวิทยาลัย", "วีซ่า & CAS"],
    dateLabel: "2026",
    kicker: "DET · เรียนต่ออังกฤษ",
  },
];

export function getArticle(slug: string): ArticleMeta | null {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** Newest first; the landing section features ARTICLES[0]. */
export function getFeaturedArticle(): ArticleMeta {
  return ARTICLES[0]!;
}
