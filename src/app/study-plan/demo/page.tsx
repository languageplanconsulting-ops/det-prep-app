import DiagnosticReportView from "@/components/study-plan/DiagnosticReportView";
import StudyPlanView from "@/components/study-plan/StudyPlanView";
import { sampleReport, samplePlan } from "@/lib/study-plan/sample";

export const dynamic = "force-dynamic";

// Dev/demo page: runs the real scoring engine on the canonical sample student
// and renders the report + plan exactly as they will appear in the app.
export default function StudyPlanDemoPage() {
  const report = sampleReport(120);
  const plan = samplePlan(true);
  return (
    <main style={{ minHeight: "100vh", background: "#eef2f7", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
      <DiagnosticReportView report={report} />
      <StudyPlanView plan={plan} freeUser={true} />
    </main>
  );
}
