/**
 * Pronunciation matching for the speak lessons — ported from
 * det-mobile/src/lib/readspeak.ts. Order-preserving word match (LCS),
 * robust to extra/missing words in the transcript. Punctuation/case ignored.
 *
 * On top of the raw LCS score it flags DROPPED INFLECTIONAL ENDINGS: a target
 * word like "deserves" / "matches" / "deserved" that the learner said WITHOUT
 * its -s / -es / -ed ending (i.e. they spoke the bare stem "deserve" / "match").
 * These are treated as must-fix: the item cannot pass while any ending is
 * dropped, so learners are forced to pronounce the ending and try again.
 */

export const PRONUNCIATION_PASS = 95;

export function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function lcsMatchedTargetIndices(target: string[], spoken: string[]): Set<number> {
  const n = target.length;
  const m = spoken.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j] = target[i - 1] === spoken[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const matched = new Set<number>();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (target[i - 1] === spoken[j - 1]) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }
  return matched;
}

/** Which inflectional ending was dropped, for the learner-facing message. */
export type EndingKind = "s" | "es" | "ed";

export type EndingIssue = {
  /** Index into `words` of the target word whose ending was dropped. */
  idx: number;
  /** The full target word, e.g. "deserves". */
  word: string;
  /** The bare stem the learner actually said, e.g. "deserve". */
  heard: string;
  kind: EndingKind;
};

/**
 * A tiny stoplist of words that END in s/es/ed but are NOT inflections, so we never
 * nag about them. (The stem-must-appear-in-the-transcript rule below already makes
 * false positives nearly impossible, but this documents intent and adds belt-and-braces.)
 */
const NON_INFLECTION = new Set([
  "is", "was", "has", "this", "his", "us", "thus", "as", "does", "goes", "yes", "its",
  "class", "glass", "grass", "pass", "mass", "boss", "loss", "cross", "across", "miss",
  "kiss", "less", "unless", "press", "dress", "stress", "address", "success", "process",
  "business", "always", "perhaps", "towards", "series", "species",
  "red", "bed", "wed", "fed", "led", "bred", "sled", "fled", "shed", "bled", "sped",
]);

/**
 * If target word `t` is an -s/-es/-ed inflected form AND one of the spoken tokens is its
 * ending-dropped stem, return that stem + which ending was dropped. Otherwise null.
 *
 * Works by reconstructing the stem candidates the learner would produce by dropping the
 * inflection, then checking whether any of them was literally spoken — this is high-
 * confidence evidence of "said 'deserve' where the answer was 'deserves'" rather than a
 * word that was merely missed/mumbled.
 */
function droppedEnding(t: string, spoken: Set<string>): { heard: string; kind: EndingKind } | null {
  if (t.length < 3 || NON_INFLECTION.has(t)) return null;
  const cands: { stem: string; kind: EndingKind }[] = [];
  if (t.endsWith("s") && !t.endsWith("ss")) {
    cands.push({ stem: t.slice(0, -1), kind: "s" }); // deserves→deserve, runs→run, needs→need
    if (t.endsWith("es")) cands.push({ stem: t.slice(0, -2), kind: "es" }); // matches→match, boxes→box
    if (t.endsWith("ies")) cands.push({ stem: `${t.slice(0, -3)}y`, kind: "es" }); // tries→try
  }
  if (t.endsWith("ed") && !t.endsWith("eed")) {
    cands.push({ stem: t.slice(0, -1), kind: "ed" }); // deserved→deserve, used→use
    cands.push({ stem: t.slice(0, -2), kind: "ed" }); // matched→match, wanted→want
    if (t.endsWith("ied")) cands.push({ stem: `${t.slice(0, -3)}y`, kind: "ed" }); // tried→try
    const dd = t.slice(0, -2); // doubled-consonant past: stopped→stop
    if (dd.length >= 2 && dd[dd.length - 1] === dd[dd.length - 2]) {
      cands.push({ stem: dd.slice(0, -1), kind: "ed" });
    }
  }
  for (const c of cands) {
    if (c.stem.length >= 2 && spoken.has(c.stem)) return { heard: c.stem, kind: c.kind };
  }
  return null;
}

export type PronunciationResult = {
  pct: number;
  words: string[];
  missedIdx: number[];
  /** Target words whose -s/-es/-ed ending the learner dropped (must be redone). */
  endingIssues: EndingIssue[];
};

/** Score a spoken transcript against the target answer (0–100, punctuation ignored). */
export function pronunciationScore(target: string, spoken: string): PronunciationResult {
  const words = normalizeWords(target);
  const sp = normalizeWords(spoken);
  if (words.length === 0) return { pct: 0, words, missedIdx: [], endingIssues: [] };
  const matched = lcsMatchedTargetIndices(words, sp);
  const pct = Math.round((matched.size / words.length) * 100);
  const missedIdx = words.map((_, i) => i).filter((i) => !matched.has(i));

  const spokenSet = new Set(sp);
  const endingIssues: EndingIssue[] = [];
  for (const i of missedIdx) {
    const t = words[i]!;
    const info = droppedEnding(t, spokenSet);
    if (info) endingIssues.push({ idx: i, word: t, heard: info.heard, kind: info.kind });
  }
  return { pct, words, missedIdx, endingIssues };
}

/**
 * The single source of truth for "did this take pass?": at least PRONUNCIATION_PASS%
 * of words matched AND no inflectional ending was dropped. The ending rule is a hard
 * gate — a single dropped -s/-ed fails the take even at 95%+, so these endings are
 * genuinely tested rather than averaged away.
 */
export function pronunciationPassed(r: PronunciationResult): boolean {
  return r.pct >= PRONUNCIATION_PASS && r.endingIssues.length === 0;
}

/** Thai hint for a dropped ending, e.g. « ออกเสียง “s” ท้ายคำ “deserves” ให้ชัด ». */
export function endingIssueHintTh(issue: EndingIssue): string {
  const soundLabel = issue.kind === "ed" ? "-ed" : `-${issue.kind}`;
  return `ออกเสียง “${soundLabel}” ท้ายคำ “${issue.word}” ให้ชัด (ได้ยินว่า “${issue.heard}”)`;
}
