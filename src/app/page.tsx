import type { Metadata } from "next";

import { AdminLandingPageClient } from "@/components/landing/AdminLandingPageClient";
import { LandingPageClient } from "@/components/landing/LandingPageClient";
import { getAdminAccess } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Duolingo English Test Prep Thailand | Mock Test, Instant Feedback, Guide",
  description:
    "เตรียมสอบ Duolingo English Test สำหรับคนไทย พร้อม mock test, instant feedback, speaking and writing practice, mini diagnosis และคู่มือ DET แบบครบ",
};

type HomeProps = {
  searchParams?: Promise<{ fastTrack?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = searchParams ? await searchParams : {};
  const ftRaw = sp.fastTrack;
  const initialFastTrackOpen =
    ftRaw === "1" || (Array.isArray(ftRaw) && ftRaw[0] === "1");

  // New "Calm Clarity" landing is admin-only for now — real users keep the
  // current page until it's approved for everyone.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminLandingPageClient initialFastTrackOpen={initialFastTrackOpen} />;
  }

  return <LandingPageClient initialFastTrackOpen={initialFastTrackOpen} />;
}
