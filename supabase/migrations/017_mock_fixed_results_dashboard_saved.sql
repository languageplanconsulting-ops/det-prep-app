-- Learners can pin a completed fixed mock result to their mock test dashboard (/mock-test/start).
alter table public.mock_fixed_results
  add column if not exists dashboard_saved_at timestamptz null;

comment on column public.mock_fixed_results.dashboard_saved_at is
  'When set, the learner saved this report to their mock test dashboard.';

create index if not exists mock_fixed_results_user_dashboard_saved_idx
  on public.mock_fixed_results (user_id, dashboard_saved_at desc nulls last)
  where dashboard_saved_at is not null;
