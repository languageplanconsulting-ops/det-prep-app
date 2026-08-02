import type { Metadata } from "next";

import { PracticePageClient } from "@/components/practice/PracticePageClient";
import { absoluteUrl } from "@/lib/site-metadata";

const TITLE = "ฝึกทำข้อสอบ Duolingo English Test ครบทุกทักษะ";
const DESCRIPTION =
  "ฝึกทำข้อสอบ Duolingo English Test ทุกประเภท ทั้ง read & speak, write about photo, dictation, fill in the blank และ listening พร้อมเฉลยและคำอธิบายภาษาไทย";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/practice"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/practice"),
    type: "website",
  },
};

export default function PracticeHubPage() {
  return <PracticePageClient />;
}
