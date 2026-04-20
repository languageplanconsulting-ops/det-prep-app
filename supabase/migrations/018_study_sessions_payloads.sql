alter table public.study_sessions
  add column if not exists submission_payload jsonb,
  add column if not exists report_payload jsonb;

comment on column public.study_sessions.submission_payload is
  'Compact learner submission snapshot for admin review of a study session.';

comment on column public.study_sessions.report_payload is
  'Compact graded report snapshot for admin review of a study session.';
