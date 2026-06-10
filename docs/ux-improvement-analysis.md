# UX Improvement Analysis — English Plan (DET prep for Thai learners)

Applying **Change by Design** (Brown), **Evil by Design** (Nodder), **UX Research** (Nunnally/Farkas), and **The Mom Test** (Fitzpatrick) to every exam + the Mock Test.

> Audience reality: most users are Thai learners who have *tried English before and felt they failed*. They study in 2–5 minute bursts, on a phone, tired, often anxious about a real DET that costs money and gates a visa/university place. They quit the second they feel lost or embarrassed; they return when they feel smart. **Design the emotion, not just the exercise.**

---

## Part 0 — Cross-cutting principles (apply to all exams)

| # | Principle (book) | What it means here |
|---|---|---|
| 1 | **Emotional-first** (Brown) | First 3 min of any exercise must end with the learner feeling *more* capable, not graded. A learner who "fails" silently leaves and doesn't come back (UX Research diary finding). |
| 2 | **Friction audit** (Nodder, Sloth) | Count taps + seconds from "I want to practise" → "first moment of success." Every extra step sheds tired learners. |
| 3 | **Default = continue** (Nodder, Sloth) | End-of-exercise screen should *serve* the next action, not dump the user on a menu. Stopping should be a choice, not the default. |
| 4 | **Feedback = coaching, not grading** (Brown + Nodder) | Never show a bare wrong/score. Show **one** specific thing to fix and make fixing it possible *now*. |
| 5 | **Cumulative achievement, not anxiety streak** (Nodder, Gluttony) | Replace "don't break your streak" with "here's what you've *built*" (words mastered, topics you can now handle). Sunk-cost as pride, not fear. |
| 6 | **Proximate social proof** (Nodder, Pride/Envy) | Compare to someone *like them, slightly ahead* ("learners who started at your level reached 120 in ~6 weeks"), never a discouraging rank. |
| 7 | **Participatory onboarding** (Brown) | Learner co-authors: target score, exam date, time/day, weakest skill. We already have the hooks (target_total, mock_fixed_results) — surface them. |
| 8 | **No jargon, Thai-first, no shame** | (Already enforced — keep auditing.) |

---

## Part 1 — Literacy

### Dictation (listen → type)
**Current reality:** char-by-char diff with dots (`fin···· ··i···`), a scattered "redeem" grid of ~15 labelled boxes, score to 2 decimals (28.77/85). *You already flagged this as confusing — correctly.*

**Areas for improvement**
- **(Brown, empathy / coaching #4)** The report never shows the **correct sentence plainly**. Lead with the answer in full, large, readable. A learner who can't decode their result feels stupid and leaves.
- **(Coaching #4)** Replace the character diff with a **word-level** diff + a short "3 things you missed" list (e.g. *-ed* endings, comma, a dropped clause). One pattern to focus on beats 15 boxes.
- **(Sloth #2/#3)** Kill the 2-decimal score (28.77 → 29). Make **"ลองอีกครั้ง"** the single primary action; demote "redeem" to optional.
- **(Gluttony #5)** After several sets: "คุณพิมพ์ถูก 312 คำจากการฟังแล้ว" — show the built thing.
- **(Mom Test research)** Ask: *"เล่าครั้งล่าสุดที่ทำ dictation แล้วผิด — คุณทำอะไรต่อ?"* Hypothesis to test: learners abandon after a low score rather than retry.

### Fill in the blank (letter tiles + clues)
- **(Coaching #4)** The **clue penalty** frames help as punishment → anxiety. Reframe: clues are part of learning; show "ลองเองก่อนได้คะแนนเต็มช่อง" as encouragement, not a threat.
- **(Sloth #2)** Typing letter-by-letter into tiny tiles is high-friction on mobile. Test a tap-the-word or first-letter-then-autocomplete variant with 5 learners (rapid prototype, Brown).
- **(Coaching #4)** On the report, "close (1–2 letters off)" should celebrate the near-miss ("เกือบแล้ว!") not just mark amber.

### Real word (tap real words)
- **Strongest exam already** — game-like, low friction, instant. Keep it as the **"feel smart in 60 seconds"** entry point for discouraged learners (Brown: the first win).
- **(Pride #6)** Add proximate proof: "ความแม่นยำของคุณ 82% — สูงกว่าคนที่เริ่มสัปดาห์นี้ 60%."
- **(Gluttony #5)** "วันนี้คุณแยกคำจริงได้ 38 คำ" cumulative.

---

## Part 2 — Comprehension

### Reading (passage + 4 MCQ)
- **(Brown, 3 lenses — desirability over feasibility)** The hub leads with *exam mechanics* ("DET caps: Easy 85 · Medium 120 · Hard 140"). That's feasibility framing. Lead with the **learner outcome**: "ฝึกจับใจความ + หา title — ทักษะที่ออกสอบ DET บ่อยสุด."
- **(Coaching #4)** When wrong, the "why this answer" explanation is good — make it the *hero* of the wrong state, not a footnote. Tie it to a strategy ("title = ใจความรวม ไม่ใช่ประโยคเดียว").
- **(Sloth #3)** After the 4th question → default straight to the next exam, not the set list.

### Vocabulary (cloze, 6 blanks, auto-advance)
- **Good flow** (auto-advance = Sloth done right). Keep.
- **(Coaching #4)** "ตอบผิด → เก็บลง Notebook" should be **one tap, auto-suggested**, not a thing the learner must remember (UX Research: the missing trigger, not the missing tool).
- **(Gluttony #5)** Surface the vocabulary *bank* the learner is building over time, with the "100,000+ word" mountain reframed as progress, not an intimidating cliff.

---

## Part 3 — Production (the anxiety zone)

> These are the highest-emotion exams: speaking into a mic, writing in English, being scored /160. Brown's empathy lens matters most here.

### Write about photo / Speak about photo
- **(Brown, first-success #1)** The hard **15-word minimum** before you can submit is a wall for a nervous beginner. Consider a "warm-up" first attempt that's ungraded, or sentence-starters ("In this photo I can see…") so the blank page never wins.
- **(Coaching #4)** The /160 report is rubric-rich but can read as a verdict. Lead with **one** highest-impact fix ("เพิ่มรายละเอียด 1 อย่างต่อประโยค") + the score second.
- **(Nodder, Pride — identity #)** Keep it feeling like a *serious tool for ambitious learners*, but the empty mic state needs reassurance ("ไม่มีใครฟังนอกจากระบบ — พลาดได้").
- **(Mom Test)** Ask: *"ครั้งล่าสุดที่ต้องพูด/เขียนภาษาอังกฤษแล้วรู้สึกไม่มั่นใจ — เกิดอะไรขึ้น?"* The story will reveal whether the barrier is vocabulary, grammar, or *fear* (usually fear).

### Read-then-speak / Read-then-write
- **(Sloth #2)** The **prep-time picker** (choose 1–5 min) is a decision before the work — friction. Default to a sensible time with a quiet "ปรับเวลา" option.
- **(Coaching #4)** Give a reusable **answer skeleton** ("เลือกข้าง → 2 เหตุผล → ตัวอย่าง → สรุป") visible during prep — turns a scary open task into a fill-in structure.

### Interactive speaking (6 turns, mic, 10s prep / 35s speak)
- **(Brown empathy)** 6 live turns is the most intimidating exercise in the app. A **"warm-up turn that doesn't count"** would dramatically lower the entry barrier.
- **(Gluttony #5)** Show progress *during* the 6 turns as building ("3/6 — กำลังไปได้ดี"), so fatigue feels like momentum, not a slog.
- **(Coaching #4)** The conversation recap is excellent — make the *one* thing to improve unmissable, hide the rest behind "ดูเพิ่ม."

---

## Part 4 — Conversation

### Interactive conversation (listen → MCQ, "scenario memory")
- **(Sloth #2)** "Play first, options unlock after audio" is good guidance but can feel like waiting. Make the play button unmissable and the unlock instant.
- **(Coaching #4)** On a wrong turn, replay the exact line + show why — and let the learner **re-hear, not just re-read**.
- **(Pride #6)** "Scenario memory" is the real skill — name the learner's growing ability ("คุณจำบริบทได้แม่นขึ้น 🎯").

### Dialogue → summary (read → write summary /160)
- Already the most modern screen. 
- **(Coaching #4)** The min-20-words gate + rubric is fine; lead the report with the single biggest lever (usually "ตรงประเด็น" / relevancy).
- **(Sloth #3)** Default to "ทำชุดต่อไป" after the report.

---

## Part 5 — Mock Test (the big commitment)

**Current reality:** ~1 hour, 20 steps, uses a monthly **credit**, brutalist dashboard with cadence dots, attempt history, personal best. High stakes, high anxiety.

**Areas for improvement**
- **(Brown, desirability + emotional)** A full Mock is a *huge* ask for a tired learner. Frame the entry around the **outcome and safety**: "นี่คือการซ้อม ไม่ใช่สอบจริง · ไม่ต้องเปิดกล้อง · พลาดได้" — you have this copy; make it the loudest thing, above the credit mechanics.
- **(Nodder, Gluttony — ethical commitment #5)** The **credit** system reads as scarcity/loss ("เหลือ 2/3"). Reframe toward what they've *built*: "ทำ Mock มาแล้ว 4 ครั้ง · พัฒนาขึ้น +12." Scarcity creates anxiety; progress creates pride.
- **(Nodder, Envy — proximate #6)** Personal-best and history are good, but add the *aspirational-but-reachable* line: "คนที่เริ่มที่ 105 เท่าคุณ ส่วนใหญ่ถึง 120 ใน ~6 สัปดาห์." Never a discouraging global rank.
- **(Cagan/Brown outcome)** The results page should answer **"what do I do Monday morning?"** — i.e. "จุดอ่อนคือ Writing + Listening → ไปฝึก Dictation + Write about photo" with a one-tap route. (The V2 results report starts this; make the next-action a button, not prose.)
- **(Sloth #2)** The pre-flight modal has many fields (targets, admin toggles). For a normal user, default everything and show **one** "เริ่ม" button; hide the rest under "ตั้งค่าเพิ่ม."
- **(Brown, 2–5 min reality)** A 1-hour block fights the learner's real behaviour. Consider a **"Mock by section"** option (do Speaking today, Reading tomorrow) that still aggregates into a full score — meets people where they actually are.
- **(Mom Test)** Ask: *"เล่าครั้งล่าสุดที่คุณตั้งใจจะนั่งทำข้อสอบเต็มชุด — เกิดอะไรขึ้น? ทำจบไหม? ถ้าไม่ ทำไม?"* Strong hypothesis: most never finish a 1-hour block in one sitting → section-based mock wins.

---

## Part 6 — Retention & onboarding (whole app)

- **(Brown, participatory)** First-run should ask: เป้าหมายคะแนน, วันสอบ, เวลาที่ฝึกได้ต่อวัน, ทักษะที่กังวลสุด — and the whole hub then orients around *that* (we have the data fields; wire them).
- **(Nodder, Gluttony)** Replace any day-count streak with a **"สิ่งที่คุณสร้างมาแล้ว"** panel: words mastered, sets cleared, score trend. Missing a day shouldn't feel like loss.
- **(Nodder, Sloth — notifications)** Base reminders on *observed* best practice times (from study-tracker data), not a fixed 8 pm. 
- **(Pride, social proof — honest)** A reassurance line on the hub: "ผู้เรียนไทยหลายพันคนใช้เตรียม DET" — only if true; never fabricate.

---

## Part 7 — The research habit (Nunnally/Farkas + Mom Test)

Stop guessing. Two standing loops:
- **Monthly (evaluative):** 3–5 moderated sessions — *"ลองทำ dictation ให้ดูหน่อย"* — watch where they hesitate, mouth words, check the score, or rage-quit on a slow load.
- **Quarterly (generative):** diary study — 5 learners record a voice note every time they sit to practise (what they did before, goal, what broke, how they felt). This surfaces the *emotional* failure points no survey shows.

**Behavioural (not opinion) questions to reuse:**
- ❌ "คุณชอบหน้านี้ไหม?" → ✅ "ทำให้ดูหน่อยว่าจะเริ่มฝึกยังไง"
- ❌ "อยากได้ฟีเจอร์ X ไหม?" → ✅ "เล่าครั้งล่าสุดที่คุณเตรียมสอบภาษาอังกฤษ — ทำอะไร นานแค่ไหน อะไรทำให้หยุด"
- Treat every feature request as a **symptom** — ask for the story behind it before building.
- Look for **commitment** signals (จ่ายเงิน, สมัคร beta), not enthusiasm ("น่าสนใจดี").

---

## Top 10 highest-impact changes (ranked)

1. **Dictation report rebuild** — plain correct answer + word-level diff + one focus (you already want this).
2. **Mock Test: reframe "credit" scarcity → cumulative progress**, and make the results page end in a **one-tap "ฝึกจุดอ่อนนี้"** action.
3. **"Mock by section"** option to fit 2–5 min reality.
4. **Coaching-first reports everywhere** — lead with one fix, score second.
5. **Warm-up / ungraded first attempt** on Speaking + Interactive Speaking (kill the fear barrier).
6. **Replace day-streak with "what you've built"** cumulative panel.
7. **Auto-suggest "add to Notebook"** on every wrong answer (trigger, not tool).
8. **Default the prep-time + pre-flight choices**; one primary button.
9. **Participatory onboarding** wired to target score + exam date.
10. **Proximate social proof** ("คนที่เริ่มที่ระดับคุณ…") on hub + mock results.

*No code changed by this document — it's an analysis. Each item can become a previewed proposal on request.*
