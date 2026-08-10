# Interactive Reading — measured item spec

Derived from **all 6** Interactive Reading practice sets available on the DET practice hub
(captured 2026-08-10). Two were played through by hand end-to-end; the item specification for all
six was read off the session payload the page itself loads.

Only structure, counts and short fragments are recorded here — Duolingo's passages are their
copyrighted content and are deliberately **not** reproduced. This document is the authoring spec
for our own bank.

---

## Task vocabulary (their names)

| Their id | Our step | Instruction string (verbatim) |
| --- | --- | --- |
| `mpr-cloze` | 1 | Select the best option for each missing word |
| `mpr-text-completion` | 2 | Select the best sentence to complete the passage |
| `mpr-highlight-answer` | 3, 4 | Highlight text in the passage to answer the question below |
| `mpr-select-idea` | 5 | Select the idea that is expressed in the passage |
| `mpr-select-title` | 6 | Select the best title for the passage |

Placeholder in the answer box: *"Click and drag to highlight text"*.
Intro screen: title *"Interactive reading"*, max 15s.

## Timing — driven by sub-item count, not fixed

| Condition | Clock | Intro copy |
| --- | --- | --- |
| `sub_item_count >= 11` | **480s (8:00)** | "You will have 8 minutes to answer questions about a reading passage." |
| `sub_item_count < 11` | **420s (7:00)** | "You will have 7 minutes…" |

`sub_item_count` = cloze blanks + 5 (one each for the other tasks). Observed range **11–15**.
Header re-labels itself as the set shrinks: "for 6 questions" → … → "for this question".

## Passage

- Length **569–1,576 characters** (~100–270 words). The easiest set is ~100 words — passages are
  much shorter than they look on screen.
- Stored as three parts: **`beginning` + `middle` + `ending`**. `middle` **is** the text-completion
  answer. So the sentence gap is always at a fixed structural position — end of the first block —
  never floating.
- Genre range is wider than "academic":
  - **narrative** — a student and her tutor (past tense, emotional arc)
  - **first-person opinion** — why I like my local parks (informal, contractions, "It beats being stuck in a hot, stuffy gym")
  - **informational/expository** — firefighters, rainforest layers, biophysics, magnet fishing
- Reveal: step 1 shows only the blanked block; step 2 adds the gap box and the following block; from
  step 3 the whole passage is shown **with blanks filled in with the CORRECT answers**, even where
  the learner answered wrongly.

## Step 1 — cloze

- **7–10 blanks**, **5 options each**, exactly one key.
- Distractors are same-position-plausible but **not always the same part of speech**; near-homophone
  pairs appear (`affect` / `effect`).
- Critically, **function words are targeted as often as content words**:
  - copula — `which {} the science of matter` → *is*
  - relative pronoun — `the other people {} are out in nature` → *who*
  - preposition — `look {} people and pets` → *for*
  - pronoun — `prevent {} from spreading` → *it*
  - quantifier/superlative — `even the {} complex concepts` → *most*
  - light-verb collocation — `the effect certain chemicals {} on living cells` → *have*;
    `{} out the fire` → *put*; `when a fire {} out` → *breaks*
  - noun collocation — `a body of freshwater of some {}` → *kind*
  - connective/relative adverb — `sinks to the bottom, {} it can remain` → *where*
  - adjective — `one {} solution` → *novel*; `a {} daily basis` → *nearly*
- Scoring is **per blank, partial credit**. Feedback lists the whole key with the missed blanks
  emphasised and the correct ones muted.

## Step 2 — text completion

- **4 options (easiest set) or 5**.
- The key restates or bridges: it is the sentence the *next* sentence depends on. The tell is the
  connector that follows it ("Still…", "Here…", "Deeper still…", "Little did they know…").
- Distractor families observed, in rough frequency order:
  1. **adjacent topic** — true-sounding, same domain, unrelated to this paragraph's job
  2. **contradicts** the passage
  3. **fits locally, breaks the chain** — reads fine in isolation, wrong at this position
  4. **too specific** — a statistic or detail the passage never introduces
  5. **wrong genre register** — an encyclopaedic aside dropped into a personal narrative
- On submit the chosen sentence is **inserted into the passage in place**.

## Steps 3 & 4 — highlight answer

Two questions per set, both against the full passage. The key is a **character range**, so a span,
not an option.

Measured answer lengths: **16, 20, 34, 36, 41, 49, 64, 79, 89, 123 characters.**
Both extremes are real: `"the canopy layer"` (16) and `"strong social skills"` (20) sit alongside
full sentences and long clauses. **The learner cannot assume "highlight the sentence".**

Behaviour measured by deliberate wrong answers:

- **Ragged edges are forgiven** — a drag starting mid-word was accepted.
- **A different span is not forgiven, even when true and relevant** — for a "where are they located"
  stem, highlighting the sentence that describes the location was marked wrong; the key was the
  three-word noun phrase naming it.

Question stems collected (this is the family to author against):

| Family | Examples |
| --- | --- |
| Cause / result | What happens as a result of metal degradation? |
| Reason | What is the reason why magnet fishing can be beneficial financially? · Why was she nervous at first…? |
| Function / benefit | How do rainforests benefit the planet? |
| Location | Where are most of the plants, animals, and insects located…? |
| Definition / relation | How does biophysics relate to physics and biology? |
| Role / responsibility | What is the main responsibility of a fire department? |
| Addition | In addition to knowledge and physical fitness, what other skills are important…? |
| Preference / action | What does the author like to do on the river? · What is the author's favourite part…? |
| Outcome | What career did she consider after her tutoring? |

## Step 5 — select the idea

**Correction to an earlier assumption:** the key is usually a **near-verbatim restatement of one
explicitly stated sentence** — often the passage's topic sentence — not a deep inference. In the
firefighters set the key is the passage's own sentence with one word changed.

Options: **4 (easiest) or 5**, all full sentences, typically 15–25 words, all the same length so
length is not a cue. Distractor families:

1. **plausible but never stated** — "Nora's mother sought help… at a tutoring centre"
2. **adjacent true fact about the topic** — "Biophysics has been increasing in popularity"
3. **contradicts** — "Animals in one layer cannot live in another"
4. **over-generalises** beyond the passage's scope
5. **keyword bait** — recycles a salient noun from a simile or aside ("Skyscrapers are built after rainforests are cut down")

## Step 6 — select the title

- **4 or 5 options**, **Title Case**, **3–6 words**, no sentences.
- Keys observed: *An Introduction to Biophysics* · *The Role of Firefighters* · *The Help of a Good
  Tutor* · *The Benefits of Outdoor Activities* · *Rainforests and Their Importance* · *A hobby with
  an environmental upside*.
- Distractor families: adjacent topic (*Smoke Detection Devices*), too narrow (*The Layout of a Fire
  Station*), polarity flip (*The Difficulties of Firefighters*, *Rainforests are Improving*), too
  broad (*The Processes of Life*), keyword bait (*Ice Cream and Swimming*).

---

## Authoring targets for our bank

| Parameter | Value |
| --- | --- |
| Passage | 110–270 words, 3 blocks (beginning / middle-gap / ending) |
| Genre mix | ⅓ narrative, ⅓ first-person opinion, ⅓ informational — **not** all academic |
| Cloze blanks | 7–10, five options each, **at least a third targeting function words** |
| Sub-item count | ≥ 11 → 8:00 clock; below that → 7:00 |
| Text completion | 5 options; distractors drawn from the five families above |
| Highlight | 2 questions, answer spans **15–125 characters**, at least one under 40 |
| Highlight stems | drawn from the nine stem families, never all "where does it mention" |
| Idea | 5 sentence options of equal length; key = restatement of a stated sentence |
| Title | 5 Title Case phrases, 3–6 words |
