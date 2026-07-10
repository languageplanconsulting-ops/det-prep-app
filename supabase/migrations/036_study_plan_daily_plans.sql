-- Per-day study plan (the "recipe" for one calendar day).
--
-- Why this table exists
-- --------------------
-- Before this, a day's practice sequence was built randomly at start time and
-- kept only in the browser's sessionStorage (web) / local state (mobile). Two
-- consequences we're fixing:
--   1. The day's plan was never stable — reopening re-rolled a different set,
--      so "come back and finish the rest" was impossible.
--   2. Completion was binary: `study_plan_completions` stores one row per day,
--      and BOTH apps rendered a day as done via
--      `isDone = hasCompletionRow || hasAnyAttemptThatDay`. Doing a single
--      exercise therefore turned the whole day green.
--
-- This table pins the day's plan so it is stable and resumable, and carries the
-- two things the learner can vary per day: how long they want to study
-- (duration_minutes) and which track they're doing (exam vs lesson).
--
-- Per-skill progress is NOT stored here. It is derived at read time by counting
-- that day's `practice_attempts` per task_type against `items`. practice_attempts
-- is already written by BOTH web and mobile (with a shared detail.contentKey, see
-- src/lib/practice-attempts-contentkey.ts), so progress syncs across platforms for
-- free and can never drift from the real attempt log.
--
-- `items` shape (ordered):  [{ "skill": "dictation", "count": 3 }, ...]
--   skill ∈ dictation | fitb | realword | reading | vocab | conversation | dialogue_summary

create table if not exists public.study_plan_daily_plans (
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  -- Which kind of practice this day is: real exam questions, or guided lessons.
  -- Progress/improvement stats are only tracked for the 'exam' track.
  track text not null default 'exam' check (track in ('exam', 'lesson')),
  -- Per-day override of study_plan_schedules.default_duration_minutes.
  duration_minutes smallint not null check (duration_minutes in (5, 10, 20, 30, 60)),
  -- The ordered skill groups for this day. Stable once written.
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

create index if not exists study_plan_daily_plans_user_date_idx
  on public.study_plan_daily_plans (user_id, plan_date desc);

alter table public.study_plan_daily_plans enable row level security;

drop policy if exists "Users manage own daily plans" on public.study_plan_daily_plans;
create policy "Users manage own daily plans"
  on public.study_plan_daily_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
