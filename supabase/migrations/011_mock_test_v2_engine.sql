-- Mock test engine v2: pool metadata, continuous placement scores, assembly JSON.

alter table public.mock_questions
  add column if not exists target_band smallint;

alter table public.mock_questions
  add constraint mock_questions_target_band_check
  check (target_band is null or target_band in (85, 125, 150));

-- Backfill from legacy difficulty (easy/medium/hard) when target_band missing
update public.mock_questions
set target_band = case difficulty
  when 'easy' then 85
  when 'hard' then 150
  else 125
end
where target_band is null;

alter table public.mock_questions
  alter column target_band set default 125;

alter table public.mock_questions
  add column if not exists max_points numeric not null default 1;

alter table public.mock_questions
  add column if not exists time_limit_sec integer;

alter table public.mock_questions
  add column if not exists content_family text not null default 'unknown';

comment on column public.mock_questions.target_band is
  'Internal routing pool: 85 / 125 / 150 (DET-style bands; not the final reported score).';
comment on column public.mock_questions.content_family is
  'Dedup key: do not serve two items with the same family in one attempt when possible.';

alter table public.mock_test_sessions
  add column if not exists engine_version integer not null default 1;

alter table public.mock_test_sessions
  add column if not exists assembly jsonb not null default '{}'::jsonb;

alter table public.mock_test_sessions
  add column if not exists routing_band smallint;

alter table public.mock_test_sessions
  add column if not exists stage1_raw_100 numeric;

alter table public.mock_test_sessions
  add column if not exists stage1_det_like numeric;

alter table public.mock_test_sessions
  add column if not exists v2_response_log jsonb not null default '[]'::jsonb;

comment on column public.mock_test_sessions.engine_version is '1 = legacy 10-phase linear; 2 = pool-based 4-stage placement.';

alter table public.mock_test_results
  add column if not exists final_score_raw numeric;

alter table public.mock_test_results
  add column if not exists final_score_rounded_5 smallint;

alter table public.mock_test_results
  add column if not exists cefr_level text;

alter table public.mock_test_results
  add column if not exists routing_band smallint;

alter table public.mock_test_results
  add column if not exists stage1_raw_100 numeric;

alter table public.mock_test_results
  add column if not exists stage1_det_like numeric;

alter table public.mock_test_results
  add column if not exists reading_subscore_v2 numeric;

alter table public.mock_test_results
  add column if not exists listening_subscore_v2 numeric;

alter table public.mock_test_results
  add column if not exists writing_subscore_v2 numeric;

alter table public.mock_test_results
  add column if not exists speaking_subscore_v2 numeric;

alter table public.mock_test_results
  add column if not exists overall_raw_0_to_100 numeric;

alter table public.mock_test_results
  add column if not exists placement_payload jsonb;
