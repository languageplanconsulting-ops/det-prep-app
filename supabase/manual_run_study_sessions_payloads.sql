-- Deploy the missing submission_payload/report_payload columns on study_sessions.
-- Paste this into the Supabase SQL editor. Safe to re-run (idempotent).
-- This is migration 018 made re-runnable: these columns were never created in
-- the live DB, so every "finish" write from src/lib/study-tracker.ts bundled
-- completed/score together with these two fields in one UPDATE — which failed
-- outright (column does not exist) and was silently swallowed by the caller's
-- try/catch. Net effect: study_sessions.completed was false and score was null
-- on every single row, so every "sessions completed" count (e.g. admin
-- subscriptions list) read as 0 for all users.
--
-- The API route (src/app/api/study/session/route.ts) has also been fixed to
-- write completed/score in their own update, independent of these two optional
-- jsonb columns, so that gap can't silently swallow completed/score again even
-- if this migration lags behind in the future. Run this anyway to restore the
-- submission/report snapshots the admin subscription detail page expects.

alter table public.study_sessions
  add column if not exists submission_payload jsonb,
  add column if not exists report_payload jsonb;

comment on column public.study_sessions.submission_payload is
  'Compact learner submission snapshot for admin review of a study session.';

comment on column public.study_sessions.report_payload is
  'Compact graded report snapshot for admin review of a study session.';
