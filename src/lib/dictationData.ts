/**
 * Canonical dictation catalog: 20 sets × 3 levels (placeholder copy + audio paths).
 * Replace MP3s under public/audio/dictation/ using easy-1.mp3 … hard-20.mp3.
 * Admin paste overlays transcript (and optional hint) per difficulty + set order.
 */
import { DICTATION_SET_COUNT } from "@/lib/dictation-constants";
import type { DictationDifficulty, DictationFullBank, DictationItem, DictationRoundNum } from "@/types/dictation";

const LEVEL: DictationDifficulty[] = ["easy", "medium", "hard"];

const SAMPLE_TRANSCRIPTS: Record<DictationDifficulty, string[]> = {
  easy: [
    "The sun is warm today.",
    "Birds fly over the lake.",
    "Please close the door quietly.",
    "We will meet at noon.",
    "She reads a book every night.",
    "The train arrives on time.",
    "Water is important for life.",
    "They walked through the park.",
    "I need a cup of tea.",
    "The shop opens at nine.",
    "Winter brings cold winds.",
    "He wrote a short letter.",
    "The dog ran across the yard.",
    "We heard music from next door.",
    "Please wait in line here.",
    "The moon shines at night.",
    "Children play after school.",
    "Fresh bread smells wonderful.",
    "The river flows to the sea.",
    "Kind words can help a friend.",
  ],
  medium: [
    "The committee will announce the results on Monday morning.",
    "Although it rained, the festival continued without delay.",
    "Researchers observed a steady improvement across all groups.",
    "She hesitated before signing the contract at the desk.",
    "The museum acquired several rare paintings from abroad.",
    "Public transport remains the most efficient option downtown.",
    "He explained the procedure clearly, step by step.",
    "The storm damaged the roof, but no one was injured.",
    "Students must submit their essays before the deadline.",
    "The recipe calls for butter, sugar, and fresh lemons.",
    "Volunteers organized the event with remarkable attention to detail.",
    "The engineer proposed a safer design for the bridge.",
    "Winter crops require careful planning and consistent watering.",
    "The novel explores themes of courage, loss, and hope.",
    "Local businesses welcomed the new pedestrian zone warmly.",
    "The orchestra rehearsed the symphony for three hours.",
    "Her argument was concise, well supported, and persuasive.",
    "The satellite transmitted data faster than expected yesterday.",
    "They negotiated calmly until both sides reached agreement.",
    "The documentary highlights voices often missing from the news.",
  ],
  hard: [
    "The architect’s preliminary sketches, though unconventional, ultimately convinced the review board.",
    "Notwithstanding the unforeseen delays, the expedition reached the base camp before nightfall.",
    "The manuscript, densely annotated in the margins, revealed a far more ambitious thesis.",
    "Environmental regulators emphasized that compliance must be verifiable, transparent, and continuous.",
    "The diplomat’s remarks, carefully worded, avoided any direct reference to the dispute.",
    "Scholars have long debated whether the fragment predates the commonly accepted chronology.",
    "The orchestra’s interpretation balanced precision with an unusually expressive rubato.",
    "Under the revised policy, applicants must demonstrate both proficiency and practical experience.",
    "The telescope’s calibration—sensitive to temperature—required an overnight stabilization period.",
    "Journalists noted that the spokesperson’s statement contradicted earlier, on-the-record comments.",
    "The watershed’s rehabilitation, costly yet necessary, will unfold across multiple seasons.",
    "Her dissertation examined how institutions adapt when technological disruption accelerates unexpectedly.",
    "The defendant maintained that the contract, ambiguously drafted, could support either reading.",
    "Meteorologists cautioned that rapidly shifting pressure systems could intensify without warning.",
    "The curator arranged the exhibition so that each room built upon the previous theme.",
    "Investors sought assurances that liabilities had been disclosed thoroughly and in good faith.",
    "The playwright’s dialogue, spare and deliberate, leaves much unsaid between the characters.",
    "Engineers tested the alloy under conditions that simulated decades of ordinary wear.",
    "The commission recommended reforms that would decentralize authority while preserving accountability.",
    "Historians caution against reading contemporary motives into sources composed centuries earlier.",
  ],
};

function hintFor(level: DictationDifficulty, setNumber: number): string {
  const hints: Record<DictationDifficulty, string[]> = {
    easy: [
      "Listen for short words and clear pauses.",
      "Picture each sentence as a single breath.",
      "Note capital letters at the start.",
      "Comma means a tiny pause.",
      "End punctuation closes the thought.",
    ],
    medium: [
      "Track clause boundaries and commas.",
      "Contractions may appear—listen closely.",
      "Names and dates are exact.",
      "Parallel lists use commas between items.",
      "Don’t guess apostrophes; replay if needed.",
    ],
    hard: [
      "Formal register; expect longer clauses.",
      "Hyphens and apostrophes must match exactly.",
      "Semicolons separate related full thoughts.",
      "Proper nouns carry precise spelling.",
      "Replay five seconds before final pass.",
    ],
  };
  const pool = hints[level];
  return pool[(setNumber - 1) % pool.length];
}

function buildCatalog(): DictationItem[] {
  const items: DictationItem[] = [];
  const transcripts = SAMPLE_TRANSCRIPTS;

  for (const difficulty of LEVEL) {
    const lines = transcripts[difficulty];
    for (let setNumber = 1; setNumber <= DICTATION_SET_COUNT; setNumber++) {
      const transcript =
        lines[(setNumber - 1) % lines.length] ??
        `Placeholder dictation for ${difficulty} set ${setNumber}.`;
      items.push({
        id: `dictation-${difficulty}-${setNumber}`,
        round: 1 as DictationRoundNum,
        difficulty,
        setNumber,
        audioPath: `/audio/dictation/${difficulty}-${setNumber}.mp3`,
        transcript,
        hintText: hintFor(difficulty, setNumber),
      });
    }
  }
  return items;
}

export const DICTATION_DATA: DictationItem[] = buildCatalog();

export function defaultDictationByDifficulty(): Record<DictationDifficulty, DictationItem[]> {
  const map: Record<DictationDifficulty, DictationItem[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const item of DICTATION_DATA) {
    map[item.difficulty].push(item);
  }
  for (const d of LEVEL) {
    map[d].sort((a, b) => a.setNumber - b.setNumber);
  }
  return map;
}

function emptyDictationFullBank(): DictationFullBank {
  const b = {} as DictationFullBank;
  for (const r of [1, 2, 3, 4, 5] as const) {
    b[r] = { easy: [], medium: [], hard: [] };
  }
  return b;
}

/** Defaults live in round 1 only; rounds 2–5 are empty until admin upload. */
export function defaultDictationFullBank(): DictationFullBank {
  const bank = emptyDictationFullBank();
  for (const item of DICTATION_DATA) {
    bank[1][item.difficulty].push(item);
  }
  for (const d of LEVEL) {
    bank[1][d].sort((a, b) => a.setNumber - b.setNumber);
  }
  return bank;
}
