-- Course completion + per-item accuracy, moved off the device.
--
-- 042 synced the learner's PLAN (settings, drag overrides) but not their
-- PROGRESS, which stayed in localStorage under ep-course-progress-v1. A new
-- phone, a cleared Safari cache, or an iOS storage eviction (the content banks
-- already sit near the 5 MB origin cap) reset a paying learner's course to zero
-- while their calendar survived. This closes that.
--
-- Shape, owned by the client planner (block-planner.ts Progress):
--   { "completedIds": ["v-...", "e-..."],
--     "accuracy": { "e-...": { "correct": 4, "total": 5 } } }
--
-- Accuracy rides along in the same blob because it is written on the same
-- event — an item finishing — and is only ever read back with its item.

alter table public.course_plan_settings
  add column if not exists progress jsonb not null default '{"completedIds":[],"accuracy":{}}'::jsonb;

comment on column public.course_plan_settings.progress is
  'Finished course item ids + per-item accuracy. Client shape: block-planner.ts Progress.';
