import { redirect } from "next/navigation";
import { FITB_DIFFICULTIES } from "@/lib/fitb-constants";
import type { FitbDifficulty } from "@/types/fitb";

function isDifficulty(s: string): s is FitbDifficulty {
  return (FITB_DIFFICULTIES as readonly string[]).includes(s);
}

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function FillInBlankLegacyRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ difficulty: string; setNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { difficulty: dRaw, setNumber: sRaw } = await params;
  const sp = await searchParams;
  const redeem = sp.redeem;
  const difficulty = dRaw.toLowerCase();
  if (!isDifficulty(difficulty)) {
    redirect("/practice/literacy/fill-in-blank");
  }
  const q =
    redeem === "1" || redeem === "true" ? "?redeem=1" : "";
  redirect(`/practice/literacy/fill-in-blank/round/1/${difficulty}/${sRaw}${q}`);
}
