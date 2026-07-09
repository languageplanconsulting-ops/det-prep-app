"use client";

import { WritingReportView } from "@/components/writing/WritingReportView";
import { SpeakingReportView } from "@/components/speaking/SpeakingReportView";
import { PhotoSpeakReportView } from "@/components/photo-speak/PhotoSpeakReportView";
import { InteractiveSpeakingReportView } from "@/components/interactive-speaking/InteractiveSpeakingReportView";
import { DialogueSummaryReportView } from "@/components/dialogue-summary/DialogueSummaryReportView";
import type { WritingAttemptReport } from "@/types/writing";
import type { SpeakingAttemptReport } from "@/types/speaking";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";
import type { DialogueSummaryAttemptReport } from "@/types/dialogue-summary";

/**
 * Renders a saved report JSON with the SAME component the learner sees on
 * their own report screen, instead of an admin-only text/JSON dump — so
 * admins reviewing a client's submission see the real, full display.
 *
 * "speaking_partner" has no web report component (that feature is
 * mobile-only) so it falls through to the raw-JSON view.
 */
export function AdminReportPreview({
  examType,
  report,
}: {
  examType: string;
  report: Record<string, unknown>;
}) {
  switch (examType) {
    case "read_then_write":
      return <WritingReportView report={report as unknown as WritingAttemptReport} />;
    case "read_then_speak":
      return <SpeakingReportView report={report as unknown as SpeakingAttemptReport} />;
    case "write_about_photo":
    case "speak_about_photo":
      return <PhotoSpeakReportView report={report as unknown as PhotoSpeakAttemptReport} />;
    case "interactive_speaking":
      return (
        <InteractiveSpeakingReportView
          report={report as unknown as InteractiveSpeakingAttemptReport}
        />
      );
    case "dialogue_summary":
      return (
        <DialogueSummaryReportView
          report={report as unknown as DialogueSummaryAttemptReport}
          listHref="/admin/data-collection"
          roundHref="/admin/data-collection"
        />
      );
    default:
      return (
        <pre className="overflow-x-auto rounded-lg border border-slate-200 p-3 text-[11px] leading-relaxed text-slate-600">
          {JSON.stringify(report, null, 2)}
        </pre>
      );
  }
}
