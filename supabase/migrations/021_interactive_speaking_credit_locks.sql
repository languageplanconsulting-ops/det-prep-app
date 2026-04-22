create table if not exists public.interactive_speaking_credit_locks (
  attempt_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id text,
  status text not null default 'pending' check (status in ('pending', 'charged')),
  charge_source text check (charge_source in ('plan', 'addon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interactive_speaking_credit_locks_user_idx
  on public.interactive_speaking_credit_locks(user_id, created_at desc);

alter table public.interactive_speaking_credit_locks enable row level security;

create policy "Users manage own interactive speaking credit locks"
on public.interactive_speaking_credit_locks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
