"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { InteractiveSpeakingReportView } from "@/components/interactive-speaking/InteractiveSpeakingReportView";
import { takeReportHandoff } from "@/lib/grading-report-handoff";
import {
  loadInteractiveSpeakingReport,
  saveInteractiveSpeakingReport,
} from "@/lib/interactive-speaking-storage";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";

export function InteractiveSpeakingReportPageClient({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<InteractiveSpeakingAttemptReport | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    const handoff = takeReportHandoff<InteractiveSpeakingAttemptReport>(attemptId);
    if (handoff?.attemptId && handoff.kind === "interactive-speaking") {
      saveInteractiveSpeakingReport(handoff);
      setReport(handoff);
      return;
    }
    setReport(loadInteractiveSpeakingReport(attemptId));
  }, [attemptId]);

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <LuxuryLoader label="Loading your interactive speaking report…" />
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Report not found.</p>
        <Link href="/practice/production/interactive-speaking" className="mt-4 inline-block text-ep-blue">
          Back to scenarios
        </Link>
      </div>
    );
  }

  return <InteractiveSpeakingReportView report={report} />;
}
