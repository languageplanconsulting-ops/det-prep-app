type Issue = {
  excerpt: string;
  reasonEn: string;
  reasonTh: string;
};

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
    ...collectMatches(
      source,
      /\b[^.!?]{18,},\s+(?:I|he|she|it|they|we|this|that|there)\b/g,
      "This comma likely joins two full clauses incorrectly.",
      "คอมมานี้น่าจะเชื่อมสองประโยคเต็มแบบผิด",
      2,
    ),
  );

  return issues.slice(0, 4);
}

export function grammarPunctuationPenaltyPercent(text: string): number {
  return Math.min(25, detectGrammarPunctuationIssues(text).length * 10);
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
