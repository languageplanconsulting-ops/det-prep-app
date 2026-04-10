import type { Metadata } from "next";
import Link from "next/link";

import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "ENGLISH PLAN — Duolingo English Test Prep",
  description:
    "DET preparation across Production, Comprehension, Literacy, and Conversation with AI feedback. เตรียมสอบ DET ครบทั้ง 4 ทักษะ",
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
        . <strong>Staff:</strong>{" "}
        <Link className="font-bold text-ep-blue underline" href="/login#admin-login">
          Admin code login
        </Link>
        .
      </section>
      <LandingPageClient initialFastTrackOpen={initialFastTrackOpen} />
    </>
  );
}
