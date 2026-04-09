import { redirect } from "next/navigation";
import { parseSetNumberParam, parseVocabSessionParam } from "@/lib/vocab-constants";

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function VocabLegacySessionRedirect({
  params,
}: {
  params: Promise<{ setNumber: string; sessionLevel: string }>;
}) {
  const { setNumber: sn, sessionLevel: sl } = await params;
  const setNumber = parseSetNumberParam(sn);
  const sessionLevel = parseVocabSessionParam(sl);
  if (setNumber === null || !sessionLevel) {
    redirect("/practice/comprehension/vocabulary");
  }
  redirect(`/practice/comprehension/vocabulary/round/1/${setNumber}/${sessionLevel}`);
}
