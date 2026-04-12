"use client";

import {
  buildInteractiveSpeakingReportNotebookFullBodies,
  buildInteractiveSpeakingReportNotebookPreview,
} from "@/lib/interactive-speaking-report-notebook";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";

export function InteractiveSpeakingFullReportNotebookButton({
  report,
}: {
  report: InteractiveSpeakingAttemptReport;
}) {
  return (
    <FullReportNotebookButton
      attemptId={report.attemptId}
      entrySource="interactive-speaking"
      build={() => {
        const preview = buildInteractiveSpeakingReportNotebookPreview(report);
        const { fullBodyEn, fullBodyTh } = buildInteractiveSpeakingReportNotebookFullBodies(report);
        return { ...preview, fullBodyEn, fullBodyTh };
      }}
    />
  );
}
