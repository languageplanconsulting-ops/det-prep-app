import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminPricingContent } from "@/components/pricing/AdminPricingContent";
import { absoluteUrl } from "@/lib/site-metadata";

// Targets the "สมัคร/แพ็กเกจติว" intent. The "ค่าสอบ DET เท่าไร" intent belongs to
// /duolingo-english-test/cost-thailand — keep these two distinct to avoid cannibalising it.
const TITLE = "แพ็กเกจติว Duolingo English Test: ราคาและสิทธิ์การใช้งาน";
const DESCRIPTION =
  "เลือกแพ็กเกจเตรียมสอบ Duolingo English Test กับ English Plan ทั้ง mock test เต็มรูปแบบ ตรวจ speaking/writing ด้วย AI และแผนติวรายทักษะ อธิบายเป็นภาษาไทย";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/pricing"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/pricing"),
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-ep-blue" />
            กำลังโหลด…
          </div>
        </main>
      }
    >
      <AdminPricingContent />
    </Suspense>
  );
}
