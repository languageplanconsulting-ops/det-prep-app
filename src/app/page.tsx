import type { Metadata } from "next";

import { LandingPageClient } from "@/components/landing/LandingPageClient";

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

  return <LandingPageClient initialFastTrackOpen={initialFastTrackOpen} />;
}
