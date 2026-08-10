import type { MetadataRoute } from "next";

import { ARTICLES } from "@/lib/articles";
import { DET_PAGE_ORDER } from "@/lib/seo/det-content";
import { absoluteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only routes that return 200 to an anonymous crawler belong here.
  // /practice and /mock-test/start are deliberately excluded: middleware redirects
  // signed-out visitors (see middleware.ts isPracticePath / requiresProtectedSession),
  // so Googlebot never sees their content. /duolingo-english-test/practice is the
  // crawlable, server-rendered equivalent that links into them after signup.
  const staticRoutes = [
    "/",
    "/about",
    // /pricing is gone from here on purpose: it now redirects anonymous crawlers to
    // /course and is noindex — packages are only sold with the course.
    "/mini-diagnosis/start",
    "/duolingo-english-test",
    "/duolingo-english-test/practice",
    "/duolingo-level-test",
  ];

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" as const : "monthly" as const,
    priority: route === "/" ? 1 : 0.8,
  }));

  const detEntries = DET_PAGE_ORDER.map((slug) => ({
    url: absoluteUrl(`/duolingo-english-test/${slug}`),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const articleEntries = ARTICLES.map((article) => ({
    url: absoluteUrl(`/articles/${article.slug}`),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...detEntries, ...articleEntries];
}
