/**
 * Sentence "Fill in the Blanks" (real DET 2024+ format): one sentence at a time, first letters
 * shown, 20 s each. Content comes from /api/practice/content/sentence-fitb; the pure helpers mirror
 * src/lib/sentence-fitb.ts so scores match the website.
 */
import { apiFetch, authHeaders } from "./api";
import { API_BASE_URL } from "./config";

export type SfitbLevel = "A2" | "B1" | "B2" | "C1";
export type SfitbItem = {
  id: string;
  sentence: string;
  answer: string;
  prefixLen: number;
  level: SfitbLevel;
  pos: string;
  meaningTh: string;
  hintTh: string;
  explanationTh: string;
};
export type SfitbExam = { id: string; round: number; exam: number; items: SfitbItem[] };
export type SfitbExamSummary = { exam: number; id: string; levels: SfitbLevel[] };

export const SFITB_TASK_TYPE = "sentence_fitb";
export const SFITB_SECONDS_PER_ITEM = 20;
export const SFITB_MAX_SCORE = 160;

export function sfitbPrefix(item: SfitbItem): string {
  return item.answer.slice(0, Math.max(0, Math.min(item.prefixLen, item.answer.length - 1)));
}
export function sfitbRemainderLength(item: SfitbItem): number {
  return item.answer.length - sfitbPrefix(item).length;
}
export function sfitbIsCorrect(item: SfitbItem, typed: string): boolean {
  return (sfitbPrefix(item) + typed.trim()).toLowerCase() === item.answer.toLowerCase();
}
/** Right = 1, right after opening the hint = ½, wrong = 0; scaled to 160. */
export function sfitbScore(results: { correct: boolean; hintUsed: boolean }[]): number {
  if (!results.length) return 0;
  const pts = results.reduce((n, r) => n + (r.correct ? (r.hintUsed ? 0.5 : 1) : 0), 0);
  return Math.round((pts / results.length) * SFITB_MAX_SCORE);
}
export function sfitbContentKey(round: number, exam: number): string {
  return `sentence-fitb:r${round}:e${exam}`;
}

export async function fetchSfitbExams(round: number): Promise<SfitbExamSummary[]> {
  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/sentence-fitb?round=${round}`, {
    headers: await authHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as { exams?: SfitbExamSummary[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? `Could not load exams (${res.status})`);
  return data.exams ?? [];
}

export async function fetchSfitbExam(round: number, exam: number): Promise<SfitbExam> {
  const res = await apiFetch(`${API_BASE_URL}/api/practice/content/sentence-fitb?round=${round}&exam=${exam}`, {
    headers: await authHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as { exam?: SfitbExam; error?: string };
  if (!res.ok || !data.exam) throw new Error(data.error ?? `Could not load the exam (${res.status})`);
  return data.exam;
}
