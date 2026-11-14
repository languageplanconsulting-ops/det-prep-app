import { useLocalSearchParams } from "expo-router";

import { ExamRunner } from "../../../components/mock/ExamRunner";

/** The 20-step mock exam (same session as the website — resumable from either). */
export default function MockRunScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ExamRunner kind="mock" sessionId={String(sessionId)} />;
}
