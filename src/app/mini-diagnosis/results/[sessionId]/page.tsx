import { AdminMiniDiagnosisResultsClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisResultsClient";
import { MiniDiagnosisResultsClient } from "@/components/mini-diagnosis/MiniDiagnosisResultsClient";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function MiniDiagnosisResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // Admin-only preview of the new results screen. Real users keep the current one.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminMiniDiagnosisResultsClient sessionId={sessionId} />;
  }
  return <MiniDiagnosisResultsClient sessionId={sessionId} />;
}
