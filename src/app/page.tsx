import type { Metadata } from "next";
import Link from "next/link";

import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Duolingo English Test Prep Thailand | Mock Test, AI Feedback, Guide",
  description:
    "เตรียมสอบ Duolingo English Test สำหรับคนไทย พร้อม mock test, AI feedback, speaking and writing practice, mini diagnosis และคู่มือ DET แบบครบ",
};

type HomeProps = {
  searchParams?: Promise<{ fastTrack?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const sp = searchParams ? await searchParams : {};
  const ftRaw = sp.fastTrack;
  const initialFastTrackOpen =
    ftRaw === "1" || (Array.isArray(ftRaw) && ftRaw[0] === "1");

  return (
    <>
      <section
        className="border-b-4 border-black bg-neutral-100 px-4 py-3 text-center text-[13px] leading-snug text-neutral-900 sm:text-sm"
        aria-label="Sign-in options for visitors"
      >
        <span className="font-black uppercase tracking-wide text-neutral-950">
          Visitors
        </span>{" "}
        —{" "}
        <strong>Students / Fast Track:</strong>{" "}
        <Link className="font-bold text-ep-blue underline" href="/login">
          Sign in
        </Link>{" "}
        or{" "}
        <Link className="font-bold text-ep-blue underline" href="/?fastTrack=1">
          activate Duolingo Fast Track VIP
        </Link>
        .
      </section>
      <LandingPageClient initialFastTrackOpen={initialFastTrackOpen} />
      <section className="bg-[#eef4ff] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl border-4 border-black bg-white p-8 shadow-[10px_10px_0_0_#111]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.24em] text-[#004aad]">
            DET Thailand guide
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Start with the Duolingo English Test guide hub
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-neutral-700">
            If you are comparing exams, checking score targets, planning your budget, or trying to
            improve tasks like Write About Photo and Speak About Photo, use our Thai-first DET guide
            hub first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/duolingo-english-test"
              className="border-4 border-black bg-[#004aad] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[6px_6px_0_0_#111]"
            >
              Open DET guide hub
            </Link>
            <Link
              href="/duolingo-english-test/mock-test"
              className="border-4 border-black bg-[#ffcc00] px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              Read mock test guide
            </Link>
            <Link
              href="/duolingo-english-test/score-guide"
              className="border-4 border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[6px_6px_0_0_#111]"
            >
              Read score guide
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
