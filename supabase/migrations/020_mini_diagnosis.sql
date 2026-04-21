create table if not exists public.mini_diagnosis_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  internal_name text not null,
  user_title text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mini_diagnosis_sets_internal_name_unique
  on public.mini_diagnosis_sets (lower(internal_name));

create table if not exists public.mini_diagnosis_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.mini_diagnosis_sets(id) on delete cascade,
  step_index integer not null check (step_index >= 1 and step_index <= 9),
  task_type text not null check (task_type in (
    'dictation',
    'real_english_word',
    'vocabulary_reading',
    'fill_in_blanks',
    'interactive_listening',
    'write_about_photo',
    'read_then_speak'
  )),
  time_limit_sec integer not null check (time_limit_sec > 0),
  rest_after_step_sec integer not null default 0 check (rest_after_step_sec >= 0 and rest_after_step_sec <= 180),
  content jsonb not null,
  correct_answer jsonb,
  is_ai_graded boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists mini_diagnosis_set_items_set_step_unique
  on public.mini_diagnosis_set_items (set_id, step_index);

create table if not exists public.mini_diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.mini_diagnosis_sets(id) on delete restrict,
  status text not null default 'in_progress' check (status in ('in_progress', 'cancelled', 'completed')),
  current_step integer not null default 1 check (current_step >= 1 and current_step <= 9),
  responses jsonb not null default '[]'::jsonb,
  targets jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists mini_diagnosis_sessions_user_idx
  on public.mini_diagnosis_sessions (user_id, status, started_at desc);

create table if not exists public.mini_diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.mini_diagnosis_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id uuid not null references public.mini_diagnosis_sets(id) on delete restrict,
  actual_total numeric not null,
  actual_listening numeric not null,
  actual_speaking numeric not null,
  actual_reading numeric not null,
  actual_writing numeric not null,
  level_label text,
  weaknesses jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  report_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mini_diagnosis_results_user_idx
  on public.mini_diagnosis_results (user_id, created_at desc);

alter table public.mini_diagnosis_sets enable row level security;
alter table public.mini_diagnosis_set_items enable row level security;
alter table public.mini_diagnosis_sessions enable row level security;
alter table public.mini_diagnosis_results enable row level security;

drop policy if exists "Signed users read active mini diagnosis sets" on public.mini_diagnosis_sets;
create policy "Signed users read active mini diagnosis sets"
  on public.mini_diagnosis_sets for select
  using (auth.uid() is not null and is_active = true);

drop policy if exists "Signed users read mini diagnosis set items" on public.mini_diagnosis_set_items;
create policy "Signed users read mini diagnosis set items"
  on public.mini_diagnosis_set_items for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.mini_diagnosis_sets s
      where s.id = set_id and s.is_active = true
    )
  );

drop policy if exists "Users manage own mini diagnosis sessions" on public.mini_diagnosis_sessions;
create policy "Users manage own mini diagnosis sessions"
  on public.mini_diagnosis_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own mini diagnosis results" on public.mini_diagnosis_results;
create policy "Users manage own mini diagnosis results"
  on public.mini_diagnosis_results for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins manage mini diagnosis sets" on public.mini_diagnosis_sets;
create policy "Admins manage mini diagnosis sets"
  on public.mini_diagnosis_sets for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage mini diagnosis set items" on public.mini_diagnosis_set_items;
create policy "Admins manage mini diagnosis set items"
  on public.mini_diagnosis_set_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins read mini diagnosis sessions" on public.mini_diagnosis_sessions;
create policy "Admins read mini diagnosis sessions"
  on public.mini_diagnosis_sessions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins read mini diagnosis results" on public.mini_diagnosis_results;
create policy "Admins read mini diagnosis results"
  on public.mini_diagnosis_results for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
