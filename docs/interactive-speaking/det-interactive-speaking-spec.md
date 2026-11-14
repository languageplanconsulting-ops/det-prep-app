# Interactive Speaking — task spec and authoring rules

Researched 2026-11-14 in Chrome from Duolingo's own sources:

| Source | What it gave |
| --- | --- |
| Help Center → *Interactive Speaking* (go.duolingo.com/det-questions) | directions, turn count, timing, section length, tips |
| Help Center → *Test Structure* | where the task sits and how often it appears |
| Help Center → *How the Items Are Scored* | what the grading engine looks at |
| DET Technical Manual, July 2026 edition (§3.1 pp. 8–10, Figure 5; §4.2 p. 22) | conversation design, topic count, how follow-ups are chosen, fairness review |
| Official Guide for test takers (PDF titled "2024", footer © 2026) pp. 10–12 | the same frequency table and scoring list |
| DET blog, *Introducing Interactive Speaking* (Jun 2025) | no prep time, the six subskills, how content is written |
| DET blog, *Adaptive speaking assessment with AI* (Jul 2026) | how the next question is picked |

Only structure and short fragments are recorded here. No Duolingo test content is reproduced. This
is the authoring spec for our scenario bank (`ep-interactive-speaking-scenarios-v1`).

---

## The task on the real test

| | Real DET |
| --- | --- |
| Format | Simulated conversation with an animated on-screen character |
| Turns | **6–8 questions** (one set per test) |
| Topics per conversation | **usually two**, with **usually 3–4 prompts per topic** (manual §3.1) |
| Prompt delivery | **Audio only, heard once.** The screen says *"Listen to the question"*, then *"Record your answer"*. The question is not shown as text. |
| Prep time | **None**: "just like real conversation" (blog) |
| Answer time | **35 seconds** per question. *CLICK TO RECORD* → speak → *CONTINUE* |
| Section length | **3:30–4:40**, depending on how many questions are asked |
| Position | After the adaptive section, in the speaking block: Speak About the Photo → Read, Then Speak → **Interactive Speaking** → Writing Sample → Speaking Sample |
| Subscore | Speaking |

### How the follow-ups work

- After each answer the system checks it against a **question-specific task-completion rubric**,
  meaning which key ideas the answer covered and which it left out.
- The next question is picked from **pre-written, expert-reviewed** content. It is not generated
  freely. It goes for an idea the speaker **hasn't covered yet** (so it doesn't repeat), often by
  asking them to **say more about something they just mentioned**.
- It also **adapts difficulty**. A stronger answer leads to a more cognitively demanding prompt
  ("richer, more complex prompts"), and a weak one leads to an easier question.
- Topic shifts are part of the construct. The task measures "the ability to engage in topic shifts".
- Scores stay comparable across different conversations through IRT prompt-difficulty modelling.

### What is scored

Six subskills (blog): **fluency, grammar, pronunciation, vocabulary, coherence, task completion**.
The Help Center lists the speaking facets as follows:

- **content**: relevance, development, effect
- **fluency**: speed, natural pauses, reliance on fillers, repetition, false starts
- **pronunciation**: intelligibility, sounds, word and sentence stress, intonation

Help Center tips: speak loudly at a natural pace, *"imagine you are having a conversation with a real
person"*, and keep speaking as long as you can **while still answering the question asked**.

### Topic space

- Discourse functions the task targets: **narrating, describing, explaining, expressing opinions**
  (manual §3.1). The interaction is informal and topic-focused, built from question–answer pairs.
- Topics are spread over the four CEFR domains (**Personal, Public, Educational, Professional**).
  The DET says "applied linguists designed hundreds of conversation topics and rhetorical patterns".
- Typical progression inside one topic: an easy personal entry question → explain or give an example
  → reasons or an opinion → compare, hypothesise or reflect. Advanced speakers get pushed further up
  that ladder.
- The fairness and bias review (manual §4.2) **removes** content that needs specialised or
  culture-specific knowledge, highly technical content, stereotypes, or distressing material
  (e.g. violence).

---

## How our app differs (keep in mind when writing scenarios)

| | Real DET | Our app |
| --- | --- | --- |
| Scenario | 2 topics × 3–4 prompts | **1 scenario** = 1 admin starter question + **5 AI follow-ups** (`INTERACTIVE_SPEAKING_FOLLOWUP_COUNT`), 6 turns |
| Follow-ups | picked from a reviewed pool | generated per turn by Gemini (`gemini-interactive-speaking-next.ts`), told to **stay on the same topic** |
| Prompt | audio only | audio + English text + Thai translation |
| Prep | none | `INTERACTIVE_SPEAKING_PREP_SECONDS = 3` (the web hub's tip text still says "เตรียม 10 วิ"; the mock test uses 8 s) |
| Answer | 35 s | 35 s (`INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS`) ✓ |

Because our follow-ups stay on one topic, **the starter has to open a topic with several angles**
(experience, reasons, comparison, future, the other side) so that five follow-ups can each find
something new.

---

## Authoring rules for our scenarios

**Fields:** `id`, `titleEn`, `titleTh`, `starterQuestionEn`, `starterQuestionTh`, `round`
(`1`–`5`), `thumbnail` (one emoji). Follow-ups are generated from the title and starter, so
those two carry the whole scenario.

1. **One spoken question** a listener can follow after hearing it once. Aim for 10–28 words; it may
   carry one short tail (*"…and why?"*, *"What happened?"*). No lists of sub-questions and no
   bullet-style prompts. That belongs to the monologue tasks.
2. **Answerable in 35 s without preparation.** Start from what the speaker knows (their life, their
   view) rather than from facts they would need to look up.
3. **Inclusive, with no assumptions.** Don't assume the learner has a job, a car, siblings, money to
   travel abroad, or a university place. Use *"school or work"*, *"a place you have visited or would
   like to visit"*, *"someone you know"*. Nothing that needs Thai- or US-specific knowledge to answer.
4. **Fairness filter.** No politics by party, religion, violence, crime victims, illness or death,
   dating, or money hardship as a personal question. Societal topics are fine as *issues*
   (e.g. "should cities limit cars?").
5. **Title** is a short noun phrase naming the topic (3–7 words). The Thai title is natural Thai,
   not word-for-word.
6. **Thai starter** is a natural, polite spoken translation of the same question (no ครับ/ค่ะ, so
   it reads for any speaker), ending in "?" if the English does.
7. **No repeats.** Each topic appears once across all rounds (checked by title, starter and id).
8. **Difficulty climbs by round.** It shows in what the starter asks for, not in rare vocabulary:

| Round | Level | Starter asks the learner to… | Domains |
| --- | --- | --- | --- |
| 1 | A2–B1 | describe routines and habits at school or work (existing 31) | Educational, Professional |
| 2 | B1 | describe and **narrate** everyday life and past experiences (home, food, places, people, hobbies, small events) | Personal, Public |
| 3 | B1+ | **explain** a situation and how they handled it or would handle it: problems, choices, plans at school, work, in the community | Educational, Public, Professional |
| 4 | B2 | give and **justify an opinion**, **compare** two options, weigh pros and cons of common social questions | Public, Educational, Professional |
| 5 | B2–C1 | **evaluate** abstract or societal issues, **hypothesise** (*"if…, what would…"*), take a position on a trade-off and anticipate the other side | all four |

Rounds 3–5 starters should leave room for the generator's "polite challenge / other side" and
"future" follow-ups. Rounds 1–2 starters should be concrete enough that a short answer still gives
it something to follow up on.

---

## Bank and tooling

- Live key `ep-interactive-speaking-scenarios-v1` in `content_bank_snapshots` (`global`). It holds a
  JSON string array. Learners see every scenario in it, because this skill has **no admin-occupancy
  map**. The API filters by `round ?? 1` (`src/lib/practice-content/interactive-speaking.ts`), and the
  mobile app shows rounds 1–5 (`PRACTICE_ROUNDS`). The web hub lists all scenarios in one list.
- Round 1 is the 31 original scenarios (no `round` field). Rounds 2–5 have 30 each, written by hand in
  `generated-interactive-speaking/round<r>.json`.
- `scripts/build-interactive-speaking-bank.ts` (run with `--env-file=.env.local --tsconfig tsconfig.json`):
  - no flag: report per round (read-only)
  - `--list`: every title and starter already used
  - `--add=file.json`: validate new scenarios against the rules above and against everything already
    used, then append the valid ones to the round file (30 per round at most)
  - `--check`: re-validate the saved files
  - `--upload-only`: back up the snapshot, re-read it, merge the saved scenarios (skipping ids already
    there), write, and read back
