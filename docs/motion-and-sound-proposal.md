# Motion + Sound Proposal — making exams feel alive (Duolingo-grade)

Goal: replace the "brute" instant state-changes with **smooth microinteractions** and **friendly click/feedback sounds**, so practice feels rewarding — not clinical.

Theory: **Saffer — Microinteractions** (trigger → rules → *feedback* → loops), **Disney 12 principles** (anticipation, ease-in/out, follow-through, squash/stretch), **Doherty threshold** (<400ms feels instant), **Material motion** (meaningful, not decorative), **Brown** (gentle — wrong answers must never feel punishing), **Nodder** (satisfying feedback = the "just one more" loop; reward sound reinforces real progress).

Current state: `playBlinkBeep()` = a harsh 880→660Hz **square wave** (digital/buzzy). Motion = scattered `ep-luxury-*` classes, mostly missing on taps. No correct/wrong/reward sounds. No mute control. No `prefers-reduced-motion` handling.

---

## A. SOUND KIT (Web Audio, synthesized — no asset downloads, muteable)

| Event | Sound (synth) | Character | When | Principle |
|---|---|---|---|---|
| **Tap / select option** | soft sine "pop" ~660Hz, 60ms, gentle decay | light, satisfying | every MCQ/word/tile tap | Saffer feedback · replaces harsh beep |
| **Correct** | two-note rising "ding" (C→E), 180ms | bright, happy | correct answer/blank | Nodder reward |
| **Wrong** | soft low "thunk" (~200Hz sine, no buzz), 160ms | gentle, *not* shaming | wrong answer | Brown (don't punish) |
| **Submit** | quick "whoosh" (filtered noise sweep), 220ms | momentum | on submit | follow-through |
| **Score reveal** | 3-note pleasant arpeggio, 500ms | small celebration | report opens | Nodder gluttony (reward effort) |
| **Streak / milestone** | warm chime + sparkle | celebratory | cumulative milestone | reward, sparing |
| **Audio replay (dictation/listen)** | none (don't mask the content audio) | — | — | clarity |

**Rules**
- **Muteable**: a 🔊/🔇 toggle (localStorage `ep-sound-on`, default **on** like Duolingo, but always visible). Respect device silent where detectable.
- **Never sound-only**: every sound pairs with a visual change (WCAG — not feedback by audio alone).
- **Debounce/cap volume** (~0.06 gain) so it's pleasant, never startling.
- One shared `useExamSound()` hook → `sfx.tap() / .correct() / .wrong() / .submit() / .reveal()`. Replaces `playBlinkBeep` everywhere.

---

## B. MOTION / MICROINTERACTIONS

Durations follow Doherty (<400ms feels instant); easing = `cubic-bezier(0.22,1,0.36,1)` (gentle ease-out) unless noted.

| Interaction | Current | Proposed motion | Duration | Principle |
|---|---|---|---|---|
| **Option / word tap** | instant color flip | quick **scale 0.97→1** (squash) + color ease | 130ms | Disney squash · feedback |
| **Selected state** | instant border | border + tint **fade-in**, key chip pops | 150ms | continuity |
| **Correct answer** | instant green | green **pulse** + ✓ icon **pop-in** (scale 0→1.1→1) | 220ms | reward, anticipation |
| **Wrong answer** | instant red | gentle **horizontal shake** (±4px ×2) + red fade | 250ms | error, *soft* |
| **Blank fill (FITB / Vocab)** | instant text | letter/word **drops in** + tile tints, tiny bounce | 200ms | follow-through |
| **Progress bar / dots** | jumps | **animated fill** / dot fill | 400ms | progress feedback |
| **Score number (report)** | static | **count-up** 0→score | 600ms | celebration |
| **Screen / step change** | abrupt swap | **fade + slide-up 8px** (already `ep-comp-step-in` — apply consistently) | 250ms | spatial continuity |
| **Card hover (desktop)** | hard shadow jump | soft **lift -2px** + shadow ease | 140ms | affordance |
| **Sticky CTA enable** | opacity flip | enabled state **subtle pulse once** | 200ms | "you can go now" |
| **Modal open/close** | exists (220ms) ✅ | keep — already smooth | — | — |
| **Audio playing (dictation/IS)** | static | soft **equalizer bars** / ring pulse while playing | loop | visibility of state (Norman) |

---

## C. Accessibility & performance (non-negotiable)
- **`prefers-reduced-motion`**: a global CSS guard disables transforms/animations (keep instant state changes). Already partially present — extend it.
- **GPU-friendly**: animate only `transform` + `opacity` (never width/top) to stay 60fps on mid-range Thai-market Android.
- **Sound off by one tap**, remembered per device.
- Motion is **meaningful, never decorative** (Material) — every animation communicates a state change.

---

## D. Delivery plan (same safe pattern)
1. Build `useExamSound()` (synth kit) + a `<SoundToggle>` — **admin-gated first**, replaces `playBlinkBeep`.
2. Add a small motion utility layer (CSS classes: `ep-pop`, `ep-shake`, `ep-pulse-ok`, `ep-fill`, count-up hook) guarded by `prefers-reduced-motion`.
3. Apply per exam, starting with the two you named — **Dictation + Fill-in-blank** — then roll across.
4. Each step admin-gated, verified, you review on phone (motion/sound *must* be felt, not assumed — UX Research principle).

---

## E. Recommended scope for round 1 (smallest satisfying slice)
| Build | Why |
|---|---|
| `useExamSound()` tap + correct + wrong + submit | replaces buzzy beep everywhere, instant "alive" feel |
| `<SoundToggle>` in nav | control + trust |
| `ep-pop` on every option/tile tap | the core Duolingo "click" feel |
| `ep-shake` wrong / `ep-pulse-ok` correct | gentle right/wrong feedback |
| count-up score on reports | reward |
| `prefers-reduced-motion` guard | a11y |

*Proposal only — nothing built yet. Approve the sound character + motion set (or tweak any row) and I'll implement round 1 admin-gated on Dictation + Fill-in-blank first.*
