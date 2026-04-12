"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { InteractiveSpeakingSession } from "@/components/interactive-speaking/InteractiveSpeakingSession";
import { getInteractiveSpeakingScenarioById } from "@/lib/interactive-speaking-storage";

export default function InteractiveSpeakingScenarioPage() {
  const params = useParams();
  const scenarioId = typeof params?.scenarioId === "string" ? params.scenarioId : "";
  const scenario = scenarioId ? getInteractiveSpeakingScenarioById(scenarioId) : undefined;

  if (!scenarioId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Invalid link.</p>
        <Link href="/practice/production/interactive-speaking" className="mt-4 inline-block text-ep-blue">
          Back to list
        </Link>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-bold">Scenario not found.</p>
        <Link href="/practice/production/interactive-speaking" className="mt-4 inline-block text-ep-blue">
          Back to list
        </Link>
      </div>
    );
  }

  return <InteractiveSpeakingSession scenario={scenario} />;
}
