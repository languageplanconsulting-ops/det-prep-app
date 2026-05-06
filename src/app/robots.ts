import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/mini-diagnosis/start",
          "/mock-test/start",
          "/duolingo-english-test",
          "/duolingo-english-test/",
        ],
        disallow: ["/admin/", "/api/", "/profile", "/notebook", "/student-overview"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
