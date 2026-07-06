-- Calendar-based study plan (exam date + cadence -> a daily schedule of
-- timed-tier practice sessions / mock tests). Distinct from
-- `study_plan_results` (the diagnostic gate-ladder report) — this is the
-- day-by-day scheduling layer built on top of it.
--
-- The calendar itself (which dates are study days, what tier/mock is
-- recommended per day) is derived at read time from the schedule row via
-- generateCalendar() (src/lib/study-plan/schedule.ts); only completions are
-- persisted here.

create table if not exists public.study_plan_schedules (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  exam_date date not null,
  cadence_days smallint not null default 1 check (cadence_days between 1 and 7),
  default_duration_minutes smallint not null default 10 check (default_duration_minutes in (5, 10, 20, 30, 60)),
  reminder_time time not null default '19:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  completion_date date not null,
  tier_completed smallint not null check (tier_completed in (5, 10, 20, 30, 60)),
  session_ref text,
  completed_at timestamptz not null default now()
);

create index if not exists study_plan_completions_user_date_idx
  on public.study_plan_completions (user_id, completion_date desc);

alter table public.study_plan_schedules enable row level security;
alter table public.study_plan_completions enable row level security;

create policy "Users manage own study plan schedule"
  on public.study_plan_schedules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own study plan completions"
  on public.study_plan_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
