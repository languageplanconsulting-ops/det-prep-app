import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetArticlePage } from "@/components/seo/DetArticlePage";
import { DET_PAGE_ORDER, DET_PAGES, getDetPage, type DetPageSlug } from "@/lib/seo/det-content";
import { absoluteUrl } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return DET_PAGE_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getDetPage(slug);
  if (!page) {
    return {};
  }

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: absoluteUrl(`/duolingo-english-test/${page.slug}`),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: absoluteUrl(`/duolingo-english-test/${page.slug}`),
      type: "article",
    },
  };
}

export default async function DetSeoArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const page = getDetPage(slug);
  if (!page) {
    notFound();
  }

  const relatedPages = page.related.map((relatedSlug) => DET_PAGES[relatedSlug as DetPageSlug]);
  return <DetArticlePage page={page} relatedPages={relatedPages} />;
}
