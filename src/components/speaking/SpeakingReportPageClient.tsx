"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { SpeakingReportView } from "@/components/speaking/SpeakingReportView";
import { takeReportHandoff } from "@/lib/grading-report-handoff";
import { loadSpeakingReport, saveSpeakingReport } from "@/lib/speaking-storage";
import type { SpeakingAttemptReport } from "@/types/speaking";

export function SpeakingReportPageClient({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<SpeakingAttemptReport | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const handoff = takeReportHandoff<SpeakingAttemptReport>(attemptId);
    if (handoff?.attemptId) {
      saveSpeakingReport(handoff);
      setReport(handoff);
      return;
    }
    setReport(loadSpeakingReport(attemptId));
  }, [attemptId]);

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <LuxuryLoader label="Assembling your speaking report…" />
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Report not found.</p>
        <Link href="/practice/production/read-and-speak" className="mt-4 inline-block text-ep-blue">
          Back to rounds
        </Link>
      </div>
    );
  }

  return <SpeakingReportView report={report} />;
}
