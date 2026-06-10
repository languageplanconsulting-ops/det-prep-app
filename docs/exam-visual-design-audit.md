# Visual & Interaction Design Audit — all exams

Lens: layout, color, button placement, visual hierarchy, typography, mobile ergonomics.
Theory base: **Fitts's Law** (target size/distance), **Hick's Law** (fewer choices = faster), **Gestalt** (proximity/similarity/common-region/figure-ground), **Norman** (affordances/signifiers/feedback), **Nielsen heuristics**, **color theory** (60-30-10, semantic color, WCAG AA contrast), **reading patterns** (F/Z), **Jakob's Law** (consistency), **thumb-zone** ergonomics — cross-checked with Brown (empathy), Nodder (Sloth/friction), Nunnally/Farkas (observe real taps).

Severity: 🔴 high · 🟠 medium · 🟢 polish.

---

## 0. Design-system level (fix once, helps every exam)

| Aspect | Issue today | Theory | Improvement | Sev |
|---|---|---|---|---|
| **Color budget** | Brutalist uses black borders + hard yellow/blue blocks everywhere — no 60-30-10 discipline | Color theory (60-30-10) | 60% neutral (white/slate), 30% `#004AAD`, 10% `#FFCC00` *accent only* (CTAs, highlights). Yellow stops being structural. | 🔴 |
| **Semantic color consistency** | green=correct / red=wrong / amber=close used inconsistently; blue used for both links and primary | Jakob's Law, learnability | Lock a token set: blue=primary action, yellow=reward/CTA accent, green=correct, red=wrong, amber=close/warning. Never reuse. | 🟠 |
| **Contrast** | Monospace mid-gray labels on white can fail WCAG AA; black-on-yellow buttons OK but harsh | WCAG AA (4.5:1) | Audit all text ≥4.5:1; soften pure-black → `#0f172a`; ensure yellow buttons use `#004AAD` text (passes). | 🟠 |
| **Primary-action placement** | "Submit" sits inline mid-card; on mobile it's mid-screen, not in thumb reach | Fitts's Law + thumb-zone | **Sticky bottom CTA bar** for the single primary action in every exam. Big (≥48px), full-width on mobile. | 🔴 |
| **Tap-target size** | Letter tiles, MCQ rows, audio icons often <44px | Fitts's Law / WCAG 2.5.5 | Min 44×44px on every interactive element. | 🔴 |
| **Button hierarchy** | Primary + secondary + tertiary often same weight/size | Visual hierarchy, Hick's Law | One filled primary, one outline secondary, rest text-only. Never two filled buttons competing. | 🟠 |
| **Typography scale** | Monospace `ep-stat` for labels reads technical; no consistent scale | Type scale, readability | Sans (IBM Plex Sans Thai) throughout; a 4-step scale (caption/body/title/display); Thai line-height ≥1.6. | 🟠 |
| **Corner radius / shadow** | Sharp corners + hard offset shadows feel aggressive | Aesthetic-usability effect | Soft `rounded-2xl` + soft shadows (already in V2 skin). | 🟢 |
| **Whitespace** | Cramped, dense cards | Gestalt (proximity needs space) | More padding; group by whitespace not borders. | 🟠 |

---

## LITERACY

### Dictation
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Button placement | Play/Replay top, Submit far below textarea | Fitts + thumb-zone | Sticky "ส่งคำตอบ" bottom bar; audio controls stay near the prompt | 🔴 |
| Audio controls | Two text buttons, no clear "now playing" state | Norman feedback | Add an animated playing indicator + a visible replay counter | 🟠 |
| Report diff | Char-dots = low figure-ground, undecodable *(✅ fixed for admins)* | Gestalt figure-ground | Word-level diff, color only on errors | 🔴 |
| Color | Red dots + red underline + green chips = noisy | Color theory restraint | Color *only* the wrong words; everything else neutral | 🟠 |

### Fill in the blank
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Letter tiles | ~24px wide tap targets, hard on mobile thumbs | Fitts / WCAG 2.5.5 | Bigger tiles (≥36px) or switch interaction to tap-word | 🔴 |
| Clue buttons | Scattered per-blank, compete with passage | Gestalt proximity / Hick | Group all clues in one collapsible row; one tap to reveal | 🟠 |
| Progress bar | Thin yellow on top, easy to miss | Visual hierarchy | Keep but pair with "เติมแล้ว 3/8" label | 🟢 |
| Submit | Sticky footer (good) but black border heavy | Fitts (good) + aesthetics | Keep sticky; soften styling | 🟢 |
| Passage | Serif-ish mono, blanks inline mid-text | Reading flow | Sans, generous line-height, blanks visually distinct (underline + tint) | 🟠 |

### Real word  *(cleanest layout already)*
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Word grid | Good (Gestalt similarity) but tiles tall/narrow | Fitts | Even tap areas, ≥44px height | 🟢 |
| Selected state | Yellow fill only — relies on color alone | Accessibility (not color-only) | Add a check icon / border so it's not color-dependent | 🟠 |
| Submit | Full-width bottom (good) | Fitts | Keep; make sticky on long sets | 🟢 |

---

## COMPREHENSION

### Reading
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Layout | Long passage + question stacked; lots of scrolling between them | Spatial memory / cognitive load | On desktop, 2-col (passage left, Q right); on mobile, sticky mini-passage or "ดูบทความ" toggle | 🟠 |
| MCQ options | Plain bordered buttons, no keys | Gestalt + scannability | A/B/C/D key chips; clear selected + hover state | 🟠 |
| Next/Back | "Next question" placement varies | Jakob's Law / Z-pattern | Primary "Next" bottom-right, "Back" bottom-left, consistently | 🟠 |
| Progress | No step indicator (Q1→Q4) | Visual feedback | 4-dot progress | 🟢 |
| Vocab highlights | Yellow inline, low affordance (looks like highlight not button) | Norman signifier | Dotted underline + tap cue so it reads as interactive | 🟠 |
| Difficulty caps | "85/120/140" dominates header | Hierarchy / desirability | Demote to a small chip; lead with skill | 🟢 |

### Vocabulary
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Auto-advance | Good (low friction) | Hick / Sloth | Keep; add subtle transition so the jump isn't jarring | 🟢 |
| Blank state | `[BLANK]` placeholder + fill-in | Figure-ground | Style blank as a clear slot (underline + faint tint); filled word animates in | 🟠 |
| MCQ | Same as Reading — no keys | Scannability | A/B/C/D keys, 44px rows | 🟠 |
| Progress | "Blank 2/6" text only | Feedback | Dot/segment bar | 🟢 |

---

## PRODUCTION

### Write about photo / Speak about photo
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Photo size | Photo competes with prompt for the fold | Visual hierarchy | Photo large but capped; prompt directly under, EN bold / TH muted | 🟠 |
| Prompt hierarchy | EN + TH same weight | Typographic hierarchy | EN lead (the tested language), TH as muted gloss | 🟠 |
| Mic / record button | "Start speaking" blue, "Stop" red — but mid-card | Norman convention (record=red) + Fitts | Record = red circular, prominent, thumb-reachable; stop = same spot | 🟠 |
| Word counter | Small, below textarea | Feedback proximity | Live counter + min-goal next to the input, color-state at 15 | 🟢 |
| Submit | Disabled until 15 words, but placement mid-card | Fitts + affordance | Sticky bottom; disabled state visually clear (not just opacity) | 🔴 |
| Buttons competing | "Try again" + "Submit" same row, similar weight | Hick / hierarchy | Submit filled primary; "Try again" text-only | 🟠 |

### Read-then-write / Read-then-speak
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Prep-time picker | A full decision screen before work | Hick's Law | Default a time, collapse the picker | 🟠 |
| Countdown | Large blue number (good) | Feedback / hierarchy | Keep; add a calm color shift near the end, not alarming red flash | 🟢 |
| Question cards | Grid of cards = extra navigation layer | Hick / Sloth | Auto-pick or reduce to a simple list | 🟠 |
| Transcript box | Below question, scroll needed | Proximity | Keep question pinned while transcript grows | 🟢 |

### Interactive speaking
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Turn progress | "Turn 3/6" text | Feedback / momentum | 6-segment progress bar, fills as you go | 🟠 |
| Timer | Speak-time countdown placement | Hierarchy | Top-right card, large, but not red-alarm until last 5s | 🟢 |
| Avatar | Was "AI" badge *(✅ → EP)* | Brand | Consider a friendly P'Doy/teacher avatar | 🟢 |
| Record button | Mid-screen | Fitts + record=red | Prominent red, thumb zone | 🟠 |
| Phase clarity | playing→prep→record→review states blur | Norman visibility of system state | Clear labeled phase chip ("กำลังฟัง" / "เตรียม" / "พูด") | 🟠 |

---

## CONVERSATION

### Interactive conversation
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Play button | Must play before options unlock; button not dominant | Norman affordance + hierarchy | Large central play (yellow), unmistakable; "ฟังก่อน" hint | 🟠 |
| Transcript toggle | Small text button | Signifier | Clear toggle with icon | 🟢 |
| MCQ reveal | Staggered animation can feel slow | Feedback timing | Snappy reveal (<150ms) | 🟢 |
| Progress | 8 steps (scenario+3+5) but no map | Feedback | 8-segment progress so length is visible | 🟠 |
| Audio replay | "Speak line" in report | Coaching | Make re-hear prominent on wrong turns | 🟠 |

### Dialogue → summary  *(most modern)*
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Chat bubbles | Use gradients (against brand rule) | Brand + restraint | Flat solid speaker colors | 🟠 |
| Scenario list | 5 numbered sentences — good | Gestalt | Keep | 🟢 |
| Rubric chips | 4 colored chips compete at top | Hierarchy / Hick | Demote to a single line; lead with the task | 🟠 |
| Word counter | Progress bar blue→emerald gradient | Brand | Flatten; keep the at-goal color flip | 🟢 |
| Submit | Big blue, border-4 | Fitts (good) | Sticky on mobile, soften | 🟢 |

---

## MOCK TEST
| Aspect | Issue | Theory | Improvement | Sev |
|---|---|---|---|---|
| Start dashboard | Dense brutalist grid, dot background, monospace | Cognitive load / aesthetic | Soft cards, clear sections, one hero CTA | 🔴 |
| Credit chip | "2/3" prominent = scarcity | Hierarchy + Nodder ethics | Demote; lead with progress | 🟠 |
| Pre-flight modal | Many fields/toggles for a normal user | Hick's Law | Default all; one "เริ่ม" button; hide advanced | 🟠 |
| Results | Score ring strong *(✅ V2)*; step list dense | Hierarchy | V2 next-action hero ✅; collapse step detail by default | 🟢 |
| Timer bar | During exam | Visibility of state | Keep visible, calm; warn only near the end | 🟢 |

---

## Top visual fixes (ranked, cross-exam)

| # | Fix | Theory | Exams | Sev |
|---|---|---|---|---|
| 1 | **Sticky bottom primary CTA** (one big action, thumb zone) | Fitts + thumb-zone | all 12 | 🔴 |
| 2 | **44px min tap targets** (tiles, MCQ, audio icons) | Fitts / WCAG | FITB, Real word, Reading, Vocab | 🔴 |
| 3 | **60-30-10 color discipline** — yellow = accent only | Color theory | all | 🔴 |
| 4 | **A/B/C/D keys + clear selected state** on all MCQ | Gestalt + scannability | Reading, Vocab, Conversation | 🟠 |
| 5 | **One primary button**, secondary as outline/text | Hick + hierarchy | all (esp. Production) | 🟠 |
| 6 | **EN-first prompt typography**, TH muted | Hierarchy | Reading, Production | 🟠 |
| 7 | **Progress indicators** (dots/segments) everywhere | Visibility of state | Reading, Vocab, Interactive ×2 | 🟠 |
| 8 | **Record = red, prominent, thumb zone** | Norman convention | Speak, Read-speak, Interactive sp. | 🟠 |
| 9 | **Selected states not color-only** (add icon/border) | Accessibility | Real word, all MCQ | 🟠 |
| 10 | **Flatten remaining gradients** | Brand | Dialogue-summary | 🟢 |

*Analysis only — no code changed. Most 🔴 items (sticky CTA, tap targets, color discipline) are reusable design-system changes that improve every exam at once.*
