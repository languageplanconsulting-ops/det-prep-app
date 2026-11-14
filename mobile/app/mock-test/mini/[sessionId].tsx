import { useLocalSearchParams } from "expo-router";

import { ExamRunner } from "../../../components/mock/ExamRunner";

/** The 9-step mini diagnosis. */
export default function MiniRunScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ExamRunner kind="mini" sessionId={String(sessionId)} />;
}
