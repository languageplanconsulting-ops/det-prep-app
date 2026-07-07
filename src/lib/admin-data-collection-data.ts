import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  DATA_COLLECTION_EXAM_LABELS,
  type DataCollectionExamType,
} from "@/lib/data-collection";

export type SubmissionRow = {
  id: string;
  examType: string;
  examLabel: string;
  userEmail: string | null;
  userName: string | null;
  attemptId: string | null;
  promptTitle: string | null;
  promptText: string | null;
  submittedText: string;
  wordCount: number | null;
  score160: number | null;
  report: Record<string, unknown>;
  createdAt: string;
};

export type DataCollectionSnapshot = {
  deployed: boolean;
  total: number;
  counts: Array<{ examType: string; examLabel: string; count: number }>;
  rows: SubmissionRow[];
};

const MAX_ROWS = 500;

type Raw = {
  id: string;
  exam_type: string;
  attempt_id: string | null;
  prompt_title: string | null;
  prompt_text: string | null;
  submitted_text: string | null;
  word_count: number | null;
  score160: number | null;
  report: Record<string, unknown> | null;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

export async function fetchDataCollectionData(
  examType?: string,
): Promise<DataCollectionSnapshot> {
  const supabase = createServiceRoleSupabase();

  let query = supabase
    .from("data_collection_submissions")
    .select(
      "id,exam_type,attempt_id,prompt_title,prompt_text,submitted_text,word_count,score160,report,created_at,profiles(email,full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (examType && examType !== "all") query = query.eq("exam_type", examType);

  const { data, error } = await query;

  if (error) {
    const notDeployed = /Could not find the table|does not exist|relation .* does not exist/i.test(
      error.message,
    );
    if (notDeployed) {
      return { deployed: false, total: 0, counts: [], rows: [] };
    }
    throw new Error(error.message);
  }

  const rows: SubmissionRow[] = (data ?? []).map((r) => {
    const raw = r as unknown as Raw;
    return {
      id: raw.id,
      examType: raw.exam_type,
      examLabel:
        DATA_COLLECTION_EXAM_LABELS[raw.exam_type as DataCollectionExamType] ?? raw.exam_type,
      userEmail: raw.profiles?.email ?? null,
      userName: raw.profiles?.full_name ?? null,
      attemptId: raw.attempt_id,
      promptTitle: raw.prompt_title,
      promptText: raw.prompt_text,
      submittedText: raw.submitted_text ?? "",
      wordCount: raw.word_count,
      score160: raw.score160,
      report: raw.report ?? {},
      createdAt: raw.created_at,
    };
  });

  // Per-exam counts come from a separate lightweight count query (not limited to MAX_ROWS).
  const counts: DataCollectionSnapshot["counts"] = [];
  let total = 0;
  for (const key of Object.keys(DATA_COLLECTION_EXAM_LABELS) as DataCollectionExamType[]) {
    const { count } = await supabase
      .from("data_collection_submissions")
      .select("id", { count: "exact", head: true })
      .eq("exam_type", key);
    const c = count ?? 0;
    total += c;
    counts.push({ examType: key, examLabel: DATA_COLLECTION_EXAM_LABELS[key], count: c });
  }

  return { deployed: true, total, counts, rows };
}
