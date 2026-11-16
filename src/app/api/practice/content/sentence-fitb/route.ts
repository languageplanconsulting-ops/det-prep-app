import { NextResponse } from "next/server";

import { SFITB_ITEMS_PER_EXAM, sfitbExam, sfitbExams } from "@/lib/sentence-fitb";
import { getRequestAuthUser } from "@/lib/supabase-request-client";

/**
 * Sentence "Fill in the Blanks" for the mobile app. `?round=1&exam=N` returns one exam;
 * no `exam` returns the exam list for the round. Accepts the web cookie session or a Bearer token.
 */
export async function GET(request: Request) {
  const { user } = await getRequestAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const round = Number(url.searchParams.get("round") ?? 1);
  const examRaw = url.searchParams.get("exam");

  if (examRaw) {
    const exam = sfitbExam(round, Number(examRaw));
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    return NextResponse.json({ exam });
  }
  const exams = round === 1 ? sfitbExams() : [];
  return NextResponse.json({
    round,
    itemsPerExam: SFITB_ITEMS_PER_EXAM,
    exams: exams.map((e) => ({ exam: e.exam, id: e.id, levels: e.items.map((i) => i.level) })),
  });
}
