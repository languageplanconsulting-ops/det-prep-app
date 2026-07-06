-- Paste into the Supabase SQL editor to deploy "My Speaking Partner" (free-topic AI
-- conversation practice, mobile-only). Idempotent / safe to re-run.
-- Mirrors migrations 030 + 031. Credit charging and cross-session weakness tracking
-- only work once these tables exist in the live DB.

create table if not exists public.speaking_partner_credit_locks (
  attempt_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'charged')),
  charge_source text check (charge_source in ('plan', 'addon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists speaking_partner_credit_locks_user_idx
  on public.speaking_partner_credit_locks(user_id, created_at desc);

alter table public.speaking_partner_credit_locks enable row level security;

drop policy if exists "Users manage own speaking partner credit locks" on public.speaking_partner_credit_locks;
create policy "Users manage own speaking partner credit locks"
on public.speaking_partner_credit_locks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- One row per (user, topic). topic_kind distinguishes grammar vs transition;
-- vocabulary is intentionally excluded from weakness tracking.
create table if not exists public.speaking_partner_weakness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_kind text not null check (topic_kind in ('grammar', 'transition')),
  topic_key text not null,
  topic_en text not null,
  topic_th text not null,
  occurrence_count int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_session_attempt_id text,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_kind, topic_key)
);

create index if not exists speaking_partner_weakness_history_user_idx
  on public.speaking_partner_weakness_history (user_id, occurrence_count desc);

alter table public.speaking_partner_weakness_history enable row level security;

drop policy if exists "Users manage own speaking partner weakness history" on public.speaking_partner_weakness_history;
create policy "Users manage own speaking partner weakness history"
on public.speaking_partner_weakness_history
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
