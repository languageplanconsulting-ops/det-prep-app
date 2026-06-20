-- Personalized study-plan diagnostic results.
-- Stores the computed report (per-skill bands + predicted) and the answer snapshot.
-- The plan is re-generated at render time from the report so it always reflects the
-- learner's current access tier and the latest resource catalog.

create table if not exists public.study_plan_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target int not null,
  predicted int not null,
  report jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists study_plan_results_user_idx
  on public.study_plan_results (user_id, created_at desc);

alter table public.study_plan_results enable row level security;

create policy "Users manage own study plan results"
  on public.study_plan_results
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
