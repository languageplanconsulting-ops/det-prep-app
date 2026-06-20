import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetVsIeltsUkArticle } from "@/components/articles/DetVsIeltsUkArticle";
import { ARTICLES, getArticle } from "@/lib/articles";

type PageProps = { params: Promise<{ slug: string }> };

/** slug → rendered body component */
const BODIES: Record<string, () => React.ReactElement> = {
  "det-vs-ielts-uk": DetVsIeltsUkArticle,
};

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return { title: "ไม่พบบทความ" };
  return {
    title: a.title,
    description: a.excerpt,
    openGraph: {
      title: `${a.title}: ${a.subtitle}`,
      description: a.excerpt,
      type: "article",
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const Body = BODIES[slug];
  if (!Body || !getArticle(slug)) notFound();
  return (
    <main className="min-h-screen bg-gray-50">
      <Body />
    </main>
  );
}
