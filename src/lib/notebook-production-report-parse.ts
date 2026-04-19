/**
 * Parse `fullBodyEn` / `fullBodyTh` from {@link buildSpeakingReportNotebookFullBodies}
 * and {@link buildWritingReportNotebookFullBodies} into structured data for rich notebook UI.
 */

export type NotebookProductionKind = "speaking" | "writing";

export type ParsedCorrection = {
  before: string;
  after: string;
  explanation: string;
};

export type ParsedCriterion = {
  key: string;
  name: string;
  scorePercent: number;
  pointsOn160: string;
  summaryEn: string;
  summaryTh: string;
  corrections: ParsedCorrection[];
};

export type ParsedVocabUpgrade = {
  original: string;
  upgraded: string;
  meaningTh: string;
  exampleEn: string;
};

export type NotebookProductionParsedReport = {
  kind: NotebookProductionKind;
  topicEn: string;
  topicTh: string;
  questionEn: string;
  questionTh: string;
  score160: number;
  wordCount: number;
  prepMinutes: number;
  submittedAt: string | null;
  submissionEn: string;
  /** Extra blocks (writing follow-ups, study pack) shown below main template. */
  tailEn: string;
  criteria: ParsedCriterion[];
  vocabUpgrades: ParsedVocabUpgrade[];
  takeawaysEn: string[];
  takeawaysTh: string[];
};

function levelFromPct(pct: number): "high" | "mid" | "low" {
  if (pct >= 85) return "high";
  if (pct >= 68) return "mid";
  return "low";
}

export { levelFromPct };

function stripBullet(line: string): string {
  return line.replace(/^\s*[•\-*]\s+/, "").trim();
}

function parseScoreLine(
  en: string,
): Pick<NotebookProductionParsedReport, "score160" | "wordCount" | "prepMinutes"> | null {
  const m = en.match(/Score:\s*(\d+)\s*\/\s*160\s*·\s*(\d+)\s*words\s*·\s*prep\s*(\d+)\s*min/i);
  if (!m) return null;
  return {
    score160: Number(m[1]),
    wordCount: Number(m[2]),
    prepMinutes: Number(m[3]),
  };
}

function parseSubmitted(en: string): string | null {
  const m = en.match(/^Submitted:\s*(.+)$/m);
  return m ? m[1]!.trim() : null;
}

function parseTopicLine(en: string): string {
  const m = en.match(/^Topic:\s*(.+)$/m);
  return m ? m[1]!.trim() : "";
}

function parseQuestionLine(en: string): string {
  const m = en.match(/^Question:\s*(.+)$/m);
  return m ? m[1]!.trim() : "";
}

function parseTopicTh(th: string): string {
  const m = th.match(/^หัวข้อ:\s*(.+)$/m);
  return m ? m[1]!.trim() : "";
}

function parseQuestionTh(th: string): string {
  const m = th.match(/^คำถาม:\s*(.+)$/m);
  return m ? m[1]!.trim() : "";
}

function extractSubmissionEn(en: string, kind: NotebookProductionKind): { submission: string; restAfter: string } {
  const speakMark = "=== Your submission (punctuated for grading) ===";
  const writeMark = "=== Main answer (punctuated for grading) ===";
  const mark = kind === "speaking" ? speakMark : writeMark;
  const idx = en.indexOf(mark);
  if (idx === -1) return { submission: "", restAfter: en };
  const after = en.slice(idx + mark.length).replace(/^\s*\n/, "");
  const next = after.search(/\n===|\n---\s*(Grammar|Vocabulary|Coherence|Task relevancy)\b/);
  if (next === -1) return { submission: after.trim(), restAfter: "" };
  return {
    submission: after.slice(0, next).trim(),
    restAfter: after.slice(next),
  };
}

function parseCriterionCorrections(bodyText: string): ParsedCorrection[] {
  const lines = bodyText.split(/\r?\n/).map((l) => l.trimEnd());
  const corrections: ParsedCorrection[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line.startsWith("•")) {
      i += 1;
      continue;
    }
    const explanation = stripBullet(line);
    let excerpt = "";
    let after = "";
    i += 1;
    while (i < lines.length) {
      const L = lines[i]!.trim();
      if (L.startsWith("•")) break;
      const q = L.match(/^["“](.+)["”]$/);
      if (q) excerpt = q[1]!.trim();
      const arr = L.match(/^→\s*(.+)$/);
      if (arr) after = arr[1]!.trim();
      i += 1;
    }
    const before = excerpt || explanation.slice(0, 160);
    corrections.push({
      before,
      after: after || "—",
      explanation,
    });
  }
  return corrections;
}

function parseCriteriaFromEn(rest: string): ParsedCriterion[] {
  const segments = rest.split(/\n---\s*/);
  const out: ParsedCriterion[] = [];
  for (const seg of segments) {
    if (!seg.trim()) continue;
    const m = seg.match(
      /^(Grammar|Vocabulary|Coherence|Task relevancy)\s*\((\d+)%[^)]*\)\s*—\s*≈\s*(\d+)\/160\s*---\s*\n([\s\S]*)$/i,
    );
    if (!m) continue;
    const name = m[1]!;
    const scorePercent = Number(m[2]);
    const pointsOn160 = `${m[3]}/160`;
    const body = (m[4] ?? "").trim();
    const lines = body.split(/\r?\n/);
    const summaryEn = (lines[0] ?? "").trim();
    const restBody = lines.slice(1).join("\n").trim();
    const corrections = parseCriterionCorrections(restBody);
    out.push({
      key: name,
      name,
      scorePercent: Number.isFinite(scorePercent) ? scorePercent : 0,
      pointsOn160,
      summaryEn,
      summaryTh: "",
      corrections,
    });
  }
  return out;
}

function injectThSummaries(criteria: ParsedCriterion[], th: string): void {
  const segments = th.split(/\n---\s*/);
  for (const seg of segments) {
    const m = seg.match(
      /^(Grammar|Vocabulary|Coherence|Task relevancy)\s*\((\d+)%[^)]*\)\s*—\s*≈\s*\d+\/160\s*---\s*\n([\s\S]*)$/i,
    );
    if (!m) continue;
    const name = m[1]!;
    const body = (m[3] ?? "").trim();
    const firstLine = body.split(/\r?\n/).map((l) => l.trim())[0] ?? "";
    const summaryTh = firstLine.startsWith("•") ? "" : firstLine;
    const c = criteria.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (c) c.summaryTh = summaryTh.trim();
  }
}

function parseVocabUpgrades(en: string): ParsedVocabUpgrade[] {
  const mark = "=== Vocabulary upgrades ===";
  const idx = en.indexOf(mark);
  if (idx === -1) return [];
  const chunk = en.slice(idx + mark.length).replace(/^\s*\n/, "");
  const end = chunk.search(/\n===/);
  const body = (end === -1 ? chunk : chunk.slice(0, end)).trim();
  const out: ParsedVocabUpgrade[] = [];
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("•")) continue;
    const inner = stripBullet(t);
    const [main, exPart] = inner.split(/\s*\|\s*e\.g\.\s*/i);
    const m = main.match(/^(.+?)\s*→\s*(.+?):\s*(.+)$/);
    if (!m) continue;
    out.push({
      original: m[1]!.trim(),
      upgraded: m[2]!.trim(),
      meaningTh: m[3]!.trim(),
      exampleEn: (exPart ?? "").trim(),
    });
  }
  return out;
}

function parseTakeaways(en: string, th: string): { en: string[]; th: string[] } {
  const enMark = "=== Key learning ===";
  const thMark = "=== สิ่งที่ได้เรียนรู้ ===";
  const sliceBullets = (text: string, mark: string): string[] => {
    const idx = text.indexOf(mark);
    if (idx === -1) return [];
    const chunk = text.slice(idx + mark.length).replace(/^\s*\n/, "");
    const end = chunk.search(/\n===/);
    const body = (end === -1 ? chunk : chunk.slice(0, end)).trim();
    return body
      .split(/\r?\n/)
      .map((l) => stripBullet(l.trim()))
      .filter((l) => l.length > 0);
  };
  return {
    en: sliceBullets(en, enMark),
    th: sliceBullets(th, thMark),
  };
}

function tailAfterSubmission(en: string, kind: NotebookProductionKind): string {
  const { restAfter } = extractSubmissionEn(en, kind);
  if (!restAfter) return "";
  const cut = restAfter.search(/\n---\s*Grammar\b/i);
  if (cut === -1) return restAfter.trim();
  const beforeGrammar = restAfter.slice(0, cut).trim();
  return beforeGrammar;
}

export function tryParseNotebookProductionReport(args: {
  fullBodyEn: string;
  fullBodyTh: string;
  source: "writing-read-and-write" | "speaking-read-and-speak" | string;
}): NotebookProductionParsedReport | null {
  const { fullBodyEn, fullBodyTh, source } = args;
  if (source !== "writing-read-and-write" && source !== "speaking-read-and-speak") return null;
  const en = fullBodyEn.trim();
  if (!en) return null;

  const kind: NotebookProductionKind | null = en.includes("READ, THEN SPEAK")
    ? "speaking"
    : en.includes("READ, THEN WRITE")
      ? "writing"
      : null;
  if (!kind) return null;

  const score = parseScoreLine(en);
  if (!score) return null;

  const { submission, restAfter } = extractSubmissionEn(en, kind);
  const criteria = parseCriteriaFromEn(restAfter);
  if (criteria.length === 0) return null;

  injectThSummaries(criteria, fullBodyTh.trim());

  const tailEn = tailAfterSubmission(en, kind);
  const vocabUpgrades = kind === "speaking" ? parseVocabUpgrades(en) : [];
  const { en: takeawaysEn, th: takeawaysTh } = parseTakeaways(en, fullBodyTh.trim());

  return {
    kind,
    topicEn: parseTopicLine(en),
    topicTh: parseTopicTh(fullBodyTh.trim()),
    questionEn: kind === "speaking" ? parseQuestionLine(en) : "",
    questionTh: kind === "speaking" ? parseQuestionTh(fullBodyTh.trim()) : "",
    ...score,
    submittedAt: parseSubmitted(en),
    submissionEn: submission,
    tailEn,
    criteria,
    vocabUpgrades,
    takeawaysEn,
    takeawaysTh,
  };
}
