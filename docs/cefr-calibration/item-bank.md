# CEFR Calibration — Item Bank & Estimation Logic

Companion to [`spec.md`](./spec.md). This is the **content proposal**: the actual questions per
task type per level, and the exact logic that turns responses into a CEFR/DET level estimate.

Task types (as requested): **dictation · fill-in-the-blank · choose real words · reading ·
listening · conversation · write-about-photo**.

Every item carries a **difficulty anchor θ** on the 10–160 DET scale. That anchor is the bridge
between "did they get it right" and "what level are they."

## Difficulty anchors (the backbone)

| Level | θ anchor | Used as the "value" of a correct item at that level |
|-------|----------|------|
| A2 | 55 | |
| B1 | 80 | |
| B2 | 112 | |
| C1 | 140 | |
| C2 | 158 | |

Every item below is tagged with its level → its θ. The estimator (bottom of doc) uses θ, not
raw counts.

---

# 1. DICTATION (Listening + spelling/parsing)

Hear a sentence once or twice, type it. Difficulty scales by **length, word frequency, syntactic
complexity, and connected-speech** (weak forms, contractions). Scored by token edit-distance
(`dictation-diff.ts`) → % words correct → partial credit.

| Level | θ | Sentence (what's played) | What makes it this level |
|-------|---|--------------------------|--------------------------|
| A2 | 55 | *My sister works in a big hospital near the station.* | 10 common words, present simple |
| B1 | 80 | *Although it was raining, we decided to walk to the market together.* | concessive clause, 12 words |
| B2 | 112 | *The committee has postponed the meeting until further notice because of the ongoing negotiations.* | perfect aspect, lower-freq lexis, subordination |
| C1 | 140 | *Had the researchers anticipated the anomaly, they would have adjusted their methodology accordingly.* | inversion, 3rd conditional, academic vocab |
| C2 | 158 | *The ostensibly innocuous amendment nevertheless precipitated a cascade of unforeseen complications.* | dense low-frequency, abstract, weak-form heavy |

**Scoring:** `% words correct` per sentence (0–1). A word is "correct" within a small edit-distance
tolerance (typos vs. genuine mishears differ — an edit-distance ≥ 2 on a content word counts as a
miss). The A2 line is a floor check (near-everyone passes); B2/C1/C2 lines carry the discrimination.

---

# 2. FILL IN THE BLANK (Reading — grammar & form)

C-test style: the word **stem** is given, so it tests grammatical *form*, not vocabulary recall
(same design as the existing "Little Bakery" passage). One passage can hold blanks of several
levels — each blank is tagged separately, which is efficient (one task → signal across levels).

| Level | θ | Blank (context → answer) | Grammar target |
|-------|---|--------------------------|----------------|
| A2 | 55 | *She go___ to school every day.* → **goes** | present simple 3rd-person -s |
| A2 | 55 | *There are three cat___ in the garden.* → **cats** | regular plural |
| B1 | 80 | *Yesterday we buy___ → **bought** a new car.* | past simple, irregular |
| B1 | 80 | *He has lived here since___ he was___ born.* → **was** | since + past |
| B2 | 112 | *The bridge, which build___ → **was built** in 1920, is still used.* | past passive in relative clause |
| B2 | 112 | *If I had known, I would ___ (tell) → **have told** you.* | 3rd conditional |
| C1 | 140 | *Not only did he apolog___ → **apologize**, but he also...* | inversion after "not only" |
| C1 | 140 | *Were the plan to fail___ → **fail**, we would...* | subjunctive-conditional inversion |
| C2 | 158 | *Little did they realiz___ → **realize** the gravity...* | fronting + inversion, register |
| C2 | 158 | *Suffice it to say___ → **say**, the results were mixed.* | fixed subjunctive idiom |

**Scoring:** each blank 0/1 (with close-spelling tolerance from `gradeFitbBlank()`). Level signal =
the proportion correct within each θ tier.

---

# 3. CHOOSE REAL WORDS (Vocabulary breadth — lexical decision)

A grid of words; the student marks which are **real English words**. Fakes are morphologically
plausible pseudowords. Vocabulary size correlates strongly with overall proficiency; the level of a
real word = its **frequency band**. This is the classic validated "Yes/No vocabulary test."

| Level | θ | Real words (mark ✓) | Plausible fakes (mark ✗) |
|-------|---|---------------------|--------------------------|
| A2 | 55 | house · quickly · water · friend | morb · plent · gronesty |
| B1 | 80 | manage · weather · decision · industry | flimper · descide · manageful |
| B2 | 112 | reluctant · allocate · conceive · superficial | conceptful · allocute · reluctation |
| C1 | 140 | ubiquitous · tacit · mitigate · nuance | mitigant · ubiquitary · tacify |
| C2 | 158 | perspicacious · obfuscate · sedulous · defenestrate | perspicuity(real!→avoid) · obfusive · sedulate |

**Scoring — with guessing correction (important for accuracy):**
```
hit rate      h = (real words marked ✓) / (real words shown)
false-alarm   f = (fakes marked ✓)      / (fakes shown)
corrected score  =  h − f          # someone who ticks everything scores ~0, not 100%
```
The corrected score per frequency band → a vocabulary-size estimate → its θ. False-alarm correction
is what stops a "tick everything" strategy from inflating the level — it's the single biggest
accuracy lever in this task.

---

# 4. READING (comprehension)

A passage + MCQ. Scales by **text length, lexical density, and question type** (literal → detail →
inference → tone/argument).

**A2 (θ 55)** — a short notice:
> *The library is open from 9 a.m. to 6 p.m. on weekdays. On Saturdays it closes at 1 p.m. It is
> closed on Sundays.*
> **Q:** When can you use the library on Saturday afternoon? → *(You can't — it closes at 1 p.m.)*  *[literal]*

**B1 (θ 80)** — a short personal article:
> *When I moved to the city, I missed the quiet of my village. But over time I grew to love the
> energy of the streets...*
> **Q:** How did the writer's feeling change? → *from missing home → to enjoying the city* *[main idea]*

**B2 (θ 112)** — an opinion piece:
> *Proponents of remote work cite productivity gains, yet they often overlook the erosion of
> spontaneous collaboration...*
> **Q:** What is the author's attitude to remote work? → *cautiously critical / sees a trade-off* *[attitude/inference]*

**C1 (θ 140)** — an academic abstract:
> *While the intervention yielded statistically significant gains, the effect size was modest and
> the confounds non-trivial...*
> **Q:** What does the author imply about the study's conclusions? → *they should be treated with caution* *[argument structure]*

**C2 (θ 158)** — dense/abstract prose:
> a paragraph with irony, hedging, and layered qualification.
> **Q:** which statement best captures the author's *tone*? *[nuance/tone]*

**Scoring:** each MCQ 0/1, tagged to the passage's θ.

---

# 5. LISTENING (audio comprehension MCQ)

Audio clip (via `speech-synthesize` or recorded) + MCQ. Scales by **speech rate, vocabulary,
inference load**, and whether the answer is stated vs. implied.

| Level | θ | Clip | Question type |
|-------|---|------|---------------|
| A2 | 55 | slow station announcement: *"The train to Chiang Mai now leaves from platform 4."* | literal detail (which platform?) |
| B1 | 80 | short dialogue arranging to meet | gist + detail (where/when do they meet?) |
| B2 | 112 | a short interview | speaker's **attitude** |
| C1 | 140 | a lecture excerpt | main **argument** / how a point supports it |
| C2 | 158 | rapid two-person debate | **implication / what is NOT said but meant** |

**Scoring:** each MCQ 0/1 at its θ. (This is the existing `interactive_listening` engine — reuse.)

---

# 6. CONVERSATION (Speaking — multi-turn, Gemini-graded)

Reuses `interactive-speaking` + the Gemini grader. Unlike the receptive tasks, **level is not
laddered by item difficulty — it is graded directly from the response** against CAN-DO descriptors.
The trick is one prompt whose **follow-ups escalate**, so the same task probes A2 up to C1+:

> **Prompt:** *"Tell me about your hometown."*
> → follow-up 1 *(B1):* "What would you change about it?"
> → follow-up 2 *(B2):* "How has it changed over the last ten years?"
> → follow-up 3 *(C1):* "Some people say small towns are dying. What's your view — and what should be done?"

The rubric (existing 4 criteria) maps to CEFR:

| Criterion | A2 | B1 | B2 | C1 |
|-----------|----|----|----|----|
| **Grammar range** | simple present, frequent errors | past/future, some complex, errors don't block | varied tenses, mostly accurate | wide range, rare slips |
| **Lexical range** | basic, concrete | everyday + some topic words | some idiomatic/abstract | precise, idiomatic, register-aware |
| **Fluency/coherence** | short, halting, listable | connected with basic linkers | clear, well-linked | smooth, structured argument |
| **Interaction** | answers literally | develops a point | responds to the twist | debates, concedes, nuances |

**Output:** Gemini returns per-criterion 0–100 **and** a `cefrLevel` field → θ. Confidence comes
from criterion agreement (all four pointing to the same band = high confidence).

---

# 7. WRITE ABOUT PHOTO (Writing — Gemini-graded)

Reuses `write_about_photo` + `gemini-writing.ts`. Same idea: **one image, escalating task**, and the
rubric returns a CEFR level directly.

> **Image:** a busy street market.
> → *A2 task:* "Describe what you see." (3–4 sentences)
> → *B1 task:* "What are the people doing, and why might they be there?"
> → *B2 task:* "Describe the scene and speculate about what happens next."
> → *C1 task:* "Describe the scene and argue whether markets like this should be preserved."

The student writes one response; the grader reads range + accuracy + task fulfilment against the
level the response actually reaches (a student can attempt the higher task or stop at the lower —
the writing itself reveals the ceiling).

| Criterion (existing weights) | Signal for level |
|---|---|
| Grammar 40% | range & accuracy of structures attempted |
| Vocabulary 30% | frequency band & precision of word choice |
| Coherence 20% | linking, paragraphing, argument |
| Task 10% | did they meet the A2 / B1 / B2 / C1 demand |

**Output:** 4-criterion 0–160 **and** `cefrLevel` → θ.

---

# 8. HOW THIS BECOMES A LEVEL ESTIMATE (the accuracy engine)

Two different estimators, because receptive and productive evidence differ.

## 8a. Receptive skills (dictation, FITB, real-words, reading, listening)

Each item is a **pass/fail (or partial) observation at a known difficulty θ**. A student's ability
`θ̂` is the point where their success probability crosses ~60%. Practically:

1. **Adaptive routing (fewer items, same precision).** Stage 1 serves ~B1/B2 (θ≈80–112) items. If
   they pass, Stage 2 serves C1/C2 items; if they fail, Stage 2 serves A2/B1 items. This
   concentrates every item **near the student's boundary**, which is where a question actually
   carries information. A well-placed 5–6 items ≈ a fixed 15-item test.

2. **Ability estimate.** Order the attempted items by θ. `θ̂` = the highest θ tier where the student
   scores ≥ 60%, **interpolated upward** by partial success on the next tier:
   ```
   θ̂ = θ(highest passed tier) + passRate(next tier) × (θ(next) − θ(passed))
   ```
   Example: passes B2 tier fully, gets 1/2 of C1 tier → θ̂ = 112 + 0.5×(140−112) = **126** → B2 (high).

3. **160-number & band.** `θ̂` is already on the 10–160 scale → `toCefr(θ̂)` gives the CEFR band.

## 8b. Productive skills (conversation, write-about-photo)

The Gemini rubric returns a CEFR level + per-criterion scores directly (§6, §7). `θ` = the anchor
of that level, nudged by the 4-criterion average within the band. Confidence = criterion agreement.

## 8c. Combine → the score card

- 4 skill θ̂ → 4 CEFR bands + 4 DET-equivalent numbers.
- **Overall** = average → its band.
- **Integrated subscores** (DET-style): Literacy=(R+W)/2, Comprehension=(R+L)/2,
  Conversation=(L+S)/2, Production=(W+S)/2 → each banded.

## 8d. Where the "accuracy" comes from (and how we report it)

- **Adaptive placement** — items land near the boundary, maximizing information per question.
- **Guessing correction** — false-alarm correction on real-words; edit-distance (not exact match)
  on dictation → less noise.
- **Multiple task types per skill** — reading level = FITB **and** passage **and** real-words
  agreeing; disagreement widens the confidence margin instead of picking a wrong point.
- **Cross-skill consistency check** — the integrated subscores should be internally consistent; a
  large divergence (e.g., C1 reading but A2 listening) flags a possible fluke → offer a re-check of
  the odd skill rather than trusting one item.
- **Reported as a band, not false precision:** e.g. *"B2 — borderline C1 (Reading)."* We surface the
  margin, so schools/students see calibrated confidence, not a fake single number.

## 8e. Worked example (one student)

| Skill | Evidence | θ̂ | Band |
|-------|----------|----|------|
| Reading | FITB: A2✓✓ B1✓✓ B2✓✓ C1✓✗ ; passage B2✓ C1✗ ; real-words corrected score → B2 | 118 | **B2** |
| Listening | dictation A2✓ B1✓ B2 70% C1 20% ; listen-MCQ B2✓ C1✗ | 110 | **B2** |
| Writing | photo task → grammar 78 / vocab 70 / coherence 72 / task(B2) met → rubric B2 | 108 | **B2** |
| Speaking | conversation → handles B2 follow-up, stumbles on C1 view → rubric B1–B2 | 96 | **B1** |
| **Overall** | avg(118,110,108,96)=108 | 108 | **B2** |

Integrated: Literacy (R+W)/2=113 **B2** · Comprehension (R+L)/2=114 **B2** · Conversation (L+S)/2=103
**B2** · Production (W+S)/2=102 **B2**. Speaking is the outlier (B1) → report flags "Speaking is your
lowest — one level below the rest," which is exactly the study-plan hook.

---

# 9. Content volume to author for launch

Per skill task, we need ~2 items per level (A2–C2) so the adaptive engine has choices and items
don't burn out:

| Task | Items to write (2 × 5 levels) |
|------|-------------------------------|
| Dictation | 10 sentences |
| Fill-in-blank | 2 passages, ~10 tagged blanks each |
| Choose real words | 5 grids (10 words each: ~6 real + 4 fake per level) |
| Reading | 5 passages × 2 Qs = 10 |
| Listening | 5 clips × 2 Qs = 10 |
| Conversation | 2 escalating prompts |
| Write-about-photo | 2 images × escalating tasks |

~50 receptive items + a handful of productive prompts = a full first bank. The tables above are the
seed set; Phase-1 authoring fills the second item per level.
