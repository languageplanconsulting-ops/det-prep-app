# Mock Test Authoring SOP (Duolingo-English-Test prep app)

**Purpose:** the complete, self-contained procedure for authoring a numbered "Mock N" fixed
test — every step, its content shape, its rules, scoring, audio, and upload. Written so a
fresh context window can build a correct mock with no other knowledge. Last verified against
the live DB + code 2026-07-12 (built Mocks 22–26).

---

## 0. Big picture

- A mock = **1 row in `mock_fixed_sets`** + **exactly 20 rows in `mock_fixed_set_items`** (one per step).
- The **same Supabase project** powers **web** (`DET APP 1`, Next.js, deployed) and **mobile**
  (`det-mobile`, Expo). Inserting an **active** set makes it appear in BOTH immediately — content
  changes need no code deploy. Renderer/UI changes DO need a deploy (web = Vercel on merge to `main`;
  mobile = EAS rebuild).
- Numbering is **just text** in `name` / `internal_name` / `user_title` (e.g. "Mock 27"). There is
  **no** `set_type` or number column. Highest as of 2026-07-12 = **Mock 26** (no Mock 21 exists).

### Tables

`public.mock_fixed_sets`: `id uuid pk`, `name text`, `internal_name text` (unique on lower),
`user_title text`, `is_active bool`, `created_by uuid`, `created_at`, `updated_at`.

`public.mock_fixed_set_items`: `id uuid pk`, `set_id uuid fk`, `step_index int (1..20)`,
`task_type text` (CHECK list below), `time_limit_sec int`, `rest_after_step_sec int (0..300)`,
`content jsonb`, `correct_answer jsonb (nullable)`, `is_ai_graded bool`, `created_at`.
Unique index on `(set_id, step_index)`.

`task_type` allowed values: `fill_in_blanks`, `write_about_photo`, `dictation`,
`real_english_word`, `vocabulary_reading`, `speak_about_photo`, `read_and_write`,
`read_then_speak`, `interactive_conversation_mcq`, `interactive_speaking`, `conversation_summary`.

### Global invariants (verified across Mock 13/16/19/20)

- **Timing lives in columns**, not content. Exact canonical values in §2.
- **`is_ai_graded = false` on EVERY step.** Grading is not gated on this column.
- **`correct_answer` column** is set ONLY for dictation = `{ "answer": "<sentence>" }`; `null` for all else.
- **Audio is base64 `data:audio/mpeg;base64,…` DATA URIs embedded directly in `content`** (NOT a
  storage bucket). 13 clips per set: 4 dictation + interactive step 13 (1 scenario + 8 question clips).
- Numbering/label only in text fields; insert **inactive**, add 20 items, then flip **active**.

---

## 1. The fixed 20-step sequence (order is mandatory & validated)

| Step | task_type | time_limit_sec | rest_after_step_sec |
|---|---|---|---|
| 1 | fill_in_blanks | 120 | 0 |
| 2 | write_about_photo | 60 | 0 |
| 3 | dictation | 60 | 0 |
| 4 | fill_in_blanks | 120 | 0 |
| 5 | speak_about_photo | 60 | **45** |
| 6 | fill_in_blanks | 120 | 0 |
| 7 | write_about_photo | 60 | 0 |
| 8 | vocabulary_reading | 480 | **45** |
| 9 | speak_about_photo | 60 | 0 |
| 10 | read_and_write | **3900** | 0 |
| 11 | fill_in_blanks | 120 | 0 |
| 12 | read_then_speak | 300 | **45** |
| 13 | interactive_conversation_mcq | 420 | 0 |
| 14 | conversation_summary | 120 | 0 |
| 15 | speak_about_photo | 60 | 0 |
| 16 | dictation | 60 | 0 |
| 17 | dictation | 60 | **45** |
| 18 | dictation | 60 | 0 |
| 19 | interactive_speaking | 480 | 0 |
| 20 | real_english_word | 240 | 0 |

---

## 2. Per-step authoring spec

### Steps 1, 4, 6, 11 — `fill_in_blanks`
**content:** `{ passage, cefr_level:"A2-C1", difficulty:"medium", focus?, missingWords:[…9…] }`
Each `missingWords[i]`: `{ correctWord, clue, synonyms:string[], prefix_length:int, explanationThai }`.

Rules:
- Passage contains `[BLANK 1]…[BLANK 9]` **in order**; `missingWords[n-1]` fills `[BLANK n]` so the
  sentence reads naturally. (Agents frequently misorder this — always re-verify blank↔word alignment.)
- **EVERY `correctWord` is exactly ONE word** (letters only; no spaces/hyphens). Never use compound
  tenses ("had brought") — they are multiple words.
- **CEFR distribution per passage: 3 A2 · 3 B1 · 2 B2 · 1 C1** (current standard). Difficulty comes from
  vocabulary, not tense.
- **Mix word types** in each passage: adjectives, adverbs, conjugated verbs, linking/transitional words.
  Keep the **conjugated verbs tricky**: `-s`/`-es`/`-ies` (carry→carries, try→tries), `-ed` with doubling
  or y→ied (stop→stopped, plan→planned, carry→carried), and irregular past (wake→woke, sweep→swept,
  cling→clung, seek→sought). Clue for a verb = `"<base> → <tense>"`; for others = `"<type> — <definition>"`.
- `prefix_length`: integer, clamped 1–5, always < word length (shown as a blue prefix hint; the learner
  types the remaining letters into per-letter boxes).
- Sentence-initial linking words: store `correctWord` capitalised (e.g. "However"); scoring is
  case-insensitive.
Scoring (client): exact=1, Levenshtein 1–2 = "close" 0.5, else 0; ×0.85 if the per-blank clue was used.

### Steps 2, 7 — `write_about_photo`
**content:** `{ image_url, photo_type:"scene", instruction:"Write a response based on the photo.", instruction_th:"เขียนคำตอบจากภาพ" }`
- `image_url` = a **verified** Unsplash URL `https://images.unsplash.com/photo-<id>?w=900`. ALWAYS HTTP-check
  it returns `200/206` + `image/*` before insert (see §4). Reuse IDs already used by existing mocks — they
  are known-good. Never invent IDs.
AI-graded (essay) via `/api/writing-report` at grade time. No audio.

### Steps 5, 9, 15 — `speak_about_photo`
**content:** `{ image_url, photo_type:"scene", instruction:"Speak a response based on the photo.", instruction_th:"พูดคำตอบจากภาพ" }`
- Same photo rules. Submits a speech transcript; graded via `/api/photo-speak-report` (originHub `speak-about-photo`).

### Steps 3, 16, 17, 18 — `dictation`
**content:** `{ audio_url:"data:audio/mpeg;base64,…", instruction:"Listen and type exactly what you hear.", instruction_th:"ฟังและพิมพ์ให้ตรงกับที่ได้ยิน", reference_sentence:"<sentence>" }`
**correct_answer:** `{ "answer":"<same sentence>" }`
- Difficulty ladder (per set's 4 clips): S1 ~12w B1, 1 comma · S2 ~13w B2, 1 comma · S3 ~15w B2/C1,
  2 commas · S4 ~14w C1, 2 commas. Natural, correctly punctuated, no hard-to-spell proper nouns.
- Generate `audio_url` via Deepgram (§3).
- **UI rule (2026-07 renderer):** the learner may play the audio **at most 3 times**.

### Step 8 — `vocabulary_reading` (combined vocab + reading)
**content:**
```
{ passage:{ p1, p2:"[MISSING PARAGRAPH]", p3 },
  titleEn,
  highlightedVocab:[5× { word, example, meaningEn, meaningTh }],
  vocabularyQuestions:[6× { question(with [BLANK n]), options[4], correctAnswer }],
  missingParagraph:{ question, options[4], correctAnswer },
  informationLocation:{ question, options[4], correctAnswer },
  bestTitle:{ question, options[4], correctAnswer },
  mainIdea:{ question, options[4], correctAnswer },
  mock_combined_mode:true }
```
- `passage.p2` is literally `"[MISSING PARAGRAPH]"`; the real middle paragraph is
  `missingParagraph.correctAnswer` and also one of `missingParagraph.options[]` (verbatim). p1/p3 ≈ 90 words,
  the real p2 ≈ 80 words and must genuinely bridge p1→p3.
- 6 `vocabularyQuestions`: each is a short quoted phrase from the passage with one word replaced by
  `[BLANK n]` (n=1..6); 4 single-word options, one correct.
- All 4 macro MCQs (missingParagraph, informationLocation, bestTitle, mainIdea): 4 options; the
  `correctAnswer` must appear **verbatim** in `options`; **correct is NEVER the single longest option**;
  vary the correct position across the blocks. For `informationLocation`, make one WRONG option clearly
  longer than the correct.
Scoring: (correct / total steps) × 100, aggregated in Reading bucket.

### Step 10 — `read_and_write`
**content:** `{ prompt, instruction:"Read then write based on the topic.", instruction_th:"อ่านแล้วเขียนตามหัวข้อ" }`
- `prompt` = one-sentence essay prompt. time_limit 3900s. AI-graded via `/api/writing-report` (essay ≥50 words).

### Step 12 — `read_then_speak`
**content:** `{ instruction:"<one-sentence talking prompt>" }`
- Graded via `/api/speaking-report` (transcript ≥15 words).

### Step 13 — `interactive_conversation_mcq`  ★ CAMPUS RULE
**content:**
```
{ scenario_title_en:"<emoji> <short title>",
  scenario_en:"<2 sentences, 2nd person>",
  scenario_audio_url:"data:audio/mpeg;base64,…",
  part_a_questions:[3× { question_en, options[4], correct_answer, question_audio_url }],
  part_b_questions:[5× { question_en, options[4], correct_answer, question_audio_url }],
  turns:[ …part_a_questions then part_b_questions concatenated (8 items, same shape)… ] }
```
**Scenario MUST be a campus/university problem** — a student in a **specific major** with a
**specific problem** seeking advice from a professor / advisor / student office. Examples:
Psychology major can't find an internship → asks professor; Architecture major overwhelmed →
asks to drop a class; scholarship / letter-of-recommendation / plagiarism appeal / missed-exam /
group-project extension / lost accommodation. **NOT** generic service scenarios (hotel, gym,
blender return, doctor's appt, app choice — those are WRONG for step 13).

- **Part A (3 comprehension Qs about the LISTENED scenario):** short options. Q1 is usually
  "The student is asking for ___" (short noun phrases: *internship advice / permission to drop a class /
  a reference*). Q2 & Q3 answers are **nouns = student-life vocabulary** (internship, reference,
  transcript, careers office, CV, placement, syllabus, deadline).
- **Part B (5 spoken best-reply Qs):** `question_en` is the other party's spoken line; options are 4
  possible replies. Tests THREE abilities:
  1. **Correct starter** matching the question form — "Have you…?" → "Yes, I have." / "No, I haven't."
     (NOT "Yes, I did"); "Would you like…?" → "Yes, please"; "Are you…?" → "A little, yes"; "Shall we…?" → "Yes, let's".
  2. **Paraphrase**, not the exact words of the question.
  3. **Scenario awareness.**
  Each WRONG option typically **repeats an exact word from the question** but is off-topic / ignores the
  scenario, or uses the wrong starter.
- **Correct answer is NEVER the single longest option** (applies to Part A AND Part B). Vary correct position.
- `correct_answer` must appear verbatim in `options`.
- Audio: `scenario_audio_url` from `scenario_en`; each Q's `question_audio_url` from its `question_en`
  (Deepgram, §3). `turns` = `part_a_questions` ++ `part_b_questions`.
- **UI (planned):** cute floating chat bubbles, mascot speaks each line, transcript revealed only after
  the scenario audio plays, Part B spoken not written, tap → instant right/wrong → correct reply appears as
  next bubble.

### Step 14 — `conversation_summary` (linked to step 13)
**content:**
```
{ turns:[8× { question_en, reference_answer_en }],   // = step-13 part_a+part_b, answer = correct_answer
  scenario_en, scenario_title_en,
  summary_instruction_en:"Write a concise summary based on the scenario and the conversation flow below.",
  summary_instruction_th:"สรุปบทสนทนาจากสถานการณ์และคำตอบที่ถูกต้องด้านล่าง",
  mock_linked_from_interactive:true }
```
- Always regenerate step 14 whenever step 13 changes. AI-graded (summary).

### Step 19 — `interactive_speaking`
**content:** `{ prompt_en:"Let's discuss: <discussion prompt>", prompt_th:"มาคุยเรื่องนี้กัน", expected_turns:5 }`
- Follow-up turns generated live at runtime. **UI:** 35-second countdown per spoken reply (MAX_SPEAK_SECONDS=35).

### Step 20 — `real_english_word` — TWO supported formats
**Format A — classic grid** (Mocks 1–25):
```
{ rounds:4, words_per_round:20, real_words:[32], fake_words:[48],
  score_per_correct:5, round_duration_sec:60,
  real_words_per_round?, score_penalty_per_fake_pick?(default 2), max_score?(160) }
```
- Exactly **32 real + 48 fake = 80** words. Fake = plausible misspellings ("recieved") or pseudo-words.
- Web scoring (client): +score_per_correct per real tapped, −penalty per fake tapped, clamped [0,160].
  Mobile emits `{correctCount}`; server scores `correctCount*5` cap 160.

**Format B — true/false spelling judgment** (Mock 26+; needs the 2026-07 renderer deployed):
```
{ format:"true_false", instruction, instruction_th,
  score_per_correct:16, max_score:160,
  words:[10× { word, isReal:boolean, level:"A2|B1|C1|C2", correctSpelling?:string }] }
```
- **10 words × 16 pts = 160.** Distribution **4 A2 · 2 B1 · 2 C1 · 2 C2**; ~half correctly spelled, half
  misspelled (`correctSpelling` names the right form for the fakes). Learner judges each word ✓correct/✗misspelled.
- UI: words shown ONE BY ONE on a big animated card. Scoring: client computes `score160 = 16 × correct`
  and emits it; the submit-step route passes `score160` through (no server change needed).

---

## 3. Audio pipeline (Deepgram Aura TTS)

- Helper mirrors `src/lib/deepgram-synthesize.ts`: `POST https://api.deepgram.com/v1/speak?model=<model>`,
  header `Authorization: Token <DEEPGRAM_API_KEY>` (in `.env.local`), body `{ text }`.
- Model: **`aura-2-thalia-en`** (single voice for ALL clips — dictation + conversation — matches production).
- Response bytes → base64 → `data:audio/mpeg;base64,<b64>`. Cache by text; retry ~4× with backoff.
- Clips per set = 13: dictation ×4 (`reference_sentence`) + step 13 (scenario_en + 8 question_en). Max 2000
  chars/request.

## 4. Photos (verified Unsplash)

- Only reuse `photo-<id>` values already present in existing mocks (query `mock_fixed_set_items` where
  task_type in write/speak_about_photo). They are known to return 200.
- Before insert, HTTP-GET each chosen `…?w=900` URL and assert `res.ok && content-type starts image/`.
- Each mock uses 5 photos: 2 write (steps 2,7) + 3 speak (steps 5,9,15). Prefer distinct across a set.

## 5. Global content rules (apply everywhere)

1. Single-word answers for all fill-in-blank / vocab-blank items.
2. In EVERY multiple-choice block: `correctAnswer`/`correct_answer` appears **verbatim** in `options`, no
   duplicate options, and the **correct answer is not the single longest** option (most important for the
   reading macro-Qs and the conversation — natural single-word vocab options are exempt).
3. Distinct themes/topics/scenarios across mocks (don't repeat a reading topic or conversation scenario).
4. Bilingual EN + TH where the shape has `_th` fields.

## 6. Upload procedure (service-role, no admin session needed)

1. Load `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPGRAM_API_KEY`).
   Run scripts from inside the repo (needs `@supabase/supabase-js` in node_modules).
2. Author the 20 steps' content per §2; generate audio (§3); verify photos (§4).
3. Build the 20 item rows from the timing template (§1); `is_ai_graded:false`; `correct_answer` only for dictation.
4. Insert set row `{ name, internal_name, user_title, is_active:false }` → insert 20 items →
   update set `is_active:true`. (Guard: skip if a set with that `name` already exists.)
5. **Validate before insert:** blank↔word alignment & counts (9), single-word answers, prefix<len,
   4 options per MCQ, correct∈options, correct-not-longest, real/fake counts (32/48) or true_false (10, levels
   4/2/2/2, 16×10=160), photo 200 checks.
6. **Verify after insert:** read back; sequence == template; dictation audio+answer; interactive scenario+8
   audio; vocab p2 hidden + 6 vocabQ + combined; real-word counts/format; photos load.
7. Build scripts go in a temp `.mockbuild/` in the repo, deleted after (keeps the repo clean).

## 7. Scoring buckets & deploy notes

- `src/lib/mock-test/fixed-mock-score-buckets.ts` weights each task_type into the 4 skills
  (e.g. real_english_word = 20% of Reading). No change needed for new content.
- Content edits (new mocks, rewording, campus fixes) are **live on insert** — no deploy.
- Renderer/UI changes (e.g. real-word true/false, dictation 3-play cap, chat-bubble conversation) need a
  code deploy: web = push branch → PR → merge to `main` (Vercel); mobile = EAS rebuild. The agent env here
  has **no GitHub push creds** — hand the founder the `git push` commands.

## 8. Present-first vs commit

Default: present the proposal for review, then upload after "upload mock N". BUT if the founder says
"commit to it / do it / once done tell me", author + audio + insert directly, then report.

## 9. Known audit debt (2026-07-12)

- **Non-campus step-13 scenarios to rewrite:** Mock 16, 22, 23, 24, 25.
- **Correct-is-longest violations in step 13** across most mocks (only 13/16/25/26 clean) — should be fixed
  by lengthening a wrong option or shortening the correct.
