import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/practice",
          "/mini-diagnosis/start",
          "/mock-test/start",
          "/duolingo-english-test",
          "/duolingo-english-test/",
          "/duolingo-level-test",
          "/articles",
          "/articles/",
        ],
        disallow: ["/admin/", "/api/", "/profile", "/notebook"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
