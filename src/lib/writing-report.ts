import type {
  EssayHighlight,
  ImprovementPoint,
  StudySentenceSuggestion,
  StudyVocabularySuggestion,
  WritingAttemptReport,
  WritingCriterionReport,
  WritingTopic,
} from "@/types/writing";
import {
  coherenceTransitionPenaltyPercent,
  detectGrammarPunctuationIssues,
  detectTransitionMisuseIssues,
  grammarPunctuationPenaltyPercent,
} from "@/lib/production-writing-penalties";

export const WRITING_RUBRIC_WEIGHTS = {
  grammar: 0.3,
  vocabulary: 0.25,
  coherence: 0.25,
  taskRelevancy: 0.2,
} as const;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function scoreGrammarPercent(essay: string): number {
  const wc = countWords(essay);
  if (wc < 50) return 35;
  const lower = essay.toLowerCase();
  const sub = (
    lower.match(
      /\b(because|although|while|unless|since|whereas|even though|if|when|which|who)\b/g,
    ) ?? []
  ).length;
  const sentences = essay.split(/[.!?]+/).filter((s) => s.trim().length > 8);
  const longRun = sentences.filter((s) => s.split(/\s+/).length > 40).length;
  let s = 72;
  if (longRun > 0) s -= 22;
  if (sub >= 3) s = Math.max(s, 95);
  else if (sub >= 1) s = Math.max(s, 88);
  return Math.min(100, Math.max(25, s));
}

function scoreVocabularyPercent(essay: string): number {
  const lower = essay.toLowerCase();
  const adv = (
    lower.match(
      /\b(significant|nevertheless|furthermore|consequently|perspective|emphasize|crucial|sophisticated|demonstrate|establish)\b/g,
    ) ?? []
  ).length;
  const mid = (
    lower.match(
      /\b(important|however|experience|develop|challenge|opportunity|support|reason|result)\b/g,
    ) ?? []
  ).length;
  let s = 58;
  if (adv >= 2) s = 88;
  else if (adv === 1) s = 78;
  if (mid >= 4) s += 8;
  if (adv === 0 && mid < 2) s = Math.min(s, 62);
  return Math.min(100, Math.max(28, s));
}

function scoreCoherencePercent(essay: string): number {
  const lower = essay.toLowerCase();
  const tr = (
    lower.match(
      /\b(however|therefore|moreover|first|second|finally|in addition|for example|as a result|on the other hand)\b/g,
    ) ?? []
  ).length;
  const ref = /\b(this|that|these|those)\s+\w+/i.test(essay);
  const run = essay.split(/[.!?]+/).filter((s) => s.split(/\s+/).length > 45).length;
  let s = 45;
  if (tr >= 2 && ref) s = 100;
  else if (tr >= 2) s = 82;
  else if (tr === 1) s = 68;
  if (run > 0) s = Math.min(s, 52);
  return Math.min(100, Math.max(35, s));
}

function scoreTaskPercent(essay: string, topic: WritingTopic): number {
  const wc = countWords(essay);
  if (wc < 50) return 32;
  const lower = essay.toLowerCase();
  const personal = /\b(i|my|me|we|our|us)\b/.test(lower);
  const promptWords = topic.promptEn.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const hits = promptWords.filter((w) => lower.includes(w)).length;
  let s = 55;
  if (personal && hits >= 3) s = 100;
  else if (personal && hits >= 1) s = 82;
  else if (hits >= 2) s = 72;
  else if (hits >= 1) s = 58;
  if (!personal && hits < 2) s = Math.min(s, 52);
  return Math.min(100, Math.max(28, s));
}

function to160(g: number, v: number, c: number, t: number): number {
  const sum =
    WRITING_RUBRIC_WEIGHTS.grammar * g +
    WRITING_RUBRIC_WEIGHTS.vocabulary * v +
    WRITING_RUBRIC_WEIGHTS.coherence * c +
    WRITING_RUBRIC_WEIGHTS.taskRelevancy * t;
  return Math.round(sum * 1.6);
}

function pointsOn160(percent: number, weight: number): number {
  return Math.round(percent * weight * 1.6 * 10) / 10;
}

function buildHighlights(essay: string): EssayHighlight[] {
  const highlights: EssayHighlight[] = [];
  const re = /[^.!?]+[.!?]+|[^\n]+$/g;
  let m: RegExpExecArray | null;
  let i = 0;
  const types = ["grammar", "vocabulary", "coherence", "task"] as const;
  while ((m = re.exec(essay)) !== null && highlights.length < 8) {
    const type = types[i % 4];
    const isPositive = i % 3 !== 1;
    const notes: Record<(typeof types)[number], { e: string; t: string; pe: string; pt: string }> = {
      grammar: {
        e: "Tighten agreement or shorten very long sentences.",
        t: "ดูว่าใครทำอะไรให้ตรงกัน หรือตัดประโยคให้สั้นลง",
        pe: "Clear grammar in this segment.",
        pt: "ส่วนนี้เขียนโครงสร้างชัดดี",
      },
      vocabulary: {
        e: "Use a more precise word here if you can.",
        t: "ลองใช้คำที่ตรงความหมายมากขึ้น",
        pe: "Good word choice.",
        pt: "เลือกคำได้ดี",
      },
      coherence: {
        e: "Add a linker or clearer reference between ideas.",
        t: "ใส่คำเชื่อมหรือบอกให้รู้ว่าหมายถึงอะไร",
        pe: "Logical flow here.",
        pt: "อ่านแล้วต่อเรื่องกันดี",
      },
      task: {
        e: "Tie this part more directly to the prompt.",
        t: "ให้ส่วนนี้ตอบคำถามตรงๆ มากขึ้น",
        pe: "On-task detail.",
        pt: "อยู่ในโจทย์",
      },
    };
    const pack = notes[type];
    const label =
      type === "grammar"
        ? "Grammar"
        : type === "vocabulary"
          ? "Vocabulary"
          : type === "coherence"
            ? "Coherence"
            : "Task";
    highlights.push({
      start: m.index,
      end: m.index + m[0].length,
      type,
      isPositive,
      noteEn: isPositive ? pack.pe : pack.e,
      noteTh: isPositive ? pack.pt : pack.t,
      headlineEn: isPositive ? `${label}: nice work here` : `${label}: needs attention`,
      headlineTh: isPositive
        ? `${label}: ทำได้ดีในส่วนนี้`
        : `${label}: ควรปรับปรุง`,
      patternEn:
        type === "grammar" && isPositive
          ? "Pattern: Although + subject + verb, subject + verb."
          : type === "grammar" && !isPositive
            ? "Check: subject and verb must agree (singular/plural)."
            : undefined,
      patternTh:
        type === "grammar" && isPositive
          ? "ดี: ขึ้นต้นด้วย Although แล้วตามด้วยประโยคหลัก"
          : type === "grammar" && !isPositive
            ? "เช็ก: คน/สิ่งกับคำว่าทำอะไร ต้องใช้คู่กันถูก"
            : undefined,
      scoreLineEn: isPositive
        ? `+ ${label}: supports your score on this criterion.`
        : `− ${label}: pulls your score down — apply the fix below.`,
      scoreLineTh: isPositive
        ? `+ ${label}: ช่วยคะแนนในเกณฑ์นี้`
        : `− ${label}: กดคะแนน — ลองแก้ตามคำแนะนำ`,
      fixEn: !isPositive
        ? type === "grammar"
          ? "Fix: make the verb match the subject; split the sentence if it is too long."
          : type === "vocabulary"
            ? "Fix: pick a more precise word from the topic area."
            : type === "coherence"
              ? "Fix: add a linker (however, therefore) or a clear reference (this/that)."
              : "Fix: add one concrete detail that answers the prompt."
        : undefined,
      fixTh: !isPositive
        ? type === "grammar"
          ? "แก้: ให้คำว่าทำอะไรตรงกับใคร หรือแบ่งประโยคถ้ายาวเกินไป"
          : type === "vocabulary"
            ? "แก้: เลือกคำที่ตรงกับหัวข้อมากขึ้น"
            : type === "coherence"
              ? "แก้: ใส่คำเชื่อม หรือใช้ this/that ให้รู้ว่าหมายถึงอะไร"
              : "แก้: เพิ่มรายละเอียดที่ตอบคำถาม"
        : undefined,
    });
    i += 1;
  }
  return highlights;
}

function criterion(
  id: string,
  weight: number,
  scorePercent: number,
  summary: { en: string; th: string },
  breakdown: { en: string; th: string; excerpt?: string }[],
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
    })),
  };
}

function buildImprovementPoints(
  g: number,
  v: number,
  c: number,
  t: number,
  essay: string,
): ImprovementPoint[] {
  const pool: ImprovementPoint[] = [];
  if (g < 80) {
    pool.push({
      id: "g1",
      category: "grammar",
      en: "Proofread subject–verb agreement after linking words.",
      th: "หลังคำเชื่อม ดูว่าใครทำอะไรให้ตรงกัน",
    });
  }
  if (v < 80) {
    pool.push({
      id: "v1",
      category: "vocabulary",
      en: "Replace general words with topic-specific terms.",
      th: "ใช้คำเฉพาะหัวข้อแทนคำทั่วไป",
    });
  }
  if (c < 80) {
    pool.push({
      id: "c1",
      category: "coherence",
      en: "Use signposts: First, However, Finally.",
      th: "ใช้คำบอกลำดับ First, However, Finally",
    });
  }
  if (t < 80) {
    pool.push({
      id: "t1",
      category: "task",
      en: "Add one personal example that answers the prompt directly.",
      th: "เพิ่มตัวอย่างส่วนตัวที่ตอบโจทย์ตรงๆ",
    });
  }
  pool.push({
    id: "x1",
    category: "general",
    en: "Read aloud once — awkward rhythm flags grammar issues.",
    th: "อ่านออกเสียงครั้งหนึ่ง ถ้าจังหวะแปลกๆ มักมีจุดที่ผิด",
  });
  if (countWords(essay) < 80) {
    pool.push({
      id: "wc",
      category: "general",
      en: "Aim for 80–120 words with one clear main idea.",
      th: "เขียน 80–120 คำ มีไอเดียหลักชัด",
    });
  }
  while (pool.length < 2) {
    pool.push({
      id: `pad-${pool.length}`,
      category: "general",
      en: "Underline three keywords from the prompt and answer each.",
      th: "ขีดเส้นใต้คำสำคัญในโจทย์สามคำแล้วตอบให้ครบ",
    });
  }
  return pool.slice(0, Math.min(10, pool.length));
}

/** Up to 7 sentence patterns and 10 vocabulary notes when AI does not supply them. */
export function buildLocalStudyPack(
  titleEn: string,
  titleTh: string,
  essay: string,
): {
  studySentences: StudySentenceSuggestion[];
  studyVocabulary: StudyVocabularySuggestion[];
} {
  const te = titleEn.trim() || "this topic";
  const tt = titleTh.trim() || "หัวข้อนี้";
  const firstSentence = essay.split(/[.!?]+/).map((s) => s.trim()).find((s) => s.length > 12);
  const hook = firstSentence ? firstSentence.slice(0, 60).trim() : "your main idea here";

  const studySentences: StudySentenceSuggestion[] = [
    {
      id: "ss1",
      en: `I believe ${te} matters because it connects to real-life decisions.`,
      th: `ผม/ดิฉันเชื่อว่า ${tt} สำคัญเพราะเชื่อมกับการตัดสินใจในชีวิตจริง`,
    },
    {
      id: "ss2",
      en: `One clear argument is that ${te} influences how people cooperate.`,
      th: `ข้อโต้แย้งที่ชัดคือ ${tt} มีผลต่อการทำงานร่วมกันของผู้คน`,
    },
    {
      id: "ss3",
      en: `Although some disagree, I would defend my view on ${te} with one concrete example.`,
      th: `แม้บางคนไม่เห็นด้วย ผม/ดิฉันจะยืนยันมุมมองเรื่อง ${tt} ด้วยตัวอย่างจริงหนึ่งข้อ`,
    },
    {
      id: "ss4",
      en: `If I had to summarise in one sentence: "${hook}" captures my position on ${te}.`,
      th: `ถ้าสรุปหนึ่งประโยค: "${hook}" สะท้อนจุดยืนของผม/ดิฉันเรื่อง ${tt}`,
    },
    {
      id: "ss5",
      en: `Furthermore, looking at ${te} from another angle reveals trade-offs we should name.`,
      th: `นอกจากนี้ การมอง ${tt} จากอีกมุมหนึ่งจะเห็นข้อแลกเปลี่ยนที่ควรพูดให้ชัด`,
    },
    {
      id: "ss6",
      en: `In conclusion, revisiting ${te} tomorrow will help me add precision, not length.`,
      th: `สรุปคือ การทบทวน ${tt} อีกครั้งพรุ่งนี้จะช่วยให้แม่นยำขึ้น ไม่ใช่ยาวขึ้น`,
    },
    {
      id: "ss7",
      en: `I would refine my answer on ${te} by linking the prompt keywords to one personal story.`,
      th: `ผม/ดิฉันจะขัดเกลาคำตอบเรื่อง ${tt} โดยผูกคำสำคัญในโจทย์กับเรื่องส่วนตัวหนึ่งเรื่อง`,
    },
  ];

  const studyVocabulary: StudyVocabularySuggestion[] = [
    {
      id: "sv1",
      termEn: "nevertheless",
      termTh: "ถึงอย่างไร",
      noteEn: "Contrast politely after stating a fact.",
      noteTh: "พูดความต่างแบบสุภาพ หลังบอกข้อเท็จจริง",
    },
    {
      id: "sv2",
      termEn: "furthermore",
      termTh: "นอกจากนี้",
      noteEn: "Adds a second supporting point in formal tone.",
      noteTh: "เพิ่มเหตุผลข้อที่สอง โทนเป็นทางการหน่อย",
    },
    {
      id: "sv3",
      termEn: "consequently",
      termTh: "ด้วยเหตุนั้น",
      noteEn: "Shows result; stronger than 'so' in essays.",
      noteTh: "บอกว่าเกิดอะไรตามมา แรงกว่า so ในการเขียน",
    },
    {
      id: "sv4",
      termEn: "perspective",
      termTh: "มุมมอง",
      noteEn: "Use instead of repeating 'opinion' many times.",
      noteTh: "ใช้แทนคำว่า opinion ที่พูดซ้ำๆ",
    },
    {
      id: "sv5",
      termEn: "significant",
      termTh: "สำคัญมาก",
      noteEn: "Upgrade from 'important' when the idea is central.",
      noteTh: "แรงกว่า important เวลาอยากเน้นว่าสำคัญจริงๆ",
    },
    {
      id: "sv6",
      termEn: "demonstrate",
      termTh: "แสดงให้เห็น",
      noteEn: "Verb for showing evidence or skill.",
      noteTh: "บอกว่า “โชว์ให้เห็น” ว่ามีจริงหรือทำเป็น",
    },
    {
      id: "sv7",
      termEn: "coherent",
      termTh: "อ่านแล้วต่อเรื่องกัน",
      noteEn: "Describes ideas that connect clearly.",
      noteTh: "ความคิดต่อกัน ไม่งง",
    },
    {
      id: "sv8",
      termEn: "address the prompt",
      termTh: "ตอบให้ตรงโจทย์",
      noteEn: "Collocation examiners like for task focus.",
      noteTh: "พูดถึงคำถามที่ให้ ไม่หลุดไปเรื่องอื่น",
    },
    {
      id: "sv9",
      termEn: "nuanced",
      termTh: "มองหลายด้าน",
      noteEn: "Shows you see more than one side.",
      noteTh: "ไม่มองแค่ขาวหรือดำอย่างเดียว",
    },
    {
      id: "sv10",
      termEn: "takeaway",
      termTh: "สิ่งที่ได้ไป",
      noteEn: "One-sentence lesson at the end.",
      noteTh: "สรุปสั้นๆ ท้ายเรื่องว่าได้อะไร",
    },
  ];

  return { studySentences, studyVocabulary };
}

/** Ensures study lists exist (max 7 / 10); fills from local heuristics when missing. */
export function withStudyPackDefaults(
  report: WritingAttemptReport,
): WritingAttemptReport {
  const hasS = (report.studySentences?.length ?? 0) > 0;
  const hasV = (report.studyVocabulary?.length ?? 0) > 0;
  const local = buildLocalStudyPack(
    report.topicTitleEn,
    report.topicTitleTh,
    report.essay,
  );
  return {
    ...report,
    studySentences: hasS
      ? report.studySentences!.slice(0, 7)
      : local.studySentences,
    studyVocabulary: hasV
      ? report.studyVocabulary!.slice(0, 10)
      : local.studyVocabulary,
  };
}

export function buildWritingAttemptReport(
  attemptId: string,
  topic: WritingTopic,
  essay: string,
  prepMinutes: number,
): WritingAttemptReport {
  const grammarPunctuationIssues = detectGrammarPunctuationIssues(essay);
  const transitionIssues = detectTransitionMisuseIssues(essay);
  const g = Math.max(0, scoreGrammarPercent(essay) - grammarPunctuationPenaltyPercent(essay));
  const v = scoreVocabularyPercent(essay);
  const c = Math.max(0, scoreCoherencePercent(essay) - coherenceTransitionPenaltyPercent(essay));
  const tk = scoreTaskPercent(essay, topic);
  const score160 = to160(g, v, c, tk);
  const wc = countWords(essay);
  const ex = essay.slice(0, 80).trim() + (essay.length > 80 ? "…" : "");
  const pack = buildLocalStudyPack(topic.titleEn, topic.titleTh, essay);

  return {
    gradingSource: "local",
    attemptId,
    topicId: topic.id,
    topicTitleEn: topic.titleEn,
    topicTitleTh: topic.titleTh,
    prepMinutes,
    essay,
    wordCount: wc,
    submittedAt: new Date().toISOString(),
    score160,
    grammar: criterion("grammar", WRITING_RUBRIC_WEIGHTS.grammar, g, {
      en: `Grammar (target complex structures when appropriate). Score: ${g}%.`,
      th: `เรื่องการเขียนให้ถูกต้อง คะแนน: ${g}%`,
    }, [
      ...grammarPunctuationIssues.map((issue, idx) => ({
        excerpt: issue.excerpt || ex,
        en:
          idx === 0
            ? `${issue.reasonEn} Grammar score includes a -10% punctuation penalty for each issue (max -25%).`
            : issue.reasonEn,
        th:
          idx === 0
            ? `${issue.reasonTh} คะแนนไวยากรณ์ถูกหักเรื่องวรรคตอน -10% ต่อครั้ง (สูงสุด -25%).`
            : issue.reasonTh,
      })),
      { excerpt: ex, en: "Check opening for one clear main clause.", th: "ประโยคแรกควรบอกใจความหลักชัดๆ" },
      { en: "Keep tense consistent with the prompt.", th: "เรื่องเวลา (อดีต/ปัจจุบัน) ให้ตรงกับโจทย์" },
      { en: "With FANBOYS, both sides should be full clauses.", th: "ถ้าใช้คำเชื่อมพวก for, and, but ทั้งสองข้างควรเป็นประโยคสมบูรณ์" },
    ]),
    vocabulary: criterion("vocabulary", WRITING_RUBRIC_WEIGHTS.vocabulary, v, {
      en: `Vocabulary precision (B2/C1 when correct). Score: ${v}%.`,
      th: `เลือกคำให้ตรงและดีขึ้น คะแนน: ${v}%`,
    }, [
      { en: "Use collocations that match the register.", th: "ใช้คำคู่กันที่เข้ากับโทนเรื่อง" },
      { en: "Avoid repeating the same adjective.", th: "อย่าใช้คำคุณศัพท์คำเดิมซ้ำๆ" },
      { en: "Watch for false friends from Thai.", th: "ระวังคำที่หน้าตาเหมือนไทยแต่ความหมายคนละอย่าง" },
    ]),
    coherence: criterion("coherence", WRITING_RUBRIC_WEIGHTS.coherence, c, {
      en: `Coherence (transitions + referencing). Score: ${c}%.`,
      th: `อ่านแล้วต่อเรื่องกัน คะแนน: ${c}%`,
    }, [
      ...transitionIssues.map((issue, idx) => ({
        excerpt: issue.excerpt,
        en:
          idx === 0
            ? `${issue.reasonEn} Coherence score includes a -35% transition-use penalty when this happens.`
            : issue.reasonEn,
        th:
          idx === 0
            ? `${issue.reasonTh} คะแนน coherence ถูกหัก -35% เมื่อใช้คำเชื่อมผิดลักษณะนี้`
            : issue.reasonTh,
      })),
      { en: "Use this/that to refer back clearly.", th: "ใช้ this/that ให้รู้ว่าหมายถึงอะไรก่อนหน้า" },
      { en: "One main idea per paragraph.", th: "ย่อหน้าละหนึ่งหัวข้อหลัก" },
      { en: "Signal contrast with However / On the other hand.", th: "เวลาเปรียบเทียบใช้ However หรือ On the other hand" },
    ]),
    taskRelevancy: criterion("task", WRITING_RUBRIC_WEIGHTS.taskRelevancy, tk, {
      en: `Task relevancy (specific + on-prompt). Score: ${tk}%.`,
      th: `ตอบตรงคำถามหรือเปล่า คะแนน: ${tk}%`,
    }, [
      { en: "Echo key words from the question.", th: "เอาคำสำคัญจากโจทย์มาใช้ในคำตอบ" },
      { en: "Balance general claims with one concrete example.", th: "มีทั้งข้อความกว้างๆ กับตัวอย่างจริงสักอย่าง" },
      { en: "Close by restating the question in new words.", th: "จบด้วยการพูดถึงคำถามอีกครั้งด้วยคำใหม่" },
    ]),
    improvementPoints: buildImprovementPoints(g, v, c, tk, essay),
    highlights: buildHighlights(essay),
    studySentences: pack.studySentences,
    studyVocabulary: pack.studyVocabulary,
  };
}
