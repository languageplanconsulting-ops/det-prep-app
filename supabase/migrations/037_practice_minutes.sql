-- Freeform "randomized timed practice" minutes log.
--
-- The calendar (032_study_plan_calendar.sql) already shows a day as active from
-- practice_attempts, but it can't say HOW LONG the learner practised off-plan.
-- This table records each finished timed-random session ("I had 10 minutes, the
-- app picked random sets across levels for me") so the calendar can show
-- "🎲 ฝึกอิสระ XX นาที" on that day even when it wasn't the proposed plan.
--
-- One row per finished session (not per set): minutes = the time budget the
-- learner chose, sets_done = how many sets they finished, words_learned = how
-- many vocab words they saved to their notebook during the session.

create table if not exists public.study_plan_practice_minutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  practice_date date not null,
  skill text not null,
  minutes integer not null default 0 check (minutes >= 0 and minutes <= 600),
  sets_done integer not null default 0 check (sets_done >= 0),
  words_learned integer not null default 0 check (words_learned >= 0),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists study_plan_practice_minutes_user_date_idx
  on public.study_plan_practice_minutes (user_id, practice_date desc);

alter table public.study_plan_practice_minutes enable row level security;

create policy "Users manage own practice minutes"
  on public.study_plan_practice_minutes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
