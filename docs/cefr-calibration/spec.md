# CEFR Calibration Test — Canonical Spec

Single source of truth for the **4-skill CEFR calibration mini-test**. It reports each of
**Reading · Listening · Speaking · Writing** as a **CEFR level (A2–C2)** and a **DET-equivalent
score (10–160)**, plus an overall level and the four DET-style **integrated subscores**.

This feature is a thin layer over the existing `mini_diagnosis` engine — it does **not** replace it.
It adds (1) a CEFR banding layer, (2) 2-stage adaptive routing, and (3) a DET-style score card.

Related specs: [`diagnostic-spec.md`](./study-plan/diagnostic-spec.md) (the ceiling/gate model this
reuses), and the mock-test v2 routing engine (migration `011_mock_test_v2_engine.sql`).

---

## 0. Decisions locked

| Decision | Choice |
|---|---|
| Adaptivity | **2-stage adaptive (MST)** — router stage + targeted-difficulty stage per skill |
| Report format | **Full DET-style score card** — 4 skill levels + 4 integrated subscores + overall |
| Grading | Reuse existing engines — heuristic for receptive, Gemini rubric for productive |
| Scale | 10–160 (DET), 5-point increments; CEFR band derived from the 160-number |

---

## 1. The CEFR ↔ DET concordance (the mapping table)

All scoring already produces a **0–160 per skill** (see `score-buckets.ts`). CEFR is a pure band
function over that number. Cutoffs live in **one config object** so they can be tuned without
touching logic — published sources disagree on the B1/B2 line, so treat these as defaults.

```ts
// src/lib/cefr/bands.ts  (new)
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type CefrBand = {
  level: CefrLevel;
  min: number;          // inclusive, on the 10–160 DET scale
  max: number;          // inclusive
  labelEn: string;
  labelTh: string;
};

// Default bands. Source: Duolingo/CIOL-validated DET–CEFR concordance.
// NOTE: some sources cut B1/B2 at 85/90 instead of 95/100 — tune here only.
export const CEFR_BANDS: CefrBand[] = [
  { level: "A1", min: 10,  max: 45,  labelEn: "Beginner",             labelTh: "เริ่มต้น" },
  { level: "A2", min: 50,  max: 55,  labelEn: "Elementary",           labelTh: "พื้นฐาน" },
  { level: "B1", min: 60,  max: 95,  labelEn: "Intermediate",         labelTh: "ระดับกลาง" },
  { level: "B2", min: 100, max: 125, labelEn: "Upper-Intermediate",   labelTh: "กลาง-สูง" },
  { level: "C1", min: 130, max: 150, labelEn: "Advanced",             labelTh: "ขั้นสูง" },
  { level: "C2", min: 155, max: 160, labelEn: "Proficient",           labelTh: "เชี่ยวชาญ" },
];

export function toCefr(score160: number): CefrBand {
  const s = Math.max(10, Math.min(160, Math.round(score160)));
  // NOTE: bands intentionally have gaps (e.g. 96–99). Do NOT use a min<=s<=max
  // range match — an interpolated score landing in a gap would fall through.
  // Pick the highest band whose `min` is <= the score.
  let band = CEFR_BANDS[0];
  for (const b of CEFR_BANDS) if (s >= b.min) band = b;
  return band;
}
```

**Concordance reference (for the doc / UI copy):**

| CEFR | DET score | Meaning |
|------|-----------|---------|
| A1–A2 | 10–55 | Basic user |
| B1 | 60–95 | Independent (lower) |
| B2 | 100–125 | Independent (upper) |
| C1 | 130–150 | Proficient |
| C2 | 155–160 | Near-native |

Sources: Duolingo "Is the DET aligned with the CEFR?" blog; DET Understand Scoring page;
CIOL-validated DET–CEFR alignment (Cardwell et al. 2024 concordance).

---

## 2. What the student sees (the report / score card)

Post-July-2024 the real DET reports **4 individual skill scores** *and* **4 integrated subscores**.
We mirror that exactly.

### 2a. Overall
- **Overall CEFR level** (headline) = `toCefr(total)`, where `total` = average of the 4 skills
  (same `total` already computed in `score-buckets.ts`).
- **Overall DET-equivalent** = `total` rounded to nearest 5.

### 2b. Four skill cards
For each of Reading / Listening / Speaking / Writing:

> **Reading — B2** · DET-equivalent ≈ **110** · *Upper-Intermediate / กลาง-สูง*

Each card shows the CEFR level, the DET-equivalent number, and one CAN-DO descriptor sentence
for that level+skill (static copy table, see §7).

### 2c. Four integrated subscores (DET-style)
Derived from the 4 skill numbers — no new grading:

```ts
// src/lib/cefr/subscores.ts  (new)
export function integratedSubscores(s: { reading: number; writing: number; listening: number; speaking: number }) {
  const round5 = (n: number) => Math.round(n / 5) * 5;
  return {
    literacy:      round5((s.reading + s.writing) / 2),    // Reading + Writing
    comprehension: round5((s.reading + s.listening) / 2),  // Reading + Listening
    conversation:  round5((s.listening + s.speaking) / 2), // Listening + Speaking
    production:    round5((s.writing + s.speaking) / 2),   // Writing + Speaking
  };
}
```
Each integrated subscore also gets a `toCefr()` band for display.

### 2d. Study-plan handoff
Unchanged: the weakest skill still feeds `generatePlan()` in `plan.ts`. The CEFR label is
additive — it does not change gate logic.

---

## 3. Test blueprint — reuse existing engines

Every item type already exists. This is item **selection + difficulty tagging**, not new engines.

| Skill | Item types (`MiniDiagnosisTaskType`) | Grading | Engine |
|-------|--------------------------------------|---------|--------|
| **Reading** | `fill_in_blanks`, `vocabulary_reading`, `real_english_word` | Heuristic | `fitb-storage.ts`, `reading-storage.ts` |
| **Listening** | `dictation`, `interactive_listening` | Heuristic | `dictation-storage.ts`, `MiniInteractiveListeningStep.tsx` |
| **Writing** | `write_about_photo` | Gemini rubric | `gemini-writing.ts` |
| **Speaking** | `read_then_speak` | Gemini rubric | `gemini-speaking.ts` |

Skill→score weighting is unchanged from `score-buckets.ts`:
- Reading = `vocab*0.5 + fitb*0.5`
- Listening = `dictation*0.5 + interactive*0.5`
- Writing = `write_about_photo*0.55 + dictation*0.30 + fitb*0.15`
- Speaking = `read_then_speak*1.0`

---

## 4. 2-stage adaptive design (MST)

The one real engine change. Goal: stay accurate across A2–C2 in ~20 min. Pattern mirrors the
mock-test v2 router (`routing_band` / `stage1` columns already in migration `011`).

### 4a. Item difficulty tags
Every `mini_diagnosis_set_item` gains a CEFR difficulty and a routing role:

```
item_cefr     : 'A2' | 'B1' | 'B2' | 'C1' | 'C2'    -- difficulty of this item
routing_role  : 'router' | 'easy' | 'medium' | 'hard' -- which stage/branch it belongs to
```

- `router` items sit at ~B1/B2 (medium) — they discriminate best across the middle.
- `easy` = A2/B1 items; `medium` = B1/B2; `hard` = C1/C2.

### 4b. Flow (per skill, receptive skills adapt; productive skills stay fixed)

```
Stage 1 (Router):   2 router items  →  provisional ability = weighted correctness
                    │
                    ├─ low  (< B1 threshold)  → Stage 2 = EASY module  (A2/B1 items)
                    ├─ mid  (B1–B2)           → Stage 2 = MEDIUM module (B1/B2 items)
                    └─ high (> B2 threshold)  → Stage 2 = HARD module   (C1/C2 items)

Stage 2 (Targeted): 2–3 items from the routed module  →  refined ability estimate
```

- **Receptive (Reading/Listening):** adapt as above. Ability estimate = difficulty-weighted
  proportion correct, then mapped onto 0–160 (harder items correct → higher ceiling).
- **Productive (Writing/Speaking):** the Gemini grader already estimates level directly from the
  response, so these stay **single-item** (no branch needed) — the rubric self-adapts. Optionally
  pick the prompt difficulty from the receptive router result to keep the task appropriate.

### 4c. Routing thresholds
Config-driven, one table, tunable:

```ts
// src/lib/cefr/routing.ts (new)
export const ROUTING = {
  // provisional score (0–160) from Stage-1 router → which Stage-2 module
  toEasy:   { max: 75 },            // < B1
  toMedium: { min: 76, max: 119 },  // B1–B2
  toHard:   { min: 120 },           // > B2
};
```

### 4d. Ability → 160 mapping within a module
Within a routed module, final skill number = base of the module band + (proportion correct ×
module width), so a student routed to HARD who gets everything right lands at C2, and one who
struggles inside HARD still can't exceed the HARD ceiling minus penalty. This preserves the
existing **"lowest band wins"** intuition from `diagnostic-spec.md` while allowing upward reach.

---

## 5. Sequence (the ~20-min test)

Replaces the fixed 9-step `MINI_DIAGNOSIS_SEQUENCE_TEMPLATE` with a router-aware template.
New template type (extends `MiniDiagnosisTemplateStep`):

```ts
export type CalibrationStep = MiniDiagnosisTemplateStep & {
  stage: 1 | 2;
  routingRole: "router" | "easy" | "medium" | "hard";
  skill: "reading" | "listening" | "writing" | "speaking";
};
```

Proposed default sequence (12 steps, ~20 min):

| # | Skill | Stage | Role | taskType | Notes |
|---|-------|-------|------|----------|-------|
| 1 | Reading | 1 | router | `fill_in_blanks` | B1/B2 router |
| 2 | Reading | 1 | router | `vocabulary_reading` | B1/B2 router |
| 3 | Reading | 2 | routed | `fill_in_blanks` | difficulty from steps 1–2 |
| 4 | Listening | 1 | router | `dictation` | B1/B2 router |
| 5 | Listening | 1 | router | `interactive_listening` | B1/B2 router |
| 6 | Listening | 2 | routed | `dictation` | difficulty from steps 4–5 |
| 7 | Reading | 2 | routed | `real_english_word` | speed/vocab confirm |
| 8 | Writing | — | fixed | `write_about_photo` | Gemini-graded, prompt sized to reading route |
| 9 | Speaking | — | fixed | `read_then_speak` | Gemini-graded, prompt sized to listening route |

(9 steps is enough for a "mini" test; add a 2nd writing/speaking item only if you want tighter
productive estimates. Keep total ≤ 25 min — reuse `MINI_DIAGNOSIS_DURATION_LABEL`.)

---

## 6. Data model changes (extend, don't rebuild)

New idempotent migration `supabase/manual_run_cefr_calibration.sql` (follows the
`manual_run_*.sql` convention):

```sql
-- Item difficulty + routing (on the existing items table)
alter table mini_diagnosis_set_items
  add column if not exists item_cefr text
    check (item_cefr in ('A1','A2','B1','B2','C1','C2')),
  add column if not exists routing_role text
    check (routing_role in ('router','easy','medium','hard'));

-- Cached CEFR output on results (derived; for fast report render + analytics)
alter table mini_diagnosis_results
  add column if not exists cefr_overall text,
  add column if not exists cefr_reading text,
  add column if not exists cefr_listening text,
  add column if not exists cefr_speaking text,
  add column if not exists cefr_writing text,
  add column if not exists integrated_subscores jsonb;  -- {literacy, comprehension, conversation, production}
```

RLS unchanged (users own their rows; admins manage sets/items). The report payload continues to
live in `mini_diagnosis_results.report_payload`; add a `cefr` block to it:

```jsonc
"cefr": {
  "overall": { "level": "B2", "det": 110 },
  "skills": {
    "reading":   { "level": "B2", "det": 110 },
    "listening": { "level": "B1", "det": 90 },
    "speaking":  { "level": "B2", "det": 105 },
    "writing":   { "level": "B1", "det": 95 }
  },
  "integrated": {
    "literacy":      { "level": "B2", "det": 100 },
    "comprehension": { "level": "B1", "det": 95 },
    "conversation":  { "level": "B1", "det": 95 },
    "production":    { "level": "B2", "det": 100 }
  }
}
```

---

## 7. Item difficulty calibration (the rigor)

Bands are only as trustworthy as the item tags. Two phases:

**Phase 1 — LLM seed (launch-ready).** Tag every item's `item_cefr` by having the model rate it
against CEFR descriptors (a one-off admin script; store the rationale). Good enough to ship.

**Phase 2 — Empirical refinement.** After real takers, compute each item's p-value (proportion
correct) per known-ability cohort and adjust `item_cefr`. All responses are already logged in
`study_sessions` / `mini_diagnosis_results`, so the pipeline exists — add an admin analytics view.

**Productive rubric → CEFR.** Extend the Gemini system instruction in `gemini-writing.ts` and
`gemini-speaking.ts` to also return a `cefrLevel` field, anchored to CAN-DO descriptors (grammar
range, lexical range, coherence, task fulfilment). Keep the existing 4-criterion 0–160 output; add
CEFR alongside it. Use raw transcripts (no auto-correct) as today.

**CAN-DO copy table** (`src/lib/cefr/descriptors.ts`): one bilingual sentence per (skill × level),
30 strings, for the report cards. Static content, no logic.

---

## 8. Files to add / change

**New**
- `src/lib/cefr/bands.ts` — band table + `toCefr()`
- `src/lib/cefr/subscores.ts` — integrated subscores
- `src/lib/cefr/routing.ts` — router thresholds + ability→160 mapping
- `src/lib/cefr/descriptors.ts` — bilingual CAN-DO copy
- `supabase/manual_run_cefr_calibration.sql` — schema extension
- `src/components/mini-diagnosis/CefrScoreCard.tsx` — DET-style card UI

**Change**
- `src/lib/mini-diagnosis/types.ts` — add `CalibrationStep`, `stage`/`routingRole`/`skill`
- `src/lib/mini-diagnosis/sequence.ts` — router-aware sequence
- `src/lib/mini-diagnosis/score-buckets.ts` — attach `toCefr()` + subscores to output
- `src/app/api/mini-diagnosis/session/[id]/submit-step/route.ts` — Stage-1 → Stage-2 selection
- `src/lib/gemini-writing.ts`, `src/lib/gemini-speaking.ts` — add `cefrLevel` to rubric output
- Mini-diagnosis results component — render the score card

---

## 9. Build phases

1. **CEFR layer** (½ day) — `bands.ts` + `subscores.ts` + report payload + score card UI.
   Ships value immediately on **existing** mini-diag scores; no adaptivity yet.
2. **DET-style score card** — 4 skill cards + 4 integrated subscores + overall.
3. **Adaptivity** — item tags (`item_cefr`, `routing_role`), Stage-1 router, Stage-2 selection.
4. **Calibration** — Phase-1 LLM tagging now; Phase-2 p-value pipeline after real takers.
5. **Mobile port** — reuse `mobile/lib/*` scoring; mini-diag UI isn't on mobile yet.

---

## 10. Open questions

- **B1/B2 cutoff:** default 95/100 here — confirm against whichever concordance you cite to schools.
- **Test length:** 9 steps (~20 min) vs 12 (tighter productive estimate, ~25 min)?
- **Free vs paid gating:** reuse `MINI_DIAGNOSIS_FREE_LIFETIME_LIMIT = 1`, or a separate limit?
- **Certificate output:** do you want a shareable "CEFR estimate" PDF/score card for marketing?
