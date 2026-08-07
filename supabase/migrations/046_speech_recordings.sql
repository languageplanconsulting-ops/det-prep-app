-- Shadow-log the raw audio behind every speech transcription, so real
-- Thai-learner recordings exist to grade/calibrate a future acoustic
-- pronunciation scorer against. Purely additive: no existing table/route
-- behavior changes, this only records what already happens.
create table if not exists public.speech_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null, -- e.g. 'speech-transcribe', 'study-plan-transcribe'
  audio_path text not null, -- path within the Bunny Storage zone
  mime_type text not null,
  transcript text,
  reviewed boolean not null default false, -- set true once a human (พี่ดอย) has scored it
  human_score jsonb, -- per-word/phone human grading, once reviewed
  created_at timestamptz not null default now()
);

create index if not exists speech_recordings_user_id_idx on public.speech_recordings(user_id);
create index if not exists speech_recordings_created_at_idx on public.speech_recordings(created_at);
create index if not exists speech_recordings_reviewed_idx on public.speech_recordings(reviewed) where not reviewed;

alter table public.speech_recordings enable row level security;

-- Only the server (service role, via API routes) writes/reads this table.
-- No end-user policy: learners should never see or query this table directly,
-- and admins review it through an admin-only route using the service role.
