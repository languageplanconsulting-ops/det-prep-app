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
          "/mini-diagnosis/start",
          "/mock-test/start",
          "/duolingo-english-test",
          "/duolingo-english-test/",
        ],
        disallow: ["/admin/", "/api/", "/profile", "/notebook"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
