-- "Fix this habit" mini drill shown on a report for a mistake the learner has
-- repeated: pick the reason (Thai choices), then rewrite one practice sentence.
-- One row per (learner, topic, original sentence), so the AI-generated choices
-- are paid for once and a reopened report restores where the learner left off.
-- Service-role only: the API checks answers, so correct ids never reach the client
-- before the learner answers. RLS is on with no policies = no direct client access.
create table if not exists public.weakness_drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_key text not null,
  topic_en text not null default '',
  topic_th text not null default '',
  wrong_hash text not null,
  -- [{ "id": "c1", "text": "..." }, ...] already shuffled
  choices jsonb not null,
  correct_choice_id text not null,
  explanation_th text not null default '',
  stem_en text not null default '',
  stem_th text not null default '',
  step1_choice_id text,
  step1_correct boolean,
  rewrite_attempts integer not null default 0,
  rewrite_passed boolean not null default false,
  rewrite_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_key, wrong_hash)
);

create index if not exists weakness_drills_user_created_idx
  on public.weakness_drills (user_id, created_at desc);

alter table public.weakness_drills enable row level security;
