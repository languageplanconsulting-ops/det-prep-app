import type { Metadata } from "next";
import { Suspense } from "react";

import { MockTestStartClient } from "@/components/mock-test/MockTestStartClient";
import { absoluteUrl } from "@/lib/site-metadata";

const TITLE = "Mock Test Duolingo English Test: ทดลองสอบ DET เสมือนจริง";
const DESCRIPTION =
  "ทดลองสอบ Duolingo English Test แบบเต็มชุด จับเวลาเหมือนสอบจริง พร้อมคะแนนและผลวิเคราะห์รายทักษะเป็นภาษาไทย";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/mock-test/start"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/mock-test/start"),
    type: "website",
  },
};

export default function MockTestStartPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold text-neutral-600">Loading...</div>}>
      <MockTestStartClient />
    </Suspense>
  );
}
