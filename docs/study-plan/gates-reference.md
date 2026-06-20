# Study-Plan Gate Ladder (reference)

The personalized study plan runs on a **ceiling model**: a student's estimated band is
capped by the *lowest* competency gate they fail, and that same gate is what they study
first. Each gate has 2–3 diagnostic items; a gate is **failed** when the student misses
≥50% of its items (one slip never fails a gate).

| Gate | Tests | Diagnostic source | Fail → ceiling |
|------|-------|-------------------|----------------|
| `G0_structure`   | Sentence structure, word order, missing words        | Dictation        | < 80     |
| `G1_present`     | Subject–verb agreement, present simple, number/noun form | FITB / cloze | < 95     |
| `G2_lexis`       | Content-word spelling, vocabulary choice             | Dictation        | < 100    |
| `G3_past`        | Past tense, irregular verbs                          | FITB / cloze     | 100–110  |
| `G4_punct`       | Commas (FANBOYS), capitalization, transitions/cohesion | Dictation / cloze | 105–110 |
| `G5_passive`     | Passive voice, perfect tenses, past participle       | FITB / cloze     | 110–120  |
| `G6_advanced`    | Conditionals, gerunds, word-formation, register      | FITB / cloze     | 120–135  |
| `R_VOCAB`        | Word recognition by CEFR band (40-word probe)        | real_word / vocab | band-mapped |
| `R_SKILL`        | Passage comprehension, main idea, inference          | passage-mc       | band-mapped |
| `L_listen`       | Listening comprehension                              | interactive_listening | band-mapped |
| `SP_speak`       | Fluency, spoken grammar, task completion             | AI-graded speak  | rubric   |

## Reading band mapping (R_VOCAB / R_SKILL)
Score with signal detection on the misspelling probe: `score = hits − false_alarms`.
Highest band passed at ≥70% → A2:<90 · B1:90–105 · B2:105–125 · C1:125–135 · C2:135+

## Two output numbers (by design)
- **Predicted DET score** = existing weighted skill-bucket average → the goal-gap headline.
- **Ceiling band** = lowest failed gate → drives the prioritized study queue.

## Plan rule
Walk the priority queue from the lowest failed gate upward. Never schedule a higher gate
before a lower one is cleared. Each gate → `mini-lesson → practice bank (N) → re-check`.
