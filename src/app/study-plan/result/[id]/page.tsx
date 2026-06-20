import DiagnosticReportView from "@/components/study-plan/DiagnosticReportView";
import StudyPlanView from "@/components/study-plan/StudyPlanView";
import type { Report } from "@/lib/study-plan/diagnostic";
import { generatePlan } from "@/lib/study-plan/plan";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans Thai', sans-serif", color: "#5b6472", padding: 24, textAlign: "center" }}>
      {children}
    </main>
  );
}

export default async function StudyPlanResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOptionalAuthUserId();
  if (!userId) return <Notice>กรุณาเข้าสู่ระบบเพื่อดูผลแบบทดสอบของคุณ</Notice>;

  const supabase = await createRouteHandlerSupabase();
  const { data: row } = await supabase.from("study_plan_results").select("report").eq("id", id).single();
  if (!row?.report) return <Notice>ไม่พบผลแบบทดสอบนี้</Notice>;

  const report = row.report as Report;
  const { data: prof } = await supabase.from("profiles").select("tier").eq("id", userId).single();
  const freeUser = ((prof?.tier as string | undefined) ?? "free") === "free";
  const plan = generatePlan(report, { freeUser });

  return (
    <main style={{ minHeight: "100vh", background: "#eef2f7", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
      <DiagnosticReportView report={report} />
      <StudyPlanView plan={plan} />
    </main>
  );
}
