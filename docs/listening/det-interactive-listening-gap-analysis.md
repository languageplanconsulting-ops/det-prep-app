# Interactive Listening — real DET task vs. our "interactive conversation"

Source: Duolingo English Test → Practice → **Interactive Listening**, internal sub-type
`audio-interactional-competence` (captured 2026-08-10). One complete item specification was read off
the session payload the page loads, the task-level constants (instructions, timing, rules) came with
it, and a second set was observed through the UI.

**Sample caveat, stated plainly:** for the reading work I had all six practice sets. Here I have one
full item spec plus a second set seen on screen. The *constants* are task-level and therefore
authoritative for every set, and the two sets agree on structure — but the per-set content patterns
(distractor families, how the summary is scored) rest on a thinner sample than the reading spec did.
Harvesting the remaining sets is cheap if we decide to build against this.

Ours: `src/types/conversation.ts`, `src/lib/conversation-*.ts`,
`src/components/conversation/ConversationSessionClient.tsx`, routes under
`/practice/listening/interactive/*`.

---

## 1. What the real task is

**Nine questions on one clock**, in three phases over a single scenario. The header reads
"6:30 **for 9 questions**" and counts down like Interactive Reading.

| Phase | Their id | Count | Format |
| --- | --- | --- | --- |
| 1 | `aic-comprehension` | 3–4 | Listen to the scenario, then **type** short answers into sentence frames |
| 2 | `aic-select-response` | 4–5 | Hear the other speaker, **pick 1 of 5** replies; the conversation chains forward |
| 3 | `aic-summarization` | 1 | **Write a summary** of the conversation you just had |

The two observed sets split 3+5+1 and 4+4+1 — the total stays at 9.

### Timing (from the constants, so it holds for every set)

| Key | Value |
| --- | --- |
| `conversation_respond_seconds_max` | **390** (6:30 for the conversation phases) |
| `summarization_respond_seconds_max` | **75** (the summary gets its own clock) |

### The instruction strings, verbatim

- `comprehension_instructions` — "Listen to the scenario and then answer questions"
- `conversation_instructions` — "You will participate in a conversation about the scenario below"
- `select_start_instructions` — "Pick the best option to start the conversation"
- `select_response_instructions` — "Select the best response"
- `conversation_complete_instructions` — "The conversation is complete"
- `summarization_instructions` — "Write a summary of the conversation you just had"
- `correct_answer_header` — "Best Answer:"
- `play_only_once_disclaimer` — **"Listen closely! Audio clips only play once."**

### Phase 1 — comprehension is NOT multiple choice

Each sub-item carries a `question`, an `answer_ref`, and an `answer_template`. The learner types a
short answer into a blank inside a given sentence frame:

| question | template shown | reference answer |
| --- | --- | --- |
| What are you and your friend discussing? | `We are talking about ___.` | our plans for the future |
| What will you do after finishing school? | `After school I think I'll ___.` | go to graduate school |
| What degree are you interested in? | `I am interested in ___.` | an education degree |

On screen this renders as four questions each with an inline input inside the sentence. It is a
**production** task graded against a reference, not a recognition task.

### Phase 2 — select-response is a chained conversation

Each turn has its own `audio_url` plus a `prompt` (the transcript of what the other speaker said),
and **five** reply options with one key. The learner's pick becomes their turn and the conversation
continues. The item has a named character (`character_name: "oscar"`) and a scenario paragraph.

Example turn: *"Hey, what are you up to?"* → key: *"I'm trying to decide if I want to go to graduate
school."* Distractors are conversationally fluent but wrong in this thread — an answer about moving
to a city, one about job interviews, one that replies as if the other person had already spoken, one
that gives advice nobody asked for.

### Phase 3 — the summary

Free writing, 75 seconds, with a bank of `sample_writing_responses` (multiple model answers of
~50 words). Model answer, verbatim:

> "While talking to a friend, I discovered that they were also interested in going to a graduate
> school to become a teacher like me…"

---

## 2. What we have

`ConversationExam` = a scenario + `highlightedWords` + `scenarioQuestions[]` + `mainQuestions[]`.

- **8 steps**: 3 scenario questions + 5 main questions (`CONVERSATION_SCENARIO_Q_COUNT = 3`,
  `CONVERSATION_MAIN_Q_COUNT = 5`).
- **Both phases are multiple choice.** `ConversationScenarioQuestion` and
  `ConversationMainQuestion` both have `options: string[]` and `correctIndex: number`.
- **No summary step at all.**
- **No clock** — the session advances on a CTA under the answer reveal; there is no countdown
  anywhere in `ConversationSessionClient.tsx`.
- **No play-once rule** — audio can be replayed freely.
- Scored out of `CONVERSATION_FULL_SCORE = 160`, proportional to correct/8.
- Bank: 5 rounds × 5 sets × 2 difficulties (easy/medium; hard retired).
- Ours adds two things DET does not have: a Thai `explanation` per question, and
  `highlightedWords` with translations.

---

## 3. The differences that matter

### D1 — We are missing the summary entirely
One of the nine questions is a written summary on its own 75-second clock. We have no equivalent.
This is the same shape of gap as the missing cloze step in reading: a whole scored task type absent.
It is also the only *productive writing* moment in the listening section, so its absence changes what
the section measures.

### D2 — Our comprehension phase tests the wrong skill
The real phase 1 makes the learner **produce** a short answer inside a sentence frame. Ours gives
four options and asks them to **recognise** one. A learner who can always pick the right option from
a list may still be unable to type "go to graduate school" into "After school I think I'll ___."
This is the single biggest fidelity gap, and it also explains why our version feels easier than the
real thing.

### D3 — No clock, and the wrong unit
Real: one 6:30 countdown across the conversation phases, then a separate 75s for the summary, with a
"9 questions" counter that shrinks. Ours: untimed, advanced by a button. Time pressure is a large
part of what makes the real task hard — especially the summary.

### D4 — Audio replay
Real: **"Audio clips only play once."** Ours: unlimited replay. Practising with unlimited replay
trains a strategy that is unavailable on test day.

### D5 — Option count
Real select-response gives **5** options per turn. Worth checking our bank — if sets were authored
with 4, the guess rate is 25% against a real 20%.

### D6 — Missing scaffolding the real task provides
The real item carries a **named character** and shows the scenario paragraph on screen throughout the
conversation. Ours has a scenario string; worth confirming it stays visible during the turns.

### D7 — What we should keep
Our Thai `explanation` per question and `highlightedWords` glossary are genuine advantages — DET
explains nothing beyond a "Best Answer:" header. Any rebuild should preserve both, as the reading
rebuild did.

---

## 4. What needs to change

Ordered by impact.

**C1 — Add the summarization step.** Free-text summary, 75-second clock, scored against sample
responses. Needs a scoring approach: either AI grading (we already have graders for writing) or
rubric + model answers shown on reveal. This is a new content field (`sampleSummaries: string[]`) and
a new step in the runner.

**C2 — Convert phase 1 from multiple choice to typed sentence frames.** Data model gains
`answerTemplate` (e.g. `"After school I think I'll {}."`) and `answerRef`, and loses `options` /
`correctIndex` for scenario questions. Grading should be lenient on wording — accept a reference set
or fuzzy-match against `answerRef`, the way the real task must. **This invalidates the scenario
questions in the existing bank**, so it is a content migration, not just a code change.

**C3 — Put the whole thing on one clock.** 390s across the conversation phases, 75s for the summary,
header counting down "for N questions" like the reading task.

**C4 — Enforce play-once**, with the disclaimer up front. Keep a replay affordance in an explicit
"practice mode" if we want a gentler on-ramp, but the default should match the test.

**C5 — Standardise on 9 steps and 5 options.** Comprehension 3–4, select-response 4–5, summary 1.
Audit the existing bank for option counts.

**C6 — Reuse the reading rebuild's machinery.** The validator pattern
(`scripts/validate-interactive-reading.mjs`) and the one-engine/step-filter approach both transfer
directly: a full set is the runner over all three phases; a drill is the same runner with one phase
switched on.

### Scope estimate

Roughly the same shape as the reading job, with one difference: the reading conversion could reuse
legacy passages, whereas here **the scenario questions must be re-authored** (C2) because MCQ options
cannot be turned into typed answers mechanically. The select-response turns and audio should carry
over unchanged.
