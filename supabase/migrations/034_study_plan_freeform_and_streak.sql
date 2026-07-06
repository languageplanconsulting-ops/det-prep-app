-- Freeform ("no exam date, just track what I do") study-plan mode, plus a
-- last-used-tier hint so "today" can default to one tap instead of a menu.

alter table public.study_plan_schedules
  add column if not exists is_freeform boolean not null default false;

alter table public.study_plan_schedules
  add column if not exists last_tier smallint;
