import { REALWORD_DIFFICULTIES, REALWORD_SET_COUNT } from "@/lib/realword-constants";
import type { RealWordCard, RealWordDifficulty, RealWordSet } from "@/types/realword";
import type { RealWordItem } from "@/types/exams";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function mapRealWordDifficulty(raw: string): RealWordDifficulty | null {
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "foundational") return "easy";
  if (s === "medium" || s === "intermediate") return "medium";
  if (s === "hard" || s === "advanced") return "hard";
  return null;
}

/** Array of `{ topic, words: [...] }` — each topic becomes one board (consecutive set slots). */
export function isRealWordGroupedTopicFormat(parsed: unknown): boolean {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  const first = parsed[0];
  if (!isRecord(first)) return false;
  return Array.isArray(first.words) && typeof first.topic === "string";
}

export type RealWordAdminMergeRow = {
  set_id: string;
  difficulty: RealWordDifficulty;
  word: string;
  is_real: boolean;
  explanationThai: string;
  synonyms: string;
};

function parseWordCellForGroup(raw: unknown, idx: number, topicLabel: string): Omit<RealWordAdminMergeRow, "set_id" | "difficulty"> {
  if (!isRecord(raw)) {
    throw new Error(`Topic "${topicLabel}": word ${idx + 1} must be an object`);
  }
  const word = raw.word;
  if (typeof word !== "string" || !word.trim()) {
    throw new Error(`Topic "${topicLabel}": word ${idx + 1} must have a non-empty "word" string`);
  }
  const is_real = raw.is_real === true;
  const explanationThai =
    raw.explanationThai == null ? "" : String(raw.explanationThai);
  let synonyms = "";
  if (raw.synonyms == null) synonyms = "";
  else if (typeof raw.synonyms === "string") synonyms = raw.synonyms;
  else if (Array.isArray(raw.synonyms)) {
    synonyms = raw.synonyms.filter((x): x is string => typeof x === "string").join(", ");
  } else {
    synonyms = String(raw.synonyms);
  }
  return {
    word: word.trim(),
    is_real,
    explanationThai,
    synonyms,
  };
}

/**
 * Turn `[{ topic, words: [...] }, ...]` into flat merge rows with distinct set_id per topic.
 * Assigns consecutive empty set numbers from selectedSetStart (within round + difficulty occupancy).
 */
export function expandGroupedRealWordTopicsToMergeRows(
  parsed: unknown[],
  selectedRound: number,
  selectedDifficulty: RealWordDifficulty,
  selectedSetStart: number,
  occupiedSetNumbers: Set<number>,
): { rows: RealWordAdminMergeRow[]; assignedSetNumbers: number[] } {
  const rows: RealWordAdminMergeRow[] = [];
  const assignedSetNumbers: number[] = [];
  const used = new Set(occupiedSetNumbers);

  let searchFrom = selectedSetStart;
  for (let g = 0; g < parsed.length; g++) {
    const item = parsed[g];
    if (!isRecord(item)) {
      throw new Error(`Group ${g + 1}: must be an object`);
    }
    const topic = item.topic;
    const words = item.words;
    if (typeof topic !== "string" || !topic.trim()) {
      throw new Error(`Group ${g + 1}: "topic" must be a non-empty string`);
    }
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error(`Group ${g + 1} ("${topic.trim()}"): "words" must be a non-empty array`);
    }

    let targetSet: number | null = null;
    for (let n = searchFrom; n <= REALWORD_SET_COUNT; n++) {
      if (!used.has(n)) {
        targetSet = n;
        break;
      }
    }
    if (targetSet == null) {
      throw new Error(
        `Not enough empty set slots from set ${selectedSetStart} for topic "${topic.trim()}" (need ${parsed.length - g} more slot(s)).`,
      );
    }
    used.add(targetSet);
    assignedSetNumbers.push(targetSet);
    searchFrom = targetSet + 1;

    const topicSlug = topic.trim().toLowerCase().replace(/\s+/g, "-");
    const setId = `RW_R${selectedRound}_${selectedDifficulty.toUpperCase()}_S${String(targetSet).padStart(2, "0")}_TOPIC_${topicSlug}`;

    const label = topic.trim();
    for (let i = 0; i < words.length; i++) {
      const cell = parseWordCellForGroup(words[i], i, label);
      rows.push({
        set_id: setId,
        difficulty: selectedDifficulty,
        ...cell,
      });
    }
  }

  return { rows, assignedSetNumbers };
}

function parseSetNumberFromSetId(setId: string): number | null {
  const nums = setId.match(/\d+/g);
  if (!nums?.length) return null;
  const n = Number.parseInt(nums[nums.length - 1]!, 10);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= REALWORD_SET_COUNT) return n;
  return null;
}

function parseOne(raw: unknown, idx: number, defaultDifficulty?: RealWordDifficulty): RealWordItem {
  if (!isRecord(raw)) throw new Error(`Row ${idx + 1}: must be an object`);
  const set_id = raw.set_id;
  const difficultyRaw = raw.difficulty;
  const word = raw.word;
  const is_real = raw.is_real;
  if (typeof set_id !== "string" || !set_id.trim()) throw new Error(`Row ${idx + 1}: set_id required`);
  if (typeof word !== "string" || !word.trim()) throw new Error(`Row ${idx + 1}: word required`);
  if (typeof is_real !== "boolean") throw new Error(`Row ${idx + 1}: is_real must be boolean`);
  const explanationThai =
    raw.explanationThai == null ? undefined : String(raw.explanationThai);
  const synonyms = raw.synonyms == null ? undefined : String(raw.synonyms);
  let d: RealWordDifficulty | null = null;
  if (typeof difficultyRaw === "string" && difficultyRaw.trim()) {
    d = mapRealWordDifficulty(difficultyRaw);
    if (!d) throw new Error(`Row ${idx + 1}: unknown difficulty`);
  } else if (defaultDifficulty) {
    d = defaultDifficulty;
  } else {
    throw new Error(`Row ${idx + 1}: difficulty required (add to JSON or choose level in admin)`);
  }
  return {
    set_id: set_id.trim(),
    difficulty: d,
    word: word.trim(),
    is_real,
    explanationThai,
    synonyms,
  };
}

/**
 * Flat rows where each word line already has `set_id` (possibly multiple ids → multiple boards).
 * Not the grouped `{ topic, words: [] }` format.
 */
export function isFlatRowsWithSetIdPerWord(parsed: unknown): boolean {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  if (isRealWordGroupedTopicFormat(parsed)) return false;
  return parsed.every((r) => {
    if (!isRecord(r)) return false;
    return (
      typeof r.set_id === "string" &&
      r.set_id.trim().length > 0 &&
      typeof r.word === "string" &&
      typeof r.is_real === "boolean"
    );
  });
}

/** Group flat rows by difficulty + set_id → game boards (setNumber 1–20). */
export function parseRealWordBankJson(
  text: string,
  options?: { defaultDifficulty?: RealWordDifficulty },
): RealWordSet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON must be a non-empty array");
  }

  const def = options?.defaultDifficulty;
  const rows = parsed.map((r, i) => parseOne(r, i, def));

  type GroupKey = `${RealWordDifficulty}::${string}`;
  const groups = new Map<GroupKey, RealWordItem[]>();

  for (const row of rows) {
    const d = row.difficulty;
    const key = `${d}::${row.set_id}` as GroupKey;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const out: RealWordSet[] = [];
  const usedNumbers: Record<RealWordDifficulty, Set<number>> = {
    easy: new Set(),
    medium: new Set(),
    hard: new Set(),
  };

  const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const items = groups.get(key)!;
    const first = items[0]!;
    const d = first.difficulty;
    let setNumber = parseSetNumberFromSetId(first.set_id);
    if (setNumber == null || usedNumbers[d].has(setNumber)) {
      for (let n = 1; n <= REALWORD_SET_COUNT; n++) {
        if (!usedNumbers[d].has(n)) {
          setNumber = n;
          break;
        }
      }
    }
    if (setNumber == null || setNumber < 1 || setNumber > REALWORD_SET_COUNT) {
      throw new Error(`Too many sets for level ${d} (max ${REALWORD_SET_COUNT})`);
    }
    usedNumbers[d].add(setNumber);

    const words: RealWordCard[] = items.map((it) => ({
      word: it.word,
      is_real: it.is_real,
      explanationThai: it.explanationThai?.trim() ?? (it.is_real ? "—" : ""),
      synonyms: it.synonyms?.trim() ?? "",
    }));

    const realCount = words.filter((w) => w.is_real).length;
    if (realCount < 1) throw new Error(`Set ${first.set_id}: need at least one real word`);

    out.push({
      setNumber,
      setId: first.set_id,
      difficulty: d,
      words,
    });
  }

  return out;
}

export function realWordSetsToBank(sets: RealWordSet[]): Record<RealWordDifficulty, RealWordSet[]> {
  const bank: Record<RealWordDifficulty, RealWordSet[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const s of sets) {
    bank[s.difficulty].push(s);
  }
  for (const d of REALWORD_DIFFICULTIES) {
    bank[d] = [...bank[d]].sort((a, b) => a.setNumber - b.setNumber);
  }
  return bank;
}
