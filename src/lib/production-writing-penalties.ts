type Issue = {
  excerpt: string;
  reasonEn: string;
  reasonTh: string;
  suggestionEn?: string;
  suggestionTh?: string;
};

const COMMA_SPLICE_RIGHT_START =
  /^(?:I|he|she|it|they|we|this|that|there|these|those)\b/i;

const INTRODUCTORY_PHRASE_START =
  /^(?:judging|looking|based|considering|speaking|compared|to me|to be honest|in my opinion|in my view|for example|for instance|as a result|after|before|when|while|if|because|although|since)\b/i;

const LIKELY_SUBJECT_START =
  /^(?:I|he|she|it|they|we|this|that|there|these|those|the\s+\w+|a\s+\w+|an\s+\w+|[A-Z][a-z]+)\b/;

const LIKELY_FINITE_VERB =
  /\b(?:am|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b|\b\w+(?:ed|s)\b/i;

const PASSIVE_VOICE_PATTERN =
  /\b(?:am|is|are|was|were|be|been|being|get|gets|got)\s+(?:not\s+)?(?:\w+ly\s+)?(?:\w+(?:ed|en)|known|seen|shown|made|built|found|given|taken|written|driven|spoken|born|caught|held|left|lost|paid|put|read|said|sold|sent|told|won)\b/i;

const SUBORDINATING_CONJUNCTION_PATTERN =
  /\b(?:although|though|because|since|while|when|after|before|if|unless|whereas|once|until|even though|so that|as long as|provided that)\b/i;

const RELATIVE_CLAUSE_PATTERN =
  /(?:,\s*|\b)(?:which|who|whom|whose|that|where|when)\s+[A-Za-z]/i;

const ING_CLAUSE_PATTERN =
  /(?:^|[.!?]\s+|,\s+)[A-Za-z]+ing\b/i;

function clipExcerpt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 18);
  const end = Math.min(text.length, index + length + 18);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function collectMatches(
  text: string,
  regex: RegExp,
  reasonEn: string,
  reasonTh: string,
  limit = 4,
): Issue[] {
  const issues: Issue[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null && issues.length < limit) {
    issues.push({
      excerpt: clipExcerpt(text, match.index, match[0].length),
      reasonEn,
      reasonTh,
    });
  }
  return issues;
}

function firstUsefulExcerpt(text: string): string {
  const source = String(text ?? "").trim();
  if (!source) return "";
  const firstSentence = source.split(/[.!?]/, 1)[0]?.trim() ?? "";
  const excerpt = firstSentence || source;
  return excerpt.length > 70 ? `${excerpt.slice(0, 67).trim()}...` : excerpt;
}

function hasPassiveVoice(text: string): boolean {
  return PASSIVE_VOICE_PATTERN.test(text);
}

function hasComplexStructure(text: string): boolean {
  return (
    text.includes(",") ||
    SUBORDINATING_CONJUNCTION_PATTERN.test(text) ||
    RELATIVE_CLAUSE_PATTERN.test(text) ||
    ING_CLAUSE_PATTERN.test(text)
  );
}

function detectCommaSpliceIssues(text: string): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < text.length && issues.length < 2; i += 1) {
    if (text[i] !== ",") continue;

    const leftBoundary = Math.max(text.lastIndexOf(".", i), text.lastIndexOf("!", i), text.lastIndexOf("?", i));
    const rightBoundaryCandidates = [text.indexOf(".", i), text.indexOf("!", i), text.indexOf("?", i)].filter((x) => x >= 0);
    const rightBoundary = rightBoundaryCandidates.length > 0 ? Math.min(...rightBoundaryCandidates) : text.length;

    const left = text.slice(leftBoundary + 1, i).trim();
    const right = text.slice(i + 1, rightBoundary).trim();

    if (left.length < 8 || right.length < 6) continue;
    if (INTRODUCTORY_PHRASE_START.test(left)) continue;
    if (!COMMA_SPLICE_RIGHT_START.test(right)) continue;
    if (!LIKELY_SUBJECT_START.test(left)) continue;
    if (!LIKELY_FINITE_VERB.test(left)) continue;

    issues.push({
      excerpt: clipExcerpt(text, i, 1),
      reasonEn: "This comma likely joins two full clauses incorrectly.",
      reasonTh: "คอมมานี้น่าจะเชื่อมสองประโยคเต็มแบบผิด",
    });
  }
  return issues;
}

export function detectGrammarPunctuationIssues(text: string): Issue[] {
  const source = String(text ?? "");
  if (!source.trim()) return [];

  const issues: Issue[] = [];

  issues.push(
    ...collectMatches(
      source,
      /\s+[,.!?;:]/g,
      "Remove the space before punctuation marks.",
      "ลบช่องว่างที่อยู่หน้าวรรคตอน",
      3,
    ),
  );

  issues.push(
    ...collectMatches(
      source,
      /[,.!?;:](?=[A-Za-z])/g,
      "Add a space after punctuation marks.",
      "เพิ่มช่องว่างหลังวรรคตอน",
      3,
    ),
  );

  issues.push(
    ...collectMatches(
      source,
      /([,.!?;:])\1+/g,
      "Avoid repeated punctuation marks.",
      "อย่าใช้วรรคตอนซ้ำติดกัน",
      2,
    ),
  );

  issues.push(
    ...detectCommaSpliceIssues(source),
  );

  return issues.slice(0, 4);
}

export function grammarPunctuationPenaltyPercent(text: string): number {
  return Math.min(25, detectGrammarPunctuationIssues(text).length * 10);
}

export function detectGrammarStructureIssues(text: string): Issue[] {
  const source = String(text ?? "");
  if (!source.trim()) return [];

  const issues: Issue[] = [];
  const excerpt = firstUsefulExcerpt(source);

  if (!hasPassiveVoice(source)) {
    issues.push({
      excerpt,
      reasonEn: "Grammar -10%: no passive voice appears in this answer.",
      reasonTh: "หักคะแนน grammar -10% เพราะคำตอบนี้ไม่มี passive voice",
      suggestionEn: "Add one natural passive pattern such as “is being built”, “was made”, or “is surrounded by” if it fits the task.",
      suggestionTh: "ลองเพิ่ม passive voice แบบธรรมชาติ 1 จุด เช่น is being built, was made หรือ is surrounded by ถ้าเข้ากับโจทย์",
    });
  }

  if (!hasComplexStructure(source)) {
    issues.push({
      excerpt,
      reasonEn:
        "Grammar -10%: no complex sentence pattern appears here (for example: subordinator, relative clause, -ing opener, or comma-based structure).",
      reasonTh:
        "หักคะแนน grammar -10% เพราะคำตอบนี้ยังไม่มีโครงสร้างประโยคซับซ้อน เช่น although/because, which/who/where, V-ing หรือประโยคที่มี comma",
      suggestionEn:
        "Try one longer sentence with a connector like because/although, a relative clause like which/who, or an -ing opener.",
      suggestionTh:
        "ลองเพิ่มประโยคที่ยาวขึ้นอีก 1 ประโยค โดยใช้ because/although, which/who หรือเปิดด้วย V-ing",
    });
  }

  return issues;
}

export function grammarStructurePenaltyPercent(text: string): number {
  return detectGrammarStructureIssues(text).length * 10;
}

export function detectTransitionMisuseIssues(text: string): Issue[] {
  const source = String(text ?? "");
  if (!source.trim()) return [];

  const issues: Issue[] = [];

  issues.push(
    ...collectMatches(
      source,
      /(?:^|[.!?]\s+)(?:However|Therefore|Moreover|Furthermore|Nevertheless|Consequently|Meanwhile|For example|For instance|In addition|As a result|On the other hand)\b(?!,)/gm,
      "This transition word is used without the punctuation it needs.",
      "คำเชื่อมนี้ใช้โดยไม่มีวรรคตอนที่ควรมี",
      2,
    ),
  );

  issues.push(
    ...collectMatches(
      source,
      /\b(?:however|therefore|moreover|furthermore|nevertheless|consequently|meanwhile)\b(?!,)/gi,
      "Check whether this transition word is linking ideas correctly.",
      "เช็กว่าคำเชื่อมนี้เชื่อมความคิดได้ถูกหรือยัง",
      2,
    ),
  );

  const deduped: Issue[] = [];
  for (const issue of issues) {
    if (!deduped.some((x) => x.excerpt.toLowerCase() === issue.excerpt.toLowerCase())) {
      deduped.push(issue);
    }
  }
  return deduped.slice(0, 2);
}

export function coherenceTransitionPenaltyPercent(text: string): number {
  return detectTransitionMisuseIssues(text).length > 0 ? 35 : 0;
}
