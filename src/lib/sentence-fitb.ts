/**
 * "Fill in the Blanks" — the SENTENCE version of the real DET (2024+ format), as observed on the
 * real practice test (Nov 2026): one sentence on screen, one word with its first letters shown and
 * one box per missing letter, 20 seconds per sentence, about 8 sentences in a row, no going back.
 *
 * Prefix rule measured on the real items (suddenly→sud, elimination→elim, weekend→wee, demand→dem,
 * recommend→reco, socializing→soci, near→ne, team→te, epic→ep): 2–3 letters show 1, 4 letters show
 * 2, 5–8 show 3, 9+ show 4. Each item stores its own `prefixLen` anyway.
 *
 * The bank is static (src/data/sentence-fitb/part-*.json, authored by hand, answers split by first
 * letter across four files so no word repeats). Exams are dealt deterministically so exam N is
 * always the same eight sentences, on web and in the app.
 *
 * Mobile keeps its own copy of the pure helpers in mobile/lib/sentence-fitb.ts.
 */
import part1 from "@/data/sentence-fitb/part-1.json";
import part2 from "@/data/sentence-fitb/part-2.json";
import part3 from "@/data/sentence-fitb/part-3.json";
import part4 from "@/data/sentence-fitb/part-4.json";

export type SfitbLevel = "A2" | "B1" | "B2" | "C1";

export type SfitbItem = {
  id: string;
  /** Contains the literal token `{blank}` once. */
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

export const SFITB_TASK_TYPE = "sentence_fitb";
export const SFITB_SECONDS_PER_ITEM = 20;
export const SFITB_ITEMS_PER_EXAM = 8;
export const SFITB_ROUNDS = [1] as const;
/** Score scale used across the app's literacy tasks. */
export const SFITB_MAX_SCORE = 160;

const LEVEL_RANK: Record<SfitbLevel, number> = { A2: 0, B1: 1, B2: 2, C1: 3 };

type RawItem = Omit<SfitbItem, "id">;

/** Small deterministic hash so the deal never changes between builds. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildExams(): SfitbExam[] {
  const raw: RawItem[] = [
    ...(part1 as RawItem[]),
    ...(part2 as RawItem[]),
    ...(part3 as RawItem[]),
    ...(part4 as RawItem[]),
  ].filter((x) => x && typeof x.sentence === "string" && x.sentence.includes("{blank}") && x.answer);

  const items: SfitbItem[] = raw.map((x) => ({ ...x, id: `sf-${x.answer.toLowerCase()}` }));
  // Easiest level first, shuffled inside each level, then dealt round-robin: every exam gets a
  // spread of levels and a mix of first letters.
  items.sort(
    (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || hash(a.id) - hash(b.id),
  );
  const examCount = Math.floor(items.length / SFITB_ITEMS_PER_EXAM);
  const exams: SfitbExam[] = Array.from({ length: examCount }, (_, i) => ({
    id: `sfitb-r1-e${i + 1}`,
    round: 1,
    exam: i + 1,
    items: [],
  }));
  items.slice(0, examCount * SFITB_ITEMS_PER_EXAM).forEach((item, k) => {
    exams[k % examCount]!.items.push(item);
  });
  // Within an exam, climb from easier to harder, the way an adaptive section feels.
  for (const e of exams) e.items.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  return exams;
}

let cache: SfitbExam[] | null = null;
export function sfitbExams(): SfitbExam[] {
  cache ??= buildExams();
  return cache;
}

export function sfitbExam(round: number, exam: number): SfitbExam | undefined {
  if (round !== 1) return undefined;
  return sfitbExams().find((e) => e.exam === exam);
}

export function sfitbPrefix(item: SfitbItem): string {
  return item.answer.slice(0, Math.max(0, Math.min(item.prefixLen, item.answer.length - 1)));
}

export function sfitbRemainderLength(item: SfitbItem): number {
  return item.answer.length - sfitbPrefix(item).length;
}

/** `typed` is only the letters after the prefix. Case-insensitive, exact spelling. */
export function sfitbIsCorrect(item: SfitbItem, typed: string): boolean {
  return (sfitbPrefix(item) + typed.trim()).toLowerCase() === item.answer.toLowerCase();
}

/** Right = 1 point, right after opening the hint = ½, wrong = 0; scaled to 160. */
export function sfitbScore(results: { correct: boolean; hintUsed: boolean }[]): number {
  if (!results.length) return 0;
  const pts = results.reduce((n, r) => n + (r.correct ? (r.hintUsed ? 0.5 : 1) : 0), 0);
  return Math.round((pts / results.length) * SFITB_MAX_SCORE);
}

export function sfitbContentKey(round: number, exam: number): string {
  return `sentence-fitb:r${round}:e${exam}`;
}
