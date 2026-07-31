-- Unfinished work the learner ran out of time for, so the backlog follows them
-- across devices instead of living only in one browser.
--
-- Shape: { entries: [{ fromDate, item }] } — see CarryOver in
-- src/lib/course-plan/block-planner.ts.

alter table public.course_plan_settings
  add column if not exists carry_over jsonb not null default '{"entries":[]}'::jsonb;

comment on column public.course_plan_settings.carry_over is
  'Study items the learner did not finish, offered again at the start of each session.';
