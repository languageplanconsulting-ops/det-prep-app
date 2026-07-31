# Personalized Study Calendar — Design (Persona-Driven, 1/3/6 Months)

> Status: IMPLEMENTED (2026-07-31), advisory-extras variant. What shipped:
> - `src/lib/study-plan/weakness-vector.ts` — merged mock>mini>attempts task vector (§5.1)
> - `personalizeExamItems()` in `daily-plan.ts` — weakness-weighted day sequences, applied
>   to VIRTUAL days in /api/study-plan/daily + /daily/range (pinned days never reshuffle)
> - `src/lib/study-plan/weakness-resources.ts` — the Part-2 routing table as data
> - `src/lib/study-plan/personal-plan.ts` — typed day EXTRAS (video/lesson/ai_practice/
>   diagnosis) per persona: no-data → diagnosis-first; balanced-low (≥5 weak) → course
>   front-to-back; focused → weak-task chapter walk; stale (>30d) → re-diagnosis nudge.
>   Extras are ADVISORY (returned by /api/study-plan/daily, rendered in the day sheet)
>   and deliberately NOT part of the day-completion contract — §5.2's persisted typed
>   items were skipped in favor of always-fresh computation (no migration needed).
> - Calendar day sheet renders extras + weakness-focus panel; mock/mini reports link back.
> - `/course/[slug]?lesson=<id>` deep link.
> Mock-day placement stays with the existing generateCalendar() client logic. Remaining:
> content gaps (§5.4.5), launch flag flips (§5.4.4), quota-precise AI pacing.

---

## Part 1 — What we have today (verified inventory)

### 1.1 The three content pillars

| Pillar | Volume | Where | Gate today |
|---|---|---|---|
| **Course videos** (Duolingo Fast Track) | 15 chapters, 73 lessons, ~24.6 h on Bunny | `/course/duolingo-fast-track`, tables `courses/course_chapters/course_lessons`, progress in `course_lesson_progress` | Admin-only (`STUDENT_COURSE_ENABLED = false` in `src/lib/course-access.ts`); VIP after flag flip |
| **Lessons (บทเรียน)** | 7 topics, ~1,875 items (dictation 300, real-word 600, grammar-fitb 600×5 blanks, read&write 200, read&speak 100, photo write/speak 65/70, reading-skills 3×70, campus-vocab 100 scenarios) | `/practice/lessons/*`, progress in `lesson_unit_progress` + `lesson_item_seen` | Free for any signed-in user (only VIP extra: ReadSpeak Pattern Coach) |
| **Practice exams** | 5 auto-graded skills (dictation, fitb, vocab, reading, realword) ×3 difficulties ×5 rounds + AI production (photo write/speak, read&write, read&speak, interactive speaking) + conversation + dialogue summary | `/practice/*`, attempts in `practice_attempts` | Tier set-limits (free = 1 lifetime/skill) + AI credits + conversation/mock paid-only |

Plus two assessments:
- **Mini diagnosis** — 9 steps, ~25 min, free once. Stores `actual_*` skill scores, `strengths`/`weaknesses` jsonb, and per-task-type raw scores in `report_payload.scoreBreakdown.supporting` (the cleanest sub-skill weakness vector in the codebase).
- **Fixed mock** — 20 steps, paid (basic 2/premium 4/vip 6 per month). Stores 4 skill scores + full per-step graded responses in `mock_fixed_results.report_payload.responses`.

### 1.2 The existing calendar (EXISTS, but not personalized)

- `study_plan_schedules` (exam_date, cadence 1–3, default tier 5/10/20/30 min) → `generateCalendar()` derives study days; final 14 days before exam auto-inserts 2 mock days/week; one "check-in" mock ~day 14.
- Each day = track (`exam`|`lesson`) → duration tier → **fixed sequence** from `EXAM_SEQUENCES` (e.g. 20 min = dictation×3, fitb×2, vocab×1, reading×1, realword×1). **Same recipe for every student** — this is the personalization gap.
- Progress derived from `practice_attempts` (Bangkok-day bucketing); freeform minutes in `study_plan_practice_minutes`.
- Daily runner `/practice/daily/run` is still admin/preview-gated.

### 1.3 Weakness signals that already exist (and one big gap)

| Source | Granularity | Read by planner today? |
|---|---|---|
| `practice_attempts` (score_pct per task_type/difficulty) | task-type | ✅ via `computeWeaknessReport()` (`src/lib/study-plan/weakness.ts`, WEAK_THRESHOLD 80%) |
| `data_collection_submissions` (AI dims: grammar/vocab/coherence/task-relevancy) | dimension | ✅ same |
| `mini_diagnosis_results` (weaknesses jsonb + supporting per-task scores) | skill + task-type | ❌ **ignored** |
| `mock_fixed_results.report_payload.responses` (20 graded steps, 0–160 each) | step/task-type | ❌ **ignored** |
| `study_plan_results` (diagnostic target/predicted) | skill band | partially (latestPrediction) |

**Gap #1 (highest value / lowest effort): the mock test — the user's own "identify their weakness" moment — is invisible to the planner.** `buildSkillWeightRows()` in `fixed-mock-score-buckets.ts` already computes "which component dragged this skill down" and is unused.

---

## Part 2 — The resource map: weakness → what to schedule

This is the core routing table. One row per DET task type; every plan is assembled from these rows. (Course refs = chapter numbers from the seeded Duolingo Fast Track.)

| Weakness (task type) | Course videos (watch) | Lessons (learn/drill) | Practice (test) | Approx. video time |
|---|---|---|---|---|
| `dictation` (Listen & Type) | CH10 (6 videos) | lessons/dictation — 30 units | literacy/dictation; timed-random `dictation` | ~1.7 h |
| `fill_in_blanks` (C-test / Read & Complete) | CH6 (7 videos incl. 2026 format) | lessons/grammar-fitb — 600 ex; campus-vocab for vocab-in-context | literacy/fill-in-blank; timed-random `fitb` | ~3.3 h |
| `real_english_word` (Read & Select) | CH9 (5) + CH15 vocab bonus (6) | lessons/real-word — 60 units | literacy/real-word | ~2.3 h |
| `vocabulary_reading` | CH15 (6) | lessons/campus-vocab — 100 scenarios | comprehension/vocabulary | ~2.1 h |
| reading comprehension (Interactive Reading) | CH12 (9 videos) | lessons/reading-skills — missing-paragraph / find-info / main-idea | comprehension/reading | ~2.5 h |
| `write_about_photo` | CH2 (3) | lessons/how-to-write/write-about-photo — 14 units | production/write-about-photo (AI credit) | ~1.0 h |
| `read_and_write` (essays + follow-up writing) | CH7 (10) + CH8 (2) | lessons/how-to-write/read-and-write — 40 units | production/read-and-write (AI credit) | ~4.6 h |
| `speak_about_photo` | CH3 (3) | lessons/how-to-speak/speak-about-photo — 14 units | production/speak-about-photo (AI credit) | ~0.5 h |
| `read_then_speak` / listen-then-speak | CH4 (7) + CH11 Read Aloud (2) | lessons/how-to-speak/read-and-speak — 20 units (+ VIP Pattern Coach 4-move drill) | production/read-and-speak (AI credit) | ~3.9 h |
| `interactive_speaking` (2026) | CH5 (4) | (no lesson bank yet — gap) | production/interactive-speaking (1 credit/session) | ~1.3 h |
| `interactive_conversation_mcq` + `conversation_summary` | CH13 (3) | (no lesson bank — gap) | listening/interactive (paid) + listening/dialogue-summary | ~1.5 h |
| orientation (everyone, week 1) | CH1 (3) | — | mini diagnosis | ~0.5 h |
| full-test strategy (final stretch) | CH14 guide (drafts) | — | fixed mock | ~0.9 h |

Notes:
- Skill→bucket weights from the mock (`fixed-mock-score-buckets.ts`) tell us which task types matter most per skill: Reading is 55% vocabulary_reading; Writing is 50% read_and_write; Speaking is 40% read_then_speak + 40% interactive_speaking; Listening is 40% conversation MCQ + 30% dictation. **Fixing the highest-weight weak task type moves the headline score fastest** — the planner should sort remediation by (weakness depth × bucket weight).
- Content gaps surfaced by this table: no lesson banks for interactive speaking or interactive conversation (course + AI practice only).

---

## Part 3 — Personas (the scenario space)

A persona = entry signal × weakness profile × timeline × tier. The planner should derive it, not ask the student to self-select.

### 3.1 Entry-signal ladder (how we know the weakness)

1. **Took a fixed mock** → per-step 0–160 scores → task-type weakness vector (best signal).
2. **Took mini diagnosis** → `weaknesses` jsonb + `supporting` per-task scores (good; free users have this).
3. **Only practice history** → `computeWeaknessReport()` from `practice_attempts`.
4. **Nothing** → onboarding asks target score + exam date + minutes/day, then **Day 1 of every plan = mini diagnosis** (free) and, for paid users, a mock in week 1–2. The plan starts generic and re-personalizes after the first assessment.

### 3.2 The eight personas

| # | Persona | Detection rule (on 0–160 task vector) | Plan emphasis |
|---|---|---|---|
| P1 | **หูไม่ทัน — Dictation/Listening weak** | dictation avg lowest; conversation MCQ low | CH10 → dictation lessons daily; conversation MCQ 2×/wk; dictation is 30% listening + 20% writing so it double-pays |
| P2 | **อ่านไม่แตก — Reading weak** | vocabulary_reading / fitb / reading low | CH15+CH12+CH6; reading-skills + grammar-fitb + campus-vocab rotation; vocab_reading first (55% of Reading) |
| P3 | **พูดไม่ออก — Speaking weak** | speak tasks low; sub-split: photo-speak vs read-then-speak vs interactive | CH3/CH4/CH5/CH11 by sub-weakness; read&speak lessons (Pattern Coach for VIP); AI credits budgeted for speaking |
| P4 | **เขียนไม่ถึง — Writing weak** | write_about_photo / read_and_write low; grammar dims low in AI reports | CH2+CH7+CH8; read&write lessons (biggest bank, 40 units); grammar-fitb as substrate; AI credits budgeted for writing |
| P5 | **ศัพท์ยังไม่ถึง — Vocab foundation low** | real_english_word + vocabulary_reading both low (cross-skill vocab gap) | CH9+CH15; real-word 60 units + campus-vocab; feeds every other skill |
| P6 | **พื้นฐานยังอ่อนทั้งกระดาน — Balanced-low** (all skills < ~85, gap to target > 30) | no single outlier, all low | 6-month foundation: course front-to-back (2–3 videos/wk) + lesson track (not exam track) as daily default; mock monthly only |
| P7 | **ใกล้เป้าแล้ว — Near target, exam soon** (gap ≤ 15, exam < 6 wks) | top-2 weakest only | 1-month sprint: mocks as the spine (existing final-stretch logic), drill only the 2 weakest task types between mocks, CH14 guide |
| P8 | **ยังไม่รู้จุดอ่อน — No data** | no assessment rows | Day 1 mini diagnosis; week-1 generic rotation; auto re-plan when first assessment lands |

Sub-scenarios the engine must also handle (not separate personas, just rules):
- **Mixed weakness** (2 skills tie): interleave the two remediation tracks on alternate study days.
- **AI-dimension weakness** (skill OK but grammar dim < 80 in `data_collection_submissions`): inject grammar-fitb regardless of skill scores.
- **Free tier**: quota-aware fallback (see 5.2).
- **Improvement detected** (`improvement.ts`: +10pp over last-5 vs prior-5): decay that task's weight, promote the next-weakest.

---

## Part 4 — Plan shapes by timeline

All three reuse the existing phase machinery (`generateCalendar` already does final-stretch mocks + check-in mock); we add phase-aware day recipes.

### 4.1 One month (sprint) — persona P7 default
- **Wk 1:** assessment (mock if paid, mini if free) + CH1/CH14 + top-weakness videos (≤3) ; daily 20–30 min drills on top-2 weak task types.
- **Wk 2–3:** drill loop — each study day: 1 video segment (≤15 min) on weak task + lesson unit + practice set of the same task type ("learn → drill → test" same-day).
- **Wk 4 (existing FINAL_STRETCH):** 2 mocks/week; between mocks only the 2 lowest step-types from the latest mock report.

### 4.2 Three months (standard) — personas P1–P5 default
- **Wk 1: diagnose.** Mini day 1 → mock end of wk 1 (paid) → plan locks a weakness ranking.
- **Wk 2–8: remediate, 60/40.** 60% of day slots = weakness track (video→lesson→practice ladder per Part 2 row, walking course chapter in order, lesson tiers easy→medium→advanced); 40% = maintenance rotation over the other skills (current EXAM_SEQUENCES behavior). One check-in mock ~wk 5 (exists) → re-rank weaknesses.
- **Wk 9–12: converge.** Mock every ~10 days; after each, next block re-weights to that mock's bottom-3 step types; final 14 days = existing final-stretch.

### 4.3 Six months (foundation) — persona P6 default
- **Month 1:** course CH1 + weakest-skill chapter, lesson track (easy tiers) as daily default, mini diagnosis re-run end of month.
- **Months 2–4:** course front-to-back (~3 chapters/month ≈ 2–3 videos/wk), each chapter paired with its lesson bank the same week; monthly mock (fits basic's 2/mo quota).
- **Month 5:** shift to exam track dailies weighted by the latest mock; medium/advanced lesson tiers.
- **Month 6:** the 3-month plan's wk 9–12 converge phase.

Daily time budgets stay on the existing tiers (5/10/20/30 min); videos only appear on days with tier ≥ 20 (a 20-min day = 1 video ~15 min + 1 quick drill; a 30-min day = video + lesson unit + practice set).

---

## Part 5 — Engine design (what to build)

### 5.1 Weakness vector (new: `src/lib/study-plan/weakness-vector.ts`)
One function, one output shape:
```ts
type TaskWeakness = { taskType: string; score160: number; weight: number; source: "mock"|"mini"|"attempts"; at: string };
computeTaskWeaknessVector(userId): Promise<TaskWeakness[]>  // sorted weakest-first
```
- Merge, newest-assessment-first: `mock_fixed_results.report_payload.responses` (avg per task_type) → `mini_diagnosis_results.report_payload.scoreBreakdown.supporting` → `practice_attempts` (score_pct×1.6). Decay older sources.
- `weight` = the task's max bucket weight from `fixed-mock-score-buckets.ts` (so remediation priority = (160−score) × weight).
- Extend `computeWeaknessReport()` to call this — fixes Gap #1.

### 5.2 Plan generator (new: `src/lib/study-plan/personal-plan.ts`)
```ts
generatePersonalPlan({schedule, weaknessVector, tier, courseProgress, lessonProgress})
  → per-day items with NEW item kinds
```
- Extend `study_plan_daily_plans.items` jsonb from `[{skill,count}]` to typed items: `{kind:"exam"|"lesson"|"video"|"ai_practice"|"mock"|"diagnosis", ref, minutes}` — where `ref` = course_lesson id / lesson `topic:tier:unit` / practice skill / mock. Backward-compatible: old rows = all-`exam` kind.
- Slot allocation per study day: weakness share 60% (sprint 80%, foundation 40%), fill from the Part 2 row's ladder in order **video (unwatched, chapter order) → lesson unit (next unlocked) → practice set**; maintenance share fills from existing `EXAM_SEQUENCES`.
- **Quota-aware:** AI-credit items capped to (monthly credits ÷ weeks); mocks scheduled ≤ tier's monthly limit (free 0 → mini diagnosis re-runs instead); conversation items only for paid; video items only when course access resolves (VIP post-flag / admin) — otherwise substitute the lesson-only ladder and show a locked "🎬 VIP" chip as upsell.
- **Free tier reality check:** free = 1 lifetime set/skill + 1 AI credit + 0 mocks, but **lessons are fully free** — so the free plan = mini diagnosis + lesson-track ladder + locked video/mock chips. The personalized calendar is thus also the upgrade funnel.
- Re-plan triggers: new assessment row, improvement threshold hit, exam date change. Regenerate only future unpinned days (user-edited days stay).

### 5.3 Surfacing (extend existing UI)
- `StudyPlanCalendarCardSoft` day sheet: render typed items — video rows deep-link `/course/duolingo-fast-track?lesson=<id>` and tick off via existing `course_lesson_progress`; lesson rows → `/practice/lessons/...` unit; keep "ทำทั้งหมดเลย" for the practice items.
- Report CTAs: mock report + mini report each get "สร้างแผนจากผลนี้" → creates/re-weights the plan from that result (closes the loop the user described: mock → weakness → calendar).
- Day completion: video counts complete via `course_lesson_progress.status`; lesson via `lesson_unit_progress`; practice via `practice_attempts` (existing).

### 5.4 Prerequisites / unblockers (ordered)
1. Extend weakness aggregator to mock + mini tables (5.1) — pure read, ship first.
2. Typed day items + generator (5.2) behind the same admin/preview gate as the daily runner.
3. Mock/mini report → "create plan" CTA.
4. Flip decisions needed to launch beyond admin: `STUDENT_COURSE_ENABLED`, un-gate `/practice/daily/run`.
5. Content gaps (later): lesson banks for interactive speaking + interactive conversation; parallel mini-diagnosis versions for re-testing (anti-memorization, flagged in diagnostic-questions-draft).

### 5.5 Relationship to the gate-ladder docs
`docs/study-plan/gates-reference.md`'s G0–G6 ladder is unimplemented and **orthogonal**: gates say *what to fix first inside grammar/literacy*; this design says *how to spread all resources across a calendar*. The persona planner can adopt gate ordering later as the intra-weakness sequencing rule for P2/P4/P6 (grammar-fitb categories → gates via `cloze-category-gate-map.csv`) without changing the calendar engine.

---

## Part 6 — Worked example (P1, 3 months, basic tier, 20 min/day, cadence daily)

Mock result: Listening 78 (dictation avg 65, conv MCQ 80), others 95–105. Target 110.

- **Wk 1:** Mon mini-diagnosis re-check · Tue CH10-v1 (7 m) + dictation lesson unit · Wed dictation practice set + fitb set · Thu CH10-v2 + dictation lesson · Fri conv-summary lesson gap → dialogue-summary practice · Sat **Mock #1** (uses 1 of 2 monthly) · Sun rest.
- **Wk 2–5 pattern (per study day):** 1 dictation item ladder step (video → lesson unit → practice set, rotating) + 1 maintenance slot from EXAM_SEQUENCES; conversation MCQ 2×/wk; check-in mock wk 5 → re-rank.
- **Wk 6–8:** if dictation recovers ≥ +10pp, weight shifts to next-weakest (conv MCQ) automatically.
- **Wk 9–12:** mock cadence per quota (2/mo), bottom-3 step types drilled between mocks, final 14 days = existing 2-mocks/wk stretch + CH14 guide video.
