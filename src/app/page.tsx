import type { Metadata } from "next";

import { LandingPageClient } from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "ENGLISH PLAN — Duolingo English Test Prep",
  description:
    "DET preparation across Production, Comprehension, Literacy, and Conversation with AI feedback. เตรียมสอบ DET ครบทั้ง 4 ทักษะ",
};

export default function Home() {
  return <LandingPageClient />;
}
