import { redirect } from "next/navigation";
import { READING_DIFFICULTIES } from "@/lib/reading-constants";
import type { ReadingDifficulty } from "@/types/reading";

function isDifficulty(s: string): s is ReadingDifficulty {
  return (READING_DIFFICULTIES as readonly string[]).includes(s);
}

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function ReadingLegacySetRedirect({
  params,
}: {
  params: Promise<{ difficulty: string; setNumber: string }>;
}) {
  const { difficulty: dRaw, setNumber: sRaw } = await params;
  const difficulty = dRaw.toLowerCase();
  if (!isDifficulty(difficulty)) {
    redirect("/practice/comprehension/reading");
  }
  redirect(`/practice/comprehension/reading/round/1/${difficulty}/${sRaw}`);
}
