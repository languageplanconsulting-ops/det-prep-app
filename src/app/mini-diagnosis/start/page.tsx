import type { Metadata } from "next";

import { AdminMiniDiagnosisStartClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisStartClient";
import { absoluteUrl } from "@/lib/site-metadata";

const TITLE = "เช็กระดับภาษาอังกฤษฟรี: ประเมินคะแนน Duolingo English Test";
const DESCRIPTION =
  "แบบทดสอบสั้น ๆ ประเมินระดับภาษาอังกฤษและคาดคะเนช่วงคะแนน Duolingo English Test ของคุณ พร้อมแผนเตรียมสอบรายทักษะ ใช้ฟรี ไม่ต้องจ่าย";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/mini-diagnosis/start"),
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/mini-diagnosis/start"),
    type: "website",
  },
};

export default function MiniDiagnosisStartPage() {
  return <AdminMiniDiagnosisStartClient />;
}
