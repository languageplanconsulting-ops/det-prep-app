import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site-metadata";

/**
 * Sitewide JSON-LD: identifies the brand ("English Plan") and the site to
 * Google so the two can earn a knowledge panel / sitelinks over time. Rendered
 * once in the root layout, so every page carries it. Kept deliberately factual —
 * no invented ratings or awards (Google penalises fabricated markup, and
 * self-serving review stars no longer render anyway).
 */
export function SiteStructuredData() {
  const org = {
    "@context": "https://schema.org",
    "@type": ["Organization", "EducationalOrganization"],
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/mascot-great.png"),
    description: SITE_DESCRIPTION,
    knowsLanguage: ["th", "en"],
    areaServed: "TH",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "th-TH",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}
