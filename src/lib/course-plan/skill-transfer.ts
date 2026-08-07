/**
 * "ทักษะที่ฝึกจะเป็นประโยชน์ในโจทย์ดังนี้" — where each drill actually pays off.
 *
 * A learner grinding subordinating conjunctions has no way of knowing that the
 * same skill is what earns marks in Listen and Type, Write About the Photo,
 * Read Then Write AND the Writing Sample. Told that, a boring grammar set stops
 * feeling like busywork and starts looking like four question types at once —
 * which is the single cheapest thing this course can do for motivation.
 *
 * The lists are deliberately about TRANSFER, not classification. An exercise's
 * own taskType is where it is filed; this is everywhere else the skill shows up.
 * Keep them honest: a claim the learner cannot feel on test day is worse than
 * no claim.
 */

/** The DET questions we can point at, in the order they run in the real test. */
export const TRANSFER_ORDER = [
  "read_and_select",
  "fill_in_blanks",
  "read_and_complete",
  "listen_and_type",
  "interactive_reading",
  "interactive_listening",
  "reading_comprehension",
  "vocabulary_reading",
  "write_about_photo",
  "speak_about_photo",
  "read_and_write",
  "read_then_speak",
  "interactive_conversation_mcq",
  "interactive_speaking",
  "dialogue_summary",
  "writing_sample",
  "speaking_sample",
] as const;

/**
 * Short Thai labels.
 *
 * Deliberately shorter than QUESTION_TYPE_TH in course-production.ts — these
 * render as chips inside an exercise header, where "Fill in the Blanks (ใหม่
 * 2026)" would wrap onto three lines on a phone.
 */
export const TRANSFER_LABEL_TH: Record<string, string> = {
  read_and_select: "เลือกคำจริง",
  fill_in_blanks: "เติมคำในช่องว่าง",
  read_and_complete: "C-Test",
  listen_and_type: "ตามคำบอก",
  dictation: "ตามคำบอก",
  interactive_reading: "Interactive Reading",
  interactive_listening: "Interactive Listening",
  reading_comprehension: "ทักษะการอ่าน",
  vocabulary_reading: "คำศัพท์จากการอ่าน",
  write_about_photo: "เขียนบรรยายภาพ",
  speak_about_photo: "พูดบรรยายภาพ",
  read_and_write: "เขียนตามหัวข้อ",
  read_then_speak: "พูดตามหัวข้อ",
  interactive_conversation_mcq: "Interactive Conversation",
  interactive_speaking: "Interactive Speaking",
  dialogue_summary: "สรุปบทสนทนา",
  writing_sample: "Writing Sample",
  speaking_sample: "Speaking Sample",
};

export function transferLabel(key: string): string {
  return TRANSFER_LABEL_TH[key] ?? key;
}

/**
 * Curriculum keys are prefixed by track — `gr-sub` (easy), `mgr-sub` (medium),
 * `hgr-sub` (hard) are the same skill taught at three levels, so the transfer
 * list is authored once against the base key.
 */
export function baseExerciseKey(exerciseKey: string): string {
  if (BY_EXERCISE[exerciseKey]) return exerciseKey;
  const stripped = exerciseKey.replace(/^[mh]/, "");
  return BY_EXERCISE[stripped] ? stripped : exerciseKey;
}

/**
 * Per-exercise transfer, keyed on the base curriculum key.
 *
 * Grammar is the big winner here and the reason this exists: every one of these
 * six sets is scored in four to five separate DET questions, which is invisible
 * from inside a fill-in-the-blank drill.
 */
const BY_EXERCISE: Record<string, string[]> = {
  // ---- grammar: the highest-transfer block in the course ----
  "gr-tenses": [
    "fill_in_blanks",
    "read_and_complete",
    "listen_and_type",
    "write_about_photo",
    "read_and_write",
    "writing_sample",
  ],
  "gr-present": [
    "fill_in_blanks",
    "listen_and_type",
    "write_about_photo",
    "read_and_write",
    "writing_sample",
  ],
  "gr-complex": [
    "write_about_photo",
    "read_and_write",
    "writing_sample",
    "read_then_speak",
    "read_and_complete",
  ],
  // The founder's own example: conjunctions carry dictation, both photo tasks
  // and the writing sample.
  "gr-sub": [
    "listen_and_type",
    "write_about_photo",
    "read_and_write",
    "writing_sample",
    "read_then_speak",
  ],
  "gr-relative": [
    "write_about_photo",
    "read_and_write",
    "writing_sample",
    "read_and_complete",
    "reading_comprehension",
  ],
  "gr-reduction": ["write_about_photo", "read_and_write", "writing_sample", "read_and_complete"],

  // ---- C-Test ----
  ct: [
    "read_and_complete",
    "fill_in_blanks",
    "reading_comprehension",
    "vocabulary_reading",
    "listen_and_type",
  ],

  // ---- write about photo ----
  "wp-pattern": ["write_about_photo", "speak_about_photo", "writing_sample", "read_and_write"],
  "wp-people": ["write_about_photo", "speak_about_photo", "writing_sample"],
  "wp-objects": ["write_about_photo", "speak_about_photo", "writing_sample"],
  "wp-places": ["write_about_photo", "speak_about_photo", "writing_sample"],

  // ---- speak about photo ----
  "sp-people": ["speak_about_photo", "speaking_sample", "read_then_speak", "write_about_photo"],
  "sp-objects": ["speak_about_photo", "speaking_sample", "read_then_speak", "write_about_photo"],
  "sp-places": ["speak_about_photo", "speaking_sample", "read_then_speak", "write_about_photo"],

  // ---- dictation ----
  "dic-easy": ["listen_and_type", "interactive_listening", "dialogue_summary"],
  "dic-medium": ["listen_and_type", "interactive_listening", "dialogue_summary", "writing_sample"],
  "dic-hard": [
    "listen_and_type",
    "interactive_listening",
    "dialogue_summary",
    "interactive_speaking",
  ],
  "dic-advanced": [
    "listen_and_type",
    "interactive_listening",
    "dialogue_summary",
    "interactive_speaking",
  ],

  // ---- write to a topic (50 words) ----
  "wt-ws1": ["read_and_write", "writing_sample", "write_about_photo", "read_then_speak"],
  "wt-ws2": ["read_and_write", "writing_sample", "write_about_photo", "read_then_speak"],
  "wt-ws3": ["read_and_write", "writing_sample", "write_about_photo", "read_then_speak"],
  "wt-real1": ["read_and_write", "writing_sample", "interactive_writing"],
  "wt-real2": ["read_and_write", "writing_sample", "interactive_writing"],
  "wt-real3": ["read_and_write", "writing_sample", "interactive_writing"],

  // ---- speak to a topic ----
  "st-ls1": ["read_then_speak", "speaking_sample", "interactive_speaking", "speak_about_photo"],
  "st-ls2": ["read_then_speak", "speaking_sample", "interactive_speaking", "speak_about_photo"],
  "st-ls3": ["read_then_speak", "speaking_sample", "interactive_speaking", "speak_about_photo"],
  "st-real1": ["read_then_speak", "speaking_sample", "interactive_speaking"],
  "st-real2": ["read_then_speak", "speaking_sample", "interactive_speaking"],
  "st-real3": ["read_then_speak", "speaking_sample", "interactive_speaking"],

  // ---- interactive speaking ----
  "is-l1": ["interactive_speaking", "speaking_sample", "read_then_speak"],
  "is-l2": ["interactive_speaking", "speaking_sample", "read_then_speak"],
  "is-l3": ["interactive_speaking", "speaking_sample", "read_then_speak"],
  "is-l4": ["interactive_speaking", "speaking_sample", "read_then_speak"],
  "is-real": [
    "interactive_speaking",
    "speaking_sample",
    "read_then_speak",
    "interactive_listening",
  ],

  // ---- interactive conversation / dialogue summary ----
  "ic-set": ["interactive_conversation_mcq", "interactive_listening", "dialogue_summary"],
  "ds-set": ["dialogue_summary", "interactive_listening", "read_and_write", "writing_sample"],

  // ---- real words / reading ----
  "rw-ladder": ["read_and_select", "vocabulary_reading", "read_and_complete", "reading_comprehension"],
  "rw-hard": ["read_and_select", "vocabulary_reading", "read_and_complete", "reading_comprehension"],
  "rs-exam": ["reading_comprehension", "interactive_reading", "vocabulary_reading", "read_and_write"],
  "rv-exam": ["vocabulary_reading", "reading_comprehension", "read_and_select", "read_and_complete"],
};

/**
 * Fallback when an exercise has no authored entry — its own task type plus the
 * nearest neighbours. Always returns something, because a panel that sometimes
 * vanishes reads as a bug.
 */
const BY_TASK: Record<string, string[]> = {
  fill_in_blanks: ["fill_in_blanks", "read_and_complete", "listen_and_type", "read_and_write"],
  dictation: ["listen_and_type", "interactive_listening", "dialogue_summary"],
  real_english_word: ["read_and_select", "vocabulary_reading", "read_and_complete"],
  reading_comprehension: ["reading_comprehension", "interactive_reading", "vocabulary_reading"],
  vocabulary_reading: ["vocabulary_reading", "reading_comprehension", "read_and_select"],
  write_about_photo: ["write_about_photo", "writing_sample", "speak_about_photo"],
  speak_about_photo: ["speak_about_photo", "speaking_sample", "read_then_speak"],
  read_and_write: ["read_and_write", "writing_sample", "write_about_photo"],
  read_then_speak: ["read_then_speak", "speaking_sample", "interactive_speaking"],
  interactive_speaking: ["interactive_speaking", "speaking_sample", "read_then_speak"],
  interactive_conversation_mcq: ["interactive_conversation_mcq", "interactive_listening"],
  dialogue_summary: ["dialogue_summary", "interactive_listening", "read_and_write"],
};

/**
 * The DET questions this drill's skill shows up in, in test order.
 *
 * Returns an empty list only when neither the key nor the task type is known,
 * which the UI treats as "say nothing" rather than guessing.
 */
export function transfersFor(exerciseKey: string | null | undefined, taskType: string | null): string[] {
  const explicit = exerciseKey ? BY_EXERCISE[baseExerciseKey(exerciseKey)] : undefined;
  const list = explicit ?? (taskType ? BY_TASK[taskType] : undefined);
  if (!list) return [];
  const order = TRANSFER_ORDER as readonly string[];
  return [...new Set(list)].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

export const TRANSFER_HEADING_TH = "ทักษะที่ฝึกจะเป็นประโยชน์ในโจทย์ดังนี้";
