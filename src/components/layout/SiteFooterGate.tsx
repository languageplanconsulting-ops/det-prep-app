"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Renders {@link SiteFooter} on public/marketing routes only.
 *
 * These are exactly the routes an anonymous crawler can reach (see robots.ts and
 * sitemap.ts), so the footer's internal links still land on every indexable page.
 * App surfaces — exams, practice, notebook, admin — are `Disallow`ed for crawlers
 * and are full-screen experiences where a marketing footer would just be noise.
 *
 * This is a client component only to read the pathname; Next.js still server-renders
 * it, so the links are present in the initial HTML that Googlebot receives.
 */

/** Prefixes that should NOT show the footer. Everything else does. */
const APP_ROUTE_PREFIXES = [
  "/admin",
  "/practice",
  "/mock-test",
  "/notebook",
  "/profile",
  "/study-plan",
  "/mini-diagnosis",
  "/preview",
  "/dev",
  "/login",
  "/signup",
];

export function SiteFooterGate() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (APP_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <SiteFooter />;
}
