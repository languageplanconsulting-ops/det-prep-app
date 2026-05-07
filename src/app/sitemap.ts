import type { MetadataRoute } from "next";

import { DET_PAGE_ORDER } from "@/lib/seo/det-content";
import { absoluteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/about",
    "/pricing",
    "/practice",
    "/mini-diagnosis/start",
    "/mock-test/start",
    "/duolingo-english-test",
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

  return [...staticEntries, ...detEntries];
}
