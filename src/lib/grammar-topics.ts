/**
 * The canonical English names for grammar topics.
 *
 * Persistent-weakness tracking only works if the SAME habit gets the SAME label
 * every time. Left free-form, a grader writes "article usage" on Monday and
 * "missing articles" on Friday — two rows, each stuck at one occurrence, and the
 * learner is never warned about the thing they do every single time. Every
 * production grader is handed this list, and anything that still comes back off-list
 * is snapped to it by `canonicalizeGrammarTopicEn`.
 */
export const GRAMMAR_TOPIC_CANON = [
  "Articles",
  "Subject-verb agreement",
  "Verb tense",
  "Past simple",
  "Present perfect",
  "Plurals",
  "Prepositions",
  "Word order",
  "Pronouns",
  "Countable and uncountable nouns",
  "Modal verbs",
  "Conditionals",
  "Passive voice",
  "Relative clauses",
  "Gerunds and infinitives",
  "Comparatives and superlatives",
  "Conjunctions and linkers",
  "Word form",
  "Sentence fragments",
  "Run-on sentences",
  "Punctuation",
  "Capitalization",
  "Spelling",
] as const;

/** Prompt fragment listing the allowed labels. Shared by every production grader. */
export const GRAMMAR_TOPIC_PROMPT_LIST = GRAMMAR_TOPIC_CANON.join(" | ");

/**
 * Off-list wordings the graders actually produce, mapped onto the canon.
 * Matching is substring-based on the lowercased label, longest key first.
 */
const SYNONYMS = ([
  ["a/an/the", "Articles"],
  ["definite article", "Articles"],
  ["indefinite article", "Articles"],
  ["article", "Articles"],
  ["subject-verb", "Subject-verb agreement"],
  ["subject verb", "Subject-verb agreement"],
  ["agreement", "Subject-verb agreement"],
  ["past tense", "Past simple"],
  ["past simple", "Past simple"],
  ["present perfect", "Present perfect"],
  ["tense", "Verb tense"],
  ["plural", "Plurals"],
  ["singular", "Plurals"],
  ["preposition", "Prepositions"],
  ["word order", "Word order"],
  ["pronoun", "Pronouns"],
  ["uncountable", "Countable and uncountable nouns"],
  ["countable", "Countable and uncountable nouns"],
  ["modal", "Modal verbs"],
  ["conditional", "Conditionals"],
  ["if i were", "Conditionals"],
  ["passive", "Passive voice"],
  ["relative clause", "Relative clauses"],
  ["gerund", "Gerunds and infinitives"],
  ["infinitive", "Gerunds and infinitives"],
  ["comparative", "Comparatives and superlatives"],
  ["superlative", "Comparatives and superlatives"],
  ["linker", "Conjunctions and linkers"],
  ["transition", "Conjunctions and linkers"],
  ["conjunction", "Conjunctions and linkers"],
  ["word form", "Word form"],
  ["part of speech", "Word form"],
  ["fragment", "Sentence fragments"],
  ["run-on", "Run-on sentences"],
  ["run on", "Run-on sentences"],
  ["comma splice", "Run-on sentences"],
  ["punctuation", "Punctuation"],
  ["comma", "Punctuation"],
  ["full stop", "Punctuation"],
  ["apostrophe", "Punctuation"],
  ["capitali", "Capitalization"],
  ["spelling", "Spelling"],
] as Array<[string, string]>).sort((a, b) => b[0].length - a[0].length);

/**
 * Snaps a grader's topic label onto the canon. Returns "" when nothing matches,
 * which tells the caller to fall back to the Thai label rather than invent a topic.
 */
export function canonicalizeGrammarTopicEn(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  const exact = GRAMMAR_TOPIC_CANON.find((t) => t.toLowerCase() === value);
  if (exact) return exact;
  for (const [needle, canon] of SYNONYMS) {
    if (value.includes(needle)) return canon;
  }
  return "";
}
