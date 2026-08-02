# SLA Research → App Feature Mapping

Compiled 2026-08-01. A survey of second-language-acquisition (SLA), cognitive-science-of-learning, and language-testing research, mapped against the app's current features (web + det-mobile) to (a) show which design choices are already backed by real research, and (b) surface concrete, research-motivated gaps.

Six research threads were run in parallel, each targeting a cluster of theory against a specific slice of the app. Full detail is in the sections below; citations are real, verifiable sources (author/year/venue), with a few flagged where a detail like page numbers couldn't be independently confirmed.

## How to read this doc

Each section = one theory cluster. Inside, each theory gets: the claim, which app feature it justifies and why, and one concrete gap the research points at. A consolidated priority list of gaps is below; full bibliographies are at the end of each section.

---

## Top research-motivated opportunities (cross-cluster, prioritized)

These are the gaps that came up with the clearest, most actionable research backing:

1. **Notebook review modes aren't weighted by retrieval strength.** Flip-card (free recall) is a much stronger testing-effect / generation-effect event than the matching game (recognition-pairing) — Roediger & Karpicke (2006), Slamecka & Graf (1978). Right now both modes appear to count equally toward "mastered." Consider requiring a flip-card-style recall pass (or a typed/spoken answer) before a word graduates, and weighting matching-game success lower.
2. **No graduated spaced-repetition ladder.** The Notebook implements Leitner's coarse two-box idea (unmastered → mastered) but not the graduated interval schedule that makes Leitner/SuperMemo-style systems efficient (missed-once → review tomorrow, missed-3× → review in 3 days, mastered → review in 2 weeks). This is the single highest-leverage retention improvement suggested by the spacing-effect literature (Cepeda et al., 2006).
3. **AI Speaking Partner likely doesn't do genuine negotiation of meaning.** Long's Interaction Hypothesis (1996) says the acquisition-driving mechanism is the AI signaling *non-understanding* and prompting repair — not just responding fluently to whatever the student says. If the partner is tuned to always understand smoothly, it's giving input/output practice but not interaction-hypothesis practice. Worth an explicit design check: does it ever ask for clarification when grammar/pronunciation genuinely obscures meaning, and does it use elicitation/prompts rather than recasts to correct?
4. **Mock-test written/spoken AI feedback risks being unfocused.** Both sides of the Truscott (1996) vs. Ferris (1999) corrective-feedback debate agree that exhaustive, unprioritized error-listing is the weakest form of feedback. Worth confirming the grading engine prioritizes a small number of recurring, learnable error patterns rather than listing everything wrong.
5. **Reading/mock/mini-diagnosis passages aren't confirmed to be vocabulary-profiled.** Hu & Nation (2000) put the comprehension threshold at ~95–98% known-word coverage. Passage difficulty tiers appear curated by feel rather than checked against a frequency list (e.g., Nation's BNC/COCA bands) — a solvable, mechanical audit.
6. **Interleaving is random, not discrimination-based.** Kornell & Bjork (2008) and the L2-specific replication (Libersky et al., 2025) show the interleaving benefit comes from mixing *confusable* items that force discrimination (e.g., near-synonym vocabulary, similar grammar patterns) — not from mixing arbitrary categories. Daily Practice / timed random practice currently interleave unrelated skills; a "confusable-set" interleaving mode over the existing item bank would be a bigger lift for the same practice time.
7. **No exact-task-repetition mode.** Bygate (2001) found repeating the *same* speaking task (not just the same task type) produces a measurable fluency gain on the second attempt, because prior conceptualization work carries over. Read & Speak and timed random practice always draw fresh items — an explicit "redo this exact prompt" option would let students bank the Bygate effect directly.
8. **Scaffolding doesn't fade.** ZPD theory (Vygotsky, 1978; Wood, Bruner & Ross, 1976) requires support to be *withdrawn* as competence grows, not just difficulty to ramp up. The gate/ceiling model and planner add harder content but there's no described mechanism for progressively reducing hints/scaffolds (e.g., the build-the-answer chunk drill, keyword callouts) once a learner clears a gate.
9. **Gate failures need targeted remediation, not just "try again."** Bloom's mastery learning (1968) and the meta-analysis confirming it (Kulik, Kulik & Bangert-Drowns, 1990) show the effect depends on the *quality of corrective activity* after a failed check, not the gate itself. Worth confirming a failed gate routes to specific remediation content, not a generic retry.
10. **Placement is single-branch, not adaptive.** The MEDIUM/HARD placement probe is one decision point; CAT theory (Weiss, 1982) says precision is weakest exactly at a branch threshold and improves with items concentrated near the decision boundary. Most relevant if placement errors are anecdotally common at the medium/hard boundary.
11. **Re-engagement copy should be audited for shame cues.** Krashen's Affective Filter Hypothesis (1982) says anxiety blocks uptake — "you missed 5 days" framing risks raising exactly the affective filter that needs to be low when a lapsed student returns. Cross-check with growth-mindset research (Mueller & Dweck, 1998): praise/re-engagement copy should be effort/process-framed, not ability-framed.
12. **DET-equivalent scoring claims should be caveated.** Independent (non-Duolingo) validity evidence (Isaacs, Hu, Trenkic & Varga, 2023) is more mixed than Duolingo's own technical manual — the app's DET-equivalent scores (mini-diagnosis, planned CEFR calibration) shouldn't be presented with more certainty than the source test itself has been shown to carry, and the published DET–CEFR alignment study only covers B1–C2, leaving the low end of the 0–160 mini-diagnosis scale without independent validation.

---

## Input & Comprehensible Input

### Krashen's Input Hypothesis (i+1)
Krashen, S.D. (1982). *Principles and Practice in Second Language Acquisition.* Pergamon Press. Krashen, S.D. (1985). *The Input Hypothesis: Issues and Implications.* Longman.

Acquisition happens when input is comprehensible and pitched just beyond current competence (i+1) — understood via context/scaffolding, not explicit drilling.

**Supports:** the reading-skills module's graded-difficulty passage sequencing and floating keyword callouts (the callouts are the contextual scaffolding that makes above-level text comprehensible without breaking flow).

**Gap:** difficulty looks like fixed tiers rather than a per-learner adaptive re-targeting of "i" — unlike the gate model used elsewhere in the app.

### Extensive reading and incidental vocabulary growth
Day, R.R., & Bamford, J. (1998). *Extensive Reading in the Second Language Classroom.* Cambridge University Press. Krashen, S.D. (2004). *The Power of Reading* (2nd ed.). Libraries Unlimited/Heinemann. Nation, I.S.P. (2001). *Learning Vocabulary in Another Language.* Cambridge University Press.

Large volumes of easy, self-selected reading — not intensive analysis of a few hard texts — builds fluency and drives incidental vocabulary growth.

**Supports:** the 60 shared reading passages as a reusable corpus for vocabulary exposure across drill types.

**Gap:** reusing a small fixed passage set for analytic sub-skill drills is structurally *intensive* reading, not extensive reading — there's no free-choice, high-volume, low-stakes graded-reader pool delivering the sheer novel-input volume Krashen (2004) argues is the active ingredient.

### Vocabulary frequency, lexical coverage, and graded input
Nation, I.S.P. (2006). How Large a Vocabulary Is Needed for Reading and Listening? *Canadian Modern Language Review, 63*(1), 59–82. Hu, M., & Nation, I.S.P. (2000). Unknown vocabulary density and reading comprehension. *Reading in a Foreign Language, 13*(1), 403–430. Nation's BNC/COCA frequency word-family lists (Victoria University of Wellington).

Comprehension needs very high lexical coverage (~95–98% known words); frequency-banded lists let content prioritize highest-coverage-return words first.

**Supports:** frequency-informed vocabulary selection in the typed/dropdown fill-in-blank exercises.

**Gap:** no indication passages (60-passage bank, mock-test, mini-diagnosis) are actually vocabulary-profiled against a frequency list to confirm the 95–98% coverage band per stated difficulty tier — see top-priority item #5 above.

### Dictation as comprehensible input
Oller, J.W. (1971). Dictation as a device for testing foreign-language proficiency. *English Language Teaching, 25*(3), 254–259. Rahimi, M. (2008). Using dictation to improve language proficiency. *Asian EFL Journal, 10* (pagination unverified across sources).

Dictation correlates strongly with overall proficiency because it forces active phonological/lexical reconstruction of input, not passive recognition; classroom dictation *practice* produces measurable listening gains.

**Supports:** the 200 audio dictation items — dual justification via SLA pedagogy and DET format fidelity.

**Gap:** no indication the 200 items are sequenced by word frequency or complexity (an i+1/frequency-tiered ordering is a plausible missing structuring principle).

**Bibliography:** Krashen (1982, 1985, 2004); Day & Bamford (1998); Nation (2001, 2006); Hu & Nation (2000); Nation's BNC/COCA word-family lists (wgtn.ac.nz/lals); Oller (1971); Rahimi (2008).

---

## Output, Interaction & Corrective Feedback

### Swain's Output Hypothesis
Swain, M. (1985). In Gass & Madden (Eds.), *Input in Second Language Acquisition*. Newbury House. Swain, M., & Lapkin, S. (1995). *Applied Linguistics, 16*(3), 371–391.

Comprehensible input alone is insufficient; being "pushed" to produce precise output forces learners to notice gaps between what they want to say and what they can say.

**Supports:** the AI Speaking Partner and the Read & Speak build-the-answer drill — both force extended, syntactically complete output rather than passive consumption.

**Gap:** neither feature surfaces the noticed gap back to the learner in real time (e.g., highlighting where spoken output diverged from a target form); noticing is left implicit.

### Long's Interaction Hypothesis
Long, M.H. (1996). In Ritchie & Bhatia (Eds.), *Handbook of Second Language Acquisition*. Academic Press.

Negotiation of meaning — clarification requests, comprehension/confirmation checks triggered by communication breakdown — drives acquisition.

**Supports:** the AI Speaking Partner is the natural home for this mechanism.

**Gap:** see top-priority item #3 — if the AI always understands smoothly, it forfeits the actual acquisition-driving mechanism.

### Schmidt's Noticing Hypothesis / Focus on Form vs. Forms
Schmidt, R. (1990). *Applied Linguistics, 11*(2), 129–158. Long, M.H. (1991). In de Bot et al. (Eds.), *Foreign Language Research in Cross-Cultural Perspective*. John Benjamins.

Conscious noticing of form in input is necessary for it to become intake; focus-on-forms (isolated grammar points) differs from focus-on-form (attention to form arising incidentally during meaning-focused communication).

**Supports:** the grammar fill-in-the-blank lesson (textbook focus-on-forms, maximizing noticing via explicit, salient, immediate feedback) and the pronunciation gate's per-attempt pass/fail.

**Gap:** no bridge mechanism connects discrete-item noticing (grammar FITB, pronunciation gate) back to communicative use (Speaking Partner, mock test) — drilled accuracy in isolation doesn't guarantee transfer.

### Lyster & Ranta's Corrective Feedback Taxonomy
Lyster, R., & Ranta, L. (1997). *Studies in Second Language Acquisition, 19*(1), 37–66.

Recasts (implicit reformulations) are the most common but *least* likely to produce learner uptake/self-repair, since learners often mistake them for confirmation; prompts (elicitation, clarification requests) push self-repair more effectively.

**Supports:** the pronunciation gate's strict, unambiguous pass/fail — this avoids the recast failure mode entirely.

**Gap:** mock-test AI feedback is delayed and non-interactive (structurally distant from prompt-based negotiation); the Speaking Partner likely defaults to recast-style correction where elicitation/clarification prompts would produce stronger uptake per this research.

### Truscott vs. Ferris on Written Corrective Feedback
Truscott, J. (1996). *Language Learning, 46*(2), 327–369. Ferris, D. (1999). *Journal of Second Language Writing, 8*(1), 1–11.

Truscott argues grammar correction on writing is largely ineffective; Ferris counters that selective, timely, well-designed feedback helps. Both agree unfocused, exhaustive error-marking is the weakest form.

**Supports/Gap:** see top-priority item #4 — mock-test written feedback should prioritize a small number of recurring patterns.

### Feedback timing/type for pronunciation and morphosyntax
Ellis, R., Loewen, S., & Erlam, R. (2006). *Studies in Second Language Acquisition, 28*(2), 339–368. Fu, M., & Li, S. (2022). *Studies in Second Language Acquisition, 44*(1), 2–34. Lee, E., & Lyster, R. (2016). *System*.

Explicit/metalinguistic feedback outperformed recasts for past-tense *-ed* acquisition (Ellis et al.); immediate-vs-delayed timing effects are more nuanced than "immediate always wins" (Fu & Li); recasts and prompts both aided L2 /ɹ/ pronunciation, mediated by recast length/focus (Lee & Lyster).

**Supports:** the pronunciation gate's immediate, explicit, unambiguous feedback design over implicit recasts.

**Gap:** binary pass/fail doesn't explain *why* an ending failed (mispronunciation vs. omission vs. wrong allomorph) — a differentiated explicit/metalinguistic component would likely improve acquisition further.

**Bibliography:** Swain (1985); Swain & Lapkin (1995); Long (1996, 1991); Schmidt (1990); Lyster & Ranta (1997); Truscott (1996); Ferris (1999); Ellis, Loewen & Erlam (2006); Fu & Li (2022); Lee & Lyster (2016).

---

## Retrieval Practice, Spacing & Desirable Difficulty

### The Testing Effect
Roediger, H.L., & Karpicke, J.D. (2006). *Psychological Science, 17*(3). Karpicke, J.D., & Roediger, H.L. (2008). *Science, 319*(5865).

Actively retrieving information produces far more durable retention than restudying — in Karpicke & Roediger's vocabulary experiment, repeated studying had no effect on delayed recall while repeated testing produced large, lasting gains.

**Supports:** Notebook flip-card mode, Daily Practice, timed random practice, mock tests — all retrieval events rather than passive review.

**Gap:** see top-priority item #1 — matching-game mode is weaker retrieval than flip-card and shouldn't count equally toward "mastered."

### Forgetting Curve & the Spacing Effect
Ebbinghaus, H. (1885). *Über das Gedächtnis*. Cepeda, N.J., Pashler, H., Vul, E., Wixted, J.T., & Rohrer, D. (2006). *Psychological Bulletin, 132*(3), 354–380.

Forgetting is steep immediately after learning; distributed practice beats massed practice, and the ideal gap between reviews grows with the desired retention interval.

**Supports:** absence-notification / welcome-back / weekly-recap messaging (intervening before the steep early drop) and the 7-day resumable mock (distributing retrieval across days).

**Gap:** re-engagement nudges appear to fire on a fixed absence threshold rather than one that scales with prior study history (a 2-day vs. 30-day absence likely need different review intensity).

### Leitner System / Interval Scheduling
Leitner, S. (1972). *So lernt man lernen*.

Correctly recalled cards move to longer-interval boxes; missed cards drop back — the ancestor of modern spaced-repetition systems.

**Supports:** the Notebook's coarse two-state (unmastered → mastered) implementation.

**Gap:** see top-priority item #2 — no graduated interval ladder.

### Bjork's Desirable Difficulties
Bjork, R.A., & Bjork, E.L. (1992). In *From Learning Processes to Cognitive Processes*.

Storage strength (durable memory) vs. retrieval strength (momentary accessibility) are distinct; conditions that make retrieval effortful (spacing, interleaving, variability, generation) build storage strength even though they slow performance in the moment.

**Supports:** timed random practice's cross-level randomization and Daily Practice's randomized mixed-skill draw.

**Gap:** difficulty is imposed by randomness, not calibrated to an "desirable" 80–85% success zone — a student could get an unlucky run far above or below their level; an adaptive band around the random draw would align better with the theory.

### The Generation Effect
Slamecka, N.J., & Graf, P. (1978). *Journal of Experimental Psychology: Human Learning and Memory, 4*(6), 592–604.

Self-generated answers are remembered better than the same answers merely read.

**Supports:** Notebook flip-card mode (generate before reveal).

**Gap:** matching-game mode removes generation entirely — reinforces item #1.

### Interleaved vs. Blocked Practice
Kornell, N., & Bjork, R.A. (2008). *Psychological Science, 19*(6), 585–592. Birnbaum, M.S., Kornell, N., Bjork, E.L., & Bjork, R.A. (2013). *Memory & Cognition, 41*(3). Libersky, E., Sobus, S., Slawny, C., & Kaushanskaya, M. (2025). *Second Language Research* — L2-vocabulary-specific replication.

Interleaving confusable categories (forcing discrimination) beats blocked study, despite learners *believing* blocking works better.

**Supports:** Daily Practice's mixed-skill draw and timed random practice's cross-level, cross-type sets.

**Gap:** see top-priority item #6 — the discrimination benefit comes from mixing confusable items, not arbitrary categories.

**Bibliography:** Roediger & Karpicke (2006); Karpicke & Roediger (2008); Cepeda et al. (2006); Ebbinghaus (1885); Leitner (1972); Bjork & Bjork (1992); Slamecka & Graf (1978); Kornell & Bjork (2008); Birnbaum, Kornell, Bjork & Bjork (2013); Libersky et al. (2025).

---

## Skill Acquisition, Automaticity & Formulaic Language

### DeKeyser's Skill Acquisition Theory
DeKeyser, R.M. (Ed.). (2007). *Practice in a Second Language*. Cambridge University Press. DeKeyser, R.M., & Suzuki, Y. (2025). In *Theories in Second Language Acquisition* (4th ed.). Routledge.

L2 ability develops declarative → proceduralized → automatized through extended, consistent practice of the *same* skill; practice only automatizes the skill actually exercised ("transfer-appropriate processing").

**Supports:** the pronunciation lessons' repeated-attempt-to-95%-threshold design, and the grammar FITB's 600-exercise repeated-practice loop.

**Gap:** dropdown-select ("recognition") items shouldn't earn the same mastery credit as typed ("production") items — recognition practice doesn't automatize production per transfer-appropriate processing.

### Anderson's ACT-R Model
Anderson, J.R. (1982). *Psychological Review, 89*, 369–406.

Declarative knowledge is stored as chunks, procedural knowledge as condition-action production rules; skill acquisition is the "compilation" of chunks into productions through repeated successful application.

**Supports:** the typed vocabulary blanks' dropdown → typed-with-prefix-hint progression (the hint is a declarative cue scaffolding the production rule).

**Gap:** ACT-R predicts production rules generalize only across the contexts in which they were compiled — if grammar-FITB/typed-blank items reuse a narrow set of sentence templates, learners may compile overly specific rules that don't transfer to novel DET prompts; worth auditing item template variety per grammar point.

### Wray on Formulaic Sequences
Wray, A. (2002). *Formulaic Language and the Lexicon*. Cambridge University Press.

Formulaic sequences are prefabricated strings retrieved whole, reducing processing effort and "buying time" for planning during fluent speech.

**Supports:** directly grounds the Read & Speak 4-move pattern with its build-the-answer chunk drill.

**Gap:** see top-priority item — chunks sit on a continuum from fixed to slot-and-filler; fully fixed chunks risk sounding scripted (a known DET/IELTS scoring risk). The drill should progressively introduce slot variation and fade toward freer generation as proficiency rises.

### Nick Ellis on Frequency and Chunking
Ellis, N.C. (2002). *Studies in Second Language Acquisition, 24*, 143–188.

Language processing tunes to input frequency at every grain size; implicit learning of collocational/chunk frequencies complements explicit instruction.

**Supports:** the grammar FITB's high-repetition design and timed random practice's repeated cross-level exposure.

**Gap:** frequency-effect theory implies spaced/distributed exposure outperforms massed repetition — if the 600-item FITB pool or randomizer draws down in single-session blocks rather than being spaced across return visits, the app under-exploits frequency effects (ties to item #2, spaced repetition).

### Bygate on Task Repetition
Bygate, M. (2001). In Bygate, Skehan & Swain (Eds.), *Researching Pedagogic Tasks*. Pearson Education, pp. 23–48.

Repeating the same task lets learners reuse prior conceptualization/formulation work, freeing attention for more fluent (sometimes more accurate) performance on the second attempt.

**Supports:** the pronunciation lesson's repeat-until-95% loop.

**Gap:** see top-priority item #7 — no explicit "redo this exact prompt" mode in Read & Speak or timed practice, which always draw fresh items.

### Skehan's Accuracy/Complexity/Fluency Framework
Skehan, P. (1998). *A Cognitive Approach to Language Learning*. Oxford University Press.

Accuracy, complexity, and fluency draw on a limited attentional pool and trade off; task conditions (e.g., time pressure) bias performance toward one dimension at the expense of others.

**Supports:** explains why timed random practice (biases fluency) and the pronunciation 95% threshold (biases accuracy) are structurally different practice types.

**Gap:** time pressure introduced too early/often could suppress accuracy/complexity gains from other lessons on the same material — consider sequencing accuracy-focused practice before timed fluency pressure on newly-learned content.

**Bibliography:** DeKeyser (2007); DeKeyser & Suzuki (2025); Anderson (1982); Wray (2002); Ellis, N.C. (2002); Bygate (2001); Skehan (1998).

---

## Personalization, Scaffolding, Motivation & Affect

### Zone of Proximal Development & Scaffolding
Vygotsky, L.S. (1978). *Mind in Society*. Harvard University Press. Wood, D., Bruner, J.S., & Ross, G. (1976). *Journal of Child Psychology and Psychiatry, 17*, 89–100. Lantolf, J.P., & Thorne, S.L. (2006). *Sociocultural Theory and the Genesis of Second Language Development*. Oxford University Press.

Instruction targeted just above current ability, with graduated support withdrawn as competence grows, drives development better than instruction at or far above the learner's independent level.

**Supports:** the placement probe (locating the ZPD floor), the planner's warm-up ramp, and the gate/ceiling model.

**Gap:** see top-priority item #8 — scaffolds should *fade*, not just difficulty ramp up; no described hint/support-reduction mechanism as learners clear gates.

### Bloom's Mastery Learning
Bloom, B.S. (1968). *Evaluation Comment, 1*(2). UCLA CSEIP. Kulik, C.C., Kulik, J.A., & Bangert-Drowns, R.L. (1990). *Review of Educational Research, 60*, 265–299.

Most students can reach mastery given the right pacing and corrective feedback rather than fixed time; a 108-study meta-analysis confirmed gains, largest for weaker students.

**Supports:** the gate/ceiling scoring model and personalized pacing/countdown.

**Gap:** see top-priority item #9 — effects depend on the *quality* of corrective activity after a failed check, not the gate alone.

### Self-Determination Theory & Gamification
Ryan, R.M., & Deci, E.L. (2000). *American Psychologist, 55*(1), 68–78. Noels, K.A., Pelletier, L.G., Clément, R., & Vallerand, R.J. (2000). *Language Learning, 50*, 57–85. Loewen, S., et al. (2019). *ReCALL, 31*(3), 293–311 — Duolingo-specific case study.

Autonomy, competence, and relatedness drive sustained intrinsic motivation; validated for L2 motivation specifically; Duolingo learners' time-on-app correlated with gains.

**Supports:** XP tiers/streaks (competence), mascot (relatedness), persona calendar (partial autonomy).

**Gap:** see top-priority item — autonomy is the weakest-served leg; a system-generated calendar and fixed gate sequence leave little visible learner choice over path/goals.

### Krashen's Affective Filter Hypothesis
Krashen, S. (1982). *Principles and Practice in Second Language Acquisition*. Pergamon.

Anxiety, low confidence, and boredom raise a mental filter blocking input uptake, independent of comprehensibility.

**Supports:** encouraging mascot feedback and low-stakes practice framing.

**Gap:** see top-priority item #11 — absence-triggered "you missed X days" framing risks raising the filter exactly when a returning student's uptake most needs it low.

### Dweck's Growth Mindset
Mueller, C.M., & Dweck, C.S. (1998). *Journal of Personality and Social Psychology, 75*(1), 33–52.

Praising ability after success leads to choosing easier tasks and quitting sooner after failure, versus praising process/effort, which sustains persistence.

**Supports:** mascot/XP feedback copy design.

**Gap:** confirm feedback praises strategy/effort ("nice work reviewing that pattern") rather than trait language ("you're a natural"), and that weekly recaps frame low scores as a process to improve, not a fixed-ability verdict.

### Adaptive/Placement Testing Accuracy
Weiss, D.J. (1982). *Applied Psychological Measurement, 6*(4), 473–492.

IRT-based adaptive item selection yields more precise ability estimates in fewer items than fixed forms, maintained across the full trait range.

**Supports:** the placement probe and the gate model (a coarse adaptive branch).

**Gap:** see top-priority item #10 — a binary MEDIUM/HARD probe is a single branch-point; precision is weakest at the boundary itself.

**Bibliography:** Vygotsky (1978); Wood, Bruner & Ross (1976); Lantolf & Thorne (2006); Bloom (1968); Kulik, Kulik & Bangert-Drowns (1990); Ryan & Deci (2000); Noels et al. (2000); Loewen et al. (2019); Krashen (1982); Mueller & Dweck (1998); Weiss (1982).

---

## Assessment Validity, Washback & DET-Specific Research

### Washback Hypothesis
Alderson, J.C., & Wall, D. (1993). Does Washback Exist? *Applied Linguistics, 14*(2), 115–129.

Tests influence teaching/learning, but evidence for *how* (content vs. methodology) is thinner than assumed — their Sri Lankan study found tests shifted content taught more reliably than teaching methodology.

**Supports:** the fixed 20-step mock test's format-matching to the real DET.

**Gap:** format-matching alone doesn't guarantee better *learning strategies*, only closer content alignment — no instrumented way to check whether mock practice changes *how* students study vs. just what they review.

### Validity as Unified and Consequential
Messick, S. (1989). Validity. In *Educational Measurement* (3rd ed.). *(Cited via secondary sources; primary chapter not independently re-verified.)*

Validity is a unified judgment of score-based inferences, including the social consequences of score use.

**Supports:** post-test weakness reports feeding personalized study plans.

**Gap:** no published evidence ties the app's skill-bucket categorizations to actual improvement outcomes — consequential validity is asserted, not measured.

### DET Construct Validity & Technical Manual
Cardwell, R., LaFlair, G.T., Naismith, B., & Settles, B. (2022). *Duolingo English Test: Technical Manual*. Duolingo Research Report. LaFlair, G.T., & Settles, B. (2020) — reported DET↔TOEFL iBT r = .77 (N=2,319), DET↔IELTS r = .78 (N=991) *(figures via secondary summary, not independently re-verified against primary text)*.

**Supports:** modeling the mock test's async AI grading on a scoring engine with published psychometric backing.

**Gap:** no public per-item-type reliability breakdown to cite for which of the 20 mock steps most need higher grading confidence.

### DET Predictive Validity — Independent Evidence
Isaacs, T., Hu, R., Trenkic, D., & Varga, J. (2023). *Language Testing*, SAGE.

UCL study found DET's predictive validity for first-year academic performance was modest/inconsistent (postgrad adjusted r = .195; undergrad r = −.112), and DET-admitted students underperformed IELTS/TOEFL-admitted peers at equivalent bands (confounded by pandemic-era conditions).

**Relevant to:** the planned CEFR-calibration/DET-equivalent scoring feature — see top-priority item #12.

### DET–CEFR Alignment
ACS Ventures LLC / Chartered Institute of Linguists (2023), reviewed by Dr. Anthony Green (CRELLA, University of Bedfordshire): B1: 60–95, B2: 100–125, C1: 130–150, C2: 155–160. Corroborated by Cardwell et al. (2024) concordance study.

**Supports:** the planned CEFR-calibration test and the 0–160 mini-diagnosis scale, mirroring DET's own validated band structure.

**Gap:** the study covers B1–C2 only (no A1/A2 anchor found) — the low end of the 0–160 mini-diagnosis scale currently lacks independent CEFR validation.

### Test Preparation & Metacognitive Strategy Instruction
Hao, Z., Baird, J.-A., El Masri, Y., & Double, K. (2025). *Review of Educational Research*, SAGE/AERA. Nett, U.E., et al. (2012). *Education Research International*.

A 2025 meta-analysis found test-prep interventions produce measurable score gains separate from underlying ability gains; metacognitive monitoring specifically correlated with better test performance.

**Supports:** the app's core premise of format-specific mock practice.

**Gap:** no explicit metacognitive-strategy-instruction module (pacing/monitoring coaching) — strategy gains are left implicit rather than taught.

### Item Response Theory & Difficulty Calibration
ETS Research Memorandum RM-20-06; general IRT literature.

IRT separates item difficulty from examinee ability, enabling adaptive selection and difficulty-calibrated scoring rather than raw percent-correct.

**Supports:** the 9-step 0–160 skill-bucket diagnosis and the planned 2-stage adaptive CEFR test.

**Gap:** no evidence of formal IRT calibration (difficulty/discrimination parameters) on the app's own item bank — skill buckets are likely built on simpler heuristics, a validity gap relative to DET's own IRT-based design.

**Bibliography:** Alderson & Wall (1993); Messick (1989, via secondary sources); Cardwell, LaFlair, Naismith & Settles (2022); LaFlair & Settles (2020, via secondary sources); Isaacs, Hu, Trenkic & Varga (2023); ACS Ventures/CIOL (2023); Cardwell et al. (2024); Hao, Baird, El Masri & Double (2025); Nett et al. (2012); ETS RM-20-06.

---

## Caveats

- A handful of citations (Messick 1989's exact chapter text, LaFlair & Settles 2020's correlation figures, Rahimi 2008's page range) were located via secondary sources rather than fetched in full — flagged inline where relevant. Verify before citing in anything publication-facing.
- This mapping describes app features as currently understood; it doesn't verify implementation details against the live codebase (e.g., whether the AI Speaking Partner actually uses recasts vs. prompts is an assumption to test, not a confirmed fact).
- "Research-motivated gap" ≠ "confirmed bug" — each is a hypothesis worth checking against real usage/analytics before investing engineering time.
