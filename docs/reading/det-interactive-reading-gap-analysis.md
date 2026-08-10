# DET Interactive Reading vs. our ทักษะการอ่าน — gap analysis

Source: Duolingo English Test → Practice → Reading → **Interactive Reading**
(`englishtest.duolingo.com/test/practiceHub/multipurpose-reading`), captured 2026-08-10.
Two sets played end-to-end by hand; the item specification for **all six** available sets was then
read off the session payload. The measured parameters live in
[det-interactive-reading-item-spec.md](det-interactive-reading-item-spec.md) — **that file, not this
one, is the authoring spec.** Two claims in the first draft of this document were wrong once the
full sample was in and are corrected below: the passages are shorter than they look, and step 5 is a
restatement question rather than an inference question.

Our side: `src/app/practice/lessons/reading-skills/*`,
`src/components/lessons/{MissingParagraph,FindInfo,MainIdea}LessonRunner.tsx`,
`src/lib/{missing-paragraph,find-info,main-idea}-lessons*.ts`.

---

## 1. What Interactive Reading actually is

**It is not 6 separate questions. It is ONE passage answered 6 ways, in a fixed order, on one clock.**

| Property | Observed |
| --- | --- |
| Passage | **100–270 words** across the six sets, 2–4 paragraphs. Genre is *not* only expository — one narrative and one first-person opinion piece are in the set |
| Layout | Split screen — passage left (scrollable), question right, single `SUBMIT` bottom-right |
| Clock | **480s if the set has ≥11 sub-items, 420s if fewer** (sub-items = cloze blanks + 5). Header counts down and re-labels: "7:53 **for 6 questions**" → "for 5 questions" → … → "for this question" |
| Reveal | Text not yet needed is **faded out**, not hidden. The passage grows as you answer |
| Feedback | Instant, per step, then `CONTINUE`. Green "Great job!" / amber "Partially correct" / red "Incorrect" |
| Explanation | **None. Ever.** Wrong answers show only the correct answer string |
| Order | Identical in both runs (see below) — the sequence is fixed, only the passage changes |

### The fixed 6-step sequence

| # | Prompt (verbatim) | Format | Skill tested |
| --- | --- | --- | --- |
| 1 | *Select the best option for each missing word* | 6–10 numbered inline blanks, each a **5-option dropdown** | Lexical + grammatical fit in context (collocation, connectives, relative adverbs, verb choice) |
| 2 | *Select the best sentence to complete the passage* | One gap, **5 full-sentence options**, chosen sentence is inserted into the passage in place | Cohesion / discourse — what belongs at this exact position |
| 3 | *Highlight text in the passage to answer the question below* | Free **click-and-drag** selection, mirrored live into an answer box | Locating a specific fact, question is paraphrased |
| 4 | Same as 3, second question | Same | Same |
| 5 | *Select the idea that is expressed in the passage* | 5 statement options | Inference / restatement — which claim the passage actually supports |
| 6 | *Select the best title for the passage* | 5 **short title phrases** | Gist / scope |

### Step 1 detail (heaviest step)

- Blank count varies by passage: **10** (magnet fishing), **6** (rainforest).
- Every blank has exactly **5 options**, one word each, same part of speech.
- Targets a spread of skills, not just vocabulary:
  - noun-phrase collocation — `a body of freshwater of some ___` → *kind* (vs amount/reason/place/time)
  - participial connective — `polluted, ___ human trash` → *containing*
  - relative adverb — `sinks to the bottom, ___ it can remain` → *where* (vs which/why/what/when)
  - lexical verb — `to ___ what they can discover` → *see*; `hard to ___ what might be lying below` → *know*
  - adjective — `One ___ solution` → *novel*
- **Partial credit.** Amber panel lists the answer key blank-by-blank, with the ones you got wrong **bold + underlined** and the ones you got right in plain grey: `1. full  2. throughout  3. divided  4. reach  5. made  6. species`.

### Step 2 detail

The gap is a bordered empty box sitting **between two paragraphs** (magnet fishing) or **at the start of the final paragraph** (rainforest) — position varies. Distractor families observed:

- **off-topic / wrong frame** — "The zookeepers help take care of the animals and their health."
- **contradicts the passage** — "This is why the layer below is mostly empty with no living beings."
- **true-ish but wrong position** — "Not only these, but many other animals live in this layer as well." (reads fine locally, breaks the paragraph's logical progression)
- **plausible but unsupported detail** — "Typically, a skilled magnet fisher can remove up to 50 pounds of trash…"
- **correct** — completes the causal/spatial chain the next sentence depends on ("Deeper still, the understory layer receives only a little sunlight." → next line: "Here, you'll find animals like jaguars…"; "Occasionally, magnet fishers have discovered truly valuable antiques…" → next line: "**Still**, most magnet fishers can collect some metal to sell.")

The correct option is identified by the **connector in the following sentence** ("Still…", "Here…"). That is the teachable move.

### Steps 3–4 detail (highlight)

Question stems are **varied**, not one template:

| Stem observed | Answer highlighted | Length |
| --- | --- | --- |
| What happens as a result of metal degradation? | "becomes detrimental to aquatic plants and animals living in the ecosystem." | 11 words |
| What is the reason why magnet fishing can be beneficial financially? | "old pieces of scrap metal can be sold to recyclers to convert into new products." | 15 words |
| How do rainforests benefit the planet? | "they produce a large amount of the world's oxygen" | 9 words |
| Where are most of the plants, animals, and insects located in the rainforests? | **"the canopy layer"** | **3 words** |

Scoring behaviour, measured:

- **Ragged edges are forgiven.** A drag that started mid-word (`"se old pieces of scrap metal…"`) was accepted.
- **Wrong span is not forgiven, even when semantically adjacent.** For "Where are most … located?" I highlighted *"…is layer is home to most of the rainforest species includi…"* — a true, relevant, longer sentence — and it was marked **Incorrect**; the key was the 3-word noun phrase "the canopy layer".
- So the target is a **specific span**, and answers can be as short as a noun phrase. Learners must be trained to highlight *the minimal phrase that answers the stem*, not the sentence containing it.
- The selected text is mirrored into a read-only box on the right as you drag — constant confirmation of what you've actually selected.

### Step 5 detail — "the idea that is expressed"

This is **not** a main-idea question, but nor is it deep inference — across all six sets the key is a
**near-verbatim restatement of one explicitly stated sentence**, usually the topic sentence. (The
firefighters set uses the passage's own sentence with a single word changed.) Distractor families:

- unstated-but-plausible — "Thousands of magnets are dumped in freshwater as trash every year."; "Many scientists are researching the animals that live in the rainforest."
- contradicted — "Animals in one layer cannot live in another layer of the rain forest."
- over-generalised — "Most personal hobbies tend to have an environmental benefit."; "The primary type of trash found in bodies of freshwater is metal."
- off-topic — "Skyscrapers are built after rainforests are cut down and cleared." (recycles the word *skyscrapers* from a simile in the text — keyword bait)
- **correct** — a paraphrase of something actually asserted: "Metal trash can be removed from water with powerful magnets."; "There are different layers in the rain forest which are home to different animals."

### Step 6 detail — "the best title"

Options are **short phrases, 3–6 words**, not sentences:

> A hobby with an environmental upside · The pros and cons of magnet fishing · Magnet fishing versus traditional fishing · How to make money selling magnets · The preservation of oceans and seas

> Decreasing the Rainforest · Living in Tropical Forests · Rainforests are Improving · **Rainforests and Their Importance** · Fewer Layers of Rainforests

Distractor families: too narrow, wrong direction/polarity, too broad, keyword bait, factually contradicted.

---

## 2. What we have today

| Sub-lesson | Format | Passage | Feedback |
| --- | --- | --- | --- |
| หาย่อหน้าที่หายไป (`missing-paragraph`) | 2 paragraphs (~50 words each), one gap **always between P1 and P2**, **4** sentence options; then a keyword→Thai matching mini-game | 70 items (easy 30 / medium 30 / advanced 10) | Full EN + TH rationale for the picked option and the key |
| หาข้อมูลเฉพาะ (`find-info`) | **Tap first word, tap last word** to highlight. Question always *"Where does the passage mention …?"* | Same 70 passages | Paraphrase pair (question term = passage term = Thai) + rationale + save-to-notebook |
| ใจความสำคัญ + ชื่อเรื่อง (`main-idea`) | Keyword tutorial walkthrough, then **one** question: *"อะไรคือใจความสำคัญ / ชื่อเรื่องที่เหมาะสมที่สุดของบทความนี้?"*, 4 sentence options (9–14 words) | Same 70 passages | Rationale for picked + correct |

Grading in `find-info`: selection must **cover** the target range and add no more than `EXTRA_WORD_TOLERANCE = 5` extra words.

---

## 3. The gaps

### G1 — We are missing the highest-weight question type entirely
Step 1 ("select the best option for each missing word") is 6–10 scored sub-answers with partial credit — by volume, the largest single scoring surface in Interactive Reading. **We have no lesson for it.** (`GrammarFitb` is standalone sentence-level grammar, not 5-way lexical choice embedded in a live passage.)

### G2 — `main-idea` conflates two different DET questions
DET separates *"the idea that is expressed"* (a **statement**, inference) from *"the best title"* (a **short phrase**, gist). Our single prompt asks for both and only ever offers sentence-length options. A learner trained on our version will pick a sentence-shaped answer on a title question and will not have practised the inference question at all.

### G3 — Our "idea" distractors use the wrong logic
Our distractors are **true details lifted from the passage** ("Bones and muscles handle mechanical stress in the human body." — *"true, but only one specific example"*). That is the correct distractor logic for a **title / main-idea** question. For DET's *"idea that is expressed"*, distractors are the opposite: things **not** stated — unsupported, contradicted, over-generalised, or keyword bait. So the drill currently teaches the rule "the true detail is the wrong answer", which is actively misleading for step 5, where the correct answer *is* a restated fact.

### G4 — Highlight mechanic and question stems diverge
- Interaction: ours is tap-first-word / tap-last-word; DET is **click-and-drag with a live mirror box**. Different motor task, and DET's mirror box is what teaches learners to check their own selection.
- Stem variety: ours is always *"Where does the passage mention …?"* — which telegraphs "hunt the synonym". DET uses **what happens as a result / what is the reason why / how does X benefit / where is X located**, i.e. cause, reason, function, location. Two of those require reading a relationship, not matching a word.
- Tolerance: our `+5 extra words` and cover-the-target rule rewards over-highlighting. DET punished exactly that. Our answer spans skew long (mode 6 and 8 words, up to 14); DET accepted a 3-word noun phrase as the whole answer.

### G5 — Passage shape and the chain
DET: **one** ~275-word, 4-paragraph passage answered 6 ways, progressively revealed, 8-minute clock, per-step partial credit.
Ours: ~100-word 2-paragraph passages, one question each, no clock, no chain, no partial credit. Learners never rehearse the actual thing — carrying one text through six escalating demands under time.

### G6 — Missing-paragraph gap is structurally narrower than DET's
Ours: gap always between P1 and P2, 4 options, distractor types `off_topic | too_narrow | meta`.
DET: gap can sit **anywhere** including at a paragraph head, 5 options, and includes a **wrong-position / broken-continuity** distractor that reads perfectly well in isolation. That distractor is the one that separates B2 from C1, and we don't model it.

---

## 4. What was built (2026-08-10)

Everything below was implemented; this section is the record, section 5 is what remains.

**One engine, one format.** `src/components/reading/InteractiveReadingRunner.tsx` is the only
reading runner in the app. A full set is that runner over one passage with all six steps and the
clock; a single-skill drill is the same runner over several passages with one or two steps switched
on. The three in-house drill layouts are gone from the learner's path — `find-info`,
`missing-paragraph` and `main-idea` now serve the real screen, the real instruction strings and the
real grading, and their old `[tier]/[unit]` URLs redirect. A fourth drill, `cloze`, was added for the
step we previously had no lesson for at all.

**Grading matched to measured behaviour.** Cloze is scored per blank with partial credit and the
DET-style key panel. Highlight forgives ragged edges but allows only two spare words, so
over-highlighting fails the way it fails on the real test.

**Content authored to the measured spec.** Seven sets: two B1, three B2, two C1; 162–247 words;
7, 8 and 10 blanks (12–15 sub-items); genre split across first-person opinion, narrative and
informational. Every blank, distractor and highlight carries a Thai explanation — the thing DET
never gives.

**A validator, so the format cannot drift.** `scripts/validate-interactive-reading.mjs` checks every
set against the measured parameters: passage length, tier↔CEFR agreement, blank count and option
count, the function-word share, marker/blank agreement, gap position, highlight span length and stem
family, the "at least one short answer" rule, option-length evenness on the idea question, and
Title Case 3–6 words on titles. It caught four real deviations in the first bank (a B2 narrative
filed under the easy tier, a C1 set filed under medium, a 14-character highlight span below the real
floor, and a seven-word title) — all fixed.

## 5. Still open

**Bank — done.** All 70 retired passages were converted and 7 were authored fresh: **77 sets, 462
graded steps, 993 scored sub-items, 608 cloze blanks, 4,195 answer options, 1,917 Thai
explanations.** Tier spread 32 easy / 33 medium / 12 advanced, inherited from the legacy bank. The
drills now run 77 / 77 / 154 / 154 questions.

Conversion was not mechanical: the legacy blocks are 54 + 54 words, and a 54-word opening cannot
carry 7–10 blanks at the real density, so every opening was extended to ~100–200 words. The legacy
idea distractors were discarded wholesale — they are true details, which is title-question logic and
wrong for "select the idea that is expressed". `scripts/scaffold-reading-set.mjs` carries over what
does map (passage, sentence options with their Thai rationales, one highlight); everything else was
authored.

**Still open:**

- **The retired banks.** `missing-paragraph-lessons-data.ts`, `find-info-lessons-data.ts` and
  `main-idea-lessons-data.ts` are now fully mined and unreachable from any route, and
  `{FindInfo,MainIdea,MissingParagraph}LessonRunner.tsx` are unreferenced. All six files can be
  deleted.
- **Advanced tier is thin** — 12 of 77, because the legacy bank was 30/30/10. Anyone pushing for a
  high score has the least material. Authoring ~10 more C1 sets would balance it.
- **Notebook save.** The old `find-info` runner let a learner save the paraphrase pair to their
  vocabulary notebook. The new highlight step does not; worth adding back to the feedback bar.
- **Dev-server note.** Turbopack's route graph went stale mid-session and returned 404 for the whole
  `/practice/lessons` subtree, including untouched routes and a brand-new trivial page. `rm -rf
  .next` fixes it. Not a code fault — worth knowing before debugging a phantom routing bug.
