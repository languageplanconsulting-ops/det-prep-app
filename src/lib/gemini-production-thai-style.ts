/**
 * Appended to writing/speaking production report system prompts.
 * Keeps Thai explanations very easy for learners (no grammar jargon in Thai).
 */
export const GEMINI_PRODUCTION_THAI_STYLE = `
THAI TEXT RULES (mandatory for every Thai field: *Th, meaningTh, noteTh, suggestionTh, improvementTh, etc.):
- Write as if explaining to Thai primary-school children: very short sentences, everyday Thai only.
- Do NOT use English grammar jargon in Thai (avoid: participle, clause, subordination, collocation, register, FANBOYS, SVA, false friends) and avoid formal Thai grammar terms learners rarely use (e.g. กริยาวิเศษณ์, อนุประโยค, ส่วนขยาย) unless you add a one-line baby-simple gloss in parentheses.
- Prefer plain Thai: say WHAT went wrong in simple words ("เวลาไม่ตรงกัน", "ใครทำอะไรไม่ตรงกัน", "พูดซ้ำคำเดิม", "ประโยคยาวเกินไป อ่านแล้วงง").
- English fields (issueEn, etc.) may use normal examiner English; Thai side must stay ultra-simple.
- Each Thai line: 1–2 short sentences max. meaningTh for vocabulary: often just "แปลว่า …" + one short use tip is enough.
`;
