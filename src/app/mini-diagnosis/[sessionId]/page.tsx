import { AdminMiniDiagnosisSessionClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisSessionClient";
import { MiniDiagnosisSessionClient } from "@/components/mini-diagnosis/MiniDiagnosisSessionClient";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function MiniDiagnosisSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // Admin-only preview of the revamped test-taking screen. Real users keep the current one.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminMiniDiagnosisSessionClient sessionId={sessionId} />;
  }
  return <MiniDiagnosisSessionClient sessionId={sessionId} />;
}
