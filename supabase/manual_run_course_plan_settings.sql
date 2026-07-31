-- Per-user study-plan settings for the /course page.
--
-- Replaces the localStorage-only draft so a learner's plan follows them across
-- devices (web + mobile). Two jsonb blobs rather than columns, because both
-- shapes are owned by the client planner and will change as it evolves:
--   settings  -> PlanSettings   (src/lib/course-plan/planner.ts)
--   overrides -> PlanOverrides  (drag-and-drop edits, keyed by ISO date)

create table if not exists public.course_plan_settings (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  overrides  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.course_plan_settings is
  'Study-plan settings + drag-and-drop overrides for the /course planner. One row per user.';

alter table public.course_plan_settings enable row level security;

-- A signed-in user reads and writes only their own row.
drop policy if exists "Users read own course plan" on public.course_plan_settings;
create policy "Users read own course plan"
  on public.course_plan_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own course plan" on public.course_plan_settings;
create policy "Users upsert own course plan"
  on public.course_plan_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own course plan" on public.course_plan_settings;
create policy "Users update own course plan"
  on public.course_plan_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
