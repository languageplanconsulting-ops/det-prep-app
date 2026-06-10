import type { Metadata } from "next";

export const SITE_NAME = "English Plan";
export const SITE_TITLE = "Duolingo English Test Prep Thailand";
export const SITE_DESCRIPTION =
  "English Plan helps Thai learners prepare for the Duolingo English Test with mock tests, instant feedback, speaking and writing practice, and Thai-first guidance.";

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function normalizeSiteUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : isLoopbackHostname(trimmed.split("/")[0] ?? "")
        ? `http://${trimmed}`
        : `https://${trimmed}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const url = normalizeSiteUrl(raw);
    if (!url) continue;
    if (process.env.NODE_ENV === "production" && isLoopbackHostname(url.hostname)) {
      continue;
    }
    return url;
  }

  return new URL("http://localhost:3000");
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, getSiteUrl()).toString();
}

export function buildDefaultMetadata(): Metadata {
  return {
    metadataBase: getSiteUrl(),
    title: {
      default: `${SITE_NAME} | ${SITE_TITLE}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} | ${SITE_TITLE}`,
      description: SITE_DESCRIPTION,
      url: absoluteUrl("/"),
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} | ${SITE_TITLE}`,
      description: SITE_DESCRIPTION,
    },
    keywords: [
      "Duolingo English Test Thailand",
      "DET Thailand",
      "ติว Duolingo English Test",
      "mock test Duolingo English Test",
      "Duolingo English Test score",
      "Duolingo English Test ราคา",
    ],
  };
}
