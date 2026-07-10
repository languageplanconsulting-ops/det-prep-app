-- MANUAL RUN — paste into the Supabase SQL editor on the LIVE project to add the
-- per-day study-plan table (partial-completion + resumable daily plans).
-- Idempotent: safe to run more than once. Mirrors migration 036_study_plan_daily_plans.sql.

create table if not exists public.study_plan_daily_plans (
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  track text not null default 'exam' check (track in ('exam', 'lesson')),
  duration_minutes smallint not null check (duration_minutes in (5, 10, 20, 30, 60)),
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
