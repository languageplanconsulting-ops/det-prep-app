import { AdminMiniDiagnosisResultsClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisResultsClient";

export default async function MiniDiagnosisResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <AdminMiniDiagnosisResultsClient sessionId={sessionId} />;
}
