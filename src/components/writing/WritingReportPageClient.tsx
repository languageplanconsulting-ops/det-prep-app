"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { WritingReportView } from "@/components/writing/WritingReportView";
import { takeReportHandoff } from "@/lib/grading-report-handoff";
import { loadWritingReport, saveWritingReport } from "@/lib/writing-storage";
import type { WritingAttemptReport } from "@/types/writing";

export function WritingReportPageClient({ attemptId }: { attemptId: string }) {
  const [report, setReport] = useState<WritingAttemptReport | null | undefined>(
    undefined,
  );

  useLayoutEffect(() => {
    let cancelled = false;

    const handoff = takeReportHandoff<WritingAttemptReport>(attemptId);
    if (handoff?.attemptId) {
      saveWritingReport(handoff);
      if (!cancelled) setReport(handoff);
      return;
    }

    const local = loadWritingReport(attemptId);
    if (local) {
      if (!cancelled) setReport(local);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`/api/writing-report/${attemptId}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setReport(null);
          return;
        }
        const serverReport = (await res.json()) as WritingAttemptReport;
        saveWritingReport(serverReport);
        if (!cancelled) setReport(serverReport);
      } catch {
        if (!cancelled) setReport(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <LuxuryLoader label="Assembling your writing report…" />
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Report not found.</p>
        <Link href="/practice/production/read-and-write" className="mt-4 inline-block text-ep-blue">
          Back to topics
        </Link>
      </div>
    );
  }

  return <WritingReportView report={report} />;
}
