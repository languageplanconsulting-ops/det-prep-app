import { AdminMiniDiagnosisStartClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisStartClient";
import { MiniDiagnosisStartClient } from "@/components/mini-diagnosis/MiniDiagnosisStartClient";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function MiniDiagnosisStartPage() {
  // Admin-only preview of the new "Show the value" flow. Real users keep the
  // current screen until it's approved.
  const adminAccess = await getAdminAccess();
  if (adminAccess.ok) {
    return <AdminMiniDiagnosisStartClient />;
  }
  return <MiniDiagnosisStartClient />;
}
