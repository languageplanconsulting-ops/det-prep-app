-- Replace legacy mock_test_results from 001 with full mock test system

drop policy if exists "Users manage own mock tests" on public.mock_test_results;
drop table if exists public.mock_test_results cascade;

-- MOCK TEST QUESTION BANK
create table public.mock_questions (
  id uuid default gen_random_uuid() primary key,
  phase integer not null check (phase between 1 and 9),
  question_type text not null check (question_type in (
    'fill_in_blanks',
    'read_and_select',
    'interactive_listening',
    'vocabulary_in_context',
    'read_then_speak',
    'write_about_photo',
    'speak_about_photo',
    'summarize_conversation',
    'essay_writing'
  )),
  skill text not null check (skill in (
    'literacy','comprehension','conversation','production'
  )),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  content jsonb not null,
  correct_answer jsonb,
  is_ai_graded boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MOCK TEST SESSIONS
create table public.mock_test_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  status text default 'in_progress' check (status in (
    'in_progress','submitted','processing','completed','abandoned'
  )),
  current_phase integer default 1,
  current_difficulty text default 'medium' check (current_difficulty in ('easy','medium','hard')),
  consecutive_correct integer default 0,
  consecutive_wrong integer default 0,
  phase_responses jsonb default '{}',
  ai_responses jsonb default '{}',
  started_at timestamptz default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz default (now() + interval '70 minutes')
);

-- MOCK TEST RESULTS
create table public.mock_test_results (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.mock_test_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  overall_score integer,
  literacy_score integer,
  comprehension_score integer,
  conversation_score integer,
  production_score integer,
  adaptive_log jsonb,
  score_history jsonb,
  ai_feedback jsonb,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz default now()
);

create index mock_questions_phase_diff_idx on public.mock_questions (phase, difficulty, is_active);
create index mock_test_sessions_user_idx on public.mock_test_sessions (user_id, status);
create index mock_test_results_session_idx on public.mock_test_results (session_id);
create index mock_test_results_user_idx on public.mock_test_results (user_id);
create unique index if not exists mock_test_results_session_unique on public.mock_test_results (session_id);

alter table public.mock_questions enable row level security;
alter table public.mock_test_sessions enable row level security;
alter table public.mock_test_results enable row level security;

-- mock_questions: learners read active questions; admins manage all
create policy "Anyone signed in can read active mock questions"
  on public.mock_questions for select
  using (auth.uid() is not null and is_active = true);

create policy "Admins full access mock_questions"
  on public.mock_questions for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- mock_test_sessions: own rows
create policy "Users manage own mock_test_sessions"
  on public.mock_test_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all mock_test_sessions"
  on public.mock_test_sessions for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- mock_test_results: own rows
create policy "Users manage own mock_test_results"
  on public.mock_test_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all mock_test_results"
  on public.mock_test_results for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
