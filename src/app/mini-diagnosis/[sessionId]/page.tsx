import { AdminMiniDiagnosisSessionClient } from "@/components/mini-diagnosis/AdminMiniDiagnosisSessionClient";

export default async function MiniDiagnosisSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <AdminMiniDiagnosisSessionClient sessionId={sessionId} />;
}
