import { redirect } from "next/navigation";

/** Old per-tier units ran the retired in-house format. Everything now runs the real DET task. */
export default function LegacyUnitPage() {
  redirect("/practice/lessons/reading-skills/find-info");
}
