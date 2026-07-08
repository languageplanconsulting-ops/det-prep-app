-- Paste into the Supabase SQL editor to deploy the shared practice-attempt log.
-- WEB and the mobile APP record exam/daily-practice scores to the SAME place,
-- per user account, once this exists. ADDITIVE: a brand-new table — does not
-- touch or change any existing table, so deploying it cannot break the app.
-- Idempotent / safe to re-run.
--
-- The mobile app has been writing to this table's name since it shipped
-- (src/lib/attempts.ts in det-mobile) but the table itself was never actually
-- created here — every mobile write has been silently failing server-side
-- (mobile only "works" via its local on-device fallback). Web has never
-- written or read this table at all, which is why scores don't cross devices.

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'app',          -- 'app' | 'web'
  set_id uuid references public.mock_fixed_sets(id) on delete set null,
  step_index integer,
  task_type text not null,                      -- 'dictation' | 'fill_in_blanks' | ...
  score_pct numeric,                            -- 0..100
  detail jsonb not null default '{}'::jsonb,    -- answer, reference, contentKey, etc.
  created_at timestamptz not null default now()
);

alter table public.practice_attempts enable row level security;

-- A signed-in user can read + insert ONLY their own rows.
drop policy if exists "Users read own practice attempts" on public.practice_attempts;
create policy "Users read own practice attempts"
  on public.practice_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own practice attempts" on public.practice_attempts;
create policy "Users insert own practice attempts"
  on public.practice_attempts for insert
  with check (auth.uid() = user_id);

-- Admins can read everything (for the funnel / progress dashboards).
drop policy if exists "Admins read all practice attempts" on public.practice_attempts;
create policy "Admins read all practice attempts"
  on public.practice_attempts for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists idx_practice_attempts_user_created
  on public.practice_attempts (user_id, created_at desc);
create index if not exists idx_practice_attempts_set
  on public.practice_attempts (set_id, step_index);
