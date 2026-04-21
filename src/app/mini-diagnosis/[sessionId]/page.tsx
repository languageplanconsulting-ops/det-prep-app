import { MiniDiagnosisSessionClient } from "@/components/mini-diagnosis/MiniDiagnosisSessionClient";

export default async function MiniDiagnosisSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <MiniDiagnosisSessionClient sessionId={sessionId} />;
}
