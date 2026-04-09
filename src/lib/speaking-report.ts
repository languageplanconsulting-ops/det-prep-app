import type { SpeakingAttemptReport } from "@/types/speaking";
import type {
  ImprovementPoint,
  WritingCriterionReport,
} from "@/types/writing";

// Reuse same DET-style weights as writing (30 / 25 / 25 / 20 → ×1.6 = 160)
export const SPEAKING_RUBRIC_WEIGHTS = {
  grammar: 0.3,
  vocabulary: 0.25,
  coherence: 0.25,
  taskRelevancy: 0.2,
} as const;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Light cleanup for offline reports: capitalize, ensure closing punctuation. */
export function lightPunctuateTranscript(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  if (/[.!?…]["']?\s*$/.test(cap)) return cap;
  return cap.endsWith(".") ? cap : `${cap}.`;
}

function to160(g: number, v: number, c: number, t: number): number {
  const sum =
    SPEAKING_RUBRIC_WEIGHTS.grammar * g +
    SPEAKING_RUBRIC_WEIGHTS.vocabulary * v +
    SPEAKING_RUBRIC_WEIGHTS.coherence * c +
    SPEAKING_RUBRIC_WEIGHTS.taskRelevancy * t;
  return Math.round(sum * 1.6);
}

function pointsOn160(percent: number, weight: number): number {
  return Math.round(percent * weight * 1.6 * 10) / 10;
}

const SUBORD =
  /\b(although|because|if|when|while|unless|since|whereas|even though|so that|which|who|that)\b/gi;
const FANBOYS = /\b(for|and|nor|but|or|yet|so)\b/gi;
const TRANS =
  /\b(however|therefore|moreover|furthermore|first|second|finally|in addition|for example|as a result|on the other hand|besides|meanwhile)\b/gi;

const C1B2 = new Set(
  "significant nevertheless furthermore consequently sophisticated demonstrate establish perspective crucial emphasize substantial maintain acknowledge undermine prevalent inherent".split(
    " ",
  ),
);
const B1 = new Set(
  "important however experience develop challenge opportunity support reason result improve suggest prefer decide prepare environment culture society education".split(
    " ",
  ),
);
const A2 = new Set(
  "always sometimes usually never really very much many people thing place because when where".split(
    " ",
  ),
);

/** Grammar bands: A1–A2 issues (SVA, FANBOYS, etc.) ~30%; subord/tense (B1–B2) ~50%; clean ~70%; 1 complex ~90%; 3+ ~100%. */
export function scoreGrammarPercentSpeak(text: string): number {
  const lower = text.toLowerCase();
  const wc = countWords(text);
  if (wc < 8) return 25;

  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 4);
  const subMatches = lower.match(SUBORD) ?? [];
  SUBORD.lastIndex = 0;
  const subHits = new Set(subMatches.map((x) => x.toLowerCase())).size;

  const subInSentence = (s: string) =>
    /\b(although|because|if|when|while|unless|since|whereas|even though|so that|which|who)\b/i.test(
      s,
    );

  let complexStructures = 0;
  for (const s of sentences) {
    const w = s.split(/\s+/).length;
    if (w < 6) continue;
    if (subInSentence(s) && w >= 8) complexStructures += 1;
  }

  const runOns = sentences.filter((s) => s.split(/\s+/).length > 40).length;
  const svaBad =
    /\b(they|we|you)\s+(is|was)\b/i.test(text) ||
    /\b(he|she|it)\s+(are|were)\b/i.test(text) ||
    /\b(a|an|the)\s+\w+\s+are\b/i.test(lower);

  const fanboysDensity = (lower.match(FANBOYS) ?? []).length;
  const longFrag = sentences.filter((s) => s.split(/\s+/).length > 35).length;

  const a2Flags =
    (svaBad ? 1 : 0) + (runOns > 0 ? 1 : 0) + (fanboysDensity > 12 && longFrag > 0 ? 1 : 0);

  const tenseChaos =
    /\b(was|were|went|did)\b/i.test(text) &&
    /\b(is|are|go|do)\b/i.test(text) &&
    sentences.length <= 6;

  if (complexStructures >= 3) return 100;
  if (complexStructures >= 1) return 90;
  if (a2Flags === 0 && subHits >= 1 && !tenseChaos && runOns === 0) return 70;
  if (tenseChaos || (subHits >= 1 && runOns > 0)) return 50;
  if (a2Flags >= 1) return 30;
  return 45;
}

function vocabHits(lower: string, set: Set<string>): number {
  let n = 0;
  for (const w of set) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    if (re.test(lower)) n += 1;
  }
  return n;
}

/** Vocabulary bands: C1/B2 use 90%, mistakes in advanced 85%, B1 mistakes 70%, no B1+ 60%, A2 mistake 50%, >1 A2 30%. */
export function scoreVocabularyPercentSpeak(text: string): number {
  const lower = text.toLowerCase().replace(/[^a-z\s'-]/gi, " ");
  const wc = countWords(text);
  if (wc < 8) return 35;

  const c1 = vocabHits(lower, C1B2);
  const b1 = vocabHits(lower, B1);
  const a2 = vocabHits(lower, A2);

  const falseAdvanced =
    /\b(injure|borrow me|discuss about|explain me)\b/i.test(text) ? 1 : 0;

  if (c1 >= 2 && falseAdvanced === 0) return 90;
  if (c1 >= 1 && falseAdvanced >= 1) return 85;
  if ((c1 >= 1 || b1 >= 4) && a2 >= 8 && wc < 40) return 70;
  if (c1 === 0 && b1 < 2 && wc >= 15) return 60;
  if (a2 >= 10 && c1 + b1 <= 2) return 50;
  if (a2 >= 14) return 30;
  if (c1 >= 1) return 88;
  if (b1 >= 3) return 72;
  return 58;
}

/** Coherence: 100% transition+reference, 80% transition only, 50% run-on, 40% no transitions. */
export function scoreCoherencePercentSpeak(text: string): number {
  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 4);
  const runOn = sentences.some((s) => s.split(/\s+/).length > 45);
  const hasTrans = (lower.match(TRANS) ?? []).length >= 1;
  const hasRef = /\b(this|that|these|those)\s+\w+/i.test(text);

  if (hasTrans && hasRef) return 100;
  if (hasTrans && !hasRef) return 80;
  if (runOn) return 50;
  if (!hasTrans) return 40;
  return 65;
}

/** Task: personal + overlap with prompt + optional admin keyword hints (e.g. city, people). */
export function scoreTaskPercentSpeak(
  transcript: string,
  questionPrompt: string,
  keywordHints: string[] = [],
): number {
  const lower = transcript.toLowerCase();
  const wc = countWords(transcript);
  if (wc < 10) return 35;

  const personal = /\b(i|me|my|mine|we|our|us)\b/i.test(lower);
  const stop = new Set([
    "describe",
    "explain",
    "talk",
    "about",
    "which",
    "would",
    "could",
    "should",
    "what",
    "how",
    "why",
    "when",
    "where",
    "tell",
    "give",
    "your",
    "this",
    "that",
    "with",
    "from",
    "they",
    "them",
  ]);
  const fromPrompt = questionPrompt
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9'-]/g, ""))
    .filter((w) => w.length > 3 && !stop.has(w));
  const hintTokens = keywordHints
    .flatMap((k) =>
      k
        .toLowerCase()
        .split(/[\s,;/]+/)
        .map((t) => t.replace(/[^a-z0-9'-]/g, ""))
        .filter((t) => t.length > 1),
    );
  const qWords = [...new Set([...fromPrompt, ...hintTokens])];

  const countHits = (text: string) =>
    qWords.filter((w) => {
      try {
        return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
          text,
        );
      } catch {
        return text.includes(w);
      }
    }).length;

  const hits = countHits(lower);

  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 8);
  let offTopic = 0;
  for (const s of sentences) {
    const sl = s.toLowerCase();
    const localHits = countHits(sl);
    if (localHits === 0 && s.split(/\s+/).length > 6) offTopic += 1;
  }

  if (personal && hits >= 2) return 100;
  if (personal && hits === 1) return 80;
  if (!personal && hits >= 2) return 78;
  if (offTopic >= 3) return 65;
  if (!personal && hits <= 1 && wc > 20) return 50;
  if (hits === 0 && wc > 15) return 30;
  return 55;
}

/**
 * Heuristic for offline grading: authentic personal story OR hypothetical personal frame
 * (DET-style “If I were…”, “I would…”, “In my experience…”).
 */
export function detectPersonalOrHypotheticalExperience(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(if i were|if i was|i would\b|i'd rather|i'd prefer|imagine (i|that|if|me)|suppose (i|that|we)|hypothetically|in my (experience|opinion|case|life|view)|when i (was|went|had|studied|worked)|last (year|summer|week|month)|once (i|when)|i remember|as a (child|student)|my (friend|family|teacher|boss|colleague|neighbor))\b/i.test(
      lower,
    ) ||
    /\b(personal(ly)?|from my (own )?experience|in real life|a time when i)\b/i.test(lower)
  );
}

function criterion(
  id: string,
  weight: number,
  scorePercent: number,
  summary: { en: string; th: string },
  breakdown: {
    en: string;
    th: string;
    excerpt?: string;
    suggestionEn?: string;
    suggestionTh?: string;
  }[],
): WritingCriterionReport {
  return {
    id,
    weight,
    scorePercent,
    pointsOn160: pointsOn160(scorePercent, weight),
    summary,
    breakdown: breakdown.map((b, idx) => ({
      id: `${id}-b${idx + 1}`,
      en: b.en,
      th: b.th,
      excerpt: b.excerpt,
      ...(b.suggestionEn?.trim() || b.suggestionTh?.trim()
        ? {
            suggestionEn: b.suggestionEn?.trim(),
            suggestionTh: b.suggestionTh?.trim(),
          }
        : {}),
    })),
  };
}

export function buildSpeakImprovementPoints(
  g: number,
  v: number,
  c: number,
  t: number,
): ImprovementPoint[] {
  const pool: ImprovementPoint[] = [];
  if (g < 85) {
    pool.push({
      id: "sg1",
      category: "grammar",
      en: "Record once, then add one subordinate clause (because / although / if).",
      th: "อัดเสียงครั้งหนึ่ง แล้วเพิ่มประโยคขยายด้วย because / although / if",
    });
  }
  if (v < 85) {
    pool.push({
      id: "sv1",
      category: "vocabulary",
      en: "Swap three simple words for topic-specific or B2+ items you know well.",
      th: "แทนที่คำง่ายสามคำด้วยคำเฉพาะหัวข้อหรือ B2+ ที่ใช้มั่นใจ",
    });
  }
  if (c < 85) {
    pool.push({
      id: "sc1",
      category: "coherence",
      en: "Say a linker aloud before each new idea (However / For example / As a result).",
      th: "พูดคำเชื่อมก่อนไอเดียใหม่ (However / For example / As a result)",
    });
  }
  if (t < 85) {
    pool.push({
      id: "st1",
      category: "task",
      en: "Start with ‘In my experience…’ and name one concrete detail from the question.",
      th: "เริ่มด้วย In my experience… แล้วยกรายละเอียดจริงหนึ่งอย่างจากคำถาม",
    });
  }
  pool.push({
    id: "sx1",
    category: "general",
    en: "Listen to your recording: cut filler (um, like) in the next take.",
    th: "ฟังไฟล์ของตัวเอง: ลด um / like ในรอบถัดไป",
  });
  return pool.slice(0, 8);
}

export function buildSpeakingAttemptReport(
  attemptId: string,
  topicId: string,
  topicTitleEn: string,
  topicTitleTh: string,
  questionId: string,
  questionPromptEn: string,
  questionPromptTh: string,
  prepMinutes: number,
  transcript: string,
  opts?: {
    taskKeywordHints?: string[];
    /** Wording for on-screen rubric summaries */
    variant?: "read-speak" | "photo-speak";
  },
): SpeakingAttemptReport {
  const normalized = transcript.replace(/\s+/g, " ").trim();
  const punctuatedTranscript = lightPunctuateTranscript(normalized);
  const wc = countWords(normalized);
  const excerpt = punctuatedTranscript.slice(0, 100) + (punctuatedTranscript.length > 100 ? "…" : "");

  const g = scoreGrammarPercentSpeak(normalized);
  const v = scoreVocabularyPercentSpeak(normalized);
  const c = scoreCoherencePercentSpeak(normalized);
  let tk = scoreTaskPercentSpeak(
    normalized,
    questionPromptEn,
    opts?.taskKeywordHints ?? [],
  );
  const taskPersonalExperienceBoostApplied = detectPersonalOrHypotheticalExperience(normalized);
  if (taskPersonalExperienceBoostApplied) {
    tk = Math.min(100, tk + 10);
  }
  const score160 = to160(g, v, c, tk);

  const isPhoto = opts?.variant === "photo-speak";
  const grammarEn = isPhoto
    ? `Grammar (A1–A2: SVA, FANBOYS, etc. → ~30%; subordination/tense (B1–B2) → ~50%; no clear mistakes → ~70%; 1 complex clause → ~90%; 3+ → 100%). Heuristic: ${g}%.`
    : `Grammar (A2 errors → 30%; subordination/tense issues → 50%; clean → 70%; 1 complex clause → 90%; 3+ → 100%). Heuristic score: ${g}%.`;

  return {
    gradingSource: "local",
    attemptId,
    topicId,
    questionId,
    topicTitleEn,
    topicTitleTh,
    questionPromptEn,
    questionPromptTh,
    prepMinutes,
    transcript: normalized,
    punctuatedTranscript,
    wordCount: wc,
    submittedAt: new Date().toISOString(),
    score160,
    grammar: criterion("grammar", SPEAKING_RUBRIC_WEIGHTS.grammar, g, {
      en: grammarEn,
      th: `ไวยากรณ์ (คะแนนประมาณจากรูปแบบประโยคและข้อผิดพลาดที่ตรวจจับได้): ${g}%`,
    }, [
      {
        excerpt,
        en: "Complex structures counted from subordinate clauses in longer sentences.",
        th: "นับโครงสร้างซับซ้อนจากประโยคย่อยในประโยคที่ยาวพอสมควร",
      },
      {
        en: "Run-ons (very long sentences) and simple SVA cues lower the band.",
        th: "ประโยคยาวผิดปกติและสัญญาณ SVA เบื้องต้นลดแบนด์",
      },
    ]),
    vocabulary: criterion("vocabulary", SPEAKING_RUBRIC_WEIGHTS.vocabulary, v, {
      en: `Vocabulary (C1/B2 used well ~90%; weak bands down to ~30% if only A2). Score: ${v}%.`,
      th: `คำศัพท์ (ประมาณจากระดับคำที่ตรวจพบ): ${v}%`,
    }, [
      {
        en: "Advanced lexis list match + density vs basic words.",
        th: "จับคู่คำระดับสูงและความหนาแน่นเทียบคำพื้นฐาน",
      },
    ]),
    coherence: criterion("coherence", SPEAKING_RUBRIC_WEIGHTS.coherence, c, {
      en: `Coherence (transitions + referencing vs run-ons). Score: ${c}%.`,
      th: `ความต่อเนื่อง (คำเชื่อม + การอ้างอิง): ${c}%`,
    }, [
      {
        en: "Markers like However / Therefore / First boost coherence when paired with this/that referencing.",
        th: "คำเชื่อมคู่กับ this/that ช่วยความต่อเนื่อง",
      },
    ]),
    taskRelevancy: criterion("task", SPEAKING_RUBRIC_WEIGHTS.taskRelevancy, tk, {
      en: isPhoto
        ? `Task (personal detail + prompt + keyword tags for the photo). Score: ${tk}%.${taskPersonalExperienceBoostApplied ? " +10% bonus for personal or hypothetical personal experience (capped at 100)." : ""}`
        : `Task (personal detail + overlap with prompt keywords). Score: ${tk}%.${taskPersonalExperienceBoostApplied ? " +10% bonus for personal or hypothetical personal experience (capped at 100)." : ""}`,
      th: `การตอบโจทย์ (ประสบการณ์ส่วนตัว + คำสำคัญจากคำถาม${isPhoto ? "และแท็กภาพ" : ""}): ${tk}%${taskPersonalExperienceBoostApplied ? " โบนัส +10% เมื่อมีประสบการณ์ส่วนตัวหรือสมมติ (สูงสุด 100)" : ""}`,
    }, [
      {
        en: isPhoto
          ? "Matches your speech to the question and admin keyword hints (e.g. city, people)."
          : "Uses overlap between your transcript and the spoken prompt wording.",
        th: isPhoto
          ? "เทียบคำตอบกับคำถามและคีย์เวิร์ดที่แอดมินกำหนด"
          : "เทียบคำในคำตอบกับคำถามที่ให้พูด",
      },
    ]),
    improvementPoints: buildSpeakImprovementPoints(g, v, c, tk),
    ...(taskPersonalExperienceBoostApplied ? { taskPersonalExperienceBoostApplied: true } : {}),
  };
}
