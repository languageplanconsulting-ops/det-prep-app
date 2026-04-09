import { redirect } from "next/navigation";
import { parseSetNumberParam } from "@/lib/vocab-constants";

/** Legacy URL: redirects to round 1 (former flat hub). */
export default async function VocabLegacySetRedirect({
  params,
}: {
  params: Promise<{ setNumber: string }>;
}) {
  const { setNumber: sn } = await params;
  const setNumber = parseSetNumberParam(sn);
  if (setNumber === null) {
    redirect("/practice/comprehension/vocabulary");
  }
  redirect(`/practice/comprehension/vocabulary/round/1/${setNumber}`);
}
