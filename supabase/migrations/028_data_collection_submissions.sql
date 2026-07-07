-- Data-collection log: every AI-graded production submission (write/speak tasks)
-- is saved here automatically so admins can review submitted text + the full report,
-- to refine explanations and grading. Append-only; never emailed.

create table if not exists public.data_collection_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  -- read_then_write | read_then_speak | write_about_photo | speak_about_photo
  -- | interactive_speaking | dialogue_summary
  exam_type text not null,
  attempt_id text,
  prompt_title text,       -- topic/scenario/photo title shown to the learner
  prompt_text text,        -- the prompt / question text
  submitted_text text,     -- the learner's essay / spoken transcript / summary
  word_count integer,
  score160 numeric,        -- headline DET-scale score from the report
  report jsonb not null default '{}'::jsonb,  -- the FULL generated report
  created_at timestamptz not null default now()
);

alter table public.data_collection_submissions enable row level security;

-- Admins only (read). Inserts happen via the service-role key from the report APIs,
-- which bypasses RLS — so there is intentionally no insert policy for normal users.
drop policy if exists "Admins read data_collection_submissions" on public.data_collection_submissions;
create policy "Admins read data_collection_submissions"
  on public.data_collection_submissions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists idx_dcs_exam_created
  on public.data_collection_submissions (exam_type, created_at desc);
create index if not exists idx_dcs_created
  on public.data_collection_submissions (created_at desc);
create index if not exists idx_dcs_user
  on public.data_collection_submissions (user_id, created_at desc);
