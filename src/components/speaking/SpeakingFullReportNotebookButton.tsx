"use client";

import {
  buildSpeakingReportNotebookFullBodies,
  buildSpeakingReportNotebookPreview,
} from "@/lib/speaking-report-notebook";
import type { SpeakingAttemptReport } from "@/types/speaking";
import { FullReportNotebookButton } from "@/components/writing/FullReportNotebookButton";

export function SpeakingFullReportNotebookButton({ report }: { report: SpeakingAttemptReport }) {
  return (
    <FullReportNotebookButton
      attemptId={report.attemptId}
      entrySource="speaking-read-and-speak"
      build={() => {
        const preview = buildSpeakingReportNotebookPreview(report);
        const { fullBodyEn, fullBodyTh } = buildSpeakingReportNotebookFullBodies(report);
        return { ...preview, fullBodyEn, fullBodyTh };
      }}
    />
  );
}
