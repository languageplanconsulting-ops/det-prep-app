import { redirect } from "next/navigation";
import {
  parsePassageNumberParam,
  parseSetNumberParam,
  parseVocabSessionParam,
} from "@/lib/vocab-constants";

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function VocabLegacyExamRedirect({
  params,
}: {
  params: Promise<{ setNumber: string; sessionLevel: string; passageNumber: string }>;
}) {
  const { setNumber: sn, sessionLevel: sl, passageNumber: pn } = await params;
  const setNumber = parseSetNumberParam(sn);
  const sessionLevel = parseVocabSessionParam(sl);
  const passageNumber = parsePassageNumberParam(pn);
  if (setNumber === null || !sessionLevel || passageNumber === null) {
    redirect("/practice/comprehension/vocabulary");
  }
  redirect(
    `/practice/comprehension/vocabulary/round/1/${setNumber}/${sessionLevel}/${passageNumber}`,
  );
}
