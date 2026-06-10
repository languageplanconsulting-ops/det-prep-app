# HANDOFF — English Plan revamp (read this first in a new session)

You're continuing a large **admin-only soft-modern revamp** of a Thai DET-prep app. Everything is gated so **real users see the original app**; only admins see the new design.

## The golden rules (do not break)
1. **Gate everything** on `const { isAdmin, previewEligible } = useEffectiveTier(); const soft = isAdmin || previewEligible;` then `if (soft) return <newJSX/>` (or `{soft ? … : null}`). Non-admin path must stay byte-for-byte original.
2. **No "AI" word** anywhere user-facing. No dev jargon (Gemini, GEMINI_API_KEY, .env.local, "Admins upload"). Use "ตรวจให้ทันที" / "ระบบให้คะแนน".
3. **No gradients** in UI (one lined-paper texture exception in notebook).
4. **No fabricated data** — social proof / cohort stats need real data; refused per *Evil by Design* ethics.
5. **Coach voice = "Tips from P'Doy"**, friendly Thai, use ครับ/นะครับ. Anything sales/Premium = "ENGLISH PLAN TEAM" voice, NOT P'Doy.
6. **Books to apply:** Change by Design (empathy, outcome-first), Evil by Design (Sloth/friction, Gluttony/reward, ethical persuasion), UX Research (observe real behavior), The Mom Test (behavioral questions). Plus UI theory: Fitts, Hick, Gestalt, Norman, WCAG, 60-30-10 color.

## Reusable primitives (already built — REUSE these)
- `@/components/practice/SoftHubHeader` → `SoftHubHeader` (soft hub header + P'Doy tip; colors: amber/emerald/violet/sky) + `SoftHubCard`
- `@/components/practice/AdminCoachTip` → `AdminCoachTip` (self-gating P'Doy bubble)
- `@/components/practice/AdminWritingStarters` → sentence-starters (self-gating)
- `@/components/practice/StickyExamCTA` → mobile sticky bottom CTA (Fitts)
- `@/lib/exam-sfx` → `sfxTap/sfxCorrect/sfxWrong/sfxSubmit/sfxReveal` (admin-gated via `setSfxEnabled`, mute-aware). `@/hooks/useRevealSfx` → chime on report mount.
- `@/components/admin/AdminSoftSkin` → adds `.admin-soft` class on <html> for admins; CSS skin in globals.css softens brutalist signals app-wide (border-black, border-4, hard shadows, ep-stat/font-mono → sans). Motion utils: `.ep-pop/.ep-shake/.ep-pulse-ok` (prefers-reduced-motion safe).
- `@/hooks/usePracticeHeroStats` → real Mock score/target/streak/minutes + exam date (localStorage `ep-exam-date`).

## DONE (admin-gated, build-green, committed)
- Practice Hub V2 (`PracticeHubV2`) with REAL data (Phase 2)
- All 12 exam screens: coach-tip headers + StickyExamCTA; **Dictation + Real Word = full bespoke rebuilds**; Reading/Vocab = A/B/C/D MCQ keys
- All 12 round-selector hubs (soft branches)
- All 6 guide modals (IntroModalShell soft frame + font-mono softened by skin)
- Mock **results** V2 (`MockFixedReportBrandedViewV2`); Notebook V2 (`NotebookListV2`/`NotebookGate`); Dictation report (Plan A)
- Sounds: tap everywhere + Vocab correct/wrong + reveal chime on ALL 12 reports
- Copy cleanup: removed all "AI"/dev-jargon (this is GLOBAL/all-users — intentional)
- Thai launch announcement (`RevampAnnouncementModal`, admin-only, not shown to users yet)

## NOT done (remaining)
| Item | Note |
|---|---|
| Mock Test **start/hub** page | Brutalist still. Touches credit/billing — user actively edits it; DON'T collide |
| Exam **report** bespoke redesign | Only skin-softened; could add coach headers / full redesign |
| Full bespoke exam layouts (progress dots, chat bubbles for ALL) | Only Dictation/Real Word fully rebuilt |
| Social proof + cumulative "what you built" panels | BLOCKED — needs real stats data (don't fake) |
| Warm-up turns + default-next routing | Touches recording/nav logic |
| Guide-modal colored accent blocks | Low value; mono already softened |
| More correct/wrong sounds (Reading/FITB/Conversation MCQ) + event animations | Incremental |
| **Flip everything to all users** | Awaiting user approval |

## Workflow conventions
- **Verify:** `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -ivE 'zz-preview-banner'` (filter that — it was a transient user file) then `npm run build`.
- **Commit per batch** with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. On `main`.
- **Cannot push from here** (no git creds) — user pushes via **GitHub Desktop**.
- User edits files in **parallel** (billing/PlanExpiry, landing-*.html) — only `git add` YOUR specific files, never `git add -A`.
- **Admin recognition:** preview-hash Vercel URLs (e.g. `82i6…vercel.app`) DON'T carry admin login — test on production domain. The yellow "Admin preview" banner confirms recognition.

## User's open action items
1. Push the unpushed commits (GitHub Desktop).
2. Commit `layout.tsx` (has `<SoundToggle/>`) together with their `src/components/billing/` work.

## Preview mockups (static, in /public)
`revamp-master-index.html` links them all (practice hub, exam screens, hubs, mock, notebook, dictation report, announcement).
