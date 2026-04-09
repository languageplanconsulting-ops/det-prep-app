import { redirect } from "next/navigation";
import { DICTATION_DIFFICULTIES } from "@/lib/dictation-constants";
import type { DictationDifficulty } from "@/types/dictation";

function isDifficulty(s: string): s is DictationDifficulty {
  return (DICTATION_DIFFICULTIES as readonly string[]).includes(s);
}

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function DictationLegacyRedirect({
  params,
}: {
  params: Promise<{ difficulty: string; setNumber: string }>;
}) {
  const { difficulty: dRaw, setNumber: sRaw } = await params;
  const difficulty = dRaw.toLowerCase();
  if (!isDifficulty(difficulty)) {
    redirect("/practice/literacy/dictation");
  }
  redirect(`/practice/literacy/dictation/round/1/${difficulty}/${sRaw}`);
}
