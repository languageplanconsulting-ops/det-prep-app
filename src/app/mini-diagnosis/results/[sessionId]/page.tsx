import { MiniDiagnosisResultsClient } from "@/components/mini-diagnosis/MiniDiagnosisResultsClient";

export default async function MiniDiagnosisResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MiniDiagnosisResultsClient sessionId={sessionId} />;
}
