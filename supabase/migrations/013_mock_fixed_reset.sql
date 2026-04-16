-- Fixed 20-step mock rebuild: hard reset old mock data + new fixed-schema tables.

-- Hard reset legacy mock runtime data/content.
truncate table public.mock_test_results restart identity;
truncate table public.mock_test_sessions restart identity;
truncate table public.mock_questions restart identity;

-- Fixed mock set metadata.
create table if not exists public.mock_fixed_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mock_fixed_sets_name_unique
  on public.mock_fixed_sets (lower(name));

-- One row per step (1..20) in a fixed set.
create table if not exists public.mock_fixed_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.mock_fixed_sets(id) on delete cascade,
  step_index integer not null check (step_index >= 1 and step_index <= 20),
  task_type text not null check (task_type in (
    'fill_in_blanks',
    'write_about_photo',
    'dictation',
    'vocabulary_reading',
    'speak_about_photo',
    'read_and_write',
    'read_then_speak',
    'interactive_speaking',
    'conversation_summary'
  )),
  time_limit_sec integer not null check (time_limit_sec > 0),
  rest_after_step_sec integer not null default 0 check (rest_after_step_sec >= 0 and rest_after_step_sec <= 300),
  content jsonb not null,
  correct_answer jsonb,
  is_ai_graded boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists mock_fixed_set_items_set_step_unique
  on public.mock_fixed_set_items (set_id, step_index);

-- Session for one user taking one fixed set.
create table if not exists public.mock_fixed_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.mock_fixed_sets(id) on delete restrict,
  status text not null default 'in_progress' check (status in (
    'in_progress','cancelled','completed'
  )),
  current_step integer not null default 1 check (current_step >= 1 and current_step <= 20),
  responses jsonb not null default '[]'::jsonb,
  targets jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists mock_fixed_sessions_user_idx
  on public.mock_fixed_sessions (user_id, status, started_at desc);

-- Final result row.
create table if not exists public.mock_fixed_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.mock_fixed_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.mock_fixed_sets(id) on delete restrict,
  target_total numeric,
  target_listening numeric,
  target_speaking numeric,
  target_reading numeric,
  target_writing numeric,
  actual_total numeric not null,
  actual_listening numeric not null,
  actual_speaking numeric not null,
  actual_reading numeric not null,
  actual_writing numeric not null,
  deltas jsonb not null default '{}'::jsonb,
  report_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mock_fixed_results_user_idx
  on public.mock_fixed_results (user_id, created_at desc);

-- RLS
alter table public.mock_fixed_sets enable row level security;
alter table public.mock_fixed_set_items enable row level security;
alter table public.mock_fixed_sessions enable row level security;
alter table public.mock_fixed_results enable row level security;

-- Read fixed set content for signed-in users.
drop policy if exists "Signed users read active fixed sets" on public.mock_fixed_sets;
create policy "Signed users read active fixed sets"
  on public.mock_fixed_sets for select
  using (auth.uid() is not null and is_active = true);

drop policy if exists "Signed users read fixed set items" on public.mock_fixed_set_items;
create policy "Signed users read fixed set items"
  on public.mock_fixed_set_items for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.mock_fixed_sets s
      where s.id = set_id and s.is_active = true
    )
  );

drop policy if exists "Users manage own fixed sessions" on public.mock_fixed_sessions;
create policy "Users manage own fixed sessions"
  on public.mock_fixed_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own fixed results" on public.mock_fixed_results;
create policy "Users manage own fixed results"
  on public.mock_fixed_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin full control.
drop policy if exists "Admins manage fixed sets" on public.mock_fixed_sets;
create policy "Admins manage fixed sets"
  on public.mock_fixed_sets for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage fixed set items" on public.mock_fixed_set_items;
create policy "Admins manage fixed set items"
  on public.mock_fixed_set_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins read fixed sessions" on public.mock_fixed_sessions;
create policy "Admins read fixed sessions"
  on public.mock_fixed_sessions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins read fixed results" on public.mock_fixed_results;
create policy "Admins read fixed results"
  on public.mock_fixed_results for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
