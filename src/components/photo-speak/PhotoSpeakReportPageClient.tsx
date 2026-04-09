"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { PhotoSpeakReportView } from "@/components/photo-speak/PhotoSpeakReportView";
import { takeReportHandoff } from "@/lib/grading-report-handoff";
import { loadPhotoSpeakReport, savePhotoSpeakReport } from "@/lib/photo-speak-storage";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

export function PhotoSpeakReportPageClient({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<PhotoSpeakAttemptReport | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const handoff = takeReportHandoff<PhotoSpeakAttemptReport>(attemptId);
    if (handoff?.attemptId) {
      savePhotoSpeakReport(handoff);
      setReport(handoff);
      return;
    }
    setReport(loadPhotoSpeakReport(attemptId));
  }, [attemptId]);

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <LuxuryLoader label="Assembling your photo report…" />
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Report not found.</p>
        <Link href="/practice" className="mt-4 inline-block text-ep-blue">
          Back to practice
        </Link>
      </div>
    );
  }

  return <PhotoSpeakReportView report={report} />;
}
